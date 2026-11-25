import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  DEMO_CATEGORIES,
  DEMO_MENUS,
  DEMO_STORE,
} from "@/lib/demo-data";
import { Category, Menu, Store } from "@/types/database";
import { CustomerMenuClient } from "@/components/customer/CustomerMenuClient";
import { MukaroLogo } from "@/components/MukaroLogo";
import { checkStoreSubscription } from "@/lib/subscription";

export const dynamic = "force-dynamic";

interface StorePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ meja?: string }>;
}

export default async function StoreMenuPage({
  params,
  searchParams,
}: StorePageProps) {
  const { slug } = await params;
  const { meja } = await searchParams;

  let store: Store | null = null;
  let categories: Category[] = [];
  let menus: Menu[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: storeData } = await supabase
      .from("stores")
      .select("*")
      .eq("slug", slug)
      .single();

    if (storeData) {
      store = storeData as Store;

      const [{ data: catData }, { data: menuData }] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("store_id", store.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("menus")
          .select("*")
          .eq("store_id", store.id)
          .order("created_at", { ascending: true }),
      ]);

      categories = (catData as Category[]) || [];
      menus = (menuData as Menu[]) || [];
    }
  } else if (slug === "kopi-senja") {
    store = DEMO_STORE;
    categories = DEMO_CATEGORIES;
    menus = DEMO_MENUS;
  }

  if (!store) {
    notFound();
  }

  // Subscription / expiration validation
  const { isExpired } = checkStoreSubscription(store);

  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-center">
            <MukaroLogo size="md" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
            Menu Digital Sedang Tidak Tersedia
          </h1>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Mohon maaf, layanan menu digital untuk{" "}
            <span className="font-bold text-slate-900">{store.name}</span>{" "}
            sedang tidak tersedia saat ini. Silakan hubungi kasir untuk
            melakukan pemesanan secara langsung.
          </p>
          <p className="text-[11px] text-neutral-400 font-medium pt-2">
            Powered by Mukaro
          </p>
        </div>
      </div>
    );
  }

  return (
    <CustomerMenuClient
      store={store}
      categories={categories}
      menus={menus}
      mejaParam={meja}
    />
  );
}
