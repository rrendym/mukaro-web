"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Upload,
  Loader2,
  GripVertical,
} from "lucide-react";
import {
  Category,
  Menu,
  MenuBadge,
  StockMode,
  VariantGroup,
} from "@/types/database";
import { compressImageFile } from "@/lib/image-compression";
import { createClient } from "@/lib/supabase/client";

interface MenuFormModalProps {
  storeId: string;
  categories: Category[];
  initialMenu: Menu | null;
  onClose: () => void;
  onSaved: (menu: Menu) => void;
}

export function MenuFormModal({
  storeId,
  categories,
  initialMenu,
  onClose,
  onSaved,
}: MenuFormModalProps) {
  const [name, setName] = useState(initialMenu?.name || "");
  const [categoryId, setCategoryId] = useState(
    initialMenu?.category_id || (categories[0]?.id ?? "")
  );
  const [description, setDescription] = useState(
    initialMenu?.description || ""
  );
  const [price, setPrice] = useState(
    initialMenu ? String(initialMenu.price) : ""
  );
  const [ojolPrice, setOjolPrice] = useState(
    initialMenu?.ojol_price != null ? String(initialMenu.ojol_price) : ""
  );
  const [badge, setBadge] = useState<MenuBadge | "">(
    initialMenu?.badge || ""
  );
  const [imageUrl, setImageUrl] = useState(initialMenu?.image_url || "");
  const [stockMode, setStockMode] = useState<StockMode>(
    initialMenu?.stock_mode || "none"
  );
  const [stockQty, setStockQty] = useState(
    initialMenu ? String(initialMenu.stock_qty) : "0"
  );
  const [minStock, setMinStock] = useState(
    initialMenu ? String(initialMenu.min_stock) : "5"
  );
  const [variants, setVariants] = useState<VariantGroup[]>(
    initialMenu?.variants || []
  );

  const [uploadingImage, setUploadingImage] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Format file tidak valid. Gunakan gambar JPG, PNG, atau WEBP.");
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Ukuran file melebihi batas maksimal 2MB.");
      e.target.value = "";
      return;
    }

    setUploadingImage(true);
    setError(null);
    setCompressionInfo(null);

    try {
      const compressed = await compressImageFile(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        targetMaxBytes: 200 * 1024,
      });

      const kb = Math.round(compressed.size / 1024);
      setCompressionInfo(`Terkompresi otomatis menjadi ${kb} KB`);

      const supabase = createClient();
      const filePath = `${storeId}/menus/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("menus")
        .upload(filePath, compressed, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("menus")
        .getPublicUrl(filePath);

      setImageUrl(publicUrlData.publicUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengunggah foto menu."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  // Variant builder helpers
  const addVariantGroup = () => {
    setVariants((prev) => [
      ...prev,
      {
        group: "",
        required: true,
        options: [{ name: "", price: 0 }],
      },
    ]);
  };

  const removeVariantGroup = (idx: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateGroupField = (
    idx: number,
    field: "group" | "required",
    value: string | boolean
  ) => {
    setVariants((prev) =>
      prev.map((g, i) => (i === idx ? { ...g, [field]: value } : g))
    );
  };

  const addOptionToGroup = (groupIdx: number) => {
    setVariants((prev) =>
      prev.map((g, i) =>
        i === groupIdx
          ? { ...g, options: [...g.options, { name: "", price: 0 }] }
          : g
      )
    );
  };

  const removeOptionFromGroup = (groupIdx: number, optIdx: number) => {
    setVariants((prev) =>
      prev.map((g, i) =>
        i === groupIdx
          ? { ...g, options: g.options.filter((_, oi) => oi !== optIdx) }
          : g
      )
    );
  };

  const updateOptionField = (
    groupIdx: number,
    optIdx: number,
    field: "name" | "price",
    value: string
  ) => {
    setVariants((prev) =>
      prev.map((g, i) => {
        if (i !== groupIdx) return g;
        return {
          ...g,
          options: g.options.map((opt, oi) =>
            oi === optIdx
              ? {
                  ...opt,
                  [field]: field === "price" ? Number(value || 0) : value,
                }
              : opt
          ),
        };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedPrice = Number(price);
    if (!name.trim() || isNaN(parsedPrice) || parsedPrice < 0) {
      setError("Nama menu dan harga reguler valid wajib diisi.");
      return;
    }

    // Clean empty variant groups/options
    const cleanedVariants: VariantGroup[] = variants
      .filter((g) => g.group.trim() !== "")
      .map((g) => ({
        group: g.group.trim(),
        required: g.required,
        options: g.options
          .filter((o) => o.name.trim() !== "")
          .map((o) => ({ name: o.name.trim(), price: Number(o.price || 0) })),
      }))
      .filter((g) => g.options.length > 0);

    setSaving(true);
    const supabase = createClient();

    const payload = {
      store_id: storeId,
      category_id: categoryId || null,
      name: name.trim(),
      description: description.trim() || null,
      price: parsedPrice,
      ojol_price: ojolPrice.trim() !== "" ? Number(ojolPrice) : null,
      image_url: imageUrl.trim() || null,
      badge: badge || null,
      stock_mode: stockMode,
      stock_qty: stockMode === "direct" ? Number(stockQty || 0) : 0,
      min_stock: stockMode === "direct" ? Number(minStock || 5) : 5,
      variants: cleanedVariants,
    };

    try {
      if (initialMenu) {
        const { data, error: updateError } = await supabase
          .from("menus")
          .update(payload)
          .eq("id", initialMenu.id)
          .select("*")
          .single();
        if (updateError) throw updateError;
        onSaved(data as Menu);
      } else {
        const { data, error: insertError } = await supabase
          .from("menus")
          .insert({ ...payload, is_available: true })
          .select("*")
          .single();
        if (insertError) throw insertError;
        onSaved(data as Menu);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan menu.");
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
        className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            {initialMenu ? "Edit Menu" : "Tambah Menu Baru"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F8FAFC] flex items-center justify-center hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/20 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Photo Upload with Client-Side Compression */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-24 h-24 rounded-2xl bg-[#F8FAFC] border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[11px] text-neutral-400 text-center px-2">
                  Belum ada foto
                </span>
              )}
            </div>
            <div className="space-y-2 flex-1">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold cursor-pointer hover:bg-neutral-800 transition">
                {uploadingImage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>
                  {uploadingImage ? "Mengompres & Mengunggah..." : "Upload Foto Menu"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-neutral-500">
                Otomatis dikompres di browser (&lt; 200KB) sebelum diunggah ke
                Supabase Storage.
              </p>
              {compressionInfo && (
                <p className="text-[11px] font-semibold text-emerald-700">
                  {compressionInfo}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">
                Nama Menu *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Es Kopi Susu Senja"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">
                Kategori
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#2563EB] transition"
              >
                <option value="">Tanpa Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">
              Deskripsi
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat cita rasa atau komposisi menu..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">
                Harga Reguler (Rp) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="24000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono tabular-nums focus:outline-none focus:border-[#2563EB] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">
                Harga Khusus Ojol (Opsional)
              </label>
              <input
                type="number"
                min={0}
                value={ojolPrice}
                onChange={(e) => setOjolPrice(e.target.value)}
                placeholder="29000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono tabular-nums focus:outline-none focus:border-[#2563EB] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">
                Badge Menu
              </label>
              <select
                value={badge}
                onChange={(e) => setBadge(e.target.value as MenuBadge | "")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#2563EB] transition"
              >
                <option value="">None</option>
                <option value="BESTSELLER">BESTSELLER</option>
                <option value="PROMO">PROMO</option>
                <option value="BARU">BARU</option>
              </select>
            </div>
          </div>

          {/* Stock Settings */}
          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900">
                Pengaturan Stok
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStockMode("none")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                    stockMode === "none"
                      ? "bg-[#2563EB] text-white"
                      : "bg-white text-neutral-600 border border-slate-200"
                  }`}
                >
                  Tidak Dilacak
                </button>
                <button
                  type="button"
                  onClick={() => setStockMode("direct")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                    stockMode === "direct"
                      ? "bg-[#2563EB] text-white"
                      : "bg-white text-neutral-600 border border-slate-200"
                  }`}
                >
                  Stok Langsung
                </button>
              </div>
            </div>

            {stockMode === "direct" && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                    Jumlah Stok (stock_qty)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-mono tabular-nums focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                    Peringatan Stok Minimum (min_stock)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-mono tabular-nums focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Variant & Add-on Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Varian &amp; Add-On
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Tambahkan pilihan suhu, level gula, atau topping berbayar.
                </p>
              </div>
              <button
                type="button"
                onClick={addVariantGroup}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F8FAFC] border border-slate-200 hover:border-[#2563EB] text-xs font-bold text-slate-900 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Grup</span>
              </button>
            </div>

            {variants.map((group, gIdx) => (
              <div
                key={gIdx}
                className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3"
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-neutral-300 shrink-0" />
                  <input
                    type="text"
                    value={group.group}
                    onChange={(e) =>
                      updateGroupField(gIdx, "group", e.target.value)
                    }
                    placeholder="Nama Grup (misal: Suhu, Add-on)"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#2563EB]"
                  />
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={group.required}
                      onChange={(e) =>
                        updateGroupField(gIdx, "required", e.target.checked)
                      }
                      className="rounded accent-[#141413]"
                    />
                    Wajib
                  </label>
                  <button
                    type="button"
                    onClick={() => removeVariantGroup(gIdx)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 pl-6">
                  {group.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) =>
                          updateOptionField(gIdx, oIdx, "name", e.target.value)
                        }
                        placeholder="Nama opsi (misal: Ice / Extra Shot)"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#2563EB]"
                      />
                      <input
                        type="number"
                        min={0}
                        value={opt.price}
                        onChange={(e) =>
                          updateOptionField(gIdx, oIdx, "price", e.target.value)
                        }
                        placeholder="+Harga"
                        className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono tabular-nums focus:outline-none focus:border-[#2563EB]"
                      />
                      <button
                        type="button"
                        onClick={() => removeOptionFromGroup(gIdx, oIdx)}
                        className="p-1 text-neutral-400 hover:text-rose-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOptionToGroup(gIdx)}
                    className="text-[11px] font-bold text-slate-900 underline"
                  >
                    + Tambah Opsi
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-neutral-600 hover:border-[#2563EB] transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="px-6 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-extrabold hover:bg-[#1D4ED8] flex items-center gap-2 disabled:opacity-60 transition"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{initialMenu ? "Simpan Perubahan" : "Simpan Menu"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
