/**
 * ─────────────────────────────────────────────────────────────
 *  EVERY WRITE THAT TOUCHES A LOYALTY JOURNEY.
 *
 *  Three rules hold this together:
 *
 *  1. The order count is the only truth. Rewards are derived from it,
 *     never accumulated — so a replayed request, a crash between two
 *     writes or a hand-edited row cannot leave a customer permanently
 *     ahead or behind.
 *
 *  2. Every state change is one transaction. An order is counted, its
 *     rewards granted and its reserved reward redeemed together or not
 *     at all.
 *
 *  3. Contention is settled by the database. Conditional updates
 *     (`where status = 'available'`) and unique indexes decide who wins
 *     a race — never a read-then-write in JavaScript, which two
 *     concurrent lambdas would both pass.
 * ─────────────────────────────────────────────────────────────
 */
import {
  MILESTONES,
  WELCOME_MILESTONE,
  milestone,
  type RewardType,
} from "../loyalty/config";
import type { LoyaltyState, RewardRecord } from "../loyalty/engine";
import type { Db } from "./adapter";

export type OrderStatus = "pending" | "completed" | "cancelled" | "refunded";

export type Customer = { id: string; phone: string; name: string };

/**
 * `items` comes back parsed from some drivers and as a JSON string from
 * others — and rows written before the insert above was fixed hold a string
 * whatever the driver. Normalising on read means one shape reaches the UI
 * and no historic order renders as a crash.
 */
function withItems<T extends { items: unknown }>(row: T): T & { items: OrderRow["items"] } {
  const items = row.items;
  if (Array.isArray(items)) return row as T & { items: OrderRow["items"] };

  if (typeof items === "string") {
    try {
      const parsed = JSON.parse(items);
      return { ...row, items: Array.isArray(parsed) ? parsed : [] };
    } catch {
      return { ...row, items: [] };
    }
  }

  return { ...row, items: [] };
}

export type OrderRow = {
  id: string;
  code: string;
  customer_id: string;
  status: OrderStatus;
  items: { id: string; qty: number; price: number }[];
  gift_product_id: string | null;
  subtotal: number;
  discount: number;
  total: number;
  counted: boolean;
  created_at: string;
  completed_at: string | null;
};

/**
 * Phone numbers as identity, so the same person is the same row however
 * they typed it: "+91 74473 60809", "07447360809" and "7447360809" all
 * normalise to 917447360809. A ten-digit number is assumed Indian, which is
 * true of every customer of a dessert cart in Aundh.
 */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const national = digits.startsWith("0") ? digits.slice(1) : digits;

  if (national.length === 10) return `91${national}`;
  if (national.length === 12 && national.startsWith("91")) return national;
  // anything else is either a mistake or a foreign number we cannot verify
  return national.length >= 11 && national.length <= 15 ? national : null;
}

/** PB-7QX4 — short enough to read aloud, random enough not to be guessed */
export function orderCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `PB-${out}`;
}

export async function upsertCustomer(
  db: Db,
  { phone, name }: { phone: string; name: string },
): Promise<Customer> {
  const normalised = normalisePhone(phone);
  if (!normalised) throw new Error("A valid mobile number is required");

  const [customer] = await db.query<Customer>(
    `insert into customers (phone, name)
     values ($1, $2)
     on conflict (phone) do update
       -- a blank name must never overwrite a good one
       set name = case when $2 = '' then customers.name else $2 end,
           updated_at = now()
     returning id, phone, name`,
    [normalised, name.trim().slice(0, 80)],
  );

  await db.query(
    `insert into loyalty_accounts (customer_id) values ($1)
     on conflict (customer_id) do nothing`,
    [customer.id],
  );

  return customer;
}

/**
 * The customer and where they stand, in a single round trip.
 *
 * This used to be four statements — upsert, ensure account, read account,
 * read rewards — which at 330ms each was most of a second before any work
 * began. The CTE does the writes and the read together.
 *
 * The coalesce order matters: `acct` returns a row only when the account was
 * just created, because a CTE cannot see its own insert from a sub-select.
 * So a brand new customer reads from the CTE, an existing one from the table.
 */
