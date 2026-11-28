export const LANDING_PROMO_KEY = "landing_promo_popup";

export interface LandingPromoConfig {
  enabled: boolean;
  ownerTitle: string;
  ownerDesc: string;
  ownerCta: string;
  affiliateTitle: string;
  affiliateDesc: string;
  affiliateCta: string;
}

export const DEFAULT_LANDING_PROMO: LandingPromoConfig = {
  enabled: true,
  ownerTitle: "Gratis Uji Coba 14 Hari Full Fitur + 0% Komisi Transaksi",
  ownerDesc:
    "Langsung aktifkan QR Self-Order Meja, Kasir POS & Ojol, Layar Dapur Live, serta Stok Resep tanpa kartu kredit.",
  ownerCta: "Mulai Gratis Sekarang",
  affiliateTitle:
    "Komisi 30% Tanpa Modal — Ajak 1 Outlet Dapat Hingga Rp 90.000/bln",
  affiliateDesc:
    "Bagikan link referral Anda ke pemilik kedai kopi, resto, atau warmindo dan pantau komisi secara real-time.",
  affiliateCta: "Gabung Affiliate Gratis",
};

export function mergeLandingPromo(raw: unknown): LandingPromoConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_LANDING_PROMO;
  const obj = raw as Partial<LandingPromoConfig>;
  return {
    enabled:
      typeof obj.enabled === "boolean"
        ? obj.enabled
        : DEFAULT_LANDING_PROMO.enabled,
    ownerTitle: obj.ownerTitle?.trim() || DEFAULT_LANDING_PROMO.ownerTitle,
    ownerDesc: obj.ownerDesc?.trim() || DEFAULT_LANDING_PROMO.ownerDesc,
    ownerCta: obj.ownerCta?.trim() || DEFAULT_LANDING_PROMO.ownerCta,
    affiliateTitle:
      obj.affiliateTitle?.trim() || DEFAULT_LANDING_PROMO.affiliateTitle,
    affiliateDesc:
      obj.affiliateDesc?.trim() || DEFAULT_LANDING_PROMO.affiliateDesc,
    affiliateCta:
      obj.affiliateCta?.trim() || DEFAULT_LANDING_PROMO.affiliateCta,
  };
}

/**
 * Normalizes `stores.promo_posters` (jsonb) into a clean `string[]`.
 * Falls back to `[fallbackBannerUrl]` when `promo_posters` is empty and a banner URL exists.
 */
export function normalizePromoPosters(
  raw: unknown,
  fallbackBannerUrl?: string | null
): string[] {
  let list: unknown[] = [];

  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) list = parsed;
      } catch {
        list = [];
      }
    } else if (trimmed.length > 0) {
      list = [trimmed];
    }
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of list) {
    if (typeof item !== "string") continue;
    const url = item.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    normalized.push(url);
  }

  if (normalized.length === 0 && typeof fallbackBannerUrl === "string") {
    const fallback = fallbackBannerUrl.trim();
    if (fallback) {
      normalized.push(fallback);
    }
  }

  return normalized;
}
