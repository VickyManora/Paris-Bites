import type { Metadata } from "next";

import { AdminPanel } from "@/components/admin/AdminPanel";

/**
 * The confirmation desk.
 *
 * Kept out of search results and out of the sitemap: it is a shop tool, not
 * a page. Authentication is checked on every API call it makes, so a
 * crawler or a curious customer reaching this URL sees a password box and
 * nothing else.
 */
export const metadata: Metadata = {
  title: "Orders · Paris Bites",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPanel />;
}
