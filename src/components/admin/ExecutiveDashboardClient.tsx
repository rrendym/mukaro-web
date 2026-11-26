"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Target,
  Receipt,
  Wallet,
  AlertTriangle,
  ArrowRight,
  Award,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Ingredient, Menu, Order, OrderItem, Store } from "@/types/database";
import { formatRupiah } from "@/lib/format";

interface ExecutiveDashboardClientProps {
  store: Store;
  orders: Order[];
  orderItems: OrderItem[];
  menus: Menu[];
  lowStockMenus: Menu[];
  lowStockIngredients: Ingredient[];
}

export function ExecutiveDashboardClient({
  store,
  orders,
  orderItems,
  menus,
  lowStockMenus,
  lowStockIngredients,
}: ExecutiveDashboardClientProps) {
  const [trendRange, setTrendRange] = useState<"today" | "7d" | "30d">("today");

  const paidOrders = useMemo(
    () => orders.filter((o) => o.payment_status === "paid"),
    [orders]
  );

  const { todaySales, yesterdaySales, todayOrders, channelBreakdown } =
    useMemo(() => {
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const startOfYesterday = new Date(
        startOfToday.getTime() - 24 * 60 * 60 * 1000
      );

      let tSales = 0;
      let ySales = 0;
      const tOrders: Order[] = [];
      const channels = { qris: 0, cash: 0, ojol: 0 };

      for (const o of paidOrders) {
        const d = new Date(o.created_at);
        const amt = Number(o.total_amount || 0);
        if (d >= startOfToday) {
          tSales += amt;
          tOrders.push(o);
          if (o.payment_method === "qris") channels.qris += amt;
          else if (o.payment_method === "cash") channels.cash += amt;
          else channels.ojol += amt;
        } else if (d >= startOfYesterday && d < startOfToday) {
          ySales += amt;
        }
      }

      return {
        todaySales: tSales,
        yesterdaySales: ySales,
        todayOrders: tOrders,
        channelBreakdown: channels,
      };
    }, [paidOrders]);

  const growthPercent =
    yesterdaySales > 0
      ? Math.round(((todaySales - yesterdaySales) / yesterdaySales) * 100)
      : todaySales > 0
        ? 100
        : 0;

  const targetSales = Number(store.daily_sales_target || 0);
  const targetPercent =
    targetSales > 0
      ? Math.min(100, Math.round((todaySales / targetSales) * 100))
      : 0;
  const targetRemaining = Math.max(0, targetSales - todaySales);

  const aov =
    todayOrders.length > 0 ? Math.round(todaySales / todayOrders.length) : 0;

  // Trend chart data
  const trendData = useMemo(() => {
    const now = new Date();
    if (trendRange === "today") {
      const buckets: { label: string; total: number }[] = Array.from(
        { length: 24 },
        (_, h) => ({
          label: `${String(h).padStart(2, "0")}:00`,
          total: 0,
        })
      );
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      for (const o of paidOrders) {
        const d = new Date(o.created_at);
        if (d >= startOfToday) {
          buckets[d.getHours()].total += Number(o.total_amount || 0);
        }
      }
      return buckets.filter((_, idx) => idx >= 7 && idx <= 22);
    }

    const days = trendRange === "7d" ? 7 : 30;
    const map = new Map<string, number>();
    const labels: string[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      const label = d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
      });
      map.set(key, 0);
      labels.push(`${key}__${label}`);
    }

    for (const o of paidOrders) {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (map.has(key)) {
        map.set(key, (map.get(key) || 0) + Number(o.total_amount || 0));
      }
    }

    return labels.map((entry) => {
      const [key, label] = entry.split("__");
      return { label, total: map.get(key) || 0 };
    });
  }, [paidOrders, trendRange]);

  const maxTrendValue = useMemo(
    () => Math.max(0, ...trendData.map((d) => d.total)),
    [trendData]
  );

  // Top 5 best-selling menus with image + revenue contribution
  const topMenus = useMemo(() => {
    const paidIds = new Set(paidOrders.map((o) => o.id));
    const stats = new Map<
      string,
      { name: string; menuId: string | null; qty: number; revenue: number }
    >();

    for (const item of orderItems) {
      if (!paidIds.has(item.order_id)) continue;
      const existing = stats.get(item.menu_name) || {
        name: item.menu_name,
        menuId: item.menu_id,
        qty: 0,
        revenue: 0,
      };
      existing.qty += Number(item.qty || 1);
      existing.revenue += Number(item.subtotal || 0);
      if (!existing.menuId && item.menu_id) existing.menuId = item.menu_id;
      stats.set(item.menu_name, existing);
    }

    return Array.from(stats.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map((entry) => {
        const matchedMenu = menus.find(
          (m) => m.id === entry.menuId || m.name === entry.name
        );
        return {
          ...entry,
          imageUrl: matchedMenu?.image_url || null,
        };
      });
  }, [paidOrders, orderItems, menus]);

  const lowStockCount = lowStockMenus.length + lowStockIngredients.length;

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-slate-900 dark:text-slate-100">
            Executive Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ringkasan penjualan, target harian, dan stok outlet Anda.
          </p>
        </div>
        <Link
          href={`/${store.slug}/admin/pos`}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition w-fit"
        >
          Buka Kasir POS
        </Link>
      </div>

      {/* Baris 1 — 4 Kartu KPI Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* KPI 1: Total Sales Hari Ini */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Sales Hari Ini
            </p>
            <p className="text-2xl font-bold tracking-tight font-mono tabular-nums text-slate-900 dark:text-slate-100 truncate">
              {formatRupiah(todaySales)}
            </p>
            <p
              className={`text-xs font-semibold font-mono tabular-nums ${
                growthPercent >= 0 ? "text-[#059669]" : "text-rose-600"
              }`}
            >
              {growthPercent >= 0 ? `+${growthPercent}%` : `${growthPercent}%`}{" "}
              vs kemarin
            </p>
          </div>
        </div>

        {/* KPI 2: Total Orders */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Orders</p>
            <p className="text-2xl font-bold tracking-tight font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {todayOrders.length} Order
            </p>
            <p className="text-xs font-semibold text-[#059669]">
              Transaksi lunas hari ini
            </p>
          </div>
        </div>

        {/* KPI 3: Progress Target Sales */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Progress Target Sales
              </p>
              <span className="text-xs font-bold font-mono tabular-nums text-[#2563EB]">
                {targetPercent}%
              </span>
            </div>
            <p className="text-2xl font-bold tracking-tight font-mono tabular-nums text-slate-900 dark:text-slate-100 truncate">
              {formatRupiah(targetSales)}
            </p>
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#2563EB] transition-all"
                style={{ width: `${targetPercent}%` }}
              />
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {targetSales > 0
                ? targetRemaining > 0
                  ? `Sisa ${formatRupiah(targetRemaining)}`
                  : "Target tercapai!"
                : "Belum ada target"}
            </p>
          </div>
        </div>

        {/* KPI 4: Rata-Rata Order (AOV) */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Rata-Rata Order (AOV)
            </p>
            <p className="text-2xl font-bold tracking-tight font-mono tabular-nums text-slate-900 dark:text-slate-100 truncate">
              {formatRupiah(aov)}
            </p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Per transaksi lunas
            </p>
          </div>
        </div>
      </div>

      {/* Baris 2 — Grafik Recharts & Ringkasan Channel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kiri: Grafik Tren Penjualan */}
        <div className="lg:col-span-8 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Tren Penjualan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Batang biru gelap menandai jam/hari dengan omzet tertinggi.
              </p>
            </div>
            <div className="inline-flex p-1 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800">
              {[
                { key: "today" as const, label: "Hari Ini" },
                { key: "7d" as const, label: "7 Hari" },
                { key: "30d" as const, label: "30 Hari" },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTrendRange(t.key)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    trendRange === t.key
                      ? "bg-[#2563EB] text-white"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="4 4"
                  stroke="#E2E8F0"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${Math.round(v / 1000)}rb` : String(v)
                  }
                />
                <Tooltip
                  cursor={{ fill: "#F8FAFC" }}
                  formatter={(value) => [
                    formatRupiah(Number(value || 0)),
                    "Omzet",
                  ]}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {trendData.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={
                        entry.total > 0 && entry.total === maxTrendValue
                          ? "#1D4ED8"
                          : "#2563EB"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Kanan: Omzet per Channel & Alert Stok Menipis */}
        <div className="lg:col-span-4 space-y-5">
          {/* Omzet per Channel */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Omzet per Channel
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Hari ini</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-100 dark:border-slate-800/80">
                <span className="font-semibold text-slate-900 dark:text-slate-100">QRIS</span>
                <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {formatRupiah(channelBreakdown.qris)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-100 dark:border-slate-800/80">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Tunai</span>
                <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {formatRupiah(channelBreakdown.cash)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-100 dark:border-slate-800/80">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  GoFood / Grab / Shopee
                </span>
                <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {formatRupiah(channelBreakdown.ojol)}
                </span>
              </div>
            </div>
          </div>

          {/* Alert Stok Menipis */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 text-[11px] font-bold inline-flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Stok Menipis ({lowStockCount})
                </span>
              </div>
              <Link
                href={`/${store.slug}/admin/inventory`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
              >
                <span>Opname</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {lowStockCount === 0 ? (
              <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 dark:bg-emerald-950/50 p-3 rounded-xl">
                Semua stok menu &amp; bahan baku dalam kondisi aman.
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {lowStockMenus.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/70 text-xs"
                  >
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {m.name}
                    </span>
                    <span className="font-bold font-mono tabular-nums text-rose-700 shrink-0">
                      Sisa {m.stock_qty}
                    </span>
                  </div>
                ))}
                {lowStockIngredients.map((ing) => (
                  <div
                    key={ing.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/70 text-xs"
                  >
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {ing.name}
                    </span>
                    <span className="font-bold font-mono tabular-nums text-rose-700 shrink-0">
                      {ing.stock_qty} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Baris 3 — Top 5 Menu Terlaris */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Top 5 Menu Terlaris
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Berdasarkan total porsi terjual dalam 30 hari terakhir.
            </p>
          </div>
        </div>

        {topMenus.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
            Belum ada data penjualan menu.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {topMenus.map((item, idx) => (
              <div
                key={item.name}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#090D16] flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                      #{idx + 1}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {item.name}
                  </p>
                  <p className="text-[11px] font-semibold text-[#059669] font-mono tabular-nums">
                    {item.qty} porsi
                  </p>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate">
                    {formatRupiah(item.revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
