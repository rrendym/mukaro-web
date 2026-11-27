import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Ingredient, Menu, Order, OrderItem, Store } from "@/types/database";
import { ExecutiveDashboardClient } from "@/components/admin/ExecutiveDashboardClient";
import { getDaysAgoIso } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
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

  const thirtyDaysAgo = getDaysAgoIso(30);

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

  const [
    { data: ordersData },
    { data: allMenusData },
    { data: ingredientsData },
    { data: hqOrdersData },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("store_id", store.id)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false }),
    supabase.from("menus").select("*").eq("store_id", store.id),
    supabase.from("ingredients").select("*").eq("store_id", store.id),
    ownerStores.length > 1
      ? supabase
          .from("orders")
          .select("*")
          .in(
            "store_id",
            ownerStores.map((s) => s.id)
          )
          .gte("created_at", thirtyDaysAgo)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  const orders = (ordersData as Order[]) || [];
  const allMenus = (allMenusData as Menu[]) || [];
  const orderIds = orders.map((o) => o.id);

  let orderItems: OrderItem[] = [];
  if (orderIds.length > 0) {
    const { data: itemsData } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);
    orderItems = (itemsData as OrderItem[]) || [];
  }

  const lowStockMenus = allMenus.filter(
    (m) => m.stock_mode === "direct" && m.stock_qty <= m.min_stock
  );
  const lowStockIngredients = ((ingredientsData as Ingredient[]) || []).filter(
    (i) => i.stock_qty <= i.min_stock
  );

  return (
    <ExecutiveDashboardClient
      store={store}
      ownerStores={ownerStores}
      hqOrders={(hqOrdersData as Order[]) || []}
      orders={orders}
      orderItems={orderItems}
      menus={allMenus}
      lowStockMenus={lowStockMenus}
      lowStockIngredients={lowStockIngredients}
    />
  );
}
