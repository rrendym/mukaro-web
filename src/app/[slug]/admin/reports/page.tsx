import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Store } from "@/types/database";
import { getStorePlanTier } from "@/lib/subscription";
import { ReportsClient } from "@/components/admin/ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: storeData } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!storeData) notFound();
  const store = storeData as Store;
  const planTier = getStorePlanTier(store);

  // Fetch all stores owned by this owner for multi-outlet switching
  let ownerStores: Store[] = [store];
  if (store.owner_id) {
    const { data: allOwnerStores } = await supabase
      .from("stores")
      .select("*")
      .eq("owner_id", store.owner_id)
      .order("created_at", { ascending: true });

    if (allOwnerStores && allOwnerStores.length > 0) {
      ownerStores = allOwnerStores as Store[];
    }
  }

  return (
    <ReportsClient
      store={store}
      ownerStores={ownerStores}
      planTier={planTier}
    />
  );
}
