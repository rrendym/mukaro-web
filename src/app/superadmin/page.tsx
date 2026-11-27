import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  AffiliateCommission,
  AffiliateProfile,
  Store,
} from "@/types/database";
import { SuperadminClient } from "@/components/superadmin/SuperadminClient";
import {
  DEFAULT_LANDING_PROMO,
  LANDING_PROMO_KEY,
  mergeLandingPromo,
} from "@/lib/promo-settings";
import {
  AFFILIATE_SETTINGS_KEY,
  DEFAULT_AFFILIATE_SETTINGS,
  mergeAffiliateSettings,
} from "@/lib/affiliate-settings";

export const dynamic = "force-dynamic";

export default async function SuperadminPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const superadminEmail = (
    process.env.SUPERADMIN_EMAIL ||
    process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL ||
    ""
  )
    .toLowerCase()
    .trim();

  if (!user) {
    redirect("/login");
  }

  const userEmail = (user.email || "").toLowerCase().trim();
  if (!superadminEmail || userEmail !== superadminEmail) {
    redirect("/");
  }

  const [
    { data: storesData },
    { data: profilesData },
    { data: commissionsData },
    { data: menusRows },
    { data: ordersRows },
    { data: promoRow },
    { data: affiliateSettingsRow },
  ] = await Promise.all([
    supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("affiliate_profiles")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("affiliate_commissions")
      .select(
        "*, stores(id, name, slug, owner_id, wa_number, subscription_status, plan_tier, expired_at)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("menus").select("store_id"),
    supabase.from("orders").select("store_id"),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", LANDING_PROMO_KEY)
      .maybeSingle(),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", AFFILIATE_SETTINGS_KEY)
      .maybeSingle(),
  ]);

  const menuCounts: Record<string, number> = {};
  for (const row of (menusRows as { store_id: string }[] | null) || []) {
    menuCounts[row.store_id] = (menuCounts[row.store_id] || 0) + 1;
  }

  const orderCounts: Record<string, number> = {};
  for (const row of (ordersRows as { store_id: string }[] | null) || []) {
    orderCounts[row.store_id] = (orderCounts[row.store_id] || 0) + 1;
  }

  const initialPromoConfig = promoRow?.value
    ? mergeLandingPromo(promoRow.value)
    : DEFAULT_LANDING_PROMO;

  const initialAffiliateSettings = affiliateSettingsRow?.value
    ? mergeAffiliateSettings(affiliateSettingsRow.value)
    : DEFAULT_AFFILIATE_SETTINGS;

  return (
    <SuperadminClient
      initialStores={(storesData as Store[]) || []}
      initialProfiles={(profilesData as AffiliateProfile[]) || []}
      initialCommissions={(commissionsData as AffiliateCommission[]) || []}
      menuCounts={menuCounts}
      orderCounts={orderCounts}
      initialPromoConfig={initialPromoConfig}
      initialAffiliateSettings={initialAffiliateSettings}
      adminEmail={user.email || ""}
    />
  );
}
