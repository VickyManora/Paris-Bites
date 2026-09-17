"use client";

import { useEffect, useState } from "react";

import { menu } from "@/lib/content";
import { itemLabel } from "@/lib/pricing";
import { ProductThumb } from "@/components/product/ProductThumb";
import { milestone } from "@/lib/loyalty/config";
import { properName } from "@/lib/names";

/**
 * The order desk, for two people on a phone beside a dessert cart.
 *
 * Deliberately plain: a list of orders waiting to be confirmed, each with
 * the customer's number, what they ordered, what it costs, and which Bite
 * it will be. Confirming is one tap, and it is the only action in the whole
 * system that advances a loyalty journey.
 *
 * Everything here is a request to the server, which checks the admin cookie
 * on every call. Nothing about a reward is decided in this component.
 */
type AdminOrder = {
  id: string;
  code: string;
  status: "pending" | "completed" | "cancelled" | "refunded";
  items: { id: string; qty: number; price: number }[];
  gift_product_id: string | null;
  subtotal: number;
  discount: number;
  total: number;
  created_at: string;
  phone: string;
  name: string;
  completed_orders: number | null;
};

type Filter = "pending" | "completed" | "all";

export function AdminPanel() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d: { signedIn: boolean }) => !cancelled && setSignedIn(d.signedIn))
      .catch(() => !cancelled && setSignedIn(false));
    return () => {
      cancelled = true;
    };
  }, []);

  /* Bumped after every confirm, cancel or refund to pull a fresh list. A
     counter rather than a function call, so the fetch stays inside the
     effect and state is only ever set from its callbacks. */
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  /* Formatted at fetch time, not at render time. Staff leave this page open
     on a phone beside the cart, so the one thing the list cannot tell them
     is how old it is — an order placed two minutes ago looks exactly like no
     order at all. */
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;

    fetch(`/api/admin/orders?status=${filter}`, { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          if (!cancelled) setSignedIn(false);
          return;
        }
        const data = (await res.json()) as { orders: AdminOrder[] };
        if (!cancelled) setOrders(data.orders ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load orders");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setUpdatedAt(
          new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [signedIn, filter, refresh]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      setSignedIn(true);
      setPassword("");
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not sign in");
    }
  }

  async function act(order: AdminOrder, action: "complete" | "cancel" | "refund") {
    if (action !== "complete") {
      const word = action === "refund" ? "refund" : "cancel";
      if (!confirm(`${word} ${order.code}? This will undo the Bite if it was counted.`)) return;
    }

    setBusy(order.id);
    setError(null);

    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      counted?: boolean;
      completedOrders?: number;
      message?: { headline: string };
    };

    setBusy(null);

    if (!res.ok || !data.ok) {
      setError(data.error ?? "That didn't work");
      return;
    }

    if (action === "complete") {
      setFlash(
        data.counted
          ? `${order.code} confirmed — ${properName(order.name) || "customer"} is on Bite ${data.completedOrders}`
          : `${order.code} was already confirmed`,
      );
    } else {
      setFlash(`${order.code} ${action === "refund" ? "refunded" : "cancelled"}`);
    }

    setLoading(true);
    setRefresh((n) => n + 1);
  }

  if (signedIn === null) {
    return <Shell><p className="text-sm text-muted">Checking…</p></Shell>;
  }

  if (!signedIn) {
    return (
      <Shell>
        <form onSubmit={signIn} className="card mx-auto max-w-sm rounded-3xl p-7">
          <h1 className="display text-xl">Paris Bites orders</h1>
          <p className="mt-2 text-sm text-ink-500">Staff only.</p>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="mt-5 w-full rounded-full border border-ink-900/12 bg-cream-50 px-5 py-3 text-sm outline-none focus:border-gold-500"
          />

          <button
            type="submit"
            className="mt-3 w-full rounded-full bg-ink-900 px-5 py-3 text-sm font-medium text-cream-50 transition-colors hover:bg-gold-600"
          >
            Sign in
          </button>

          {error && <p className="mt-3 text-xs text-gold-600">{error}</p>}
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="display text-2xl">Orders</h1>
            <p className="mt-1 text-sm text-ink-500">
              Confirm an order once the customer has paid at the cart.
            </p>
            {updatedAt && (
              <p className="mt-1 text-xs text-muted">
                {loading ? "Checking…" : `Updated ${updatedAt}`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {(["pending", "completed", "all"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFilter(f);
                  setLoading(true);
                }}
                className={`rounded-full px-4 py-2 text-xs font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-ink-900 text-cream-50"
                    : "border border-ink-900/12 text-ink-700 hover:border-gold-500"
                }`}
              >
                {f}
              </button>
            ))}

            {/* Orders arrive while this page sits open; nothing pushes them
                here. One tap re-reads the list — the same path a confirm
                already takes, so there is no second way to load orders. */}
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError(null);
                setRefresh((n) => n + 1);
              }}
              disabled={loading}
              aria-label="Refresh orders"
              title="Refresh orders"
              className="grid size-9 shrink-0 place-items-center rounded-full border border-ink-900/12 text-ink-700 transition-colors hover:border-gold-500 disabled:opacity-50"
            >
              <RefreshIcon spinning={loading} />
            </button>
          </div>
        </div>

        {flash && (
          <p className="mt-5 rounded-2xl border border-fresh-500/30 bg-fresh-100 px-4 py-3 text-sm text-ink-900">
            {flash}
          </p>
        )}
        {error && <p className="mt-5 text-sm text-gold-600">{error}</p>}

        <ul className="mt-6 space-y-3">
          {loading && orders.length === 0 && (
            <li className="card rounded-2xl p-6 text-center text-sm text-muted">
              Loading orders…
            </li>
          )}

          {!loading && orders.length === 0 && (
            <li className="card rounded-2xl p-6 text-center text-sm text-muted">
              Nothing here.
            </li>
          )}

          {orders.map((order) => {
            const nextBite = (order.completed_orders ?? 0) + 1;
            const bite = milestone(nextBite);

            return (
              <li key={order.id} className="card rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="display text-lg">{order.code}</p>

                    {/* The name is what staff say out loud when they hand the
                        bag over, so it is the one thing on this row worth
                        picking out of the small print. */}
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                      {order.name ? (
                        <span className="rounded-full bg-gold-500/15 px-2.5 py-1 text-sm font-semibold text-ink-900 ring-1 ring-gold-500/30">
                          {properName(order.name)}
                        </span>
                      ) : (
                        <span className="text-sm italic text-muted">No name</span>
                      )}
                      <a
                        href={`tel:${order.phone}`}
                        className="text-sm text-ink-700 underline underline-offset-2"
                      >
                        {order.phone}
                      </a>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {new Date(order.created_at).toLocaleString(undefined, {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="display text-xl">
                      {menu.currency}
                      {order.total}
                    </p>
                    {order.discount > 0 && (
                      <p className="text-xs text-fresh-600">
                        reward −{menu.currency}
                        {order.discount}
                      </p>
                    )}
                    <StatusTag status={order.status} />
                  </div>
                </div>

                {/* A picture per line: this list is what someone packs the
                    bag from, and a bowl and a waffle can share a name. */}
                <ul className="mt-3 space-y-2 border-t border-ink-900/8 pt-3 text-sm text-ink-700">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <ProductThumb id={item.id} name={itemLabel(item.id)} className="size-10" />
                        <span className="min-w-0">
                          {item.qty} × {itemLabel(item.id)}
                        </span>
                      </span>
                      <span className="shrink-0 text-ink-500 tabular-nums">
                        {menu.currency}
                        {item.price * item.qty}
                      </span>
                    </li>
                  ))}
                  {order.gift_product_id && (
                    <li className="flex items-center justify-between gap-3 text-fresh-600">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <ProductThumb
                          id={order.gift_product_id}
                          name={itemLabel(order.gift_product_id)}
                          className="size-10"
                        />
                        <span className="min-w-0">1 × {itemLabel(order.gift_product_id)}</span>
                      </span>
                      <span className="shrink-0">FREE</span>
                    </li>
                  )}
                </ul>

                {order.status === "pending" && (
                  <p className="mt-3 rounded-xl bg-blush-100 px-3.5 py-2 text-xs text-ink-700">
                    Confirming makes this <strong>Bite {nextBite}</strong>
                    {bite?.type ? ` — unlocks ${bite.short}` : " — no reward at this Bite"}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {order.status === "pending" && (
                    <button
                      type="button"
                      disabled={busy === order.id}
                      onClick={() => act(order, "complete")}
                      className="rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-cream-50 transition-colors hover:bg-gold-600 disabled:opacity-50"
                    >
                      {busy === order.id ? "Confirming…" : "Confirm order"}
                    </button>
                  )}

                  {order.status === "pending" && (
                    <button
                      type="button"
                      disabled={busy === order.id}
                      onClick={() => act(order, "cancel")}
                      className="rounded-full border border-ink-900/12 px-5 py-2.5 text-sm text-ink-700 transition-colors hover:border-gold-500 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}

                  {order.status === "completed" && (
                    <button
                      type="button"
                      disabled={busy === order.id}
                      onClick={() => act(order, "refund")}
                      className="rounded-full border border-ink-900/12 px-5 py-2.5 text-sm text-ink-700 transition-colors hover:border-gold-500 disabled:opacity-50"
                    >
                      Refund
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={async () => {
            await fetch("/api/admin/session", { method: "DELETE" });
            setSignedIn(false);
          }}
          className="mt-8 text-xs text-muted underline underline-offset-2 hover:text-ink-700"
        >
          Sign out
        </button>
      </div>
    </Shell>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`size-4 ${spinning ? "animate-spin" : ""}`}
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function StatusTag({ status }: { status: AdminOrder["status"] }) {
  const tone =
    status === "completed"
      ? "bg-fresh-100 text-fresh-600"
      : status === "pending"
        ? "bg-blush-100 text-gold-600"
        : "bg-cream-200 text-muted";

  return (
    <span
      className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${tone}`}
    >
      {status}
    </span>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-cream-100 px-5 py-10 sm:px-8">{children}</main>;
}
