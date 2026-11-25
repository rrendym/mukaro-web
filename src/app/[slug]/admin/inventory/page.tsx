import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Ingredient,
  Menu,
  MenuRecipe,
  StockOpnameLog,
  Store,
} from "@/types/database";
import { InventoryManagerClient } from "@/components/admin/InventoryManagerClient";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage({
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

  const [{ data: menusData }, { data: ingData }, { data: logsData }] =
    await Promise.all([
      supabase
        .from("menus")
        .select("*")
        .eq("store_id", store.id)
        .order("name", { ascending: true }),
      supabase
        .from("ingredients")
        .select("*")
        .eq("store_id", store.id)
        .order("name", { ascending: true }),
      supabase
        .from("stock_opname_logs")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const menus = (menusData as Menu[]) || [];
  const menuIds = menus.map((m) => m.id);
  let recipes: MenuRecipe[] = [];

  if (menuIds.length > 0) {
    const { data: recData } = await supabase
      .from("menu_recipes")
      .select("*")
      .in("menu_id", menuIds);
    recipes = (recData as MenuRecipe[]) || [];
  }

  return (
    <InventoryManagerClient
      store={store}
      initialMenus={menus}
      initialIngredients={(ingData as Ingredient[]) || []}
      initialRecipes={recipes}
      initialLogs={(logsData as StockOpnameLog[]) || []}
    />
  );
}
