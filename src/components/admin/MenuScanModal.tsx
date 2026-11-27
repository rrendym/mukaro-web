"use client";

import React, { useId, useState } from "react";
import {
  X,
  Camera,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Upload,
} from "lucide-react";
import { Category, Menu } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import type { ScannedMenuItem } from "@/app/api/admin/ai-menu-scan/route";

interface DraftMenuRow extends ScannedMenuItem {
  id: string;
  selected: boolean;
}

interface MenuScanModalProps {
  storeId: string;
  categories: Category[];
  onClose: () => void;
  onSaved: (newMenus: Menu[], newCategories: Category[]) => void;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function prepareImageForScan(
  file: File
): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error("Format gambar tidak dapat dibaca."));
      img.onload = () => {
        const maxDim = 1600;
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim && file.size <= 1.5 * 1024 * 1024) {
          resolve({
            base64: dataUrl,
            mimeType: file.type || "image/jpeg",
            previewUrl: dataUrl,
          });
          return;
        }

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({
            base64: dataUrl,
            mimeType: file.type || "image/jpeg",
            previewUrl: dataUrl,
          });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve({
          base64: compressedUrl,
          mimeType: "image/jpeg",
          previewUrl: compressedUrl,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function MenuScanModal({
  storeId,
  categories,
  onClose,
  onSaved,
}: MenuScanModalProps) {
  const datalistId = useId();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");

  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftMenuRow[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError("Format file tidak valid. Gunakan gambar JPG, PNG, atau WEBP.");
      e.target.value = "";
      return;
    }

    setError(null);
    setInfoMessage(null);
    try {
      const prepared = await prepareImageForScan(file);
      setPreviewUrl(prepared.previewUrl);
      setImageBase64(prepared.base64);
      setMimeType(prepared.mimeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses foto.");
    }
  };

  const handleExtract = async () => {
    if (!imageBase64) {
      setError("Pilih atau ambil foto daftar menu terlebih dahulu.");
      return;
    }

    setScanning(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await fetch("/api/admin/ai-menu-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          existingCategories: categories.map((c) => c.name),
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        items?: ScannedMenuItem[];
        error?: string;
      } | null;

      if (!res.ok) {
        throw new Error(data?.error || "Gagal mengekstrak menu dari foto.");
      }

      const items = data?.items || [];
      if (items.length === 0) {
        setInfoMessage(
          "Tidak ada item menu yang terbaca dari foto. Anda dapat mencoba foto lain yang lebih jelas atau menambah baris secara manual."
        );
        return;
      }

      setDrafts(
        items.map((item, idx) => ({
          ...item,
          id: `${Date.now()}-${idx}`,
          selected: true,
        }))
      );
      setInfoMessage(
        `${items.length} menu berhasil diekstrak. Silakan periksa & sesuaikan sebelum disimpan.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memindai foto menu."
      );
    } finally {
      setScanning(false);
    }
  };

  const addManualRow = () => {
    setDrafts((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        selected: true,
        name: "",
        price: 0,
        category: categories[0]?.name || "Umum",
        description: "",
      },
    ]);
  };

  const updateRow = <K extends keyof DraftMenuRow>(
    id: string,
    field: K,
    value: DraftMenuRow[K]
  ) => {
    setDrafts((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const removeRow = (id: string) => {
    setDrafts((prev) => prev.filter((row) => row.id !== id));
  };

  const selectedCount = drafts.filter((d) => d.selected).length;

  const handleSaveSelected = async () => {
    const selectedRows = drafts.filter((d) => d.selected);
    if (selectedRows.length === 0) {
      setError("Pilih minimal 1 baris menu untuk disimpan.");
      return;
    }

    const invalidRow = selectedRows.find(
      (r) => !r.name.trim() || Number.isNaN(Number(r.price)) || Number(r.price) < 0
    );
    if (invalidRow) {
      setError(
        "Pastikan semua menu terpilih memiliki nama dan harga yang valid (minimal 0)."
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // Map existing categories by lowercase name
      const categoryMap = new Map<string, Category>(
        categories.map((c) => [c.name.trim().toLowerCase(), c])
      );

      // Identify new category names to create
      const missingCategoryNames: string[] = [];
      for (const row of selectedRows) {
        const catName = row.category.trim();
        if (!catName) continue;
        const key = catName.toLowerCase();
        if (
          !categoryMap.has(key) &&
          !missingCategoryNames.some((n) => n.toLowerCase() === key)
        ) {
          missingCategoryNames.push(catName);
        }
      }

      const newlyCreatedCategories: Category[] = [];
      if (missingCategoryNames.length > 0) {
        const baseOrder = categories.length;
        const catPayloads = missingCategoryNames.map((name, idx) => ({
          store_id: storeId,
          name,
          sort_order: baseOrder + idx,
          image_url: null,
        }));

        const { data: createdCats, error: catError } = await supabase
          .from("categories")
          .insert(catPayloads)
          .select("*");

        if (catError) throw catError;

        for (const cat of (createdCats as Category[]) || []) {
          categoryMap.set(cat.name.trim().toLowerCase(), cat);
          newlyCreatedCategories.push(cat);
        }
      }

      const menuPayloads = selectedRows.map((row) => {
        const catKey = row.category.trim().toLowerCase();
        const matchedCat = catKey ? categoryMap.get(catKey) : undefined;
        return {
          store_id: storeId,
          category_id: matchedCat?.id || null,
          name: row.name.trim(),
          description: row.description.trim() || null,
          price: Math.max(0, Math.round(Number(row.price) || 0)),
          ojol_price: null,
          image_url: null,
          badge: null,
          stock_mode: "none" as const,
          stock_qty: 0,
          min_stock: 5,
          variants: [],
          is_available: true,
        };
      });

      const { data: insertedMenus, error: insertError } = await supabase
        .from("menus")
        .insert(menuPayloads)
        .select("*");

      if (insertError) throw insertError;

      onSaved((insertedMenus as Menu[]) || [], newlyCreatedCategories);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menyimpan menu ke database."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Generate Menu dari Foto (Scan &amp; Adjust)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Unggah foto buku menu, papan menu, atau catatan — AI akan mengekstrak daftarnya.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Upload + Preview + Extract */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <label className="md:col-span-5 flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#090D16] hover:border-[#2563EB] cursor-pointer transition min-h-[160px] text-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview foto menu"
                  className="max-h-40 rounded-xl object-contain"
                />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-[#2563EB]" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Pilih atau Ambil Foto Menu
                  </span>
                  <span className="text-[11px] text-slate-400">
                    JPG, PNG, atau WEBP
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <div className="md:col-span-7 space-y-3">
              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  Tips agar hasil scan akurat:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Pastikan tulisan nama menu dan harga cukup jelas terlihat.</li>
                  <li>Harga yang buram akan diisi 0 agar mudah Anda lengkapi.</li>
                  <li>Anda bebas mengedit, menambah, atau menghapus baris sebelum menyimpan.</li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={scanning || !imageBase64}
                  onClick={handleExtract}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {scanning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>
                    {scanning ? "Mengekstrak Menu..." : "Ekstrak Menu dengan AI"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={addManualRow}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#2563EB] transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris Manual</span>
                </button>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Editable Draft List */}
          {drafts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Daftar Draft Menu ({selectedCount}/{drafts.length} terpilih)
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    const allSelected = drafts.every((d) => d.selected);
                    setDrafts((prev) =>
                      prev.map((d) => ({ ...d, selected: !allSelected }))
                    );
                  }}
                  className="text-xs font-semibold text-[#2563EB] hover:underline"
                >
                  {drafts.every((d) => d.selected)
                    ? "Batalkan Semua"
                    : "Pilih Semua"}
                </button>
              </div>

              <datalist id={datalistId}>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name} />
                ))}
              </datalist>

              <div className="space-y-2.5">
                {drafts.map((row) => (
                  <div
                    key={row.id}
                    className={`p-3.5 rounded-xl border transition grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center ${
                      row.selected
                        ? "bg-[#F8FAFC] dark:bg-[#090D16] border-slate-200 dark:border-slate-800"
                        : "bg-slate-50/50 dark:bg-[#090D16]/40 border-slate-200/60 dark:border-slate-800/50 opacity-60"
                    }`}
                  >
                    <div className="md:col-span-1 flex items-center justify-between md:justify-center">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) =>
                          updateRow(row.id, "selected", e.target.checked)
                        }
                        aria-label={`Pilih ${row.name || "baris"}`}
                        className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="md:hidden p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        aria-label="Hapus baris"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Nama Menu
                      </label>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateRow(row.id, "name", e.target.value)}
                        placeholder="Nama menu"
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Harga (Rp)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={row.price}
                        onChange={(e) =>
                          updateRow(
                            row.id,
                            "price",
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-xs font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Kategori
                      </label>
                      <input
                        type="text"
                        list={datalistId}
                        value={row.category}
                        onChange={(e) =>
                          updateRow(row.id, "category", e.target.value)
                        }
                        placeholder="Kategori"
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Deskripsi
                      </label>
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) =>
                          updateRow(row.id, "description", e.target.value)
                        }
                        placeholder="Opsional"
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>

                    <div className="hidden md:flex md:col-span-1 justify-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        aria-label="Hapus baris"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-[#F8FAFC] dark:bg-[#090D16]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#111827] transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={saving || selectedCount === 0}
            onClick={handleSaveSelected}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-extrabold transition disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {saving
                ? "Menyimpan..."
                : `Simpan Menu Terpilih (${selectedCount})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