export async function customerWithState(
  db: Db,
  { phone, name }: { phone: string; name: string },
): Promise<{ customer: Customer; state: LoyaltyState }> {
  const normalised = normalisePhone(phone);
  if (!normalised) throw new Error("A valid mobile number is required");

  const [row] = await db.query<{
    id: string;
    phone: string;
    name: string;
    completed_orders: number;
    rewards: {
      id: string;
      type: RewardType;
      milestone: number;
      status: RewardRecord["status"] | "reserved";
      earned_at: string;
      redeemed_at: string | null;
      order_id: string | null;
    }[];
  }>(
    `with up as (
       insert into customers (phone, name) values ($1, $2)
       on conflict (phone) do update
         set name = case when $2 = '' then customers.name else $2 end,
             updated_at = now()
       returning id, phone, name
     ), acct as (
       insert into loyalty_accounts (customer_id) select id from up
       on conflict (customer_id) do nothing
       returning customer_id, completed_orders
     )
     select up.id, up.phone, up.name,
            coalesce(
              (select completed_orders from acct),
              (select completed_orders from loyalty_accounts where customer_id = up.id),
              0
            ) as completed_orders,
            coalesce(
              (select json_agg(r.* order by r.milestone)
                 from loyalty_rewards r where r.customer_id = up.id),
              '[]'::json
            ) as rewards
       from up`,
    [normalised, name.trim().slice(0, 80)],
  );

  return {
    customer: { id: row.id, phone: row.phone, name: row.name },
    state: {
      completedOrders: Number(row.completed_orders ?? 0),
      rewards: (typeof row.rewards === "string" ? JSON.parse(row.rewards) : row.rewards).map(
        (r: (typeof row.rewards)[number]) => ({
          id: r.id,
          type: r.type,
          milestone: r.milestone,
          status: r.status === "reserved" ? "redeemed" : r.status,
          earnedAt: new Date(r.earned_at).toISOString(),
          redeemedAt: r.redeemed_at ? new Date(r.redeemed_at).toISOString() : null,
          orderId: r.order_id,
        }),
      ),
    },
  };
}

export async function findCustomerByPhone(db: Db, phone: string): Promise<Customer | null> {
  const normalised = normalisePhone(phone);
  if (!normalised) return null;
  const [row] = await db.query<Customer>(
    `select id, phone, name from customers where phone = $1`,
    [normalised],
  );
  return row ?? null;
}

export async function loyaltyState(db: Db, customerId: string): Promise<LoyaltyState> {
  const [account] = await db.query<{ completed_orders: number }>(
    `select completed_orders from loyalty_accounts where customer_id = $1`,
    [customerId],
  );

  const rewards = await db.query<{
    id: string;
    type: RewardType;
    milestone: number;
    status: RewardRecord["status"] | "reserved";
    earned_at: string;
    redeemed_at: string | null;
    order_id: string | null;
  }>(
    `select id, type, milestone, status, earned_at, redeemed_at, order_id
       from loyalty_rewards
      where customer_id = $1
      order by milestone`,
    [customerId],
  );

  return {
    completedOrders: Number(account?.completed_orders ?? 0),
    rewards: rewards.map((r) => ({
      id: r.id,
      type: r.type,
      milestone: r.milestone,
      // a reserved reward is spoken for: the UI must not offer it again
      status: r.status === "reserved" ? "redeemed" : r.status,
      earnedAt: new Date(r.earned_at).toISOString(),
      redeemedAt: r.redeemed_at ? new Date(r.redeemed_at).toISOString() : null,
      orderId: r.order_id,
    })),
  };
}

/**
 * Grant every reward the count has earned, and only those.
 *
 * `on conflict do nothing` against `unique (customer_id, milestone)` makes
 * this safe to call as often as you like: the second call for a milestone is
 * a no-op, which is what makes order completion idempotent.
 */
async function grantEarnedRewards(db: Db, customerId: string, completedOrders: number) {
  const earned = MILESTONES.filter((m) => m.type !== null && m.earnedAfter <= completedOrders);

  for (const m of earned) {
    const inserted = await db.query<{ id: string }>(
      `insert into loyalty_rewards (customer_id, milestone, type)
       values ($1, $2, $3)
       on conflict (customer_id, milestone) do nothing
       returning id`,
      [customerId, m.n, m.type],
    );

    if (inserted[0]) {
      await db.query(
        `insert into loyalty_transactions (customer_id, type, reward_id, description)
         values ($1, 'reward_earned', $2, $3)`,
        [customerId, inserted[0].id, `${m.label} — ${m.short}`],
      );
    }
  }
}

