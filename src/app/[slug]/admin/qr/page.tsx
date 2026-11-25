import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Store } from "@/types/database";
import { QrGeneratorClient } from "@/components/admin/QrGeneratorClient";

export const dynamic = "force-dynamic";

export default async function AdminQrPage({
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mukaro.id";

  return <QrGeneratorClient store={storeData as Store} appUrl={appUrl} />;
}
