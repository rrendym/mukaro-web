"use client";

import React, { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Upload,
  Loader2,
  FolderPlus,
} from "lucide-react";
import { Category, Menu, Store } from "@/types/database";
import { formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { compressImageFile } from "@/lib/image-compression";
import { MenuFormModal } from "./MenuFormModal";

interface MenuManagerClientProps {
  store: Store;
  initialCategories: Category[];
  initialMenus: Menu[];
}

export function MenuManagerClient({
  store,
  initialCategories,
  initialMenus,
}: MenuManagerClientProps) {
  const [activeTab, setActiveTab] = useState<"menus" | "categories">("menus");
  const [menus, setMenus] = useState<Menu[]>(initialMenus);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [search, setSearch] = useState("");
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);

  // Category Form State
  const [catName, setCatName] = useState("");
  const [catSort, setCatSort] = useState("0");
  const [catImageUrl, setCatImageUrl] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [savingCat, setSavingCat] = useState(false);
  const [uploadingCatImg, setUploadingCatImg] = useState(false);

  const filteredMenus = menus.filter((m) =>
    m.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const getCategoryName = (catId: string | null) => {
    if (!catId) return "Tanpa Kategori";
    return categories.find((c) => c.id === catId)?.name || "Tanpa Kategori";
  };

  // Quick 1-click toggle availability
  const handleToggleAvailable = async (menu: Menu) => {
    const nextVal = !menu.is_available;
    setMenus((prev) =>
      prev.map((m) => (m.id === menu.id ? { ...m, is_available: nextVal } : m))
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("menus")
      .update({ is_available: nextVal })
      .eq("id", menu.id);

    if (error) {
      setMenus((prev) =>
        prev.map((m) =>
          m.id === menu.id ? { ...m, is_available: !nextVal } : m
        )
      );
    }
  };

  const handleDeleteMenu = async (menuId: string) => {
    if (!confirm("Hapus menu ini secara permanen?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("menus").delete().eq("id", menuId);
    if (!error) {
      setMenus((prev) => prev.filter((m) => m.id !== menuId));
    }
  };

  const handleSavedMenu = (saved: Menu) => {
    setMenus((prev) => {
      const exists = prev.some((m) => m.id === saved.id);
      if (exists) {
        return prev.map((m) => (m.id === saved.id ? saved : m));
      }
      return [saved, ...prev];
    });
  };

  // Category Image Upload
  const handleCatImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCatImg(true);
    try {
      const compressed = await compressImageFile(file, {
        maxWidth: 500,
        maxHeight: 500,
        targetMaxBytes: 120 * 1024,
      });
      const supabase = createClient();
      const filePath = `${store.id}/categories/${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("store-assets")
        .upload(filePath, compressed, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage
        .from("store-assets")
        .getPublicUrl(filePath);
      setCatImageUrl(data.publicUrl);
    } finally {
      setUploadingCatImg(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setSavingCat(true);
    const supabase = createClient();

    const payload = {
      store_id: store.id,
      name: catName.trim(),
      sort_order: Number(catSort || 0),
      image_url: catImageUrl.trim() || null,
    };

    try {
      if (editingCatId) {
        const { data, error } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", editingCatId)
          .select("*")
          .single();
        if (!error && data) {
          setCategories((prev) =>
            prev
              .map((c) => (c.id === editingCatId ? (data as Category) : c))
              .sort((a, b) => a.sort_order - b.sort_order)
          );
        }
      } else {
        const { data, error } = await supabase
          .from("categories")
          .insert(payload)
          .select("*")
          .single();
        if (!error && data) {
          setCategories((prev) =>
            [...prev, data as Category].sort(
              (a, b) => a.sort_order - b.sort_order
            )
          );
        }
      }
      setCatName("");
      setCatSort("0");
      setCatImageUrl("");
      setEditingCatId(null);
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm("Hapus kategori ini? Menu di dalamnya akan menjadi Tanpa Kategori."))
      return;
    const supabase = createClient();
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", catId);
    if (!error) {
      setCategories((prev) => prev.filter((c) => c.id !== catId));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Menu &amp; Kategori
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Kelola daftar produk, harga ojol, varian, dan ketersediaan stok.
          </p>
        </div>

        {activeTab === "menus" && (
          <button
            type="button"
            onClick={() => {
              setEditingMenu(null);
              setIsMenuModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-extrabold hover:bg-[#1D4ED8] transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Menu</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="inline-flex p-1 bg-white border border-slate-200 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab("menus")}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "menus"
              ? "bg-[#2563EB] text-white"
              : "text-neutral-600 hover:text-slate-900"
          }`}
        >
          Daftar Menu ({menus.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("categories")}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "categories"
              ? "bg-[#2563EB] text-white"
              : "text-neutral-600 hover:text-slate-900"
          }`}
        >
          Kategori ({categories.length})
        </button>
      </div>

      {/* Tab 1: Daftar Menu */}
      {activeTab === "menus" && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama menu..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>

          {filteredMenus.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <p className="text-sm font-semibold text-neutral-500">
                Belum ada menu. Klik &ldquo;Tambah Menu&rdquo; untuk memulai.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredMenus.map((menu) => (
                <div
                  key={menu.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center gap-4 hover:border-[#2563EB] transition"
                >
                  <div className="w-20 h-20 rounded-xl bg-[#F8FAFC] overflow-hidden shrink-0">
                    {menu.image_url ? (
                      <img
                        src={menu.image_url}
                        alt={menu.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-400">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {menu.name}
                      </h3>
                      {menu.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          menu.badge === "BESTSELLER"
                            ? "bg-[#2563EB] text-slate-900"
                            : menu.badge === "PROMO"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {menu.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      {getCategoryName(menu.category_id)}
                      {menu.stock_mode === "direct" &&
                        ` • Stok: ${menu.stock_qty}`}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900 font-mono tabular-nums">
                        {formatRupiah(Number(menu.price))}
                      </span>
                      {menu.ojol_price != null && (
                        <span className="text-[11px] text-neutral-400 font-mono tabular-nums">
                          (Ojol: {formatRupiah(Number(menu.ojol_price))})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Toggle & Actions */}
                  <div className="flex flex-col items-end gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleAvailable(menu)}
                      aria-label={`Toggle status ${menu.name}`}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        menu.is_available ? "bg-emerald-600" : "bg-neutral-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          menu.is_available ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span className="text-[10px] font-bold text-neutral-500">
                      {menu.is_available ? "Tersedia" : "Habis"}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMenu(menu);
                          setIsMenuModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-slate-900 hover:bg-[#F8FAFC] transition"
                        aria-label="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMenu(menu.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-700 hover:bg-rose-50 transition"
                        aria-label="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Kategori */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category Form */}
          <form
            onSubmit={handleSaveCategory}
            className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4 h-fit"
          >
            <div className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
                {editingCatId ? "Edit Kategori" : "Tambah Kategori"}
              </h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Nama Kategori *
              </label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Contoh: Coffee"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Urutan Tampil (sort_order)
              </label>
              <input
                type="number"
                value={catSort}
                onChange={(e) => setCatSort(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">
                Foto Kategori (Opsional)
              </label>
              <div className="flex items-center gap-3">
                {catImageUrl && (
                  <img
                    src={catImageUrl}
                    alt="Cat"
                    className="w-11 h-11 rounded-full object-cover border border-slate-200"
                  />
                )}
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#F8FAFC] border border-slate-200 text-xs font-bold cursor-pointer hover:border-[#2563EB] transition">
                  {uploadingCatImg ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCatImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={savingCat || uploadingCatImg}
                className="flex-1 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-extrabold hover:bg-[#1D4ED8] disabled:opacity-60 transition"
              >
                {savingCat
                  ? "Menyimpan..."
                  : editingCatId
                    ? "Update Kategori"
                    : "Simpan Kategori"}
              </button>
              {editingCatId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCatId(null);
                    setCatName("");
                    setCatSort("0");
                    setCatImageUrl("");
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold hover:border-[#2563EB] transition"
                >
                  Batal
                </button>
              )}
            </div>
          </form>

          {/* Category List */}
          <div className="lg:col-span-2 space-y-3">
            {categories.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-sm text-neutral-500">
                Belum ada kategori.
              </div>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between gap-4 hover:border-[#2563EB] transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#F8FAFC] overflow-hidden shrink-0 flex items-center justify-center">
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-neutral-500">
                          {cat.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {cat.name}
                      </h4>
                      <p className="text-xs text-neutral-500">
                        Urutan: {cat.sort_order}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(cat.id);
                        setCatName(cat.name);
                        setCatSort(String(cat.sort_order));
                        setCatImageUrl(cat.image_url || "");
                      }}
                      className="p-2 rounded-xl text-neutral-500 hover:text-slate-900 hover:bg-[#F8FAFC] transition"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
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
      )}

      {isMenuModalOpen && (
        <MenuFormModal
          storeId={store.id}
          categories={categories}
          initialMenu={editingMenu}
          onClose={() => setIsMenuModalOpen(false)}
          onSaved={handleSavedMenu}
        />
      )}
    </div>
  );
}
