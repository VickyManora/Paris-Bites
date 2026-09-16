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

-- One customer's reward rows as JSON, so a caller that has just written
-- them can read them back without a second round trip.
create or replace function rewards_of(p_customer uuid) returns jsonb as $$
  select coalesce(
    (select jsonb_agg(to_jsonb(r) order by r.milestone)
       from loyalty_rewards r where r.customer_id = p_customer),
    '[]'::jsonb
  );
$$ language sql stable;

-- ── Confirming an order, in one round trip ───────────────────
-- Staff confirm an order: the one moment a journey advances. This used
-- to be ten to nineteen statements — lock, update, count, then one
-- INSERT per earned milestone, then the ledger, then two more to read
-- the state back — every one of them a round trip. At ~330ms to a
-- distant region that is several seconds with a row lock held open,
-- which is a staff member watching a spinner in a busy shop.
--
-- The ladder is NOT duplicated here. It is passed in as `p_ladder`,
-- built from MILESTONES in lib/loyalty/config.ts, so that file remains
-- the only place a reward is defined. This function knows how to apply
-- a ladder; it does not know what is on one.
--
-- Idempotent, exactly as before: the row is locked and re-read, and
-- anything not still 'pending' returns the current state untouched. A
-- double-tapped button awards one Bite.
create or replace function complete_order(p_order uuid, p_ladder jsonb)
returns table (order_row jsonb, was_counted boolean, completed integer, rewards jsonb)
as $$
declare
  o   orders;
  cnt integer;
begin
  select * into o from orders where id = p_order for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  if o.status <> 'pending' or o.counted then
    select coalesce(la.completed_orders, 0) into cnt
      from loyalty_accounts la where la.customer_id = o.customer_id;

    return query select to_jsonb(o), false, coalesce(cnt, 0), rewards_of(o.customer_id);
    return;
  end if;

  update orders
     set status = 'completed', completed_at = now(), counted = true
   where id = p_order and status = 'pending'
  returning * into o;

  update loyalty_accounts
     set completed_orders = completed_orders + 1, updated_at = now()
   where customer_id = o.customer_id
  returning completed_orders into cnt;

  -- every reward the new count has earned, granted in ONE statement.
  -- `on conflict do nothing` keeps it idempotent, and the ledger row is
  -- written only for milestones that were actually new.
  with earned as (
    select (m->>'n')::int as n,
           m->>'type'     as type,
           m->>'label'    as label,
           m->>'short'    as short
      from jsonb_array_elements(p_ladder) m
     where m->>'type' is not null
       and (m->>'earnedAfter')::int <= cnt
  ), granted as (
    insert into loyalty_rewards (customer_id, milestone, type)
    select o.customer_id, e.n, e.type from earned e
    on conflict (customer_id, milestone) do nothing
    returning id, milestone
  )
  insert into loyalty_transactions (customer_id, type, reward_id, description)
  select o.customer_id, 'reward_earned', g.id, e.label || ' — ' || e.short
    from granted g join earned e on e.n = g.milestone;

  -- a reward this order had merely reserved is now genuinely spent
  update loyalty_rewards
     set status = 'redeemed', redeemed_at = now()
   where order_id = p_order and status = 'reserved';

  insert into loyalty_transactions (customer_id, type, order_id, description)
  values (o.customer_id, 'order_completed', p_order,
          'Order ' || o.code || ' completed — Bite ' || cnt);

  return query select to_jsonb(o), true, cnt, rewards_of(o.customer_id);
end;
$$ language plpgsql;

-- ── Cancelling or refunding, in one round trip ───────────────
-- The mirror of the above, and the same reason. A reward the order only
-- reserved is released; one already redeemed stays spent, because the
-- customer ate the bowl. The count drops, and any still-unspent reward
-- the new count no longer entitles them to is revoked.
--
-- "No longer entitles them to" is measured in `earnedAfter`, not in
-- milestone position — the welcome gift sits at earnedAfter 0, so a
-- customer refunded back to zero orders is still owed it.
create or replace function reverse_order(p_order uuid, p_status text, p_ladder jsonb)
returns table (order_row jsonb, completed integer, rewards jsonb)
as $$
declare
  o       orders;
  cnt     integer;
  revoked integer := 0;
  -- captured BEFORE the update below, which sets counted = false. Reading it
  -- afterwards would say this order never counted, and the journey would
  -- never walk back.
  did_count boolean;
begin
  select * into o from orders where id = p_order for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  if o.status = p_status then
    select coalesce(la.completed_orders, 0) into cnt
      from loyalty_accounts la where la.customer_id = o.customer_id;

    return query select to_jsonb(o), coalesce(cnt, 0), rewards_of(o.customer_id);
    return;
  end if;

  did_count := o.counted;

  update orders set status = p_status, counted = false
   where id = p_order
  returning * into o;

  update loyalty_rewards
     set status = 'available', order_id = null
   where order_id = p_order and status = 'reserved';

  if did_count then
    update loyalty_accounts
       set completed_orders = greatest(completed_orders - 1, 0), updated_at = now()
     where customer_id = o.customer_id
    returning completed_orders into cnt;

    with gone as (
      update loyalty_rewards r
         set status = 'revoked'
       where r.customer_id = o.customer_id
         and r.status = 'available'
         and r.milestone in (
           select (m->>'n')::int from jsonb_array_elements(p_ladder) m
            where (m->>'earnedAfter')::int > cnt
         )
      returning 1
    )
    select count(*)::int into revoked from gone;

    insert into loyalty_transactions (customer_id, type, order_id, description)
    values (
      o.customer_id,
      case when p_status = 'refunded' then 'order_refunded' else 'order_cancelled' end,
      p_order,
      'Order ' || o.code || ' ' || p_status || ' — back to ' || cnt || ' Bites' ||
        case when revoked > 0 then ', ' || revoked || ' unspent reward(s) revoked' else '' end
    );
  else
    select coalesce(la.completed_orders, 0) into cnt
      from loyalty_accounts la where la.customer_id = o.customer_id;
  end if;

  return query select to_jsonb(o), coalesce(cnt, 0), rewards_of(o.customer_id);
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
