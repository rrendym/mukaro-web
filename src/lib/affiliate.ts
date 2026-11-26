import { AffiliateCommission, AffiliateProfile } from "@/types/database";

export function normalizeAffiliatePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return `62${digits}`;
}

export function isSelfReferralCommission(
  commission: AffiliateCommission,
  partner?: Pick<AffiliateProfile, "user_id" | "whatsapp"> | null
): boolean {
  if (commission.status === "invalid_self_referral") return true;
  if (!partner) return false;

  if (
    commission.stores?.owner_id &&
    commission.stores.owner_id === partner.user_id
  ) {
    return true;
  }

  const partnerWa = normalizeAffiliatePhone(partner.whatsapp);
  const storeWa = normalizeAffiliatePhone(commission.stores?.wa_number);
  if (partnerWa && storeWa && partnerWa === storeWa) {
    return true;
  }

  return false;
}
