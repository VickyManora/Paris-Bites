-- ─────────────────────────────────────────────────────────────
--  PARIS BITES BITE CLUB — RESET TEST DATA
--
--  DESTRUCTIVE. This empties every customer-facing table: customers,
--  orders, rewards and the whole loyalty ledger. There is no undo and
--  no backup taken here — run it only against a database whose contents
--  you are willing to lose.
--
--    psql "$DATABASE_URL" -f lib/db/reset.sql
--
--  or paste it into the Supabase SQL editor.
--
--  What survives: the schema itself. Tables, indexes, constraints, the
--  place_order() function and the RLS settings are all untouched, so
--  the site works immediately afterwards — it simply has no history.
--  You do NOT need to re-run schema.sql after this.
-- ─────────────────────────────────────────────────────────────

-- One statement, so it is one transaction: either all five tables empty
-- together or none of them do. A half-cleared database — orders gone but
-- rewards still standing — is worse than no reset at all.
--
-- CASCADE is required rather than optional: orders, loyalty_accounts,
-- loyalty_rewards and loyalty_transactions all carry foreign keys to
-- customers, and Postgres refuses to truncate a referenced table without
-- it. Every table those keys reach is already named below, so CASCADE
-- pulls in nothing that is not being cleared deliberately.
--
-- RESTART IDENTITY resets loyalty_transactions.id (a bigserial) to 1, so
-- a fresh test reads from the ledger's first row rather than continuing
-- somebody else's numbering.
truncate table
  loyalty_transactions,
  loyalty_rewards,
  loyalty_accounts,
  orders,
  customers
restart identity cascade;

-- Proof, in the same session: every count below must read 0.
select 'customers'            as table_name, count(*)::int as rows from customers
union all select 'orders',               count(*)::int from orders
union all select 'loyalty_accounts',     count(*)::int from loyalty_accounts
union all select 'loyalty_rewards',      count(*)::int from loyalty_rewards
union all select 'loyalty_transactions', count(*)::int from loyalty_transactions
order by table_name;
