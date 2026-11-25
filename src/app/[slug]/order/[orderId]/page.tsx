import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cancelExpiredCashOrders } from "@/lib/stock";
import { Order, OrderItem, Store } from "@/types/database";
import { OrderTrackingClient } from "@/components/customer/OrderTrackingClient";

export const dynamic = "force-dynamic";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { slug, orderId } = await params;
  const supabase = await createClient();

  const { data: storeData } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!storeData) notFound();
  const store = storeData as Store;

  // Auto-cancel expired >15m cash orders
  await cancelExpiredCashOrders(supabase, store.id);

  const { data: orderData } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("store_id", store.id)
    .single();

  if (!orderData) notFound();

  const { data: itemsData } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  return (
    <OrderTrackingClient
      store={store}
      initialOrder={orderData as Order}
      items={(itemsData as OrderItem[]) || []}
    />
  );
}
