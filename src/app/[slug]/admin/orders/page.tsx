import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cancelExpiredCashOrders } from "@/lib/stock";
import { Order, Store } from "@/types/database";
import { LiveOrdersClient } from "@/components/admin/LiveOrdersClient";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
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

  await cancelExpiredCashOrders(supabase, store.id);

  const { data: ordersData } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <LiveOrdersClient
      store={store}
      initialOrders={(ordersData as Order[]) || []}
    />
  );
}