/**
 * The welcome gift's row, created the first time it is actually spent.
 *
 * Every other reward is granted when a Bite completes. This one is granted
 * on demand, because the customer has no history to grant it from — and it
 * still lands under `unique (customer_id, milestone)`, so a second attempt
 * finds the existing row rather than minting another. The caller gets the
 * row back only while it is still spendable; once an order holds it the
 * status is no longer 'available' and this returns null.
 */
export async function claimWelcomeReward(
  db: Db,
  customerId: string,
): Promise<{ id: string } | null> {
  const m = milestone(WELCOME_MILESTONE);
  if (!m?.type) return null;

  const [inserted] = await db.query<{ id: string }>(
    `insert into loyalty_rewards (customer_id, milestone, type)
     values ($1, $2, $3)
     on conflict (customer_id, milestone) do nothing
     returning id`,
    [customerId, m.n, m.type],
  );

  if (inserted) {
    await db.query(
      `insert into loyalty_transactions (customer_id, type, reward_id, description)
       values ($1, 'reward_earned', $2, $3)`,
      [customerId, inserted.id, `Welcome gift — ${m.short}`],
    );
    return inserted;
  }

  // it already existed: usable only if nothing has taken it yet
  const [existing] = await db.query<{ id: string }>(
    `select id from loyalty_rewards
      where customer_id = $1 and milestone = $2 and status = 'available'`,
    [customerId, m.n],
  );

  return existing ?? null;
}

/**
 * Put a pending order in the book, reserving a reward if one is being spent.
 *
 * The reservation is a conditional update: whoever flips 'available' first
 * gets the reward and everyone else is told it is gone. Two tabs, a
 * double-tapped button and two servers all lose the same way.
 */
export async function createOrder(
  db: Db,
  input: {
    customerId: string;
    items: { id: string; qty: number; price: number }[];
    giftProductId?: string | null;
    subtotal: number;
    discount: number;
    total: number;
    rewardId?: string | null;
    rewardLabel?: string | null;
  },
): Promise<{ order: OrderRow } | { error: string }> {
  /* One call to place_order() — the order, the reward claim and both ledger
     rows happen inside the database. The only reason to come back here is a
     code collision, which is a 1-in-a-million unique violation. */
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const [order] = await db.query<OrderRow>(
        `select * from place_order($1, $2, $3::text::jsonb, $4, $5, $6, $7, $8, $9)`,
        [
          input.customerId,
          orderCode(),
          JSON.stringify(input.items),
          input.giftProductId ?? null,
          input.subtotal,
          input.discount,
          input.total,
          input.rewardId ?? null,
          input.rewardLabel ?? null,
        ],
      );
      return { order: withItems(order) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("reward_unavailable"))
        return { error: "That reward has already been used." };

      // duplicate order code: draw another and try again
      const collision =
        message.includes("orders_code_key") || message.includes("duplicate key");
      if (!collision) throw error;
    }
  }

  return { error: "Could not place your order. Please try again." };
}

/**
 * Staff confirm an order: the one moment a journey advances.
 *
 * Idempotent by design. The row is locked and re-read inside the
 * transaction, and anything not still 'pending' returns the current state
 * untouched — so a double-clicked button, a retried request or two staff
 * confirming the same order at once all produce exactly one Bite.
 */
export async function completeOrder(
  db: Db,
  orderId: string,
): Promise<{ order: OrderRow; state: LoyaltyState; counted: boolean }> {
  return db.tx(async (tx) => {
    const [order] = await tx.query<OrderRow>(
      `select * from orders where id = $1 for update`,
      [orderId],
    );
    if (!order) throw new Error("Order not found");

    if (order.status !== "pending" || order.counted) {
      return { order: withItems(order), state: await loyaltyState(tx, order.customer_id), counted: false };
    }

    const [updated] = await tx.query<OrderRow>(
      `update orders
          set status = 'completed', completed_at = now(), counted = true
        where id = $1 and status = 'pending'
      returning *`,
      [orderId],
    );

    const [account] = await tx.query<{ completed_orders: number }>(
      `update loyalty_accounts
          set completed_orders = completed_orders + 1, updated_at = now()
        where customer_id = $1
      returning completed_orders`,
      [order.customer_id],
    );

    await grantEarnedRewards(tx, order.customer_id, Number(account.completed_orders));

    // a reward reserved by this order is now genuinely spent
    await tx.query(
      `update loyalty_rewards
          set status = 'redeemed', redeemed_at = now()
        where order_id = $1 and status = 'reserved'`,
      [orderId],
    );

    await tx.query(
      `insert into loyalty_transactions (customer_id, type, order_id, description)
       values ($1, 'order_completed', $2, $3)`,
      [
        order.customer_id,
        orderId,
        `Order ${order.code} completed — Bite ${account.completed_orders}`,
      ],
    );

    return {
      order: withItems(updated),
      state: await loyaltyState(tx, order.customer_id),
      counted: true,
    };
  });
}

