"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Coffee,
  Package,
  BellRing,
  XCircle,
  MessageCircle,
  Banknote,
} from "lucide-react";
import { Order, OrderItem, Store } from "@/types/database";
import { buildWhatsAppUrl, formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

const STEPS = [
  { key: "pending_payment", label: "Menunggu Pembayaran", icon: Clock },
  { key: "queued", label: "Antrean", icon: BellRing },
  { key: "preparing", label: "Sedang Dibuat", icon: Coffee },
  { key: "packing", label: "Packing", icon: Package },
  { key: "ready", label: "Siap Diambil / Diantar", icon: CheckCircle2 },
  { key: "completed", label: "Selesai", icon: CheckCircle2 },
] as const;

export function OrderTrackingClient({
  store,
  initialOrder,
  items,
}: {
  store: Store;
  initialOrder: Order;
  items: OrderItem[];
}) {
  const [order, setOrder] = useState<Order>(initialOrder);
  const accentColor = store.accent_color || "#C8102E";

  useEffect(() => {
    const supabase = createClient();

    // Supabase Realtime subscription
    const channel = supabase
      .channel(`order-track-${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          setOrder((prev) => ({ ...prev, ...(payload.new as Partial<Order>) }));
        }
      )
      .subscribe();

    // Polling fallback every 5 seconds
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", order.id)
        .single();
      if (data) {
        setOrder(data as Order);
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [order.id]);

  const currentStepIndex = STEPS.findIndex((s) => s.key === order.order_status);
  const isCancelled = order.order_status === "cancelled";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#F8FAFC]/85 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href={`/${store.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Menu</span>
          </Link>
          <span className="text-xs font-extrabold tracking-tight text-slate-900">
            {store.name}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 space-y-5">
        {/* Big Order Number Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center space-y-3">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Nomor Pesanan Anda
          </p>
          <h1
            className="text-4xl font-extrabold tracking-tight font-mono tabular-nums"
            style={{ color: accentColor }}
          >
            {order.order_number}
          </h1>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                order.payment_status === "paid"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/25"
                  : order.payment_status === "failed"
                    ? "bg-rose-50 text-rose-700 border border-rose-200/25"
                    : "bg-rose-50 text-rose-700 border border-rose-200/25"
              }`}
            >
              {order.payment_status === "paid"
                ? "Lunas"
                : order.payment_status === "failed"
                  ? "Dibatalkan"
                  : "Bayar di Kasir"}
            </span>

            {order.table_number && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F8FAFC] border border-slate-200 text-slate-900">
                Meja {order.table_number}
              </span>
            )}
          </div>

          {/* Cash Payment Instruction */}
          {order.payment_method === "cash" &&
            order.payment_status === "pending" &&
            !isCancelled && (
              <div className="mt-3 p-3.5 rounded-2xl bg-blue-50 border border-[#2563EB] text-left flex items-start gap-3">
                <Banknote className="w-5 h-5 text-slate-900 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-900 leading-relaxed">
                  <p className="font-bold">Silakan bayar tunai di kasir</p>
                  <p>
                    Tunjukkan nomor order{" "}
                    <span className="font-bold font-mono tabular-nums">{order.order_number}</span> ke
                    kasir dalam 15 menit agar pesanan segera diproses.
                  </p>
                </div>
              </div>
            )}
        </div>

        {/* Progress Stepper */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
            Status Pesanan Live
          </h2>

          {isCancelled ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/25 flex items-start gap-3 text-rose-700">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm">Pesanan Dibatalkan</p>
                {order.void_reason && <p>{order.void_reason}</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isDone = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={step.key} className="flex items-center gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition ${
                        isDone
                          ? "text-white shadow-xs"
                          : "bg-[#F8FAFC] text-neutral-400"
                      }`}
                      style={
                        isDone ? { backgroundColor: accentColor } : undefined
                      }
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-bold ${
                          isDone ? "text-slate-900" : "text-neutral-400"
                        }`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-[11px] font-semibold text-neutral-500">
                          Status saat ini • Diperbarui otomatis
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Item Details */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
            Detail Pesanan
          </h2>

          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div>
                  <p className="font-bold text-slate-900">
                    {item.qty}x {item.menu_name}
                  </p>
                  {item.selected_variants &&
                    item.selected_variants.length > 0 && (
                      <p className="text-xs text-neutral-500">
                        {item.selected_variants
                          .map((v) => v.optionName)
                          .join(", ")}
                      </p>
                    )}
                  {item.item_notes && (
                    <p className="text-xs italic text-neutral-400">
                      &ldquo;{item.item_notes}&rdquo;
                    </p>
                  )}
                </div>
                <span className="font-bold text-slate-900 shrink-0 font-mono tabular-nums">
                  {formatRupiah(Number(item.subtotal))}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatRupiah(Number(order.subtotal))}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Diskon Voucher</span>
                <span className="font-mono tabular-nums">-{formatRupiah(Number(order.discount_amount))}</span>
              </div>
            )}
            {Number(order.tax_amount) > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Pajak Resto / PB1</span>
                <span className="font-mono tabular-nums">{formatRupiah(Number(order.tax_amount))}</span>
              </div>
            )}
            {Number(order.service_amount) > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Service Charge</span>
                <span className="font-mono tabular-nums">{formatRupiah(Number(order.service_amount))}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Total Bayar</span>
              <span className="font-mono tabular-nums">{formatRupiah(Number(order.total_amount))}</span>
            </div>
          </div>
        </div>

        {/* WhatsApp Help */}
        {store.show_wa && store.wa_number && (
          <a
            href={buildWhatsAppUrl(
              store.wa_number,
              store.name,
              order.table_number ? `Meja ${order.table_number}` : null,
              `Halo ${store.name}, saya ingin menanyakan pesanan ${order.order_number}.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-5 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Bantuan WhatsApp Kasir</span>
          </a>
        )}
      </main>
    </div>
  );
}
