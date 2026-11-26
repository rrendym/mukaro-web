import React from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { Store } from "@/types/database";
import { AdminShell } from "@/components/admin/AdminShell";
import { SubscriptionPaywall } from "@/components/admin/SubscriptionPaywall";
import { checkStoreSubscription } from "@/lib/subscription";

export const dynamic = "force-dynamic";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function AdminLayout({
  children,
  params,
}: AdminLayoutProps) {
  const { slug } = await params;

  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: storeData } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!storeData) {
    notFound();
  }

  const store = storeData as Store;

  if (store.owner_id !== user.id) {
    redirect("/login");
  }

  const { isExpired, formattedExpiredAt } = checkStoreSubscription(store);
  if (isExpired) {
    return (
      <SubscriptionPaywall
        store={store}
        formattedExpiredAt={formattedExpiredAt}
      />
    );
  }

  const { data: ownerStoresData } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  const ownerStores =
    ownerStoresData && ownerStoresData.length > 0
      ? (ownerStoresData as Store[])
      : [store];

  return (
    <AdminShell
      store={store}
      ownerStores={ownerStores}
      userEmail={user.email || ""}
    >
      {children}
    </AdminShell>
  );
}
