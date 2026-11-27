"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BellRing,
  Volume2,
  Monitor,
  Printer,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
} from "lucide-react";
import { Order, OrderStatus, Store } from "@/types/database";
import { formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { deductOrderStock, restoreOrderStock } from "@/lib/stock";

function playDingSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Two-tone pleasant bell chime
    const playTone = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + startOffset);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + startOffset + duration
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + duration);
    };

    playTone(880, 0, 0.35);
    playTone(1174.66, 0.14, 0.55);
  } catch {
    // Ignore autoplay restriction errors
  }
}

type OrderTab = "pending_cash" | "active" | "ready" | "history";

export function LiveOrdersClient({
  store,
  initialOrders,
}: {
  store: Store;
  initialOrders: Order[];
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<OrderTab>("active");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  // Void Modal
  const [voidOrder, setVoidOrder] = useState<Order | null>(null);
  const [voidPin, setVoidPin] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Print Receipt Modal
  const [printOrder, setPrintOrder] = useState<Order | null>(null);

  // Realtime subscription for orders
  useEffect(() => {
    const supabase = createClient();

    const fetchOrderWithItems = async (orderId: string) => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .single();
      return data as Order | null;
    };

    const channel = supabase
      .channel(`store-orders-${store.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${store.id}`,
        },
        async (payload) => {
          const newOrder = payload.new as Order;
          const full = await fetchOrderWithItems(newOrder.id);
          if (full) {
            setOrders((prev) => {
              if (prev.some((o) => o.id === full.id)) return prev;
              return [full, ...prev];
            });
            if (
              soundEnabled &&
              (full.payment_status === "paid" || full.payment_method === "cash")
            ) {
              playDingSound();
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${store.id}`,
        },
        async (payload) => {
          const updated = payload.new as Order;
          const full = await fetchOrderWithItems(updated.id);
          if (full) {
            setOrders((prev) => {
              const prevOrder = prev.find((o) => o.id === full.id);
              if (
                soundEnabled &&
                prevOrder &&
                prevOrder.payment_status !== "paid" &&
                full.payment_status === "paid"
              ) {
                playDingSound();
              }
              return prev.map((o) => (o.id === full.id ? full : o));
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store.id, soundEnabled]);

  const toggleWakeLock = async () => {
    if (wakeLockActive && wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setWakeLockActive(false);
      return;
    }

    try {
      const nav = navigator as unknown as {
        wakeLock?: {
          request: (type: "screen") => Promise<{ release: () => Promise<void> }>;
        };
      };
      if (nav.wakeLock) {
        wakeLockRef.current = await nav.wakeLock.request("screen");
        setWakeLockActive(true);
      } else {
        alert("Browser Anda tidak mendukung Screen Wake Lock API.");
      }
    } catch {
      setWakeLockActive(false);
    }
  };

  const categorized = useMemo(() => {
    const pendingCash = orders.filter(
      (o) =>
        o.payment_method === "cash" &&
        o.payment_status === "pending" &&
        o.order_status === "pending_payment"
    );
    const active = orders.filter((o) =>
      ["queued", "preparing", "packing"].includes(o.order_status)
    );
    const ready = orders.filter((o) => o.order_status === "ready");
    const history = orders.filter((o) =>
      ["completed", "cancelled"].includes(o.order_status)
    );
    return { pendingCash, active, ready, history };
  }, [orders]);

  const currentList =
    activeTab === "pending_cash"
      ? categorized.pendingCash
      : activeTab === "active"
        ? categorized.active
        : activeTab === "ready"
          ? categorized.ready
          : categorized.history;

  const handleAcceptCash = async (order: Order) => {
    setProcessingId(order.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: "paid", order_status: "queued" })
      .eq("id", order.id);

    if (!error) {
      await deductOrderStock(supabase, order.id);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, payment_status: "paid", order_status: "queued" }
            : o
        )
      );
    }
    setProcessingId(null);
  };

  const handleUpdateStatus = async (order: Order, nextStatus: OrderStatus) => {
    setProcessingId(order.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .update({ order_status: nextStatus })
      .eq("id", order.id);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, order_status: nextStatus } : o
        )
      );
    }
    setProcessingId(null);
  };

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidOrder) return;
    setVoidError(null);

    if (voidPin.trim() !== (store.staff_pin || "1234")) {
      setVoidError("PIN Staf salah.");
      return;
    }
    if (!voidReason.trim()) {
      setVoidError("Alasan pembatalan wajib diisi.");
      return;
    }

    setProcessingId(voidOrder.id);
    const supabase = createClient();
    const wasPaid = voidOrder.payment_status === "paid";

    const { error } = await supabase
      .from("orders")
      .update({
        order_status: "cancelled",
        payment_status: wasPaid ? "refunded" : "failed",
        void_reason: voidReason.trim(),
      })
      .eq("id", voidOrder.id);

    if (!error) {
      if (wasPaid) {
        await restoreOrderStock(supabase, voidOrder.id);
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === voidOrder.id
            ? {
                ...o,
                order_status: "cancelled",
                payment_status: wasPaid ? "refunded" : "failed",
                void_reason: voidReason.trim(),
              }
            : o
        )
      );
      setVoidOrder(null);
      setVoidPin("");
      setVoidReason("");
    } else {
      setVoidError(error.message);
    }
    setProcessingId(null);
  };

  const nextActionFor = (
    status: string
  ): { label: string; next: OrderStatus } | null => {
    if (status === "queued") return { label: "Mulai Buat", next: "preparing" };
    if (status === "preparing") return { label: "Packing", next: "packing" };
    if (status === "packing") return { label: "Siap", next: "ready" };
    if (status === "ready") return { label: "Selesai", next: "completed" };
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BellRing className="w-6 h-6 text-[#2563EB]" />
            <span>Pesanan Live &amp; Dapur</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pantau pesanan masuk secara real-time, proses dapur, dan cetak struk 58mm.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playDingSound();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
              soundEnabled
                ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 text-emerald-700"
                : "bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Suara: {soundEnabled ? "Aktif" : "Mati"}</span>
          </button>

          <button
            type="button"
            onClick={toggleWakeLock}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
              wakeLockActive
                ? "bg-[#2563EB] border-[#2563EB] text-white"
                : "bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>
              {wakeLockActive ? "Layar Menyala (ON)" : "Jaga Layar Menyala"}
            </span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          {
            key: "pending_cash" as OrderTab,
            label: `Menunggu Bayar (${categorized.pendingCash.length})`,
          },
          {
            key: "active" as OrderTab,
            label: `Antrean & Diproses (${categorized.active.length})`,
          },
          {
            key: "ready" as OrderTab,
            label: `Siap Diambil (${categorized.ready.length})`,
          },
          {
            key: "history" as OrderTab,
            label: `Riwayat (${categorized.history.length})`,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === tab.key
                ? "bg-[#2563EB] text-white"
                : "bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      {currentList.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
          Tidak ada pesanan pada tab ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentList.map((order) => {
            const nextAction = nextActionFor(order.order_status);
            const isPendingCash =
              order.payment_method === "cash" &&
              order.payment_status === "pending" &&
              order.order_status === "pending_payment";
            const canVoid = !["completed", "cancelled"].includes(
              order.order_status
            );

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-hidden"
              >
                {/* Card header strip */}
                <div className="bg-[#0F172A] text-white px-4 py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-bold tabular-nums tracking-tight">
                      {order.order_number}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold uppercase">
                      {order.order_source}
                    </span>
                    {order.table_number && (
                      <span className="px-2 py-0.5 rounded-full bg-[#2563EB] text-white text-[10px] font-bold">
                        Meja {order.table_number}
                      </span>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                      order.payment_status === "paid"
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700"
                        : order.payment_status === "pending"
                          ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700"
                          : "bg-white/10 text-white/80"
                    }`}
                  >
                    {order.payment_status === "paid"
                      ? "LUNAS"
                      : order.payment_status === "pending"
                        ? "BELUM BAYAR"
                        : order.payment_status.toUpperCase()}
                  </span>
                </div>

                <div className="p-4 space-y-3 flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {order.customer_name || "Pelanggan"} •{" "}
                    {new Date(order.created_at).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                  {/* Items */}
                  <div className="border-t border-b border-slate-200 dark:border-slate-800 py-3 space-y-2">
                    {(order.order_items || []).map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {item.qty}x {item.menu_name}
                          </span>
                          {item.selected_variants &&
                            item.selected_variants.length > 0 && (
                              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                                {item.selected_variants
                                  .map((v) => v.optionName)
                                  .join(", ")}
                              </p>
                            )}
                          {item.item_notes && (
                            <p className="italic text-slate-400 text-[11px]">
                              &ldquo;{item.item_notes}&rdquo;
                            </p>
                          )}
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0 font-mono tabular-nums">
                          {formatRupiah(Number(item.subtotal))}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <p className="text-xs bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-100 dark:border-slate-800/80 p-2.5 rounded-xl text-slate-700 dark:text-slate-300">
                      <span className="font-bold">Catatan:</span> {order.notes}
                    </p>
                  )}

                  {order.void_reason && (
                    <p className="text-xs bg-rose-50 dark:bg-rose-950/50 p-2.5 rounded-xl text-rose-700">
                      <span className="font-bold">Alasan Batal:</span>{" "}
                      {order.void_reason}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-slate-100">
                    <span>Total ({order.payment_method || "-"})</span>
                    <span className="font-mono tabular-nums">{formatRupiah(Number(order.total_amount))}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
                  {isPendingCash && (
                    <button
                      type="button"
                      disabled={processingId === order.id}
                      onClick={() => handleAcceptCash(order)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Terima Tunai &amp; Proses</span>
                    </button>
                  )}

                  {nextAction && (
                    <button
                      type="button"
                      disabled={processingId === order.id}
                      onClick={() => handleUpdateStatus(order, nextAction.next)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold disabled:opacity-60 transition"
                    >
                      {nextAction.label}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPrintOrder(order)}
                    className="py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-[#F8FAFC] dark:bg-[#090D16] flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak</span>
                  </button>

                  {canVoid && (
                    <button
                      type="button"
                      onClick={() => {
                        setVoidOrder(order);
                        setVoidPin("");
                        setVoidReason("");
                        setVoidError(null);
                      }}
                      className="py-2.5 px-3.5 rounded-xl border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:bg-rose-950/50 flex items-center gap-1 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Void</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Void Order Modal */}
      {voidOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
          onClick={() => setVoidOrder(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E4DF] p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold tracking-tight text-[#141413]">
                Batalkan / Void {voidOrder.order_number}
              </h3>
              <button
                type="button"
                onClick={() => setVoidOrder(null)}
                className="w-8 h-8 rounded-full bg-[#F7F6F2] flex items-center justify-center hover:bg-[#E6E4DF] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {voidError && (
              <p className="text-xs text-[#D94E34] font-semibold bg-[#FCE4F0] p-2.5 rounded-xl">
                {voidError}
              </p>
            )}

            <form onSubmit={handleConfirmVoid} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#141413] mb-1">
                  PIN Staf *
                </label>
                <input
                  type="password"
                  required
                  value={voidPin}
                  onChange={(e) => setVoidPin(e.target.value)}
                  placeholder="Masukkan PIN staf"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E4DF] text-sm focus:outline-none focus:border-[#141413] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141413] mb-1">
                  Alasan Pembatalan *
                </label>
                <input
                  type="text"
                  required
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Contoh: Salah input / Stok habis"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E4DF] text-sm focus:outline-none focus:border-[#141413] transition"
                />
              </div>
              <button
                type="submit"
                disabled={processingId === voidOrder.id}
                className="w-full py-3 rounded-xl bg-[#D94E34] text-white text-xs font-extrabold hover:bg-[#c44430] flex items-center justify-center gap-2 transition"
              >
                {processingId === voidOrder.id && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Konfirmasi Void Order</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Receipt 58mm Preview & Print Modal */}
      {printOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
          onClick={() => setPrintOrder(null)}
        >
          <div
            className="w-full max-w-xs bg-white dark:bg-[#111827] rounded-2xl border border-[#E6E4DF] p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold tracking-tight text-[#141413]">
                Pratinjau Struk 58mm
              </h3>
              <button
                type="button"
                onClick={() => setPrintOrder(null)}
                className="w-7 h-7 rounded-full bg-[#F7F6F2] flex items-center justify-center hover:bg-[#E6E4DF] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              id="thermal-receipt"
              className="p-3 border border-dashed border-neutral-300 rounded-xl font-mono text-[11px] leading-snug text-black bg-white dark:bg-[#111827] space-y-2"
            >
              <div className="text-center border-b border-dashed border-neutral-400 pb-2">
                <p className="font-bold text-xs uppercase">{store.name}</p>
                {store.tagline && <p className="text-[10px]">{store.tagline}</p>}
              </div>

              <div className="space-y-0.5 text-[10px]">
                <p>No: {printOrder.order_number}</p>
                <p>
                  Tgl:{" "}
                  {new Date(printOrder.created_at).toLocaleString("id-ID")}
                </p>
                <p>
                  Kasir: {printOrder.cashier_name || store.active_staff_name || "-"}
                </p>
                <p>
                  Pemesan: {printOrder.customer_name || "-"}{" "}
                  {printOrder.table_number
                    ? `(Meja ${printOrder.table_number})`
                    : ""}
                </p>
                <p>Channel: {printOrder.order_source}</p>
              </div>

              <div className="border-t border-b border-dashed border-neutral-400 py-2 space-y-1.5">
                {(printOrder.order_items || []).map((item) => (
                  <div key={item.id}>
                    <div className="flex justify-between">
                      <span>
                        {item.qty}x {item.menu_name}
                      </span>
                      <span>{formatRupiah(Number(item.subtotal))}</span>
                    </div>
                    {item.selected_variants &&
                      item.selected_variants.length > 0 && (
                        <p className="text-[9px] text-neutral-600 pl-2">
                          +{" "}
                          {item.selected_variants
                            .map((v) => v.optionName)
                            .join(", ")}
                        </p>
                      )}
                  </div>
                ))}
              </div>

              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatRupiah(Number(printOrder.subtotal))}</span>
                </div>
                {Number(printOrder.discount_amount) > 0 && (
                  <div className="flex justify-between">
                    <span>Diskon</span>
                    <span>
                      -{formatRupiah(Number(printOrder.discount_amount))}
                    </span>
                  </div>
                )}
                {Number(printOrder.tax_amount) > 0 && (
                  <div className="flex justify-between">
                    <span>Pajak</span>
                    <span>{formatRupiah(Number(printOrder.tax_amount))}</span>
                  </div>
                )}
                {Number(printOrder.service_amount) > 0 && (
                  <div className="flex justify-between">
                    <span>Service</span>
                    <span>
                      {formatRupiah(Number(printOrder.service_amount))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-dashed border-neutral-400">
                  <span>TOTAL</span>
                  <span>{formatRupiah(Number(printOrder.total_amount))}</span>
                </div>
                <p className="pt-1">
                  Bayar: {(printOrder.payment_method || "-").toUpperCase()} (
                  {printOrder.payment_status.toUpperCase()})
                </p>
              </div>

              <p className="text-center text-[10px] pt-2 border-t border-dashed border-neutral-400">
                Terima kasih • Powered by Mukaro
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
