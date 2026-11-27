"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  TicketPercent,
  Megaphone,
  Clock,
  Pencil,
  X,
} from "lucide-react";
import { Store, Voucher } from "@/types/database";
import { formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function formatValidityWindow(v: Voucher): string | null {
  if (!v.valid_from && !v.valid_until) return null;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  if (v.valid_from && v.valid_until) {
    return `${fmt(v.valid_from)} – ${fmt(v.valid_until)}`;
  }
  if (v.valid_from) return `Mulai ${fmt(v.valid_from)}`;
  return `Sampai ${fmt(v.valid_until!)}`;
}

export function VouchersManagerClient({
  store,
  initialVouchers,
}: {
  store: Store;
  initialVouchers: Voucher[];
}) {
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    "percent"
  );
  const [discountValue, setDiscountValue] = useState("10");
  const [minOrder, setMinOrder] = useState("0");
  const [showInCustomerBar, setShowInCustomerBar] = useState(false);
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setCode("");
    setDiscountType("percent");
    setDiscountValue("10");
    setMinOrder("0");
    setShowInCustomerBar(false);
    setValidFrom("");
    setValidUntil("");
    setErrorMsg(null);
  };

  const startEdit = (v: Voucher) => {
    setEditingId(v.id);
    setCode(v.code);
    setDiscountType(v.discount_type);
    setDiscountValue(String(v.discount_value));
    setMinOrder(String(v.min_order ?? 0));
    setShowInCustomerBar(Boolean(v.show_in_customer_bar));
    setValidFrom(toDatetimeLocal(v.valid_from));
    setValidUntil(toDatetimeLocal(v.valid_until));
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    const supabase = createClient();

    const basePayload = {
      store_id: store.id,
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: Number(discountValue || 0),
      min_order: Number(minOrder || 0),
    };

    const extendedPayload = {
      ...basePayload,
      show_in_customer_bar: showInCustomerBar,
      valid_from: validFrom ? new Date(validFrom).toISOString() : null,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
    };

    try {
      if (editingId) {
        let { data, error } = await supabase
          .from("vouchers")
          .update(extendedPayload)
          .eq("id", editingId)
          .select("*")
          .single();

        if (
          error &&
          (error.message.includes("show_in_customer_bar") ||
            error.message.includes("valid_from") ||
            error.message.includes("valid_until"))
        ) {
          const retry = await supabase
            .from("vouchers")
            .update(basePayload)
            .eq("id", editingId)
            .select("*")
            .single();
          data = retry.data;
          error = retry.error;
        }

        if (error) throw error;
        if (data) {
          setVouchers((prev) =>
            prev.map((item) => (item.id === editingId ? (data as Voucher) : item))
          );
        }
      } else {
        let { data, error } = await supabase
          .from("vouchers")
          .insert({ ...extendedPayload, is_active: true })
          .select("*")
          .single();

        if (
          error &&
          (error.message.includes("show_in_customer_bar") ||
            error.message.includes("valid_from") ||
            error.message.includes("valid_until"))
        ) {
          const retry = await supabase
            .from("vouchers")
            .insert({ ...basePayload, is_active: true })
            .select("*")
            .single();
          data = retry.data;
          error = retry.error;
        }

        if (error) throw error;
        if (data) {
          setVouchers((prev) => [data as Voucher, ...prev]);
        }
      }
      resetForm();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menyimpan voucher."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (v: Voucher) => {
    const next = !v.is_active;
    setVouchers((prev) =>
      prev.map((item) => (item.id === v.id ? { ...item, is_active: next } : item))
    );
    const supabase = createClient();
    await supabase
      .from("vouchers")
      .update({ is_active: next })
      .eq("id", v.id);
  };

  const handleToggleRunningBar = async (v: Voucher) => {
    const next = !v.show_in_customer_bar;
    setVouchers((prev) =>
      prev.map((item) =>
        item.id === v.id ? { ...item, show_in_customer_bar: next } : item
      )
    );
    const supabase = createClient();
    const { error } = await supabase
      .from("vouchers")
      .update({ show_in_customer_bar: next })
      .eq("id", v.id);

    if (error) {
      setVouchers((prev) =>
        prev.map((item) =>
          item.id === v.id ? { ...item, show_in_customer_bar: !next } : item
        )
      );
      setErrorMsg(
        "Kolom show_in_customer_bar belum dimigrasi. Jalankan supabase_operational_updates.sql di Supabase."
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus voucher ini?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("vouchers").delete().eq("id", id);
    if (!error) {
      setVouchers((prev) => prev.filter((v) => v.id !== id));
      if (editingId === id) resetForm();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Manajemen Voucher Promo
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Buat kode promo, atur jadwal berlaku, dan tampilkan di running bar menu customer.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleSave}
          className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 h-fit"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TicketPercent className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                {editingId ? "Edit Voucher Promo" : "Buat Voucher Baru"}
              </h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Batal edit"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
              Kode Voucher *
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SENJA10"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-sm font-bold uppercase focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                Tipe
              </label>
              <select
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as "percent" | "fixed")
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-white dark:bg-[#111827] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="percent">Persen (%)</option>
                <option value="fixed">Nominal (Rp)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                Nilai
              </label>
              <input
                type="number"
                required
                min={1}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-sm font-bold font-mono tabular-nums focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
              Minimal Belanja (Rp)
            </label>
            <input
              type="number"
              min={0}
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-sm font-mono tabular-nums focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          {/* Waktu Berlaku Promo */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
              <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Jadwal Waktu Berlaku (Opsional)</span>
            </label>
            <div className="space-y-2">
              <div>
                <span className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Mulai Berlaku
                </span>
                <input
                  type="datetime-local"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-xs font-mono focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Berakhir Pada
                </span>
                <input
                  type="datetime-local"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-xs font-mono focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          </div>

          {/* Running Bar Toggle */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={showInCustomerBar}
              onChange={(e) => setShowInCustomerBar(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB]"
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug">
              Tampilkan di Running Bar Halaman Menu Customer
            </span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-extrabold hover:bg-[#1D4ED8] flex items-center justify-center gap-1.5 transition disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            <span>{editingId ? "Perbarui Voucher" : "Simpan Voucher"}</span>
          </button>
        </form>

        <div className="lg:col-span-2 space-y-3">
          {vouchers.length === 0 ? (
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800 text-sm text-neutral-500">
              Belum ada voucher promo.
            </div>
          ) : (
            vouchers.map((v) => {
              const validityText = formatValidityWindow(v);
              return (
                <div
                  key={v.id}
                  className="bg-white dark:bg-[#111827] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#2563EB] transition"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        {v.code}
                      </span>
                      <span className="text-xs font-bold text-[#059669] font-mono tabular-nums">
                        {v.discount_type === "percent"
                          ? `Diskon ${v.discount_value}%`
                          : `Potongan ${formatRupiah(Number(v.discount_value))}`}
                      </span>
                      {v.show_in_customer_bar && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] text-[10px] font-bold">
                          <Megaphone className="w-3 h-3" />
                          Running Bar
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 font-mono tabular-nums">
                      Minimal order: {formatRupiah(Number(v.min_order || 0))}
                    </p>
                    {validityText && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#2563EB]" />
                        <span>Berlaku: {validityText}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleRunningBar(v)}
                      title="Toggle tampil di Running Bar Customer"
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 transition ${
                        v.show_in_customer_bar
                          ? "bg-blue-50 dark:bg-blue-950/50 border-[#2563EB] text-[#2563EB]"
                          : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-[#2563EB]"
                      }`}
                    >
                      <Megaphone className="w-3 h-3" />
                      <span>Running Bar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggle(v)}
                      aria-label={`Toggle aktif ${v.code}`}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        v.is_active ? "bg-emerald-600" : "bg-neutral-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-[#111827] transition-transform ${
                          v.is_active ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => startEdit(v)}
                      className="p-2 rounded-xl text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                      aria-label={`Edit ${v.code}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(v.id)}
                      className="p-2 rounded-xl text-neutral-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                      aria-label={`Hapus ${v.code}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
