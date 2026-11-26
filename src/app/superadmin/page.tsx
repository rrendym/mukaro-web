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
      .select("*, stores(name, slug, subscription_status, plan_tier)")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <SuperadminClient
      initialStores={(storesData as Store[]) || []}
      initialProfiles={(profilesData as AffiliateProfile[]) || []}
      initialCommissions={(commissionsData as AffiliateCommission[]) || []}
      adminEmail={user.email || ""}
    />
  );
}
