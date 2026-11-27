"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

  // Repeating order alarm + autoplay detection
  const [alarmMuted, setAlarmMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const ringCountRef = useRef(0);

  const tryPlayAlarm = async (): Promise<boolean> => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return false;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        await ctx.resume().catch(() => {});
      }
      if (ctx.state === "suspended") {
        setAutoplayBlocked(true);
        return false;
      }
      setAutoplayBlocked(false);
      playDingSound();
      return true;
    } catch {
      setAutoplayBlocked(true);
      return false;
    }
  };

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

  const unacknowledgedCount = useMemo(
    () =>
      categorized.pendingCash.length +
      categorized.active.filter((o) => o.order_status === "queued").length,
    [categorized]
  );

  // Repeating alarm while there are queued / pending_cash orders
  useEffect(() => {
    if (!soundEnabled || alarmMuted || unacknowledgedCount === 0) {
      ringCountRef.current = 0;
      return;
    }

    const interval = setInterval(() => {
      if (ringCountRef.current >= 24) {
        clearInterval(interval);
        return;
      }
      ringCountRef.current += 1;
      void tryPlayAlarm();
    }, 4500);

    return () => clearInterval(interval);
  }, [soundEnabled, alarmMuted, unacknowledgedCount]);

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

    const expectedPin = (
      store.supervisor_pin ||
      store.staff_pin ||
      "1234"
    ).trim();
    if (voidPin.trim() !== expectedPin) {
      setVoidError("PIN Supervisor salah. Pembatalan ditolak.");
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
          {unacknowledgedCount > 0 && soundEnabled && (
            <button
              type="button"
              onClick={() => setAlarmMuted((m) => !m)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition ${
                alarmMuted
                  ? "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300"
                  : "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 animate-pulse"
              }`}
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>
                {alarmMuted
                  ? "Alarm Dijeda"
                  : `Order Baru (${unacknowledgedCount}) • Hentikan Alarm`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              setAlarmMuted(false);
              if (next) void tryPlayAlarm();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
              soundEnabled
                ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300"
                : "bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>
              {autoplayBlocked
                ? "Klik untuk Aktifkan Suara"
                : `Suara: ${soundEnabled ? "Aktif" : "Mati"}`}
            </span>
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
                : "bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
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
                    className="py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-[#F8FAFC] dark:hover:bg-[#090D16] flex items-center gap-1.5 transition"
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
                      className="py-2.5 px-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-1 transition"
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
            className="w-full max-w-sm bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Batalkan / Void {voidOrder.order_number}
              </h3>
              <button
                type="button"
                onClick={() => setVoidOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {voidError && (
              <p className="text-xs text-rose-700 dark:text-rose-300 font-semibold bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-2.5 rounded-xl">
                {voidError}
              </p>
            )}

            <form onSubmit={handleConfirmVoid} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                  PIN Supervisor *
                </label>
                <input
                  type="password"
                  required
                  value={voidPin}
                  onChange={(e) => setVoidPin(e.target.value)}
                  placeholder="Masukkan PIN Supervisor"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090D16] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Alasan Pembatalan *
                </label>
                <input
                  type="text"
                  required
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Contoh: Salah input / Stok habis"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090D16] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB] transition"
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
        <ThermalReceiptPortal
          store={store}
          printOrder={printOrder}
          onClose={() => setPrintOrder(null)}
        />
      )}
    </div>
  );
}

function ThermalReceiptPortal({
  store,
  printOrder,
  onClose,
}: {
  store: Store;
  printOrder: Order;
  onClose: () => void;
}) {
  const [paperSize, setPaperSize] = useState<"58mm" | "80mm" | "A4">("58mm");

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const pageSizeRule =
    paperSize === "58mm"
      ? "58mm auto"
      : paperSize === "80mm"
        ? "80mm auto"
        : "A4";
  const pageMargin = paperSize === "A4" ? "12mm" : "2mm";
  const paperWidthClass =
    paperSize === "58mm"
      ? "max-w-[230px]"
      : paperSize === "80mm"
        ? "max-w-[310px]"
        : "max-w-full";

  return createPortal(
    <div
      id="thermal-receipt-portal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau Struk"
    >
      <style media="print">{`
        @page { size: ${pageSizeRule}; margin: ${pageMargin}; }
        #thermal-receipt-portal {
          position: static !important;
          display: block !important;
          background: #ffffff !important;
          padding: 0 !important;
        }
        #thermal-receipt-dialog {
          position: static !important;
          max-height: none !important;
          overflow: visible !important;
          border: none !important;
          box-shadow: none !important;
          background: #ffffff !important;
          width: 100% !important;
          max-width: ${paperSize === "A4" ? "100%" : paperSize} !important;
        }
        #thermal-receipt-scroll {
          max-height: none !important;
          overflow: visible !important;
          padding: 0 !important;
        }
      `}</style>
      <div
        id="thermal-receipt-dialog"
        className="w-full max-w-md bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 max-h-[88vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 no-print">
          <h3 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Pratinjau Resi ({paperSize})
          </h3>
          <div className="flex items-center gap-2">
            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {(["58mm", "80mm", "A4"] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setPaperSize(sz)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${
                    paperSize === sz
                      ? "bg-[#2563EB] text-white"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pratinjau resi"
              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          id="thermal-receipt-scroll"
          className="flex-1 min-h-0 max-h-[85vh] overflow-y-auto px-5 py-4"
        >
          <div
            id="thermal-receipt"
            className={`mx-auto w-full ${paperWidthClass} p-3.5 border border-dashed border-slate-300 rounded-xl font-mono text-[11px] leading-snug text-slate-950 bg-white space-y-2`}
          >
            <div className="text-center border-b border-dashed border-slate-400 pb-2">
              {store.company_name && (
                <p className="text-[9px] font-semibold uppercase text-slate-700">
                  {store.company_name}
                </p>
              )}
              <p className="font-bold text-xs uppercase text-slate-950">
                {store.name}
              </p>
              {store.tagline && (
                <p className="text-[10px] text-slate-700">{store.tagline}</p>
              )}
              {store.npwp && (
                <p className="text-[9px] text-slate-600">NPWP: {store.npwp}</p>
              )}
            </div>

            <div className="space-y-0.5 text-[10px] text-slate-900">
              <p>No: {printOrder.order_number}</p>
              <p>
                Tgl: {new Date(printOrder.created_at).toLocaleString("id-ID")}
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

            <div className="border-t border-b border-dashed border-slate-400 py-2 space-y-1.5 text-slate-950">
              {(printOrder.order_items || []).map((item) => (
                <div key={item.id}>
                  <div className="flex justify-between gap-2">
                    <span>
                      {item.qty}x {item.menu_name}
                    </span>
                    <span className="shrink-0">
                      {formatRupiah(Number(item.subtotal))}
                    </span>
                  </div>
                  {item.selected_variants &&
                    item.selected_variants.length > 0 && (
                      <p className="text-[9px] text-slate-600 pl-2">
                        +{" "}
                        {item.selected_variants
                          .map((v) => v.optionName)
                          .join(", ")}
                      </p>
                    )}
                </div>
              ))}
            </div>

            <div className="space-y-0.5 text-[10px] text-slate-900">
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
                  <span>{formatRupiah(Number(printOrder.service_amount))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs text-slate-950 pt-1 border-t border-dashed border-slate-400">
                <span>TOTAL</span>
                <span>{formatRupiah(Number(printOrder.total_amount))}</span>
              </div>
              <p className="pt-1 text-slate-900">
                Bayar: {(printOrder.payment_method || "-").toUpperCase()} (
                {printOrder.payment_status.toUpperCase()})
              </p>
            </div>

            <p className="text-center text-[10px] text-slate-700 pt-2 border-t border-dashed border-slate-400">
              Terima kasih • Powered by Mukaro
            </p>
          </div>
        </div>

        <div className="px-5 pb-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Sekarang</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
