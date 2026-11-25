import { Store } from "@/types/database";

export interface SubscriptionCheckResult {
  isExpired: boolean;
  expiredAtDate: Date | null;
  formattedExpiredAt: string;
}

/**
 * Checks whether a store's SaaS subscription is active or expired.
 * Demo store ('kopi-senja') remains accessible unless explicitly set to 'expired'.
 */
export function checkStoreSubscription(
  store: Pick<Store, "slug" | "subscription_status" | "expired_at">
): SubscriptionCheckResult {
  const expiredAtDate = store.expired_at ? new Date(store.expired_at) : null;
  const formattedExpiredAt = expiredAtDate
    ? expiredAtDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "-";

  if (store.slug === "kopi-senja" && store.subscription_status !== "expired") {
    return {
      isExpired: false,
      expiredAtDate,
      formattedExpiredAt,
    };
  }

  const isDateExpired =
    expiredAtDate !== null &&
    !Number.isNaN(expiredAtDate.getTime()) &&
    expiredAtDate.getTime() < Date.now();

  const isExpired = store.subscription_status === "expired" || isDateExpired;

  return {
    isExpired,
    expiredAtDate,
    formattedExpiredAt,
  };
}
