"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  ClipboardCheck,
  Boxes,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  UserCheck,
  KeyRound,
} from "lucide-react";
import {
  Ingredient,
  Menu,
  MenuRecipe,
  StockOpnameLog,
  Store,
} from "@/types/database";
import { createClient } from "@/lib/supabase/client";

interface InventoryManagerClientProps {
  store: Store;
  initialMenus: Menu[];
  initialIngredients: Ingredient[];
  initialRecipes: MenuRecipe[];
  initialLogs: StockOpnameLog[];
}

export function InventoryManagerClient({
  store,
  initialMenus,
  initialIngredients,
  initialRecipes,
  initialLogs,
}: InventoryManagerClientProps) {
  const [activeTab, setActiveTab] = useState<"ingredients" | "opname">(
    "ingredients"
  );
  const [menus, setMenus] = useState<Menu[]>(initialMenus);
  const [ingredients, setIngredients] =
    useState<Ingredient[]>(initialIngredients);
  const [recipes, setRecipes] = useState<MenuRecipe[]>(initialRecipes);
  const [logs, setLogs] = useState<StockOpnameLog[]>(initialLogs);

  // New Ingredient Form
  const [ingName, setIngName] = useState("");
  const [ingUnit, setIngUnit] = useState("gr");
  const [ingQty, setIngQty] = useState("0");
  const [ingMin, setIngMin] = useState("100");
  const [savingIng, setSavingIng] = useState(false);

  // Recipe Builder
  const [selectedMenuId, setSelectedMenuId] = useState<string>(
    initialMenus[0]?.id || ""
  );
  const [recipeIngId, setRecipeIngId] = useState<string>(
    initialIngredients[0]?.id || ""
  );
  const [recipeQty, setRecipeQty] = useState("10");
  const [savingRecipe, setSavingRecipe] = useState(false);

  // Stock Opname state: key = `menu:${id}` or `ing:${id}` -> string actual qty
  const [opnameInputs, setOpnameInputs] = useState<Record<string, string>>({});
  const [opnameNotes, setOpnameNotes] = useState("");
  const [savingOpname, setSavingOpname] = useState(false);
  const [opnameSavedToast, setOpnameSavedToast] = useState(false);

  // Staff & Stock PIN Security + Guide Accordion
  const staffOptions = Array.isArray(store.staff_list) ? store.staff_list : [];
  const [staffName, setStaffName] = useState<string>(
    store.active_staff_name || staffOptions[0] || ""
  );
  const [stockPinInput, setStockPinInput] = useState("");
  const [stockAuthError, setStockAuthError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const validateStockAuth = (): boolean => {
    setStockAuthError(null);
    const expectedPin = (store.stock_pin ?? store.staff_pin ?? "").trim();
    if (!expectedPin) {
      setStockAuthError(
        "PIN Khusus Stok belum diatur oleh owner. Silakan atur di Pengaturan Toko terlebih dahulu."
      );
      return false;
    }
    if (!staffName.trim()) {
      setStockAuthError(
        "Pilih atau isi Nama Staf yang melakukan perubahan stok terlebih dahulu."
      );
      return false;
    }
    if (stockPinInput.trim() !== expectedPin) {
      setStockAuthError(
        "PIN Khusus Stok salah. Perubahan stok ditolak demi keamanan."
      );
      return false;
    }
    return true;
  };

  const insertOpnameLogSafe = async (
    supabase: ReturnType<typeof createClient>,
    payload: {
      store_id: string;
      item_name: string;
      item_type: string;
      system_qty: number;
      actual_qty: number;
      difference: number;
      notes: string | null;
      updated_by_staff: string;
    }
  ): Promise<StockOpnameLog | null> => {
    const { data, error } = await supabase
      .from("stock_opname_logs")
      .insert(payload)
      .select("*")
      .single();

    if (error && error.message.toLowerCase().includes("updated_by_staff")) {
      const { updated_by_staff, ...fallbackPayload } = payload;
      const mergedNotes = updated_by_staff
        ? `[Staf: ${updated_by_staff}]${fallbackPayload.notes ? ` ${fallbackPayload.notes}` : ""}`
        : fallbackPayload.notes;
      const retry = await supabase
        .from("stock_opname_logs")
        .insert({ ...fallbackPayload, notes: mergedNotes })
        .select("*")
        .single();
      return (retry.data as StockOpnameLog) || null;
    }

    return (data as StockOpnameLog) || null;
  };

  const directStockMenus = menus.filter((m) => m.stock_mode === "direct");
  const selectedMenu = menus.find((m) => m.id === selectedMenuId);
  const selectedMenuRecipes = recipes.filter(
    (r) => r.menu_id === selectedMenuId
  );

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingName.trim()) return;
    if (!validateStockAuth()) return;
    setSavingIng(true);
    const supabase = createClient();

    const qtyNum = Number(ingQty || 0);
    const { data, error } = await supabase
      .from("ingredients")
      .insert({
        store_id: store.id,
        name: ingName.trim(),
        unit: ingUnit,
        stock_qty: qtyNum,
        min_stock: Number(ingMin || 0),
      })
      .select("*")
      .single();

    if (!error && data) {
      const created = data as Ingredient;
      setIngredients((prev) => [...prev, created]);
      if (!recipeIngId) setRecipeIngId(created.id);
      const logEntry = await insertOpnameLogSafe(supabase, {
        store_id: store.id,
        item_name: `${created.name} (${created.unit})`,
        item_type: "ingredient",
        system_qty: 0,
        actual_qty: qtyNum,
        difference: qtyNum,
        notes: "Tambah bahan baku baru",
        updated_by_staff: staffName.trim(),
      });
      if (logEntry) setLogs((prev) => [logEntry, ...prev]);
      setIngName("");
      setIngQty("0");
      setStockPinInput("");
    }
    setSavingIng(false);
  };

  const handleDeleteIngredient = async (id: string) => {
    if (!confirm("Hapus bahan baku ini?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("ingredients").delete().eq("id", id);
    if (!error) {
      setIngredients((prev) => prev.filter((i) => i.id !== id));
      setRecipes((prev) => prev.filter((r) => r.ingredient_id !== id));
    }
  };

  const handleAddRecipeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenuId || !recipeIngId) return;
    setSavingRecipe(true);
    const supabase = createClient();

    // Ensure menu uses stock_mode = 'recipe'
    if (selectedMenu && selectedMenu.stock_mode !== "recipe") {
      await supabase
        .from("menus")
        .update({ stock_mode: "recipe" })
        .eq("id", selectedMenuId);
      setMenus((prev) =>
        prev.map((m) =>
          m.id === selectedMenuId ? { ...m, stock_mode: "recipe" } : m
        )
      );
    }

    const { data, error } = await supabase
      .from("menu_recipes")
      .insert({
        menu_id: selectedMenuId,
        ingredient_id: recipeIngId,
        qty_needed: Number(recipeQty || 1),
      })
      .select("*")
      .single();

    if (!error && data) {
      setRecipes((prev) => [...prev, data as MenuRecipe]);
    }
    setSavingRecipe(false);
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("menu_recipes")
      .delete()
      .eq("id", recipeId);
    if (!error) {
      setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    }
  };

  const handleSaveOpname = async () => {
    if (!validateStockAuth()) return;
    setSavingOpname(true);
    setOpnameSavedToast(false);
    const supabase = createClient();
    const newLogs: StockOpnameLog[] = [];

    try {
      // Process direct stock menus
      for (const m of directStockMenus) {
        const key = `menu:${m.id}`;
        if (opnameInputs[key] === undefined || opnameInputs[key] === "") continue;
        const actual = Number(opnameInputs[key]);
        const sys = Number(m.stock_qty || 0);
        const diff = actual - sys;

        await supabase
          .from("menus")
          .update({
            stock_qty: actual,
            is_available: actual > 0 ? m.is_available : false,
          })
          .eq("id", m.id);

        const logData = await insertOpnameLogSafe(supabase, {
          store_id: store.id,
          item_name: m.name,
          item_type: "menu",
          system_qty: sys,
          actual_qty: actual,
          difference: diff,
          notes: opnameNotes.trim() || null,
          updated_by_staff: staffName.trim(),
        });

        if (logData) newLogs.push(logData);
      }

      // Process ingredients
      for (const ing of ingredients) {
        const key = `ing:${ing.id}`;
        if (opnameInputs[key] === undefined || opnameInputs[key] === "") continue;
        const actual = Number(opnameInputs[key]);
        const sys = Number(ing.stock_qty || 0);
        const diff = actual - sys;

        await supabase
          .from("ingredients")
          .update({ stock_qty: actual, updated_at: new Date().toISOString() })
          .eq("id", ing.id);

        const logData = await insertOpnameLogSafe(supabase, {
          store_id: store.id,
          item_name: `${ing.name} (${ing.unit})`,
          item_type: "ingredient",
          system_qty: sys,
          actual_qty: actual,
          difference: diff,
          notes: opnameNotes.trim() || null,
          updated_by_staff: staffName.trim(),
        });

        if (logData) newLogs.push(logData);
      }

      // Refresh local states
      setMenus((prev) =>
        prev.map((m) => {
          const val = opnameInputs[`menu:${m.id}`];
          if (val === undefined || val === "") return m;
          const actual = Number(val);
          return {
            ...m,
            stock_qty: actual,
            is_available: actual > 0 ? m.is_available : false,
          };
        })
      );
      setIngredients((prev) =>
        prev.map((ing) => {
          const val = opnameInputs[`ing:${ing.id}`];
          if (val === undefined || val === "") return ing;
          return { ...ing, stock_qty: Number(val) };
        })
      );

      if (newLogs.length > 0) {
        setLogs((prev) => [...newLogs, ...prev]);
        setOpnameInputs({});
        setOpnameNotes("");
        setStockPinInput("");
        setOpnameSavedToast(true);
        setTimeout(() => setOpnameSavedToast(false), 3000);
      }
    } finally {
      setSavingOpname(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Manajemen Stok, Resep &amp; Opname
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Kelola bahan baku, takaran resep per menu, dan stock opname berkala.
        </p>
      </div>

      {/* Panduan / Tutorial Update Stok Accordion */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
        >
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-4 h-4 text-[#2563EB] shrink-0" />
            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
              Panduan Cara Update &amp; Stock Opname
            </span>
          </div>
          {showGuide ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
        {showGuide && (
          <div className="px-5 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Ikuti langkah berikut agar perubahan stok tercatat rapi:
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Pilih menu/bahan baku pada tab <strong>Stock Opname</strong>{" "}
                (atau tambah bahan baru di tab <strong>Bahan Baku &amp; Resep</strong>).
              </li>
              <li>
                Masukkan jumlah <strong>Stok Fisik Aktual</strong> hasil hitungan di lapangan.
              </li>
              <li>
                Pilih <strong>Nama Staf</strong> yang bertugas dan masukkan{" "}
                <strong>PIN Khusus Stok</strong> dari Pengaturan Toko.
              </li>
              <li>
                Klik <strong>Simpan</strong> — selisih dan nama staf otomatis tercatat pada riwayat audit log.
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Identitas Staf & Proteksi PIN Stok */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
              <UserCheck className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Nama Staf Pengubah Stok *</span>
            </label>
            {staffOptions.length > 0 ? (
              <select
                value={staffName}
                onChange={(e) => {
                  setStaffName(e.target.value);
                  setStockAuthError(null);
                }}
                className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
              >
                <option value="">-- Pilih Nama Staf --</option>
                {staffOptions.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={staffName}
                onChange={(e) => {
                  setStaffName(e.target.value);
                  setStockAuthError(null);
                }}
                placeholder="Ketik nama staf (atau atur daftar di Pengaturan Toko)"
                className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
              />
            )}
          </div>

          <div className="sm:w-64">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
              <KeyRound className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>PIN Khusus Stok *</span>
            </label>
            <input
              type="password"
              value={stockPinInput}
              onChange={(e) => {
                setStockPinInput(e.target.value);
                setStockAuthError(null);
              }}
              placeholder="Masukkan PIN stok"
              className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        </div>

        {stockAuthError && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-300">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{stockAuthError}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="inline-flex p-1 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab("ingredients")}
          className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === "ingredients"
              ? "bg-[#2563EB] text-white"
              : "text-neutral-600 hover:text-slate-900 dark:text-slate-100"
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Bahan Baku &amp; Resep</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("opname")}
          className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === "opname"
              ? "bg-[#2563EB] text-white"
              : "text-neutral-600 hover:text-slate-900 dark:text-slate-100"
          }`}
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          <span>Stock Opname</span>
        </button>
      </div>

      {activeTab === "ingredients" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bahan Baku CRUD */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Daftar Bahan Baku
            </h2>

            <form
              onSubmit={handleAddIngredient}
              className="grid grid-cols-12 gap-2"
            >
              <input
                type="text"
                required
                value={ingName}
                onChange={(e) => setIngName(e.target.value)}
                placeholder="Nama bahan (mis: Susu UHT)"
                className="col-span-5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-[#2563EB]"
              />
              <select
                value={ingUnit}
                onChange={(e) => setIngUnit(e.target.value)}
                className="col-span-2 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-[#111827] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="gr">gr</option>
                <option value="ml">ml</option>
                <option value="pcs">pcs</option>
              </select>
              <input
                type="number"
                value={ingQty}
                onChange={(e) => setIngQty(e.target.value)}
                placeholder="Stok"
                className="col-span-2 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono tabular-nums focus:outline-none focus:border-[#2563EB]"
              />
              <input
                type="number"
                value={ingMin}
                onChange={(e) => setIngMin(e.target.value)}
                placeholder="Min"
                className="col-span-2 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono tabular-nums focus:outline-none focus:border-[#2563EB]"
              />
              <button
                type="submit"
                disabled={savingIng}
                className="col-span-1 rounded-xl bg-[#2563EB] text-white flex items-center justify-center hover:bg-[#1D4ED8] transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {ingredients.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-6">
                  Belum ada bahan baku.
                </p>
              ) : (
                ingredients.map((ing) => (
                  <div
                    key={ing.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16]"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {ing.name}
                      </p>
                      <p className="text-[11px] text-neutral-500 font-mono tabular-nums">
                        Stok: <strong>{ing.stock_qty}</strong> {ing.unit} • Min:{" "}
                        {ing.min_stock} {ing.unit}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteIngredient(ing.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Menu Recipe Builder */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Komposisi Resep per Menu
              </h2>
              <p className="text-[11px] text-neutral-500">
                Menambahkan resep otomatis mengaktifkan mode stok resep pada
                menu.
              </p>
            </div>

            <select
              value={selectedMenuId}
              onChange={(e) => setSelectedMenuId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-white dark:bg-[#111827] focus:outline-none focus:border-[#2563EB]"
            >
              {menus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.stock_mode})
                </option>
              ))}
            </select>

            {ingredients.length > 0 && selectedMenuId && (
              <form
                onSubmit={handleAddRecipeItem}
                className="flex items-center gap-2"
              >
                <select
                  value={recipeIngId}
                  onChange={(e) => setRecipeIngId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-[#111827] focus:outline-none focus:border-[#2563EB]"
                >
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.unit})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={recipeQty}
                  onChange={(e) => setRecipeQty(e.target.value)}
                  placeholder="Takaran"
                  className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono tabular-nums focus:outline-none focus:border-[#2563EB]"
                />
                <button
                  type="submit"
                  disabled={savingRecipe}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-extrabold hover:bg-[#1D4ED8] transition"
                >
                  Tambah
                </button>
              </form>
            )}

            <div className="space-y-2">
              {selectedMenuRecipes.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-6">
                  Belum ada resep untuk menu ini.
                </p>
              ) : (
                selectedMenuRecipes.map((r) => {
                  const ing = ingredients.find((i) => i.id === r.ingredient_id);
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16]"
                    >
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                        {ing?.name || "Bahan"} — {r.qty_needed} {ing?.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecipe(r.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "opname" && (
        <div className="space-y-6">
          {opnameSavedToast && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/30 text-xs text-emerald-700 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Stock opname berhasil disimpan dan saldo diperbarui!</span>
            </div>
          )}

          <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-neutral-500">
                    <th className="py-2.5 pr-4 font-bold">Nama Item</th>
                    <th className="py-2.5 pr-4 font-bold">Tipe</th>
                    <th className="py-2.5 pr-4 font-bold">Stok Sistem</th>
                    <th className="py-2.5 pr-4 font-bold">Stok Fisik</th>
                    <th className="py-2.5 font-bold">Selisih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {directStockMenus.map((m) => {
                    const key = `menu:${m.id}`;
                    const val = opnameInputs[key];
                    const hasVal = val !== undefined && val !== "";
                    const diff = hasVal ? Number(val) - Number(m.stock_qty) : 0;
                    return (
                      <tr key={key}>
                        <td className="py-3 pr-4 font-bold text-slate-900 dark:text-slate-100">
                          {m.name}
                        </td>
                        <td className="py-3 pr-4 text-neutral-500">
                          Menu Langsung
                        </td>
                        <td className="py-3 pr-4 font-semibold font-mono tabular-nums">
                          {m.stock_qty}
                        </td>
                        <td className="py-3 pr-4">
                          <input
                            type="number"
                            value={val ?? ""}
                            onChange={(e) =>
                              setOpnameInputs((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            placeholder={String(m.stock_qty)}
                            className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold font-mono tabular-nums focus:outline-none focus:border-[#2563EB]"
                          />
                        </td>
                        <td className="py-3 font-extrabold font-mono tabular-nums">
                          {hasVal ? (
                            <span
                              className={
                                diff === 0
                                  ? "text-emerald-700"
                                  : diff < 0
                                    ? "text-rose-700"
                                    : "text-slate-900 dark:text-slate-100"
                              }
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          ) : (
                            <span className="text-neutral-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {ingredients.map((ing) => {
                    const key = `ing:${ing.id}`;
                    const val = opnameInputs[key];
                    const hasVal = val !== undefined && val !== "";
                    const diff = hasVal
                      ? Number(val) - Number(ing.stock_qty)
                      : 0;
                    return (
                      <tr key={key}>
                        <td className="py-3 pr-4 font-bold text-slate-900 dark:text-slate-100">
                          {ing.name} ({ing.unit})
                        </td>
                        <td className="py-3 pr-4 text-neutral-500">
                          Bahan Baku
                        </td>
                        <td className="py-3 pr-4 font-semibold font-mono tabular-nums">
                          {ing.stock_qty}
                        </td>
                        <td className="py-3 pr-4">
                          <input
                            type="number"
                            value={val ?? ""}
                            onChange={(e) =>
                              setOpnameInputs((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            placeholder={String(ing.stock_qty)}
                            className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold font-mono tabular-nums focus:outline-none focus:border-[#2563EB]"
                          />
                        </td>
                        <td className="py-3 font-extrabold font-mono tabular-nums">
                          {hasVal ? (
                            <span
                              className={
                                diff === 0
                                  ? "text-emerald-700"
                                  : diff < 0
                                    ? "text-rose-700"
                                    : "text-slate-900 dark:text-slate-100"
                              }
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          ) : (
                            <span className="text-neutral-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <input
                type="text"
                value={opnameNotes}
                onChange={(e) => setOpnameNotes(e.target.value)}
                placeholder="Catatan opname (opsional)..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-[#2563EB]"
              />
              <button
                type="button"
                disabled={savingOpname}
                onClick={handleSaveOpname}
                className="px-6 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-extrabold hover:bg-[#1D4ED8] flex items-center justify-center gap-2 disabled:opacity-60 transition"
              >
                {savingOpname && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Stock Opname</span>
              </button>
            </div>
          </div>

          {/* Logs */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Riwayat Stock Opname Terbaru
            </h3>
            {logs.length === 0 ? (
              <p className="text-xs text-neutral-400">Belum ada riwayat.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {logs.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {l.item_name}
                        </p>
                        {l.updated_by_staff && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] text-[10px] font-bold">
                            Staf: {l.updated_by_staff}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(l.created_at).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-mono tabular-nums mt-0.5">
                        Sistem: {l.system_qty} → Fisik: {l.actual_qty}{" "}
                        {l.notes ? `• ${l.notes}` : ""}
                      </p>
                    </div>
                    <span
                      className={`font-extrabold font-mono tabular-nums shrink-0 ${
                        l.difference === 0
                          ? "text-emerald-700"
                          : l.difference < 0
                            ? "text-rose-700"
                            : "text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {l.difference > 0 ? `+${l.difference}` : l.difference}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
