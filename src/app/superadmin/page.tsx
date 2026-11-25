import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { Store } from "@/types/database";
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

  const { data: storesData } = await supabase
    .from("stores")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <SuperadminClient
      initialStores={(storesData as Store[]) || []}
      adminEmail={user.email || ""}
    />
  );
}
