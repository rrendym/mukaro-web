"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  ClipboardCheck,
  Boxes,
  CheckCircle2,
  Loader2,
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

  const directStockMenus = menus.filter((m) => m.stock_mode === "direct");
  const selectedMenu = menus.find((m) => m.id === selectedMenuId);
  const selectedMenuRecipes = recipes.filter(
    (r) => r.menu_id === selectedMenuId
  );

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingName.trim()) return;
    setSavingIng(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ingredients")
      .insert({
        store_id: store.id,
        name: ingName.trim(),
        unit: ingUnit,
        stock_qty: Number(ingQty || 0),
        min_stock: Number(ingMin || 0),
      })
      .select("*")
      .single();

    if (!error && data) {
      const created = data as Ingredient;
      setIngredients((prev) => [...prev, created]);
      if (!recipeIngId) setRecipeIngId(created.id);
      setIngName("");
      setIngQty("0");
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

        const { data: logData } = await supabase
          .from("stock_opname_logs")
          .insert({
            store_id: store.id,
            item_name: m.name,
            item_type: "menu",
            system_qty: sys,
            actual_qty: actual,
            difference: diff,
            notes: opnameNotes.trim() || null,
          })
          .select("*")
          .single();

        if (logData) newLogs.push(logData as StockOpnameLog);
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

        const { data: logData } = await supabase
          .from("stock_opname_logs")
          .insert({
            store_id: store.id,
            item_name: `${ing.name} (${ing.unit})`,
            item_type: "ingredient",
            system_qty: sys,
            actual_qty: actual,
            difference: diff,
            notes: opnameNotes.trim() || null,
          })
          .select("*")
          .single();

        if (logData) newLogs.push(logData as StockOpnameLog);
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
                    className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{l.item_name}</p>
                      <p className="text-[11px] text-neutral-500 font-mono tabular-nums">
                        Sistem: {l.system_qty} → Fisik: {l.actual_qty}{" "}
                        {l.notes ? `• ${l.notes}` : ""}
                      </p>
                    </div>
                    <span
                      className={`font-extrabold font-mono tabular-nums ${
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
