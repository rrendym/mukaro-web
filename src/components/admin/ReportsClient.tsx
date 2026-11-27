"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  FileText,
  Lock,
  MessageCircle,
  TrendingUp,
  ShoppingBag,
  Receipt,
  Coins,
  Award,
  Loader2,
  Info,
  Store as StoreIcon,
  Wallet,
  TicketPercent,
  ReceiptText,
} from "lucide-react";
import { Category, Menu, Order, PlanTier, Store } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/format";

interface ReportsClientProps {
  store: Store;
  ownerStores: Store[];
  planTier: PlanTier;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDefaultDates() {
  const now = new Date();
  const end = toYmd(now);
  const startD = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  return { start: toYmd(startD), end };
}

function formatChannelLabel(source: string): string {
  switch (source) {
    case "qr_menu":
      return "QR Meja";
    case "walk_in":
      return "Kasir";
    case "gofood":
      return "GoFood";
    case "grabfood":
      return "GrabFood";
    case "shopeefood":
      return "ShopeeFood";
    default:
      return source;
  }
}

export function ReportsClient({
  store,
  ownerStores,
  planTier,
}: ReportsClientProps) {
  const initialDates = useMemo(() => getDefaultDates(), []);
  const [activeStoreId, setActiveStoreId] = useState(store.id);
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [activePreset, setActivePreset] = useState<
    "7d" | "14d" | "this_month" | "last_month" | "custom"
  >("7d");

  const [orders, setOrders] = useState<Order[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(! (planTier === "starter"));

  const activeStore =
    ownerStores.find((s) => s.id === activeStoreId) || store;

  const isLocked = planTier === "starter";

  useEffect(() => {
    if (isLocked) return;

    let active = true;
    const supabase = createClient();
    const startIso = new Date(`${startDate}T00:00:00`).toISOString();
    const endIso = new Date(`${endDate}T23:59:59.999`).toISOString();

    Promise.all([
      supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("store_id", activeStoreId)
        .eq("payment_status", "paid")
        .neq("order_status", "cancelled")
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: false }),
      supabase.from("menus").select("*").eq("store_id", activeStoreId),
      supabase.from("categories").select("*").eq("store_id", activeStoreId),
    ]).then(([{ data: ordersData }, { data: menusData }, { data: catsData }]) => {
      if (!active) return;
      setOrders((ordersData as Order[]) || []);
      setMenus((menusData as Menu[]) || []);
      setCategories((catsData as Category[]) || []);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [activeStoreId, startDate, endDate, isLocked]);

  const applyPreset = (
    preset: "7d" | "14d" | "this_month" | "last_month"
  ) => {
    const now = new Date();
    setActivePreset(preset);

    if (preset === "7d") {
      setStartDate(toYmd(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)));
      setEndDate(toYmd(now));
    } else if (preset === "14d") {
      setStartDate(toYmd(new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000)));
      setEndDate(toYmd(now));
    } else if (preset === "this_month") {
      setStartDate(toYmd(new Date(now.getFullYear(), now.getMonth(), 1)));
      setEndDate(toYmd(now));
    } else if (preset === "last_month") {
      const firstLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(toYmd(firstLastMonth));
      setEndDate(toYmd(lastLastMonth));
    }
  };

  // Compute all metrics consistently for UI, XLSX, and PDF
  const report = useMemo(() => {
    const menuMap = new Map<string, Menu>();
    for (const m of menus) {
      menuMap.set(m.id, m);
    }
    const catMap = new Map<string, string>();
    for (const c of categories) {
      catMap.set(c.id, c.name);
    }

    let totalGross = 0;
    let totalDiscount = 0;
    let totalNet = 0;
    let totalHpp = 0;

    const channels = {
      qr_menu: { label: "QR Meja", count: 0, omzet: 0 },
      walk_in: { label: "Kasir", count: 0, omzet: 0 },
      gofood: { label: "GoFood", count: 0, omzet: 0 },
      grabfood: { label: "GrabFood", count: 0, omzet: 0 },
      shopeefood: { label: "ShopeeFood", count: 0, omzet: 0 },
    };

    const paymentMethods = {
      qris: { label: "QRIS", count: 0, omzet: 0 },
      cash: { label: "Tunai", count: 0, omzet: 0 },
      ojol_platform: { label: "Platform Ojol", count: 0, omzet: 0 },
    };

    const menuPerfMap = new Map<
      string,
      {
        name: string;
        category: string;
        qty: number;
        omzet: number;
        hpp: number;
      }
    >();

    const txRows: {
      tanggal: string;
      jam: string;
      noOrder: string;
      kasir: string;
      channel: string;
      daftarItem: string;
      metodeBayar: string;
      subtotalKotor: number;
      diskon: number;
      omzetBersih: number;
      estimasiHpp: number;
      estimasiProfit: number;
      catatan: string;
    }[] = [];

    const voucherUsageMap = new Map<
      string,
      { label: string; count: number; totalDiscount: number }
    >();

    for (const o of orders) {
      const subtotalKotor = Math.round(Number(o.subtotal || 0));
      const diskon = Math.round(Number(o.discount_amount || 0));
      const omzetBersih = Math.round(Number(o.total_amount || 0));

      let orderHpp = 0;
      const items = o.order_items || [];
      const itemSummaryParts: string[] = [];

      for (const item of items) {
        const qty = Number(item.qty || 1);
        const itemSub = Math.round(Number(item.subtotal || 0));
        const matchedMenu = item.menu_id ? menuMap.get(item.menu_id) : undefined;
        const unitHpp =
          matchedMenu?.hpp != null && Number(matchedMenu.hpp) > 0
            ? Number(matchedMenu.hpp)
            : Math.round((itemSub / Math.max(1, qty)) * 0.4);
        const itemHpp = Math.round(unitHpp * qty);
        orderHpp += itemHpp;

        itemSummaryParts.push(`${qty}x ${item.menu_name}`);

        const catName = matchedMenu?.category_id
          ? catMap.get(matchedMenu.category_id) || "Umum"
          : "Umum";
        const existingMenu = menuPerfMap.get(item.menu_name) || {
          name: item.menu_name,
          category: catName,
          qty: 0,
          omzet: 0,
          hpp: 0,
        };
        existingMenu.qty += qty;
        existingMenu.omzet += itemSub;
        existingMenu.hpp += itemHpp;
        menuPerfMap.set(item.menu_name, existingMenu);
      }

      if (items.length === 0) {
        orderHpp = Math.round(omzetBersih * 0.4);
      }

      const orderProfit = omzetBersih - orderHpp;

      totalGross += subtotalKotor;
      totalDiscount += diskon;
      totalNet += omzetBersih;
      totalHpp += orderHpp;

      const src = o.order_source as keyof typeof channels;
      if (channels[src]) {
        channels[src].count += 1;
        channels[src].omzet += omzetBersih;
      } else {
        channels.walk_in.count += 1;
        channels.walk_in.omzet += omzetBersih;
      }

      const pm = (o.payment_method || "cash") as keyof typeof paymentMethods;
      if (paymentMethods[pm]) {
        paymentMethods[pm].count += 1;
        paymentMethods[pm].omzet += omzetBersih;
      }

      if (diskon > 0) {
        const voucherLabel = o.notes?.trim() || "Diskon Manual / Promo";
        const vEntry = voucherUsageMap.get(voucherLabel) || {
          label: voucherLabel,
          count: 0,
          totalDiscount: 0,
        };
        vEntry.count += 1;
        vEntry.totalDiscount += diskon;
        voucherUsageMap.set(voucherLabel, vEntry);
      }

      const dt = new Date(o.created_at);
      txRows.push({
        tanggal: toYmd(dt),
        jam: dt.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        noOrder: o.order_number,
        kasir: o.cashier_name || activeStore.active_staff_name || "-",
        channel: formatChannelLabel(o.order_source),
        daftarItem: itemSummaryParts.join(", ") || "-",
        metodeBayar: (o.payment_method || "-").toUpperCase(),
        subtotalKotor,
        diskon,
        omzetBersih,
        estimasiHpp: orderHpp,
        estimasiProfit: orderProfit,
        catatan: o.notes || "-",
      });
    }

    const totalOrders = orders.length;
    const totalProfit = totalNet - totalHpp;
    const aov = totalOrders > 0 ? Math.round(totalNet / totalOrders) : 0;

    const menuPerformance = Array.from(menuPerfMap.values())
      .sort((a, b) => b.qty - a.qty)
      .map((m, idx) => ({
        rank: idx + 1,
        name: m.name,
        category: m.category,
        qty: m.qty,
        omzet: Math.round(m.omzet),
        profit: Math.round(m.omzet - m.hpp),
      }));

    const voucherUsage = Array.from(voucherUsageMap.values()).sort(
      (a, b) => b.totalDiscount - a.totalDiscount
    );

    const cashInitial = Math.round(Number(activeStore.cash_drawer_initial || 0));
    const cashSales = paymentMethods.cash.omzet;
    const estimatedClosingCash = cashInitial + cashSales;
    const nonCashSales =
      paymentMethods.qris.omzet + paymentMethods.ojol_platform.omzet;

    return {
      totalOrders,
      totalGross,
      totalDiscount,
      totalNet,
      totalHpp,
      totalProfit,
      aov,
      channels,
      paymentMethods,
      txRows,
      menuPerformance,
      top5Menus: menuPerformance.slice(0, 5),
      voucherUsage,
      cashInitial,
      cashSales,
      estimatedClosingCash,
      nonCashSales,
    };
  }, [orders, menus, categories, activeStore]);

  const buildAutoFitCols = (aoa: (string | number)[][]) => {
    const colWidths: number[] = [];
    for (const row of aoa) {
      row.forEach((cell, idx) => {
        const len = String(cell ?? "").length;
        colWidths[idx] = Math.max(colWidths[idx] || 10, len + 3);
      });
    }
    return colWidths.map((w) => ({ wch: Math.min(52, Math.max(12, w)) }));
  };

  const formatNumericCells = (
    ws: XLSX.WorkSheet,
    aoa: (string | number)[][],
    numericCols: number[]
  ) => {
    for (let r = 1; r < aoa.length; r++) {
      for (const c of numericCols) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (cell && typeof cell.v === "number") {
          cell.z = "#,##0";
        }
      }
    }
  };