/**
 * Cancel or refund, and put the journey back where it was.
 *
 * A reward the order merely reserved is released, because it was never
 * enjoyed. A reward already redeemed on a completed order is NOT clawed
 * back — the customer ate the bowl. Instead the count drops, and any
 * still-unspent reward above the new count is revoked, which is the only
 * reversal that cannot take something away twice.
 */
export async function reverseOrder(
  db: Db,
  orderId: string,
  status: "cancelled" | "refunded",
): Promise<{ order: OrderRow; state: LoyaltyState }> {
  return db.tx(async (tx) => {
    const [order] = await tx.query<OrderRow>(
      `select * from orders where id = $1 for update`,
      [orderId],
    );
    if (!order) throw new Error("Order not found");

    if (order.status === status) {
      return { order: withItems(order), state: await loyaltyState(tx, order.customer_id) };
    }

    const [updated] = await tx.query<OrderRow>(
      `update orders set status = $2, counted = false where id = $1 returning *`,
      [orderId, status],
    );

    // release a reservation; a spent reward stays spent
    await tx.query(
      `update loyalty_rewards
          set status = 'available', order_id = null
        where order_id = $1 and status = 'reserved'`,
      [orderId],
    );

    if (order.counted) {
      const [account] = await tx.query<{ completed_orders: number }>(
        `update loyalty_accounts
            set completed_orders = greatest(completed_orders - 1, 0), updated_at = now()
          where customer_id = $1
        returning completed_orders`,
        [order.customer_id],
      );

      const revoked = await tx.query<{ id: string }>(
        `update loyalty_rewards
            set status = 'revoked'
          where customer_id = $1
            and status = 'available'
            and milestone > $2
        returning id`,
        [order.customer_id, Number(account.completed_orders)],
      );

      await tx.query(
        `insert into loyalty_transactions (customer_id, type, order_id, description)
         values ($1, $2, $3, $4)`,
        [
          order.customer_id,
          status === "refunded" ? "order_refunded" : "order_cancelled",
          orderId,
          `Order ${order.code} ${status} — back to ${account.completed_orders} Bites` +
            (revoked.length ? `, ${revoked.length} unspent reward(s) revoked` : ""),
        ],
      );
    }

    return { order: withItems(updated), state: await loyaltyState(tx, order.customer_id) };
  });
}

export async function orderByCode(db: Db, code: string): Promise<OrderRow | null> {
  const [row] = await db.query<OrderRow>(`select * from orders where code = $1`, [
    code.trim().toUpperCase(),
  ]);
  return row ? withItems(row) : null;
}

export async function customerOrders(db: Db, customerId: string, limit = 20) {
  const rows = await db.query<OrderRow>(
    `select * from orders where customer_id = $1 order by created_at desc limit $2`,
    [customerId, limit],
  );
  return rows.map(withItems);
}

export async function transactions(db: Db, customerId: string, limit = 50) {
  return db.query<{
    id: string;
    type: string;
    description: string;
    created_at: string;
  }>(
    `select id, type, description, created_at
       from loyalty_transactions
      where customer_id = $1
      order by created_at desc
      limit $2`,
    [customerId, limit],
  );
}

/** the admin queue: what needs confirming, newest first */
export async function ordersForAdmin(db: Db, status: OrderStatus | "all" = "pending", limit = 50) {
  const where = status === "all" ? "" : "where o.status = $2";
  const rows = await db.query<
    OrderRow & { phone: string; name: string; completed_orders: number }
  >(
    `select o.*, c.phone, c.name, la.completed_orders
       from orders o
       join customers c on c.id = o.customer_id
       left join loyalty_accounts la on la.customer_id = o.customer_id
       ${where}
      order by o.created_at desc
      limit $1`,
    status === "all" ? [limit] : [limit, status],
  );
  return rows.map(withItems);
}
