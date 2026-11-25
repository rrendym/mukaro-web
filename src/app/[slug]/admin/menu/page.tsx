import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Category, Menu, Store } from "@/types/database";
import { MenuManagerClient } from "@/components/admin/MenuManagerClient";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage({
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

  const [{ data: categoriesData }, { data: menusData }] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("store_id", store.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("menus")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <MenuManagerClient
      store={store}
      initialCategories={(categoriesData as Category[]) || []}
      initialMenus={(menusData as Menu[]) || []}
    />
  );
}
