/**
 * Shapes the server sends to the browser.
 *
 * Kept apart from service.ts because that file is `server-only` — a client
 * component importing a type from it would drag the database driver into the
 * bundle, or fail the build. Types are erased at compile time, so this file
 * ships nothing.
 */
import type { MilestoneView } from "./engine";
import type { LoyaltyState } from "./engine";
import type { RewardType } from "./config";

export type LoyaltySnapshot = {
  customer: { name: string; phone: string } | null;
  state: LoyaltyState;
  journey: MilestoneView[];
  next: { label: string; short: string; ordersAway: number } | null;
  offer: {
    id: string;
    type: RewardType;
    label: string;
    detail: string;
    choices: { id: string; name: string; price: number }[];
  } | null;
  history: { id: string; type: string; description: string; at: string }[];
};
