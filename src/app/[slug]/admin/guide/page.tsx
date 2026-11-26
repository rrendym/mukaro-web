import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Store } from "@/types/database";
import { GuideClient } from "@/components/admin/GuideClient";

export const dynamic = "force-dynamic";

export default async function AdminGuidePage({
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

  return <GuideClient store={storeData as Store} />;
}
