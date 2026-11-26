"use client";

import React, { useMemo, useState } from "react";
import {
  X,
  Users,
  ListChecks,
  Banknote,
  QrCode,
  Plus,
  Minus,
  Printer,
  CheckCircle2,
  Loader2,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { CartItem, OrderSource, Store } from "@/types/database";
import { formatRupiah, generateOrderNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { deductOrderStock } from "@/lib/stock";

export interface SplitReceiptData {
  orderNumber: string;
  createdAt: string;
  label: string;
  tableNumber: string | null;
  orderSource: OrderSource;
  paymentMethod: string;
  items: {
    name: string;
    qty: number;
    subtotal: number;
    variants?: string;
  }[];
  subtotal: number;
  taxAmount: number;
  serviceAmount: number;
  totalAmount: number;
  note?: string;
}

interface SplitBillModalProps {
  store: Store;
  cart: (CartItem & { unitPrice: number })[];
  orderSource: OrderSource;
  customerName: string;
  tableNumber: string;
  subtotal: number;
  taxAmount: number;
  serviceAmount: number;
  grandTotal: number;
  onClose: () => void;
  onItemSplitPaid: (
    paidQuantities: Record<string, number>,
    orderNumber: string
  ) => void;
  onAllSplitCompleted: (lastOrderNumber: string) => void;
}

export function SplitBillModal({
  store,
  cart,
  orderSource,
  customerName,
  tableNumber,
  subtotal,
  taxAmount,
  serviceAmount,
  grandTotal,
  onClose,
  onItemSplitPaid,
  onAllSplitCompleted,
}: SplitBillModalProps) {
  const [mode, setMode] = useState<"item" | "equal">("item");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mode A: By-item state
  const [partIndex, setPartIndex] = useState(1);
  const [selectedQtyMap, setSelectedQtyMap] = useState<Record<string, number>>(
    {}
  );
  const [customPartLabel, setCustomPartLabel] = useState("");

  // Mode B: Equal split state
  const [splitCount, setSplitCount] = useState(2);
  const [equalPaidCount, setEqualPaidCount] = useState(0);
  const [equalPaidTotal, setEqualPaidTotal] = useState(0);

  // Active 58mm receipt preview after a split payment
  const [receipt, setReceipt] = useState<SplitReceiptData | null>(null);

  const isOjol = orderSource !== "walk_in";
  const taxPct = Number(store.tax_percent || 0);
  const servicePct = Number(store.service_percent || 0);

  // Mode A calculations
  const selectedItems = useMemo(() => {
    return cart
      .map((item) => {
        const picked = Math.min(
          item.qty,
          Math.max(0, selectedQtyMap[item.cartKey] || 0)
        );
        return { item, picked };
      })
      .filter((x) => x.picked > 0);
  }, [cart, selectedQtyMap]);

  const itemSplitSubtotal = useMemo(
    () =>
      selectedItems.reduce(
        (sum, { item, picked }) => sum + item.unitPrice * picked,
        0
      ),
    [selectedItems]
  );
  const itemSplitTax = Math.round(itemSplitSubtotal * (taxPct / 100));
  const itemSplitService = Math.round(itemSplitSubtotal * (servicePct / 100));
  const itemSplitTotal = itemSplitSubtotal + itemSplitTax + itemSplitService;

  // Mode B calculations
  const safeSplitCount = Math.max(2, Math.min(50, splitCount || 2));
  const equalRemaining = Math.max(0, grandTotal - equalPaidTotal);
  const isLastEqualPayer = equalPaidCount + 1 >= safeSplitCount;
  const currentEqualAmount = useMemo(() => {
    if (equalRemaining <= 0) return 0;
    if (isLastEqualPayer) return equalRemaining;
    const baseShare = Math.floor(grandTotal / safeSplitCount);
    return Math.min(equalRemaining, baseShare);
  }, [equalRemaining, isLastEqualPayer, grandTotal, safeSplitCount]);

  const activePayTotal = mode === "item" ? itemSplitTotal : currentEqualAmount;
  const cashReceivedNum = Number(cashReceived || 0);
  const cashChange = Math.max(0, cashReceivedNum - activePayTotal);

  const defaultPartLabel = useMemo(() => {
    const base = tableNumber.trim()
      ? `Meja ${tableNumber.trim()}`
      : customerName.trim() || "Walk-in";
    return `${base} - Bagian ${partIndex}`;
  }, [tableNumber, customerName, partIndex]);

  const updateSelectedQty = (cartKey: string, maxQty: number, next: number) => {
    const clamped = Math.max(0, Math.min(maxQty, next));
    setSelectedQtyMap((prev) => ({ ...prev, [cartKey]: clamped }));
  };

  const selectAllItems = () => {
    const next: Record<string, number> = {};
    cart.forEach((item) => {
      next[item.cartKey] = item.qty;
    });
    setSelectedQtyMap(next);
  };

  const resetSelectedItems = () => {
    setSelectedQtyMap({});
  };

  const handlePayModeA = async () => {
    if (selectedItems.length === 0 || itemSplitTotal <= 0) return;
    setSubmitting(true);
    setErrorMsg(null);

    const supabase = createClient();
    const orderNumber = generateOrderNumber();
    const effectivePayment = isOjol ? "ojol_platform" : paymentMethod;
    const label = customPartLabel.trim() || defaultPartLabel;

    try {
      const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .insert({
          store_id: store.id,
          order_number: orderNumber,
          customer_name: label,
          table_number: tableNumber.trim() || null,
          order_type: isOjol ? "ojol" : "dine_in",
          order_source: orderSource,
          payment_method: effectivePayment,
          payment_status: "paid",
          order_status: "queued",
          subtotal: itemSplitSubtotal,
          tax_amount: itemSplitTax,
          service_amount: itemSplitService,
          discount_amount: 0,
          total_amount: itemSplitTotal,
        })
        .select("*")
        .single();

      if (orderErr || !orderData) {
        throw new Error(orderErr?.message || "Gagal menyimpan pembayaran split.");
      }

      const itemsPayload = selectedItems.map(({ item, picked }) => ({
        order_id: orderData.id,
        menu_id: item.menu.id,
        menu_name: item.menu.name,
        qty: picked,
        unit_price: item.unitPrice,
        selected_variants: item.selectedVariants,
        item_notes: item.notes || null,
        subtotal: item.unitPrice * picked,
      }));

      await supabase.from("order_items").insert(itemsPayload);
      await deductOrderStock(supabase, orderData.id);

      const paidMap: Record<string, number> = {};
      selectedItems.forEach(({ item, picked }) => {
        paidMap[item.cartKey] = picked;
      });

      const remainingAfter = cart.reduce((acc, item) => {
        const rem = item.qty - (paidMap[item.cartKey] || 0);
        return acc + Math.max(0, rem);
      }, 0);

      setReceipt({
        orderNumber: orderData.order_number,
        createdAt: orderData.created_at || new Date().toISOString(),
        label,
        tableNumber: tableNumber.trim() || null,
        orderSource,
        paymentMethod: effectivePayment,
        items: selectedItems.map(({ item, picked }) => ({
          name: item.menu.name,
          qty: picked,
          subtotal: item.unitPrice * picked,
          variants:
            item.selectedVariants.length > 0
              ? item.selectedVariants.map((v) => v.optionName).join(", ")
              : undefined,
        })),
        subtotal: itemSplitSubtotal,
        taxAmount: itemSplitTax,
        serviceAmount: itemSplitService,
        totalAmount: itemSplitTotal,
        note: `Split per Item (${label})`,
      });

      onItemSplitPaid(paidMap, orderData.order_number);
      setSelectedQtyMap({});
      setCustomPartLabel("");
      setCashReceived("");
      setPartIndex((p) => p + 1);

      if (remainingAfter === 0) {
        onAllSplitCompleted(orderData.order_number);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayModeB = async () => {
    if (currentEqualAmount <= 0) return;
    setSubmitting(true);
    setErrorMsg(null);

    const supabase = createClient();
    const orderNumber = generateOrderNumber();
    const effectivePayment = isOjol ? "ojol_platform" : paymentMethod;
    const payerIdx = equalPaidCount + 1;
    const baseName = tableNumber.trim()
      ? `Meja ${tableNumber.trim()}`
      : customerName.trim() || "Walk-in";
    const label = `${baseName} (Split ${payerIdx}/${safeSplitCount})`;

    // Proportional subtotal/tax/service for clean accounting
    const ratio = grandTotal > 0 ? currentEqualAmount / grandTotal : 0;
    const splitSub = Math.round(subtotal * ratio);
    const splitTax = Math.round(taxAmount * ratio);
    const splitSvc = Math.max(0, currentEqualAmount - splitSub - splitTax);

    try {
      const isFirstPayer = equalPaidCount === 0;
      const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .insert({
          store_id: store.id,
          order_number: orderNumber,
          customer_name: label,
          table_number: tableNumber.trim() || null,
          order_type: isOjol ? "ojol" : "dine_in",
          order_source: orderSource,
          payment_method: effectivePayment,
          payment_status: "paid",
          // First split triggers kitchen queue; subsequent splits record payment without duplicating kitchen ticket
          order_status: isFirstPayer ? "queued" : "completed",
          subtotal: splitSub,
          tax_amount: splitTax,
          service_amount: splitSvc,
          discount_amount: 0,
          total_amount: currentEqualAmount,
        })
        .select("*")
        .single();

      if (orderErr || !orderData) {
        throw new Error(orderErr?.message || "Gagal mencatat pembayaran split.");
      }

      if (isFirstPayer) {
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
        await supabase.from("order_items").insert(itemsPayload);
        await deductOrderStock(supabase, orderData.id);
      }

      const nextPaidCount = equalPaidCount + 1;
      const nextPaidTotal = equalPaidTotal + currentEqualAmount;
      setEqualPaidCount(nextPaidCount);
      setEqualPaidTotal(nextPaidTotal);
      setCashReceived("");

      setReceipt({
        orderNumber: orderData.order_number,
        createdAt: orderData.created_at || new Date().toISOString(),
        label,
        tableNumber: tableNumber.trim() || null,
        orderSource,
        paymentMethod: effectivePayment,
        items: [
          {
            name: `Split Bill Rata (${payerIdx}/${safeSplitCount})`,
            qty: 1,
            subtotal: currentEqualAmount,
            variants: `Total tagihan meja: ${formatRupiah(grandTotal)}`,
          },
        ],
        subtotal: splitSub,
        taxAmount: splitTax,
        serviceAmount: splitSvc,
        totalAmount: currentEqualAmount,
        note: `Pembayaran ${payerIdx} dari ${safeSplitCount}`,
      });

      if (nextPaidTotal >= grandTotal || nextPaidCount >= safeSplitCount) {
        onAllSplitCompleted(orderData.order_number);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isEqualFinished =
    equalPaidCount >= safeSplitCount || equalRemaining <= 0;
  const isItemFinished = cart.length === 0;
  const canSwitchMode = equalPaidCount === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-3 sm:p-4"
      onClick={() => {
        if (!submitting && equalPaidCount === 0) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-[#111827] z-10">
          <div>
            <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Split Bill (Pisah Tagihan)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Total tagihan saat ini:{" "}
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {formatRupiah(grandTotal)}
              </span>
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Tutup Modal Split Bill"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Receipt Preview Screen (shown immediately after a split payment) */}
          {receipt ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 flex items-center gap-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Pembayaran <strong>{receipt.label}</strong> sebesar{" "}
                  <strong className="font-mono">
                    {formatRupiah(receipt.totalAmount)}
                  </strong>{" "}
                  berhasil dicatat!
                </span>
              </div>

              {/* 58mm Thermal Receipt */}
              <div className="flex justify-center">
                <div
                  id="thermal-receipt"
                  className="w-full max-w-xs p-3.5 border border-dashed border-neutral-300 rounded-xl font-mono text-[11px] leading-snug text-black bg-white space-y-2"
                >
                  <div className="text-center border-b border-dashed border-neutral-400 pb-2">
                    <p className="font-bold text-xs uppercase">{store.name}</p>
                    {store.tagline && (
                      <p className="text-[10px]">{store.tagline}</p>
                    )}
                    <p className="text-[10px] font-bold mt-1">
                      ** STRUK SPLIT BILL **
                    </p>
                  </div>

                  <div className="space-y-0.5 text-[10px]">
                    <p>No: {receipt.orderNumber}</p>
                    <p>
                      Tgl:{" "}
                      {new Date(receipt.createdAt).toLocaleString("id-ID")}
                    </p>
                    <p>
                      Bagian: {receipt.label}
                      {receipt.tableNumber
                        ? ` (Meja ${receipt.tableNumber})`
                        : ""}
                    </p>
                    <p>Channel: {receipt.orderSource.toUpperCase()}</p>
                  </div>

                  <div className="border-t border-b border-dashed border-neutral-400 py-2 space-y-1.5">
                    {receipt.items.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between gap-2">
                          <span>
                            {item.qty}x {item.name}
                          </span>
                          <span className="shrink-0">
                            {formatRupiah(item.subtotal)}
                          </span>
                        </div>
                        {item.variants && (
                          <p className="text-[9px] text-neutral-600 pl-2">
                            {item.variants}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatRupiah(receipt.subtotal)}</span>
                    </div>
                    {receipt.taxAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Pajak</span>
                        <span>{formatRupiah(receipt.taxAmount)}</span>
                      </div>
                    )}
                    {receipt.serviceAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Service</span>
                        <span>{formatRupiah(receipt.serviceAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-xs pt-1 border-t border-dashed border-neutral-400">
                      <span>TOTAL BAYAR</span>
                      <span>{formatRupiah(receipt.totalAmount)}</span>
                    </div>
                    <p className="pt-1">
                      Bayar: {receipt.paymentMethod.toUpperCase()} (LUNAS)
                    </p>
                  </div>

                  <p className="text-center text-[10px] pt-2 border-t border-dashed border-neutral-400">
                    Terima kasih • Powered by Mukaro
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#090D16] hover:border-[#2563EB] text-slate-900 dark:text-slate-100 text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  <Printer className="w-4 h-4 text-[#2563EB]" />
                  <span>Cetak Struk Bagian Ini</span>
                </button>

                {(mode === "item" ? isItemFinished : isEqualFinished) ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Semua Tagihan Lunas — Selesai</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReceipt(null)}
                    className="py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <span>
                      {mode === "item"
                        ? `Lanjut Bagian ${partIndex}`
                        : `Lanjut Orang ke-${equalPaidCount + 1}/${safeSplitCount}`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Mode Tabs */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#090D16] border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={!canSwitchMode}
                  onClick={() => {
                    setMode("item");
                    setCashReceived("");
                    setErrorMsg(null);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 ${
                    mode === "item"
                      ? "bg-white dark:bg-[#111827] text-[#2563EB] shadow-xs border border-slate-200/80 dark:border-slate-700"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <ListChecks className="w-4 h-4" />
                  <span>Pisah per Item</span>
                </button>
                <button
                  type="button"
                  disabled={!canSwitchMode}
                  onClick={() => {
                    setMode("equal");
                    setCashReceived("");
                    setErrorMsg(null);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 ${
                    mode === "equal"
                      ? "bg-white dark:bg-[#111827] text-[#2563EB] shadow-xs border border-slate-200/80 dark:border-slate-700"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Bagi Rata (Split Equally)</span>
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* MODE A: BY ITEM */}
              {mode === "item" ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Pilih Item untuk Bagian {partIndex}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllItems}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-[#2563EB] transition"
                      >
                        Pilih Semua
                      </button>
                      <button
                        type="button"
                        onClick={resetSelectedItems}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-rose-600 inline-flex items-center gap-1 transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    </div>
                  </div>

                  {/* Label for this split */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Label Tagihan (opsional)
                    </label>
                    <input
                      type="text"
                      value={customPartLabel}
                      onChange={(e) => setCustomPartLabel(e.target.value)}
                      placeholder={defaultPartLabel}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  {/* Item Checklist & Quantity Stepper */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {cart.map((item) => {
                      const picked = selectedQtyMap[item.cartKey] || 0;
                      const isChecked = picked > 0;
                      return (
                        <div
                          key={item.cartKey}
                          className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition ${
                            isChecked
                              ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800"
                              : "bg-slate-50 dark:bg-[#090D16] border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedQty(
                                item.cartKey,
                                item.qty,
                                isChecked ? 0 : item.qty
                              )
                            }
                            className="flex items-start gap-2.5 text-left min-w-0 flex-1"
                          >
                            <span
                              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                                isChecked
                                  ? "bg-[#2563EB] border-[#2563EB] text-white"
                                  : "bg-white dark:bg-[#111827] border-slate-300 dark:border-slate-700"
                              }`}
                            >
                              {isChecked && (
                                <span className="text-[10px] font-bold">✓</span>
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {item.menu.name}
                              </p>
                              {item.selectedVariants.length > 0 && (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {item.selectedVariants
                                    .map((v) => v.optionName)
                                    .join(", ")}
                                </p>
                              )}
                              <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                                {formatRupiah(item.unitPrice)} × {item.qty}{" "}
                                tersedia
                              </p>
                            </div>
                          </button>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedQty(
                                  item.cartKey,
                                  item.qty,
                                  picked - 1
                                )
                              }
                              className="w-7 h-7 rounded-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-[#2563EB] transition"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                              {picked}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedQty(
                                  item.cartKey,
                                  item.qty,
                                  picked + 1
                                )
                              }
                              className="w-7 h-7 rounded-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-[#2563EB] transition"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Subtotal Summary for Mode A */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Subtotal Bagian Ini</span>
                      <span className="font-mono tabular-nums">
                        {formatRupiah(itemSplitSubtotal)}
                      </span>
                    </div>
                    {itemSplitTax > 0 && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Pajak ({taxPct}%)</span>
                        <span className="font-mono tabular-nums">
                          {formatRupiah(itemSplitTax)}
                        </span>
                      </div>
                    )}
                    {itemSplitService > 0 && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Service ({servicePct}%)</span>
                        <span className="font-mono tabular-nums">
                          {formatRupiah(itemSplitService)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span>Total Bagian Ini</span>
                      <span className="font-mono tabular-nums text-[#2563EB]">
                        {formatRupiah(itemSplitTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* MODE B: SPLIT EQUALLY */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                      Bagi Rata untuk Berapa Orang?
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[2, 3, 4, 5, 6].map((n) => (
                        <button
                          key={n}
                          type="button"
                          disabled={equalPaidCount > 0}
                          onClick={() => setSplitCount(n)}
                          className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-bold transition disabled:opacity-50 ${
                            safeSplitCount === n
                              ? "bg-[#2563EB] text-white border-[#2563EB]"
                              : "bg-slate-50 dark:bg-[#090D16] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#2563EB]"
                          }`}
                        >
                          {n} Orang
                        </button>
                      ))}
                      <input
                        type="number"
                        min={2}
                        max={50}
                        disabled={equalPaidCount > 0}
                        value={splitCount}
                        onChange={(e) =>
                          setSplitCount(Math.max(2, Number(e.target.value) || 2))
                        }
                        className="w-24 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB] disabled:opacity-50"
                        placeholder="Custom"
                      />
                    </div>
                  </div>

                  {/* Progress & Breakdown Card */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span>Progress Pembayaran</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {equalPaidCount} / {safeSplitCount} Orang Lunas
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((equalPaidCount / safeSplitCount) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Total Awal
                        </p>
                        <p className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatRupiah(grandTotal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Sudah Dibayar
                        </p>
                        <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(equalPaidTotal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Sisa Tagihan
                        </p>
                        <p className="font-mono font-bold text-amber-600 dark:text-amber-400">
                          {formatRupiah(equalRemaining)}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Tagihan Orang ke-{equalPaidCount + 1}
                      </span>
                      <span className="text-base font-mono font-extrabold text-[#2563EB]">
                        {formatRupiah(currentEqualAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Method + Optional Cash Calculator */}
              {!isOjol && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        paymentMethod === "cash"
                          ? "bg-[#2563EB] text-white border-[#2563EB]"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Tunai</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("qris")}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        paymentMethod === "qris"
                          ? "bg-[#2563EB] text-white border-[#2563EB]"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>QRIS</span>
                    </button>
                  </div>

                  {paymentMethod === "cash" && activePayTotal > 0 && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Uang Diterima (Rp)
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: "Uang Pas", val: activePayTotal },
                            { label: "50rb", val: 50000 },
                            { label: "100rb", val: 100000 },
                          ].map((q) => (
                            <button
                              key={q.label}
                              type="button"
                              onClick={() => setCashReceived(String(q.val))}
                              className="px-2 py-0.5 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-[10px] font-semibold hover:border-[#2563EB] transition"
                            >
                              {q.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-sm font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
                      />
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-600 dark:text-slate-400">
                          Kembalian:
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                          {formatRupiah(cashChange)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Split Payment Button */}
              <button
                type="button"
                disabled={submitting || activePayTotal <= 0}
                onClick={mode === "item" ? handlePayModeA : handlePayModeB}
                className="w-full py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition active:scale-[0.99]"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span className="font-mono tabular-nums">
                  {mode === "item"
                    ? `Bayar Bagian ${partIndex} (${formatRupiah(itemSplitTotal)})`
                    : `Catat Pembayaran ke-${equalPaidCount + 1} (${formatRupiah(currentEqualAmount)})`}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