  const handleDownloadXlsx = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Ringkasan & Kas Closing
    const summaryAoa: (string | number)[][] = [
      ["LAPORAN OPERASIONAL & PENJUALAN MUKARO"],
      ["Nama Usaha / Cabang", activeStore.name],
      ["Slug Outlet", `/${activeStore.slug}`],
      ["Periode Tanggal", `${startDate} s/d ${endDate}`],
      ["Kasir On-Duty", activeStore.active_staff_name || "-"],
      [],
      ["RINGKASAN PENJUALAN", "NILAI"],
      ["Total Transaksi Sukses", report.totalOrders],
      ["Total Omzet Kotor (Rp)", report.totalGross],
      ["Total Diskon / Voucher (Rp)", report.totalDiscount],
      ["Total Omzet Bersih (Rp)", report.totalNet],
      ["Total Estimasi HPP (Rp)", report.totalHpp],
      ["Estimasi Laba Kotor (Rp)", report.totalProfit],
      ["Rata-rata Nilai Order / AOV (Rp)", report.aov],
      [],
      ["RINGKASAN KAS CLOSING", "NILAI (Rp)"],
      ["Modal Awal Deposit Kasir", report.cashInitial],
      ["Pemasukan Tunai (Cash)", report.cashSales],
      ["Estimasi Sisa Kas Closing", report.estimatedClosingCash],
      ["Total Non-Tunai (QRIS + Ojol)", report.nonCashSales],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryAoa);
    ws1["!cols"] = buildAutoFitCols(summaryAoa);
    formatNumericCells(ws1, summaryAoa, [1]);
    XLSX.utils.book_append_sheet(wb, ws1, "Ringkasan & Kas Closing");

