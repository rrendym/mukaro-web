"use client";

import React, { useState } from "react";
import { Plus, Trash2, TicketPercent } from "lucide-react";
import { Store, Voucher } from "@/types/database";
import { formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

export function VouchersManagerClient({
  store,
  initialVouchers,
}: {
  store: Store;
  initialVouchers: Voucher[];
}) {
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    "percent"
  );
  const [discountValue, setDiscountValue] = useState("10");
  const [minOrder, setMinOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSaving(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("vouchers")
      .insert({
        store_id: store.id,
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(discountValue || 0),
        min_order: Number(minOrder || 0),
        is_active: true,
      })
      .select("*")
      .single();

    if (!error && data) {
      setVouchers((prev) => [data as Voucher, ...prev]);
      setCode("");
    }
    setSaving(false);
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

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus voucher ini?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("vouchers").delete().eq("id", id);
    if (!error) {
      setVouchers((prev) => prev.filter((v) => v.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Manajemen Voucher Promo
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Buat kode promo persentase atau potongan nominal untuk pelanggan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4 h-fit"
        >
          <div className="flex items-center gap-2">
            <TicketPercent className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
              Buat Voucher Baru
            </h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Kode Voucher *
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SENJA10"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold uppercase focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Tipe</label>
              <select
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as "percent" | "fixed")
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:outline-none focus:border-[#2563EB]"
              >
                <option value="percent">Persen (%)</option>
                <option value="fixed">Nominal (Rp)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Nilai</label>
              <input
                type="number"
                required
                min={1}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold font-mono tabular-nums focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Minimal Belanja (Rp)
            </label>
            <input
              type="number"
              min={0}
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono tabular-nums focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-extrabold hover:bg-[#1D4ED8] flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Simpan Voucher</span>
          </button>
        </form>

        <div className="lg:col-span-2 space-y-3">
          {vouchers.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-sm text-neutral-500">
              Belum ada voucher promo.
            </div>
          ) : (
            vouchers.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between gap-4 hover:border-[#2563EB] transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#F8FAFC] border border-slate-200 text-xs font-extrabold text-slate-900">
                      {v.code}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 font-mono tabular-nums">
                      {v.discount_type === "percent"
                        ? `Diskon ${v.discount_value}%`
                        : `Potongan ${formatRupiah(Number(v.discount_value))}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1 font-mono tabular-nums">
                    Minimal order: {formatRupiah(Number(v.min_order || 0))}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggle(v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      v.is_active ? "bg-emerald-600" : "bg-neutral-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        v.is_active ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(v.id)}
                    className="p-2 rounded-xl text-neutral-400 hover:text-rose-700 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
