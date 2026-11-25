import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Store, Voucher } from "@/types/database";
import { VouchersManagerClient } from "@/components/admin/VouchersManagerClient";

export const dynamic = "force-dynamic";

export default async function AdminVouchersPage({
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

  const { data: vouchersData } = await supabase
    .from("vouchers")
    .select("*")
    .eq("store_id", store.id);

  return (
    <VouchersManagerClient
      store={store}
      initialVouchers={(vouchersData as Voucher[]) || []}
    />
  );
}