    // Sheet 2: Rincian Transaksi
    const txHeader = [
      "Tanggal",
      "Jam",
      "No_Order",
      "Kasir",
      "Channel",
      "Daftar_Item",
      "Metode_Bayar",
      "Subtotal_Kotor",
      "Diskon",
      "Omzet_Bersih",
      "Estimasi_HPP",
      "Estimasi_Profit",
      "Catatan",
    ];
    const txData = report.txRows.map((r) => [
      r.tanggal,
      r.jam,
      r.noOrder,
      r.kasir,
      r.channel,
      r.daftarItem,
      r.metodeBayar,
      r.subtotalKotor,
      r.diskon,
      r.omzetBersih,
      r.estimasiHpp,
      r.estimasiProfit,
      r.catatan,
    ]);
    const txTotalRow = [
      "TOTAL",
      "",
      "",
      "",
      "",
      `${report.totalOrders} transaksi`,
      "",
      report.totalGross,
      report.totalDiscount,
      report.totalNet,
      report.totalHpp,
      report.totalProfit,
      "",
    ];
    const txAoa = [txHeader, ...txData, txTotalRow];
    const ws2 = XLSX.utils.aoa_to_sheet(txAoa);
    ws2["!cols"] = buildAutoFitCols(txAoa);
    formatNumericCells(ws2, txAoa, [7, 8, 9, 10, 11]);
    XLSX.utils.book_append_sheet(wb, ws2, "Rincian Transaksi");

