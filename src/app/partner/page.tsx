import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { AffiliateCommission, AffiliateProfile } from "@/types/database";
import { PartnerDashboardClient } from "@/components/partner/PartnerDashboardClient";

export const dynamic = "force-dynamic";

export default async function PartnerPage() {
  if (!isSupabaseConfigured()) {
    redirect("/affiliate");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/affiliate");
  }

  const { data: profile } = await supabase
    .from("affiliate_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/affiliate");
  }

  const { data: commissions } = await supabase
    .from("affiliate_commissions")
    .select(
      "*, stores(id, name, slug, owner_id, wa_number, subscription_status, plan_tier, expired_at)"
    )
    .eq("referrer_user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <PartnerDashboardClient
      profile={profile as AffiliateProfile}
      commissions={(commissions as AffiliateCommission[]) || []}
      userEmail={user.email || ""}
    />
  );
}
