import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deductOrderStock } from "@/lib/stock";
import { checkStoreSubscription } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  try {
    const { orderId } = (await req.json()) as { orderId?: string };
    if (!orderId) {
      return NextResponse.json(
        { error: "orderId wajib disertakan." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, store_id, payment_status")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: "Pesanan tidak ditemukan." },
        { status: 404 }
      );
    }

    const { data: store } = await supabase
      .from("stores")
      .select("slug, subscription_status, expired_at")
      .eq("id", order.store_id)
      .single();

    if (!store || checkStoreSubscription(store).isExpired) {
      return NextResponse.json(
        { error: "Layanan outlet sedang tidak aktif (masa langganan habis)." },
        { status: 403 }
      );
    }

    if (order.payment_status !== "paid") {
      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          order_status: "queued",
        })
        .eq("id", orderId);

      if (updateErr) {
        return NextResponse.json(
          { error: updateErr.message },
          { status: 500 }
        );
      }

      await deductOrderStock(supabase, orderId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Gagal mengonfirmasi pembayaran.",
      },
      { status: 500 }
    );
  }
}