    // Sheet 3: Menu Terjual
    const menuHeader = [
      "Peringkat",
      "Nama_Menu",
      "Kategori",
      "Qty_Terjual",
      "Total_Penjualan",
      "Estimasi_Profit",
    ];
    const menuData = report.menuPerformance.map((m) => [
      m.rank,
      m.name,
      m.category,
      m.qty,
      m.omzet,
      m.profit,
    ]);
    const menuAoa = [menuHeader, ...menuData];
    const ws3 = XLSX.utils.aoa_to_sheet(menuAoa);
    ws3["!cols"] = buildAutoFitCols(menuAoa);
    formatNumericCells(ws3, menuAoa, [3, 4, 5]);
    XLSX.utils.book_append_sheet(wb, ws3, "Menu Terjual");

    // Sheet 4: Metode Bayar & Voucher
    const payVoucherAoa: (string | number)[][] = [
      ["METODE PEMBAYARAN", "JUMLAH TRANSAKSI", "TOTAL NOMINAL (Rp)"],
      ...Object.values(report.paymentMethods).map((pm) => [
        pm.label,
        pm.count,
        pm.omzet,
      ]),
      [],
      ["CHANNEL PENJUALAN", "JUMLAH ORDER", "TOTAL OMZET (Rp)"],
      ...Object.values(report.channels).map((ch) => [
        ch.label,
        ch.count,
        ch.omzet,
      ]),
      [],
      ["PENGGUNAAN VOUCHER / DISKON", "JUMLAH PAKAI", "TOTAL DISKON (Rp)"],
      ...(report.voucherUsage.length > 0
        ? report.voucherUsage.map((v) => [v.label, v.count, v.totalDiscount])
        : [["Tidak ada pemakaian voucher/diskon", 0, 0]]),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(payVoucherAoa);
    ws4["!cols"] = buildAutoFitCols(payVoucherAoa);
    formatNumericCells(ws4, payVoucherAoa, [1, 2]);
    XLSX.utils.book_append_sheet(wb, ws4, "Metode Bayar & Voucher");

    const safeName = activeStore.name
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const fileName = `Laporan-Mukaro-${safeName || activeStore.slug}-${startDate}-sd-${endDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (isLocked) {
    const adminWa =
      process.env.NEXT_PUBLIC_MUKARO_ADMIN_WA || "6281234567890";
    const waUrl = `https://wa.me/${adminWa}?text=${encodeURIComponent(
      `Halo Admin Mukaro, saya ingin upgrade outlet "${store.name}" ke paket Pro agar bisa menggunakan fitur Rekap & Export Penjualan.`
    )}`;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-slate-900 dark:text-slate-100">
            Rekap &amp; Export Penjualan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Laporan perkembangan penjualan dalam format Google Sheets (.xlsx) 3
            tab &amp; PDF.
          </p>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-10 text-center max-w-2xl mx-auto space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] text-[11px] font-bold uppercase tracking-wider">
              Fitur Paket Pro &amp; Enterprise
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Buka Laporan Keuangan Lengkap &amp; Export Google Sheets
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mx-auto">
              Outlet Anda saat ini menggunakan paket{" "}
              <strong className="text-slate-900 dark:text-slate-100">Starter</strong>. Upgrade ke
              paket <strong className="text-[#2563EB]">Pro</strong> untuk
              mengakses rekap profit kotor, rincian transaksi per channel, dan
              export spreadsheet 3 tab + PDF.
            </p>
          </div>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Upgrade ke Paket Pro Sekarang</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Actions (Hidden on Print) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-slate-900 dark:text-slate-100">
            Rekap &amp; Export Penjualan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Analisa perkembangan usaha dan download laporan 3 tab siap import ke
            Google Sheets atau PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={handleDownloadXlsx}
            className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center gap-2 transition disabled:opacity-60 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Laporan Google Sheets (.xlsx)</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-xs font-semibold inline-flex items-center gap-2 transition disabled:opacity-60 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#2563EB]" />
            <span>Download Ringkasan PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Bar (Hidden on Print) */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "7d" as const, label: "7 Hari Terakhir" },
              { key: "14d" as const, label: "14 Hari Terakhir" },
              { key: "this_month" as const, label: "Bulan Ini" },
              { key: "last_month" as const, label: "Bulan Lalu" },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  activePreset === p.key
                    ? "bg-[#2563EB] text-white"
                    : "bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Multi-Outlet Switcher */}
          {ownerStores.length > 1 && (
            <div className="flex items-center gap-2">
              <StoreIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <select
                value={activeStoreId}
                onChange={(e) => setActiveStoreId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold bg-white dark:bg-[#111827] focus:outline-none focus:border-[#2563EB]"
              >
                {ownerStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    Outlet: {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Custom Date Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActivePreset("custom");
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActivePreset("custom");
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <div className="sm:col-span-2 flex items-end">
            <div className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span>
                Buka <strong>sheets.google.com</strong> &rarr; File &rarr;
                Import &rarr; Upload file <code>.xlsx</code> ini untuk membuka 3
                tab laporan lengkap.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Area */}
      <div id="reports-print-area" className="space-y-6">
        {/* Print-only / Header Summary */}
        <div className="hidden print:block border-b border-slate-300 pb-4 mb-4">
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Laporan Perkembangan Penjualan — {activeStore.name}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-1">
            Periode: {startDate} s/d {endDate} • Dicetak via Mukaro POS
          </p>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-12 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
            <span>Memuat data laporan...</span>
          </div>
        ) : (
          <>
            {/* 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Total Omzet Bersih
                  </p>
                  <p className="text-2xl font-bold tracking-tight font-mono tabular-nums text-slate-900 dark:text-slate-100 truncate">
                    {formatRupiah(report.totalNet)}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    Kotor: {formatRupiah(report.totalGross)}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Total Transaksi Sukses
                  </p>
                  <p className="text-2xl font-bold tracking-tight font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {report.totalOrders}
                  </p>
                  <p className="text-[11px] font-semibold text-emerald-700">
                    Order lunas pada periode ini
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Rata-rata Nilai Order
                  </p>
                  <p className="text-2xl font-bold tracking-tight font-mono tabular-nums text-slate-900 dark:text-slate-100 truncate">
                    {formatRupiah(report.aov)}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Average Order Value (AOV)
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Coins className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Estimasi Profit Kotor
                  </p>
                  <p className="text-2xl font-bold tracking-tight font-mono tabular-nums text-emerald-700 truncate">
                    {formatRupiah(report.totalProfit)}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    Est. HPP: {formatRupiah(report.totalHpp)}
                  </p>
                </div>
              </div>
            </div>

            {/* Channel & Payment Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Breakdown per Channel Penjualan
                </h2>
                <div className="space-y-2.5 text-xs">
                  {Object.values(report.channels).map((ch) => (
                    <div
                      key={ch.label}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-100 dark:border-slate-800/80"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {ch.label}
                        </span>
                        <span className="ml-2 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          ({ch.count} order)
                        </span>
                      </div>
                      <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {formatRupiah(ch.omzet)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Perbandingan Metode Pembayaran
                </h2>
                <div className="space-y-2.5 text-xs">
                  {Object.values(report.paymentMethods).map((pm) => {
                    const pct =
                      report.totalNet > 0
                        ? Math.round((pm.omzet / report.totalNet) * 100)
                        : 0;
                    return (
                      <div
                        key={pm.label}
                        className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-100 dark:border-slate-800/80 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {pm.label}
                            </span>
                            <span className="ml-2 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                              ({pm.count} trx • {pct}%)
                            </span>
                          </div>
                          <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                            {formatRupiah(pm.omzet)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#2563EB]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Top 5 Menu Terlaris */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Rincian Menu Terjual ({report.menuPerformance.length})
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Seluruh item menu terjual pada rentang {startDate} s/d{" "}
                    {endDate}.
                  </p>
                </div>
              </div>

              {report.menuPerformance.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
                  Belum ada penjualan menu pada rentang tanggal ini.
                </p>
              ) : (
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        <th className="py-2.5 pr-4 font-semibold">#</th>
                        <th className="py-2.5 pr-4 font-semibold">Nama Menu</th>
                        <th className="py-2.5 pr-4 font-semibold">Kategori</th>
                        <th className="py-2.5 pr-4 font-semibold text-right">
                          Terjual
                        </th>
                        <th className="py-2.5 pr-4 font-semibold text-right">
                          Total Omzet
                        </th>
                        <th className="py-2.5 font-semibold text-right">
                          Est. Profit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {report.menuPerformance.map((m) => (
                        <tr key={m.name}>
                          <td className="py-3 pr-4 font-mono font-bold text-[#2563EB]">
                            #{m.rank}
                          </td>
                          <td className="py-3 pr-4 font-bold text-slate-900 dark:text-slate-100">
                            {m.name}
                          </td>
                          <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">
                            {m.category}
                          </td>
                          <td className="py-3 pr-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                            {m.qty}
                          </td>
                          <td className="py-3 pr-4 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                            {formatRupiah(m.omzet)}
                          </td>
                          <td className="py-3 text-right font-mono tabular-nums font-bold text-emerald-700">
                            {formatRupiah(m.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Kas Closing & Penggunaan Voucher */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#059669] flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      Ringkasan Kas Closing
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Kasir On-Duty: {activeStore.active_staff_name || "Belum dipilih"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs pt-1">
                  <div className="flex justify-between p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16]">
                    <span className="text-slate-600 dark:text-slate-400">
                      Modal Awal Deposit Kasir
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatRupiah(report.cashInitial)}
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16]">
                    <span className="text-slate-600 dark:text-slate-400">
                      + Penjualan Tunai (Cash)
                    </span>
                    <span className="font-mono font-bold text-[#059669]">
                      +{formatRupiah(report.cashSales)}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      Estimasi Sisa Kas Laci
                    </span>
                    <span className="font-mono font-extrabold text-[#059669]">
                      {formatRupiah(report.estimatedClosingCash)}
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16]">
                    <span className="text-slate-600 dark:text-slate-400">
                      Total Non-Tunai (QRIS + Ojol)
                    </span>
                    <span className="font-mono font-bold text-[#2563EB]">
                      {formatRupiah(report.nonCashSales)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center">
                    <TicketPercent className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      Rincian Voucher &amp; Diskon
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Total potongan terpakai: {formatRupiah(report.totalDiscount)}
                    </p>
                  </div>
                </div>

                {report.voucherUsage.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
                    Tidak ada pemakaian voucher atau diskon pada rentang tanggal ini.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {report.voucherUsage.map((v) => (
                      <div
                        key={v.label}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">
                            {v.label}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {v.count} transaksi
                          </p>
                        </div>
                        <span className="font-mono font-bold text-rose-600">
                          -{formatRupiah(v.totalDiscount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Rincian Transaksi Detail */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center">
                  <ReceiptText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Rincian Transaksi ({report.txRows.length})
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Daftar transaksi lunas pada periode {startDate} s/d {endDate}.
                  </p>
                </div>
              </div>

              {report.txRows.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
                  Belum ada transaksi pada rentang tanggal ini.
                </p>
              ) : (
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        <th className="py-2.5 pr-4 font-semibold">Waktu</th>
                        <th className="py-2.5 pr-4 font-semibold">No. Order</th>
                        <th className="py-2.5 pr-4 font-semibold">Kasir</th>
                        <th className="py-2.5 pr-4 font-semibold">Channel</th>
                        <th className="py-2.5 pr-4 font-semibold">Metode</th>
                        <th className="py-2.5 pr-4 font-semibold text-right">
                          Diskon
                        </th>
                        <th className="py-2.5 font-semibold text-right">
                          Omzet Bersih
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {report.txRows.map((tx) => (
                        <tr key={tx.noOrder}>
                          <td className="py-2.5 pr-4 font-mono text-[11px] text-slate-500">
                            {tx.tanggal} {tx.jam}
                          </td>
                          <td className="py-2.5 pr-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {tx.noOrder}
                          </td>
                          <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">
                            {tx.kasir}
                          </td>
                          <td className="py-2.5 pr-4">{tx.channel}</td>
                          <td className="py-2.5 pr-4 font-mono text-[11px]">
                            {tx.metodeBayar}
                          </td>
                          <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-rose-600">
                            {tx.diskon > 0 ? `-${formatRupiah(tx.diskon)}` : "-"}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                            {formatRupiah(tx.omzetBersih)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
