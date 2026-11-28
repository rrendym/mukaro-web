"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  X,
  Minus,
  Plus,
  Trash2,
  Utensils,
  ShoppingBag,
  QrCode,
  Banknote,
  Tag,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { CartItem, PaymentMethod, Store, Voucher } from "@/types/database";
import { formatRupiah, generateOrderNumber } from "@/lib/format";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { checkStoreSubscription } from "@/lib/subscription";

interface CartDrawerProps {
  store: Store;
  cart: CartItem[];
  mejaParam?: string;
  tableLabel: string | null;
  onClose: () => void;
  onUpdateQty: (cartKey: string, delta: number) => void;
  onRemoveItem: (cartKey: string) => void;
  onClearCart: () => void;
  onOrderConfirmed: (orderSummary: {
    orderId: string;
    orderNumber: string;
    total: number;
    createdAt: string;
  }) => void;
}

export function CartDrawer({
  store,
  cart,
  mejaParam,
  tableLabel,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onOrderConfirmed,
}: CartDrawerProps) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState(mejaParam || "");
  const [orderNotes, setOrderNotes] = useState("");
  const [hybridType, setHybridType] = useState<"dine_in" | "takeaway">(
    "dine_in"
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("qris");

  // Voucher state
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  // Submission & QRIS Demo state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [qrisScreen, setQrisScreen] = useState<{
    mode: "demo" | "midtrans";
    orderId: string;
    orderNumber: string;
    totalAmount: number;
    staticQrisUrl?: string | null;
    demoQrDataUrl?: string;
    redirectUrl?: string;
  } | null>(null);
  const [confirmingDemo, setConfirmingDemo] = useState(false);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.qty,
    0
  );

  const discountAmount = appliedVoucher
    ? appliedVoucher.discount_type === "percent"
      ? Math.round(subtotal * (Number(appliedVoucher.discount_value) / 100))
      : Math.min(subtotal, Number(appliedVoucher.discount_value))
    : 0;

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(
    discountedSubtotal * (Number(store.tax_percent || 0) / 100)
  );
  const serviceAmount = Math.round(
    discountedSubtotal * (Number(store.service_percent || 0) / 100)
  );
  const grandTotal = discountedSubtotal + taxAmount + serviceAmount;

  const handleApplyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) return;
    setVoucherLoading(true);
    setVoucherError(null);

    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase belum dikonfigurasi.");
      }
      const supabase = createClient();
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("store_id", store.id)
        .eq("code", code)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        throw new Error("Kode voucher tidak ditemukan atau tidak aktif.");
      }

      const voucher = data as Voucher;
      if (subtotal < Number(voucher.min_order || 0)) {
        throw new Error(
          `Minimal belanja untuk voucher ini adalah ${formatRupiah(
            Number(voucher.min_order)
          )}.`
        );
      }

      setAppliedVoucher(voucher);
    } catch (err) {
      setAppliedVoucher(null);
      setVoucherError(
        err instanceof Error ? err.message : "Voucher tidak valid."
      );
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!customerName.trim()) {
      setSubmitError("Nama pemesan wajib diisi.");
      return;
    }

    if (store.order_mode === "table" && !tableNumber.trim()) {
      setSubmitError("Nomor meja wajib diisi.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setSubmitError("Supabase belum dikonfigurasi.");
      return;
    }

    if (!store.is_open) {
      setSubmitError("Toko sedang tutup. Pemesanan sementara dinonaktifkan.");
      return;
    }

    if (checkStoreSubscription(store).isExpired) {
      setSubmitError(
        "Menu digital outlet ini sedang tidak aktif. Silakan pesan langsung di kasir."
      );
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const orderNumber = generateOrderNumber();

    const resolvedOrderType =
      store.order_mode === "hybrid"
        ? hybridType
        : store.order_mode === "table"
          ? "dine_in"
          : "counter";

    const resolvedTableNumber =
      store.order_mode === "counter"
        ? null
        : tableNumber.trim() || null;

    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          store_id: store.id,
          order_number: orderNumber,
          customer_name: customerName.trim(),
          table_number: resolvedTableNumber,
          order_type: resolvedOrderType,
          order_source: "qr_menu",
          payment_method: paymentMethod,
          payment_status: "pending",
          order_status: "pending_payment",
          subtotal,
          tax_amount: taxAmount,
          service_amount: serviceAmount,
          discount_amount: discountAmount,
          total_amount: grandTotal,
          notes: orderNotes.trim() || null,
        })
        .select("*")
        .single();

      if (orderError || !orderData) {
        throw new Error(orderError?.message || "Gagal membuat pesanan.");
      }

      const itemsPayload = cart.map((item) => ({
        order_id: orderData.id,
        menu_id: item.menu.id,
        menu_name: item.menu.name,
        qty: item.qty,
        unit_price: item.unitPrice,
        selected_variants: item.selectedVariants,
        item_notes: item.notes || null,
        subtotal: item.unitPrice * item.qty,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsPayload);

      if (itemsError) {
        throw new Error(itemsError.message);
      }

      onOrderConfirmed({
        orderId: orderData.id,
        orderNumber: orderData.order_number,
        total: grandTotal,
        createdAt: orderData.created_at,
      });

      if (paymentMethod === "cash") {
        onClearCart();
        onClose();
        router.push(`/${store.slug}/order/${orderData.id}`);
        return;
      }

      // Payment method === 'qris'
      const qrisRes = await fetch("/api/payment/qris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderData.id }),
      });

      const qrisData = await qrisRes.json();
      if (!qrisRes.ok) {
        throw new Error(qrisData.error || "Gagal memproses pembayaran QRIS.");
      }

      let demoQrDataUrl: string | undefined;
      if (qrisData.mode === "demo" && !qrisData.staticQrisUrl) {
        demoQrDataUrl = await QRCode.toDataURL(
          `MUKARO-QRIS-DEMO:${orderData.order_number}:${grandTotal}`,
          { width: 320, margin: 2 }
        );
      }

      onClearCart();
      setQrisScreen({
        mode: qrisData.mode,
        orderId: orderData.id,
        orderNumber: orderData.order_number,
        totalAmount: grandTotal,
        staticQrisUrl: qrisData.staticQrisUrl,
        demoQrDataUrl,
        redirectUrl: qrisData.redirectUrl,
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Gagal memproses pesanan."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulateQrisPaid = async () => {
    if (!qrisScreen) return;
    setConfirmingDemo(true);
    try {
      const res = await fetch("/api/payment/demo-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: qrisScreen.orderId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Gagal mengonfirmasi QRIS.");
      }
      onClose();
      router.push(`/${store.slug}/order/${qrisScreen.orderId}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Gagal mengonfirmasi pembayaran."
      );
    } finally {
      setConfirmingDemo(false);
    }
  };

  // QRIS Payment Screen
  if (qrisScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[2px] p-0 sm:p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 p-6 text-center space-y-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#F8FAFC] border border-slate-200 text-slate-900 font-mono tabular-nums">
              {qrisScreen.orderNumber}
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push(`/${store.slug}/order/${qrisScreen.orderId}`);
              }}
              className="w-8 h-8 rounded-full bg-[#F8FAFC] flex items-center justify-center text-neutral-600 hover:bg-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
              Pembayaran QRIS
            </h3>
            <p className="text-2xl font-extrabold mt-1 font-mono tabular-nums" style={{ color: store.accent_color }}>
              {formatRupiah(qrisScreen.totalAmount)}
            </p>
          </div>

          {qrisScreen.mode === "midtrans" && qrisScreen.redirectUrl ? (
            <div className="space-y-3 py-2">
              <p className="text-xs text-neutral-500">
                Silakan selesaikan pembayaran QRIS melalui halaman aman Midtrans.
              </p>
              <a
                href={qrisScreen.redirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-full text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md"
                style={{ backgroundColor: store.accent_color }}
              >
                <span>Buka Pembayaran Midtrans</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/${store.slug}/order/${qrisScreen.orderId}`);
                }}
                className="w-full py-2.5 rounded-full border border-slate-200 text-xs font-bold text-slate-900"
              >
                Cek Status Pesanan
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 inline-block mx-auto">
                {qrisScreen.staticQrisUrl ? (
                  <img
                    src={qrisScreen.staticQrisUrl}
                    alt="QRIS Statis Toko"
                    className="w-56 h-56 object-contain mx-auto rounded-xl"
                  />
                ) : qrisScreen.demoQrDataUrl ? (
                  <img
                    src={qrisScreen.demoQrDataUrl}
                    alt="QRIS Demo"
                    className="w-52 h-52 object-contain mx-auto rounded-xl"
                  />
                ) : null}
              </div>

              <p className="text-xs text-neutral-500">
                {qrisScreen.staticQrisUrl
                  ? "Scan QRIS toko di atas, lalu konfirmasi pembayaran."
                  : "Mode Demo aktif (Midtrans Server Key belum diisi)."}
              </p>

              {submitError && (
                <p className="text-xs text-rose-700 font-semibold">{submitError}</p>
              )}

              <button
                type="button"
                disabled={confirmingDemo}
                onClick={handleSimulateQrisPaid}
                className="w-full py-3.5 px-4 rounded-full text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-60 transition active:scale-[0.98]"
                style={{ backgroundColor: store.accent_color }}
              >
                {confirmingDemo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Simulasi Bayar QRIS Lunas (Demo Mode)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#111827] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Ringkasan Pesanan
            </h2>
            <p className="text-xs text-neutral-500 dark:text-slate-400 font-mono tabular-nums">
              {tableLabel ? tableLabel : "Order Counter"} • {cart.length} item
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F8FAFC] dark:bg-[#090D16] flex items-center justify-center text-neutral-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form
          id="checkout-form"
          onSubmit={handleCheckout}
          className="flex-1 overflow-y-auto p-5 space-y-4"
        >
          {cart.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-sm">
              Keranjang masih kosong. Yuk pilih menu favoritmu!
            </div>
          ) : (
            <>
              {/* Hybrid mode selector */}
              {store.order_mode === "hybrid" && (
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#F8FAFC] border border-slate-200 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setHybridType("dine_in")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      hybridType === "dine_in"
                        ? "bg-[#2563EB] text-white"
                        : "text-neutral-600"
                    }`}
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    Makan di Sini
                  </button>
                  <button
                    type="button"
                    onClick={() => setHybridType("takeaway")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      hybridType === "takeaway"
                        ? "bg-[#2563EB] text-white"
                        : "text-neutral-600"
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Bungkus (Takeaway)
                  </button>
                </div>
              )}

              {/* Cart Items */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.cartKey}
                    className="flex items-start justify-between gap-3 p-3 rounded-2xl border border-slate-200 bg-[#F8FAFC]/70"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {item.menu.name}
                      </h4>
                      {item.selectedVariants.length > 0 && (
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {item.selectedVariants
                            .map((v) => v.optionName)
                            .join(", ")}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs italic text-neutral-500 mt-0.5">
                          &ldquo;{item.notes}&rdquo;
                        </p>
                      )}
                      <p className="text-xs font-bold text-slate-900 mt-1.5 font-mono tabular-nums">
                        {formatRupiah(item.unitPrice * item.qty)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.cartKey)}
                        className="w-7 h-7 rounded-full text-neutral-400 hover:text-rose-700 flex items-center justify-center transition"
                        aria-label="Hapus item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-1.5 py-0.5">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.cartKey, -1)}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-slate-900"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-4 text-center font-mono tabular-nums">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.cartKey, 1)}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-slate-900"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer Info */}
              <div className="space-y-2.5 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Nama Pemesan *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Masukkan nama Anda"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB] transition"
                  />
                </div>

                {store.order_mode !== "counter" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">
                      Nomor Meja {store.order_mode === "table" ? "*" : "(Opsional)"}
                    </label>
                    <input
                      type="text"
                      required={store.order_mode === "table"}
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="Contoh: 04"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB] transition"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Catatan Pesanan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Catatan tambahan untuk dapur/kasir..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB] transition"
                  />
                </div>
              </div>

              {/* Voucher Promo */}
              <div className="pt-1 space-y-1.5">
                <label className="block text-xs font-bold text-slate-900">
                  Kode Voucher Promo
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={(e) =>
                        setVoucherCode(e.target.value.toUpperCase())
                      }
                      placeholder="Masukkan kode voucher"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-bold uppercase focus:outline-none focus:border-[#2563EB] transition"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={voucherLoading || !voucherCode.trim()}
                    onClick={handleApplyVoucher}
                    className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 transition"
                  >
                    {voucherLoading ? "..." : "Gunakan"}
                  </button>
                </div>
                {voucherError && (
                  <p className="text-[11px] text-rose-700 font-medium">
                    {voucherError}
                  </p>
                )}
                {appliedVoucher && (
                  <div className="flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg font-semibold font-mono tabular-nums">
                    <span>
                      Voucher {appliedVoucher.code} aktif (-
                      {formatRupiah(discountAmount)})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedVoucher(null);
                        setVoucherCode("");
                      }}
                      className="underline"
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-900">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("qris")}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition ${
                      paymentMethod === "qris"
                        ? "border-[#2563EB] bg-[#F8FAFC]"
                        : "border-slate-200 hover:border-[#2563EB]/40"
                    }`}
                  >
                    <QrCode className="w-5 h-5 shrink-0" style={{ color: store.accent_color }} />
                    <div>
                      <p className="text-xs font-bold text-slate-900">QRIS</p>
                      <p className="text-[10px] text-neutral-500">
                        Bayar instan
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition ${
                      paymentMethod === "cash"
                        ? "border-[#2563EB] bg-[#F8FAFC]"
                        : "border-slate-200 hover:border-[#2563EB]/40"
                    }`}
                  >
                    <Banknote className="w-5 h-5 text-emerald-700 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Tunai di Kasir
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        Maks. 15 menit
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-slate-200 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">{formatRupiah(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Diskon Voucher</span>
                    <span className="font-mono tabular-nums">-{formatRupiah(discountAmount)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>Pajak Resto / PB1 ({store.tax_percent}%)</span>
                    <span className="font-mono tabular-nums">{formatRupiah(taxAmount)}</span>
                  </div>
                )}
                {serviceAmount > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>Service Charge ({store.service_percent}%)</span>
                    <span className="font-mono tabular-nums">{formatRupiah(serviceAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-base text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>Total Akhir</span>
                  <span className="font-mono tabular-nums">{formatRupiah(grandTotal)}</span>
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/20 text-xs text-rose-700 font-medium">
                  {submitError}
                </div>
              )}
            </>
          )}
        </form>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shrink-0 space-y-2">
            {!store.is_open && (
              <p className="text-center text-xs font-bold text-rose-600 dark:text-rose-400">
                Toko sedang tutup. Checkout dinonaktifkan sementara.
              </p>
            )}
            <button
              type="submit"
              form="checkout-form"
              disabled={submitting || !store.is_open}
              className="w-full py-3.5 px-5 rounded-full text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: store.accent_color }}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span className="font-mono tabular-nums">
                {!store.is_open
                  ? "Toko Sedang Tutup"
                  : paymentMethod === "qris"
                    ? `Bayar QRIS • ${formatRupiah(grandTotal)}`
                    : `Pesan & Bayar di Kasir • ${formatRupiah(grandTotal)}`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
