-- ─────────────────────────────────────────────────────────────
--  PARIS BITES BITE CLUB — SCHEMA
--
--  Run once against the production database, then again after any
--  change: every statement is idempotent, so re-running is safe.
--
--    psql "$DATABASE_URL" -f lib/db/schema.sql
--
--  The rules that protect the rewards live HERE, as constraints, not in
--  application code. A unique index cannot be raced, forgotten, or
--  bypassed by a second server instance; an `if (already)` check in
--  JavaScript can be all three.
-- ─────────────────────────────────────────────────────────────

-- gen_random_uuid() is core Postgres since 13, so no extension is needed —
-- which also means this schema loads into an embedded Postgres in the tests.

-- ── Customers ────────────────────────────────────────────────
-- The phone number IS the identity. It is stored normalised (digits
-- only, with country code) and unique, which is what makes the journey
-- survive a new browser, a cleared cache or a reinstall.
create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null unique,
  name        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Orders ───────────────────────────────────────────────────
-- `code` is the short reference the customer sends over WhatsApp and
-- staff look up in the admin panel — the join between a message on a
-- phone and a row in this table.
--
-- Money is stored in whole rupees as integers. Never floats: a rounding
-- error in a loyalty balance is a customer argument you cannot win.
create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  customer_id   uuid not null references customers(id) on delete cascade,
  status        text not null default 'pending'
                check (status in ('pending', 'completed', 'cancelled', 'refunded')),
  items         jsonb not null,
  gift_product_id text,
  subtotal      integer not null check (subtotal >= 0),
  discount      integer not null default 0 check (discount >= 0),
  total         integer not null check (total >= 0),
  -- whether this order has advanced the journey; the guard against
  -- counting the same order twice when a confirmation is repeated
  counted       boolean not null default false,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists orders_customer_idx on orders (customer_id, created_at desc);
create index if not exists orders_status_idx on orders (status, created_at desc);

-- ── Loyalty account ──────────────────────────────────────────
-- One row per customer. `completed_orders` is the only number that
-- decides where someone stands, and it is written by the server alone.
create table if not exists loyalty_accounts (
  customer_id       uuid primary key references customers(id) on delete cascade,
  completed_orders  integer not null default 0 check (completed_orders >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── Rewards ──────────────────────────────────────────────────
-- `unique (customer_id, milestone)` is the single most important line
-- in this file: a customer can hold at most one reward per milestone,
-- for the life of the account. Duplicate confirmations, replayed
-- requests and two servers writing at once all collapse onto one row.
--
-- 'reserved' means a pending order is holding it. That is what stops a
-- reward being spent twice while the first order is still unconfirmed,
-- without burning it if that order is never completed.
create table if not exists loyalty_rewards (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references customers(id) on delete cascade,
  milestone    integer not null check (milestone >= 1),
  type         text not null,
  status       text not null default 'available'
               check (status in ('available', 'reserved', 'redeemed', 'revoked')),
  earned_at    timestamptz not null default now(),
  redeemed_at  timestamptz,
  order_id     uuid references orders(id) on delete set null,
  unique (customer_id, milestone)
);

create index if not exists rewards_customer_idx on loyalty_rewards (customer_id, milestone);

-- An order may carry at most one reward. Enforced as an index rather
-- than a check so concurrent redemptions collide in the database.
create unique index if not exists rewards_one_per_order
  on loyalty_rewards (order_id)
  where order_id is not null and status in ('reserved', 'redeemed');

-- ── Transactions ─────────────────────────────────────────────
-- Append-only history: every change to a journey, why it happened and
-- what it touched. Nothing here is ever updated or deleted, so a
-- disputed balance can always be reconstructed.
create table if not exists loyalty_transactions (
  id           bigserial primary key,
  customer_id  uuid not null references customers(id) on delete cascade,
  type         text not null,
  order_id     uuid references orders(id) on delete set null,
  reward_id    uuid references loyalty_rewards(id) on delete set null,
  description  text not null default '',
  created_at   timestamptz not null default now()
);

create index if not exists transactions_customer_idx
  on loyalty_transactions (customer_id, created_at desc);

-- ── Placing an order, in one round trip ──────────────────────
-- Every statement sent from the application costs a round trip to the
-- database, and at ~330ms to a distant region that is what a customer
-- actually feels. This function does the whole write — order, reward
-- reservation, ledger entries — inside the database, so placing an order
-- is one trip instead of seven.
--
-- It keeps the guarantees it replaces. The reward is claimed by a
-- conditional update, so two concurrent orders cannot both take it; if the
-- claim finds nothing, the exception rolls back the order along with it,
-- and the customer is told the reward is gone rather than being handed an
-- order that silently lost it.
create or replace function place_order(
  p_customer     uuid,
  p_code         text,
  p_items        jsonb,
  p_gift         text,
  p_subtotal     integer,
  p_discount     integer,
  p_total        integer,
  p_reward       uuid,
  p_reward_label text
) returns orders as $$
declare
  o       orders;
  claimed uuid;
begin
  insert into orders (code, customer_id, items, gift_product_id, subtotal, discount, total)
  values (p_code, p_customer, p_items, p_gift, p_subtotal, p_discount, p_total)
  returning * into o;

  if p_reward is not null then
    update loyalty_rewards
       set status = 'reserved', order_id = o.id
     where id = p_reward
       and customer_id = p_customer
       and status = 'available'
    returning id into claimed;

    if claimed is null then
      raise exception 'reward_unavailable';
    end if;

    insert into loyalty_transactions (customer_id, type, order_id, reward_id, description)
    values (p_customer, 'reward_reserved', o.id, claimed, coalesce(p_reward_label, 'Reward'));
  end if;

  insert into loyalty_transactions (customer_id, type, order_id, description)
  values (p_customer, 'order_placed', o.id, 'Order ' || o.code || ' placed');

  return o;
end;
$$ language plpgsql;

-- ── Keep these tables off the public API ─────────────────────
-- Supabase publishes every table in `public` through PostgREST, reachable
-- with the anon key that ships in any browser. The app does not use that
-- API — it connects as the table owner over Postgres — so the door should
-- simply be shut.
--
-- RLS with no policies denies the anon and authenticated roles everything,
-- while the owner is unaffected (owners bypass RLS unless FORCE is set).
-- Without this, anyone could read your customers' phone numbers.
alter table customers            enable row level security;
alter table orders               enable row level security;
alter table loyalty_accounts     enable row level security;
alter table loyalty_rewards      enable row level security;
alter table loyalty_transactions enable row level security;

-- Belt and braces: take the grants away too. Wrapped in a check because
-- these roles exist only on Supabase — the test database has no such roles
-- and must not fail here.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema public from anon, authenticated';
  end if;
end $$;
