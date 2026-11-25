import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: "Pesanan tidak ditemukan." },
        { status: 404 }
      );
    }

    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select(
        "id, name, slug, subscription_status, expired_at, midtrans_server_key, static_qris_url"
      )
      .eq("id", order.store_id)
      .single();

    if (storeErr || !store) {
      return NextResponse.json(
        { error: "Toko tidak ditemukan." },
        { status: 404 }
      );
    }

    const { isExpired } = checkStoreSubscription(store);
    if (isExpired) {
      return NextResponse.json(
        { error: "Layanan outlet sedang tidak aktif (masa langganan habis)." },
        { status: 403 }
      );
    }

    // Mode Demo & QRIS Statis if midtrans_server_key is not configured
    if (!store.midtrans_server_key) {
      return NextResponse.json({
        mode: "demo",
        orderId: order.id,
        orderNumber: order.order_number,
        totalAmount: order.total_amount,
        staticQrisUrl: store.static_qris_url || null,
      });
    }

    // Midtrans Snap API integration
    const isSandbox = store.midtrans_server_key.startsWith("SB-");
    const snapBaseUrl = isSandbox
      ? "https://app.sandbox.midtrans.com/snap/v1/transactions"
      : "https://app.midtrans.com/snap/v1/transactions";

    const authHeader = Buffer.from(`${store.midtrans_server_key}:`).toString(
      "base64"
    );

    const midtransRes = await fetch(snapBaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: order.order_number,
          gross_amount: Math.round(Number(order.total_amount)),
        },
        enabled_payments: ["other_qris", "gopay", "shopeepay"],
        customer_details: {
          first_name: order.customer_name || "Pelanggan Mukaro",
        },
      }),
    });

    const midtransData = await midtransRes.json();

    if (!midtransRes.ok) {
      return NextResponse.json(
        {
          error:
            midtransData?.error_messages?.[0] ||
            "Gagal membuat transaksi Midtrans QRIS.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      mode: "midtrans",
      token: midtransData.token,
      redirectUrl: midtransData.redirect_url,
      orderId: order.id,
      orderNumber: order.order_number,
      totalAmount: order.total_amount,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan pada server pembayaran.",
      },
      { status: 500 }
    );
  }
}
