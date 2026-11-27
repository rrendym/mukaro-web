"use client";

import React, { useMemo, useState } from "react";
import { X, Minus, Plus, Check } from "lucide-react";
import { Menu, SelectedVariant } from "@/types/database";
import { formatRupiah } from "@/lib/format";

interface MenuDetailModalProps {
  menu: Menu;
  accentColor: string;
  isStoreOpen: boolean;
  onClose: () => void;
  onAddToCart: (
    menu: Menu,
    qty: number,
    selectedVariants: SelectedVariant[],
    notes: string
  ) => void;
}

export function MenuDetailModal({
  menu,
  accentColor,
  isStoreOpen,
  onClose,
  onAddToCart,
}: MenuDetailModalProps) {
  // Initialize required variant groups with their first option
  const initialSelections = useMemo(() => {
    const map: Record<string, SelectedVariant[]> = {};
    for (const group of menu.variants || []) {
      if (group.required && group.options.length > 0) {
        map[group.group] = [
          {
            group: group.group,
            optionName: group.options[0].name,
            price: group.options[0].price,
          },
        ];
      } else {
        map[group.group] = [];
      }
    }
    return map;
  }, [menu]);

  const [selections, setSelections] =
    useState<Record<string, SelectedVariant[]>>(initialSelections);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  const handleToggleOption = (
    groupName: string,
    required: boolean,
    optionName: string,
    price: number
  ) => {
    setSelections((prev) => {
      const current = prev[groupName] || [];
      if (required) {
        return {
          ...prev,
          [groupName]: [{ group: groupName, optionName, price }],
        };
      }
      const exists = current.some((item) => item.optionName === optionName);
      if (exists) {
        return {
          ...prev,
          [groupName]: current.filter((item) => item.optionName !== optionName),
        };
      }
      return {
        ...prev,
        [groupName]: [...current, { group: groupName, optionName, price }],
      };
    });
  };

  const selectedList = useMemo(
    () => Object.values(selections).flat(),
    [selections]
  );

  const extraPrice = useMemo(
    () => selectedList.reduce((sum, item) => sum + (item.price || 0), 0),
    [selectedList]
  );

  const unitPrice = Number(menu.price) + extraPrice;
  const totalPrice = unitPrice * qty;

  const missingRequired = useMemo(() => {
    return (menu.variants || []).some(
      (g) => g.required && (!selections[g.group] || selections[g.group].length === 0)
    );
  }, [menu.variants, selections]);

  const handleAdd = () => {
    if (!isStoreOpen || missingRequired) return;
    onAddToCart(menu, qty, selectedList, notes.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#111827] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 max-h-[88vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Image */}
        <div className="relative w-full h-36 sm:h-40 bg-[#F8FAFC] dark:bg-[#090D16] overflow-hidden shrink-0">
          {menu.image_url ? (
            <img
              src={menu.image_url}
              alt={menu.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400 dark:text-slate-500 text-sm">
              Tidak ada foto
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 dark:bg-[#111827]/95 backdrop-blur border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 flex items-center justify-center shadow-sm hover:bg-white dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
          {menu.badge && (
            <span
              className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide text-white shadow-sm"
              style={{ backgroundColor: accentColor }}
            >
              {menu.badge}
            </span>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                {menu.name}
              </h2>
              <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 shrink-0 font-mono tabular-nums">
                {formatRupiah(Number(menu.price))}
              </span>
            </div>
            {menu.description && (
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-slate-400 mt-1 leading-relaxed">
                {menu.description}
              </p>
            )}
          </div>

          {/* Variants & Add-ons */}
          {menu.variants && menu.variants.length > 0 && (
            <div className="space-y-4">
              {menu.variants.map((group) => {
                const groupSelected = selections[group.group] || [];
                return (
                  <div
                    key={group.group}
                    className="border-t border-slate-200 dark:border-slate-800 pt-3.5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        {group.group}
                      </h3>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          group.required
                            ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"
                            : "bg-[#F8FAFC] dark:bg-[#090D16] text-neutral-600 dark:text-slate-300"
                        }`}
                      >
                        {group.required ? "Wajib pilih 1" : "Opsional"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {group.options.map((opt) => {
                        const isChecked = groupSelected.some(
                          (s) => s.optionName === opt.name
                        );
                        return (
                          <button
                            key={opt.name}
                            type="button"
                            onClick={() =>
                              handleToggleOption(
                                group.group,
                                group.required,
                                opt.name,
                                opt.price
                              )
                            }
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition ${
                              isChecked
                                ? "bg-blue-50/70 dark:bg-blue-950/40 border-[#2563EB]"
                                : "bg-white dark:bg-[#090D16] border-slate-200 dark:border-slate-800 hover:border-[#2563EB]/60"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-5 h-5 flex items-center justify-center border transition ${
                                  group.required ? "rounded-full" : "rounded-md"
                                } ${
                                  isChecked
                                    ? "bg-[#2563EB] text-white border-[#2563EB]"
                                    : "border-neutral-300 dark:border-slate-600 bg-white dark:bg-[#111827]"
                                }`}
                              >
                                {isChecked && <Check className="w-3.5 h-3.5" />}
                              </span>
                              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {opt.name}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-neutral-600 dark:text-slate-300 font-mono tabular-nums">
                              {opt.price > 0
                                ? `+${formatRupiah(opt.price)}`
                                : "Gratis"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Item Notes */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3.5">
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Catatan Khusus
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Es dipisah, tidak pakai bawang..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090D16] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>
        </div>

        {/* Sticky Footer Action */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 rounded-full px-2 py-1.5">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-900 dark:text-slate-100 hover:border-[#2563EB] transition"
              aria-label="Kurangi jumlah"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-7 text-center text-sm font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="w-8 h-8 rounded-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-900 dark:text-slate-100 hover:border-[#2563EB] transition"
              aria-label="Tambah jumlah"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            disabled={!isStoreOpen || missingRequired}
            onClick={handleAdd}
            className="flex-1 py-3 px-4 rounded-full text-white font-bold text-sm flex items-center justify-between shadow-md transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: accentColor }}
          >
            <span>{isStoreOpen ? "Tambah ke Keranjang" : "Toko Tutup"}</span>
            <span className="font-mono tabular-nums">{formatRupiah(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
