export const AFFILIATE_SETTINGS_KEY = "affiliate_settings";

export interface AffiliatePartnerOverride {
  isActive: boolean;
  customCommissionPercent: number | null;
  notes?: string;
}

export interface AffiliateSettingsConfig {
  programEnabled: boolean;
  defaultCommissionPercent: number;
  starterCommission: number;
  proCommission: number;
  enterpriseCommission: number;
  partnerOverrides: Record<string, AffiliatePartnerOverride>;
}

export const DEFAULT_AFFILIATE_SETTINGS: AffiliateSettingsConfig = {
  programEnabled: true,
  defaultCommissionPercent: 30,
  starterCommission: 24000,
  proCommission: 45000,
  enterpriseCommission: 90000,
  partnerOverrides: {},
};

export function mergeAffiliateSettings(raw: unknown): AffiliateSettingsConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_AFFILIATE_SETTINGS;
  const obj = raw as Partial<AffiliateSettingsConfig>;

  const num = (val: unknown, fallback: number) =>
    typeof val === "number" && Number.isFinite(val) && val >= 0
      ? Math.round(val)
      : fallback;

  const overrides: Record<string, AffiliatePartnerOverride> = {};
  if (obj.partnerOverrides && typeof obj.partnerOverrides === "object") {
    for (const [uid, entry] of Object.entries(obj.partnerOverrides)) {
      if (!entry || typeof entry !== "object") continue;
      overrides[uid] = {
        isActive:
          typeof entry.isActive === "boolean" ? entry.isActive : true,
        customCommissionPercent:
          typeof entry.customCommissionPercent === "number" &&
          Number.isFinite(entry.customCommissionPercent) &&
          entry.customCommissionPercent >= 0
            ? Math.min(100, Math.round(entry.customCommissionPercent))
            : null,
        notes: typeof entry.notes === "string" ? entry.notes : undefined,
      };
    }
  }

  return {
    programEnabled:
      typeof obj.programEnabled === "boolean"
        ? obj.programEnabled
        : DEFAULT_AFFILIATE_SETTINGS.programEnabled,
    defaultCommissionPercent: Math.min(
      100,
      num(
        obj.defaultCommissionPercent,
        DEFAULT_AFFILIATE_SETTINGS.defaultCommissionPercent
      )
    ),
    starterCommission: num(
      obj.starterCommission,
      DEFAULT_AFFILIATE_SETTINGS.starterCommission
    ),
    proCommission: num(
      obj.proCommission,
      DEFAULT_AFFILIATE_SETTINGS.proCommission
    ),
    enterpriseCommission: num(
      obj.enterpriseCommission,
      DEFAULT_AFFILIATE_SETTINGS.enterpriseCommission
    ),
    partnerOverrides: overrides,
  };
}
