import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { deductOrderStock } from "@/lib/stock";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      order_id,
      transaction_status,
      status_code,
      gross_amount,
      signature_key,
    } = body as {
      order_id?: string;
      transaction_status?: string;
      status_code?: string;
      gross_amount?: string;
      signature_key?: string;
    };

    if (!order_id || !transaction_status) {
      return NextResponse.json(
        { error: "Payload webhook tidak lengkap." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", order_id)
      .single();

    if (!order) {
      return NextResponse.json(
        { error: "Order tidak ditemukan." },
        { status: 404 }
      );
    }

    const { data: store } = await supabase
      .from("stores")
      .select("midtrans_server_key")
      .eq("id", order.store_id)
      .single();

    // Strict Midtrans SHA-512 signature verification
    const serverKey = store?.midtrans_server_key;
    if (!serverKey || !signature_key) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    const expected = crypto
      .createHash("sha512")
      .update(
        `${order_id}${status_code || ""}${gross_amount || ""}${serverKey}`
      )
      .digest("hex");

    if (expected.toLowerCase() !== signature_key.toLowerCase()) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    // Idempotency guard: never process or deduct stock twice for already paid orders
    if (order.payment_status === "paid") {
      return NextResponse.json({ ok: true, idempotent: true });
    }

    const isPaid =
      transaction_status === "settlement" || transaction_status === "capture";
    const isFailed =
      transaction_status === "cancel" ||
      transaction_status === "expire" ||
      transaction_status === "deny";

    if (isPaid) {
      await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          order_status: "queued",
        })
        .eq("id", order.id);

      await deductOrderStock(supabase, order.id);
    } else if (isFailed) {
      await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          order_status: "cancelled",
        })
        .eq("id", order.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Webhook error",
      },
      { status: 500 }
    );
  }
}
