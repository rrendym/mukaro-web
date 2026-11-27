import ExcelJS from "exceljs";
import { StockOpnameLog, Store } from "@/types/database";

export interface DailyBreakdownRow {
  date: string;
  txCount: number;
  gross: number;
  discount: number;
  net: number;
  cash: number;
  nonCash: number;
  hpp: number;
  profit: number;
}

export interface MenuPerformanceRow {
  rank: number;
  name: string;
  category: string;
  qty: number;
  omzet: number;
  hpp: number;
  profit: number;
  contributionPct: number;
}

export interface ChannelSummaryRow {
  key: string;
  label: string;
  count: number;
  omzet: number;
}

export interface CashierSummaryRow {
  cashierName: string;
  txCount: number;
  cashTotal: number;
  nonCashTotal: number;
  grandTotal: number;
}

export interface VoucherUsageRow {
  label: string;
  count: number;
  totalDiscount: number;
  totalOrderValue: number;
}

export interface TxDetailRow {
  tanggal: string;
  jam: string;
  noOrder: string;
  statusLabel: string;
  isPaidSuccess: boolean;
  kasir: string;
  channel: string;
  daftarItem: string;
  metodeBayar: string;
  subtotalKotor: number;
  diskon: number;
  omzetBersih: number;
  pajakService: number;
  totalDibayar: number;
  estimasiHpp: number;
  estimasiProfit: number;
  catatan: string;
}

export interface LowStockItemRow {
  name: string;
  type: "Menu" | "Bahan Baku";
  currentQty: number;
  minQty: number;
  unit: string;
}

export interface ComputedReportData {
  totalOrders: number;
  totalGross: number;
  totalDiscount: number;
  totalNet: number;
  totalTax: number;
  totalService: number;
  totalTaxService: number;
  totalCollected: number;
  totalHpp: number;
  totalProfit: number;
  grossMarginRatio: number;
  aov: number;

  cashInitial: number;
  cashSales: number;
  estimatedClosingCash: number;
  nonCashSales: number;

  voidRefundCount: number;
  voidRefundAmount: number;
  peakHourLabel: string;
  busiestDayLabel: string;

  channels: Record<string, ChannelSummaryRow>;
  paymentMethods: Record<string, ChannelSummaryRow>;
  dailyBreakdown: DailyBreakdownRow[];
  menuPerformance: MenuPerformanceRow[];
  top5Menus: MenuPerformanceRow[];
  cashierSummary: CashierSummaryRow[];
  voucherUsage: VoucherUsageRow[];
  txRows: TxDetailRow[];
  allTxRows: TxDetailRow[];
  opnameLogs: StockOpnameLog[];
  largestOpnameDiff: StockOpnameLog | null;
  lowStockItems: LowStockItemRow[];
}

const RP_FMT = '"Rp "#,##0';
const QTY_FMT = "#,##0";
const PCT_FMT = "0.0%";

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } },
};

function applyBanner(
  ws: ExcelJS.Worksheet,
  title: string,
  colCount: number,
  store: Store,
  startDate: string,
  endDate: string,
  printedAt: string
) {
  ws.addRow([title]);
  ws.mergeCells(1, 1, 1, colCount);
  const titleRow = ws.getRow(1);
  titleRow.height = 30;
  titleRow.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  titleRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" },
  };
  titleRow.alignment = { vertical: "middle", horizontal: "left" };

  const meta: [string, string][] = [
    ["Outlet / Cabang", `${store.name} (/${store.slug})`],
    ["Periode Laporan", `${startDate} s/d ${endDate}`],
    ["Kasir On-Duty", store.active_staff_name || "-"],
    ["Waktu Cetak", printedAt],
  ];
  for (const [k, v] of meta) {
    const r = ws.addRow([k, v]);
    r.getCell(1).font = { bold: true, size: 10, color: { argb: "FF475569" } };
    r.getCell(2).font = { size: 10, color: { argb: "FF0F172A" } };
  }
  ws.addRow([]);
}

function styleTableHeader(row: ExcelJS.Row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = THIN_BORDER;
  });
}

function styleDataRow(row: ExcelJS.Row, isEven: boolean) {
  row.height = 20;
  row.eachCell((cell) => {
    cell.font = { size: 10, color: { argb: "FF0F172A" } };
    if (isEven) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF8FAFC" },
      };
    }
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: "middle" };
  });
}

function styleTotalRow(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: "FF0F172A" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFF6FF" },
    };
    cell.border = {
      top: { style: "medium", color: { argb: "FF1E3A8A" } },
      bottom: { style: "medium", color: { argb: "FF1E3A8A" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
    cell.alignment = { vertical: "middle" };
  });
}

function autoFitSheet(ws: ExcelJS.Worksheet) {
  ws.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      if (Number(cell.row) === 1) return;
      const val = cell.value;
      const str =
        val && typeof val === "object" && "formula" in val
          ? "Rp 999.999.999"
          : String(val ?? "");
      maxLen = Math.max(maxLen, str.length + 4);
    });
    col.width = Math.min(48, maxLen);
  });
}

export async function exportReportToExcel(
  report: ComputedReportData,
  store: Store,
  startDate: string,
  endDate: string
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Mukaro POS";
  wb.created = new Date();

  const printedAt = new Date().toLocaleString("id-ID");

  // ========================================================================
  // SHEET 1: Ringkasan & Audit
  // ========================================================================
  const ws1 = wb.addWorksheet("Ringkasan & Audit");
  applyBanner(
    ws1,
    `LAPORAN EKSEKUTIF & AUDIT OPERASIONAL — ${store.name.toUpperCase()}`,
    6,
    store,
    startDate,
    endDate,
    printedAt
  );

  const s1Header = ws1.addRow(["RINGKASAN KEUANGAN", "NILAI", "KETERANGAN"]);
  styleTableHeader(s1Header);
  ws1.views = [{ state: "frozen", ySplit: s1Header.number }];

  const rTotalTx = ws1.addRow(["Total Transaksi Sukses", report.totalOrders, "Order lunas"]);
  const rGross = ws1.addRow(["Omzet Kotor (Subtotal Item)", report.totalGross, "Sebelum diskon & pajak/service"]);
  const rDiscount = ws1.addRow(["Total Diskon / Voucher", report.totalDiscount, "Potongan promo"]);
  const rNet = ws1.addRow([
    "Omzet Bersih (Kotor - Diskon)",
    { formula: `B${rGross.number}-B${rDiscount.number}` },
    "Pendapatan penjualan bersih",
  ]);
  const rTax = ws1.addRow(["Pajak (PB1 / Tax)", report.totalTax, "Pajak yang dipungut"]);
  const rService = ws1.addRow(["Service Charge", report.totalService, "Biaya layanan"]);
  const rCollected = ws1.addRow([
    "Total Penerimaan Pelanggan",
    { formula: `B${rNet.number}+B${rTax.number}+B${rService.number}` },
    "Omzet Bersih + Pajak + Service",
  ]);
  const rHpp = ws1.addRow(["Total Estimasi HPP", report.totalHpp, "Estimasi harga pokok penjualan"]);
  const rProfit = ws1.addRow([
    "Estimasi Laba Kotor",
    { formula: `B${rNet.number}-B${rHpp.number}` },
    "Omzet Bersih - Estimasi HPP",
  ]);
  const rMargin = ws1.addRow([
    "Margin Laba Kotor (%)",
    { formula: `IF(B${rNet.number}=0,0,B${rProfit.number}/B${rNet.number})` },
    "Laba Kotor / Omzet Bersih",
  ]);
  const rAov = ws1.addRow([
    "Rata-rata Nilai Order (AOV)",
    { formula: `IF(B${rTotalTx.number}=0,0,B${rNet.number}/B${rTotalTx.number})` },
    "Omzet Bersih / Total Transaksi",
  ]);

  const finRows: Array<[ExcelJS.Row, string]> = [
    [rTotalTx, QTY_FMT],
    [rGross, RP_FMT],
    [rDiscount, RP_FMT],
    [rNet, RP_FMT],
    [rTax, RP_FMT],
    [rService, RP_FMT],
    [rCollected, RP_FMT],
    [rHpp, RP_FMT],
    [rProfit, RP_FMT],
    [rMargin, PCT_FMT],
    [rAov, RP_FMT],
  ];
  finRows.forEach(([row, fmt], idx) => {
    styleDataRow(row, idx % 2 === 1);
    row.getCell(2).numFmt = fmt;
    row.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
  });

  ws1.addRow([]);
  const kasHeader = ws1.addRow(["REKONSILIASI KAS CLOSING", "NILAI", "KETERANGAN"]);
  styleTableHeader(kasHeader);

  const rModal = ws1.addRow(["Modal Awal Deposit Kasir", report.cashInitial, "Dari Pengaturan Toko"]);
  const rCashIn = ws1.addRow(["+ Pemasukan Tunai (Cash)", report.cashSales, "Penjualan tunai lunas"]);
  const rClosing = ws1.addRow([
    "Estimasi Sisa Kas Closing",
    { formula: `B${rModal.number}+B${rCashIn.number}` },
    "Modal Awal + Pemasukan Tunai",
  ]);
  const rNonCash = ws1.addRow(["Total Non-Tunai (QRIS + Ojol)", report.nonCashSales, "Masuk rekening / platform"]);

  [rModal, rCashIn, rNonCash].forEach((row, idx) => {
    styleDataRow(row, idx % 2 === 1);
    row.getCell(2).numFmt = RP_FMT;
    row.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
  });
  styleTotalRow(rClosing);
  rClosing.getCell(2).numFmt = RP_FMT;
  rClosing.getCell(2).alignment = { vertical: "middle", horizontal: "right" };

  ws1.addRow([]);
  const riskHeader = ws1.addRow(["KONTROL RISIKO & POLA OPERASIONAL", "NILAI", "KETERANGAN"]);
  styleTableHeader(riskHeader);
  const riskRows: Array<[string, number | string, string, string]> = [
    ["Transaksi Batal / Void / Refund", report.voidRefundCount, QTY_FMT, "Order dibatalkan atau gagal"],
    ["Nominal Batal / Void / Refund", report.voidRefundAmount, RP_FMT, "Potensi transaksi tidak selesai"],
    ["Jam Tersibuk (Peak Hour)", report.peakHourLabel, "@", "Distribusi jam order tertinggi"],
    ["Hari Teramai", report.busiestDayLabel, "@", "Tanggal dengan order terbanyak"],
  ];
  riskRows.forEach(([label, val, fmt, note], idx) => {
    const r = ws1.addRow([label, val, note]);
    styleDataRow(r, idx % 2 === 1);
    r.getCell(2).numFmt = fmt;
    r.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
  });

  ws1.addRow([]);
  const auditHeader = ws1.addRow(["AUDIT STOK OPNAME & STOK MENIPIS", "NILAI", "KETERANGAN"]);
  styleTableHeader(auditHeader);
  const auditRows: Array<[string, number | string, string]> = [
    ["Jumlah Log Stock Opname Periode Ini", report.opnameLogs.length, "Perubahan stok tercatat"],
    [
      "Selisih Opname Terbesar",
      report.largestOpnameDiff
        ? `${report.largestOpnameDiff.item_name} (${report.largestOpnameDiff.difference > 0 ? `+${report.largestOpnameDiff.difference}` : report.largestOpnameDiff.difference})`
        : "Tidak ada",
      report.largestOpnameDiff?.updated_by_staff
        ? `Staf: ${report.largestOpnameDiff.updated_by_staff}`
        : "-",
    ],
    ["Item Stok Menipis Saat Ini", report.lowStockItems.length, "Perlu segera restock"],
  ];
  auditRows.forEach(([label, val, note], idx) => {
    const r = ws1.addRow([label, val, note]);
    styleDataRow(r, idx % 2 === 1);
    r.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
  });
  autoFitSheet(ws1);

  // ========================================================================
  // SHEET 2: Rekap Harian
  // ========================================================================
  const ws2 = wb.addWorksheet("Rekap Harian");
  applyBanner(
    ws2,
    `REKAP PENJUALAN HARIAN — ${store.name.toUpperCase()}`,
    9,
    store,
    startDate,
    endDate,
    printedAt
  );
  const dHeader = ws2.addRow([
    "Tanggal",
    "Jml Transaksi",
    "Omzet Kotor",
    "Diskon",
    "Omzet Bersih",
    "Tunai (Cash)",
    "Non-Tunai",
    "Est. HPP",
    "Est. Laba Kotor",
  ]);
  styleTableHeader(dHeader);
  ws2.views = [{ state: "frozen", ySplit: dHeader.number }];

  const dStart = dHeader.number + 1;
  report.dailyBreakdown.forEach((d, idx) => {
    const rowNum = dStart + idx;
    const r = ws2.addRow([
      d.date,
      d.txCount,
      d.gross,
      d.discount,
      { formula: `C${rowNum}-D${rowNum}` },
      d.cash,
      d.nonCash,
      d.hpp,
      { formula: `E${rowNum}-H${rowNum}` },
    ]);
    styleDataRow(r, idx % 2 === 1);
    r.getCell(2).numFmt = QTY_FMT;
    r.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
    for (let c = 3; c <= 9; c++) {
      r.getCell(c).numFmt = RP_FMT;
      r.getCell(c).alignment = { vertical: "middle", horizontal: "right" };
    }
  });
  const dEnd = Math.max(dStart, dHeader.number + report.dailyBreakdown.length);
  const hasDaily = report.dailyBreakdown.length > 0;
  const dTotal = ws2.addRow([
    "TOTAL",
    hasDaily ? { formula: `SUM(B${dStart}:B${dEnd})` } : 0,
    hasDaily ? { formula: `SUM(C${dStart}:C${dEnd})` } : 0,
    hasDaily ? { formula: `SUM(D${dStart}:D${dEnd})` } : 0,
    hasDaily ? { formula: `SUM(E${dStart}:E${dEnd})` } : 0,
    hasDaily ? { formula: `SUM(F${dStart}:F${dEnd})` } : 0,
    hasDaily ? { formula: `SUM(G${dStart}:G${dEnd})` } : 0,
    hasDaily ? { formula: `SUM(H${dStart}:H${dEnd})` } : 0,
    hasDaily ? { formula: `SUM(I${dStart}:I${dEnd})` } : 0,
  ]);
  styleTotalRow(dTotal);
  dTotal.getCell(2).numFmt = QTY_FMT;
  dTotal.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
  for (let c = 3; c <= 9; c++) {
    dTotal.getCell(c).numFmt = RP_FMT;
    dTotal.getCell(c).alignment = { vertical: "middle", horizontal: "right" };
  }
  autoFitSheet(ws2);

  // ========================================================================
  // SHEET 3: Menu Terjual
  // ========================================================================
  const ws3 = wb.addWorksheet("Menu Terjual");
  applyBanner(
    ws3,
    `PERFORMA MENU & KONTRIBUSI OMZET — ${store.name.toUpperCase()}`,
    9,
    store,
    startDate,
    endDate,
    printedAt
  );
  const mHeader = ws3.addRow([
    "Peringkat",
    "Nama Menu",
    "Kategori",
    "Qty Terjual",
    "Total Omzet",
    "Est. HPP",
    "Est. Laba Kotor",
    "Margin (%)",
    "Kontribusi Omzet (%)",
  ]);
  styleTableHeader(mHeader);
  ws3.views = [{ state: "frozen", ySplit: mHeader.number }];

  const mStart = mHeader.number + 1;
  const mTotalRowNum = mHeader.number + report.menuPerformance.length + 1;
  report.menuPerformance.forEach((m, idx) => {
    const rowNum = mStart + idx;
    const r = ws3.addRow([
      m.rank,
      m.name,
      m.category,
      m.qty,
      m.omzet,
      m.hpp,
      { formula: `E${rowNum}-F${rowNum}` },
      { formula: `IF(E${rowNum}=0,0,G${rowNum}/E${rowNum})` },
      {
        formula:
          report.menuPerformance.length > 0
            ? `IF($E$${mTotalRowNum}=0,0,E${rowNum}/$E$${mTotalRowNum})`
            : "0",
      },
    ]);
    styleDataRow(r, idx % 2 === 1);
    r.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
    r.getCell(4).numFmt = QTY_FMT;
    r.getCell(4).alignment = { vertical: "middle", horizontal: "right" };
    for (let c = 5; c <= 7; c++) {
      r.getCell(c).numFmt = RP_FMT;
      r.getCell(c).alignment = { vertical: "middle", horizontal: "right" };
    }
    r.getCell(8).numFmt = PCT_FMT;
    r.getCell(8).alignment = { vertical: "middle", horizontal: "right" };
    r.getCell(9).numFmt = PCT_FMT;
    r.getCell(9).alignment = { vertical: "middle", horizontal: "right" };
  });

  const mEnd = Math.max(mStart, mHeader.number + report.menuPerformance.length);
  const hasMenu = report.menuPerformance.length > 0;
  const mTotal = ws3.addRow([
    "TOTAL",
    "",
    "",
    hasMenu ? { formula: `SUM(D${mStart}:D${mEnd})` } : 0,
    hasMenu ? { formula: `SUM(E${mStart}:E${mEnd})` } : 0,
    hasMenu ? { formula: `SUM(F${mStart}:F${mEnd})` } : 0,
    hasMenu ? { formula: `SUM(G${mStart}:G${mEnd})` } : 0,
    hasMenu
      ? { formula: `IF(E${mTotalRowNum}=0,0,G${mTotalRowNum}/E${mTotalRowNum})` }
      : 0,
    hasMenu ? 1 : 0,
  ]);
  styleTotalRow(mTotal);
  mTotal.getCell(4).numFmt = QTY_FMT;
  mTotal.getCell(4).alignment = { vertical: "middle", horizontal: "right" };
  for (let c = 5; c <= 7; c++) {
    mTotal.getCell(c).numFmt = RP_FMT;
    mTotal.getCell(c).alignment = { vertical: "middle", horizontal: "right" };
  }
  mTotal.getCell(8).numFmt = PCT_FMT;
  mTotal.getCell(8).alignment = { vertical: "middle", horizontal: "right" };
  mTotal.getCell(9).numFmt = PCT_FMT;
  mTotal.getCell(9).alignment = { vertical: "middle", horizontal: "right" };
  autoFitSheet(ws3);

  // ========================================================================
  // SHEET 4: Channel, Kasir & Voucher
  // ========================================================================
  const ws4 = wb.addWorksheet("Channel, Kasir & Voucher");
  applyBanner(
    ws4,
    `METODE BAYAR, KASIR & EFEKTIVITAS VOUCHER — ${store.name.toUpperCase()}`,
    5,
    store,
    startDate,
    endDate,
    printedAt
  );

  // Table 4A: Metode Pembayaran
  const pmHeader = ws4.addRow(["METODE PEMBAYARAN", "JML TRANSAKSI", "TOTAL PENERIMAAN", "PORSI (%)", ""]);
  styleTableHeader(pmHeader);
  ws4.views = [{ state: "frozen", ySplit: pmHeader.number }];
  const pmValues = Object.values(report.paymentMethods);
  const pmStart = pmHeader.number + 1;
  const pmTotalRowNum = pmHeader.number + pmValues.length + 1;
  pmValues.forEach((pm, idx) => {
    const rowNum = pmStart + idx;
    const r = ws4.addRow([
      pm.label,
      pm.count,
      pm.omzet,
      { formula: `IF($C$${pmTotalRowNum}=0,0,C${rowNum}/$C$${pmTotalRowNum})` },
      "",
    ]);
    styleDataRow(r, idx % 2 === 1);
    r.getCell(2).numFmt = QTY_FMT;
    r.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
    r.getCell(3).numFmt = RP_FMT;
    r.getCell(3).alignment = { vertical: "middle", horizontal: "right" };
    r.getCell(4).numFmt = PCT_FMT;
    r.getCell(4).alignment = { vertical: "middle", horizontal: "right" };
  });
  const pmEnd = Math.max(pmStart, pmHeader.number + pmValues.length);
  const pmTotal = ws4.addRow([
    "TOTAL METODE BAYAR",
    { formula: `SUM(B${pmStart}:B${pmEnd})` },
    { formula: `SUM(C${pmStart}:C${pmEnd})` },
    1,
    "",
  ]);
  styleTotalRow(pmTotal);
  pmTotal.getCell(2).numFmt = QTY_FMT;
  pmTotal.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
  pmTotal.getCell(3).numFmt = RP_FMT;
  pmTotal.getCell(3).alignment = { vertical: "middle", horizontal: "right" };
  pmTotal.getCell(4).numFmt = PCT_FMT;
  pmTotal.getCell(4).alignment = { vertical: "middle", horizontal: "right" };

  ws4.addRow([]);

  // Table 4B: Rekap per Kasir
  const kasirHeader = ws4.addRow(["KASIR ON-DUTY", "JML TRANSAKSI", "TUNAI (CASH)", "NON-TUNAI", "TOTAL OMZET"]);
  styleTableHeader(kasirHeader);
  const kStart = kasirHeader.number + 1;
  report.cashierSummary.forEach((k, idx) => {
    const rowNum = kStart + idx;
    const r = ws4.addRow([
      k.cashierName,
      k.txCount,
      k.cashTotal,
      k.nonCashTotal,
      { formula: `C${rowNum}+D${rowNum}` },
    ]);
    styleDataRow(r, idx % 2 === 1);
    r.getCell(2).numFmt = QTY_FMT;
    r.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
    for (let c = 3; c <= 5; c++) {
      r.getCell(c).numFmt = RP_FMT;
      r.getCell(c).alignment = { vertical: "middle", horizontal: "right" };
    }
  });
  const kEnd = Math.max(kStart, kasirHeader.number + report.cashierSummary.length);
  const hasKasir = report.cashierSummary.length > 0;
  const kTotal = ws4.addRow([
    "TOTAL PER KASIR",
    hasKasir ? { formula: `SUM(B${kStart}:B${kEnd})` } : 0,
    hasKasir ? { formula: `SUM(C${kStart}:C${kEnd})` } : 0,
    hasKasir ? { formula: `SUM(D${kStart}:D${kEnd})` } : 0,
    hasKasir ? { formula: `SUM(E${kStart}:E${kEnd})` } : 0,
  ]);
  styleTotalRow(kTotal);
  kTotal.getCell(2).numFmt = QTY_FMT;
  kTotal.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
  for (let c = 3; c <= 5; c++) {
    kTotal.getCell(c).numFmt = RP_FMT;
    kTotal.getCell(c).alignment = { vertical: "middle", horizontal: "right" };
  }

  ws4.addRow([]);

  // Table 4C: Rincian Voucher
  const vHeader = ws4.addRow(["KODE / PROMO VOUCHER", "JML PAKAI", "TOTAL DISKON", "NILAI ORDER BER-VOUCHER", ""]);
  styleTableHeader(vHeader);
  const vStart = vHeader.number + 1;
  if (report.voucherUsage.length === 0) {
    const r = ws4.addRow(["Tidak ada pemakaian voucher", 0, 0, 0, ""]);
    styleDataRow(r, false);
    r.getCell(2).numFmt = QTY_FMT;
    r.getCell(3).numFmt = RP_FMT;
    r.getCell(4).numFmt = RP_FMT;
  } else {
    report.voucherUsage.forEach((v, idx) => {
      const r = ws4.addRow([v.label, v.count, v.totalDiscount, v.totalOrderValue, ""]);
      styleDataRow(r, idx % 2 === 1);
      r.getCell(2).numFmt = QTY_FMT;
      r.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
      r.getCell(3).numFmt = RP_FMT;
      r.getCell(3).alignment = { vertical: "middle", horizontal: "right" };
      r.getCell(4).numFmt = RP_FMT;
      r.getCell(4).alignment = { vertical: "middle", horizontal: "right" };
    });
  }
  const vEnd = Math.max(vStart, vHeader.number + report.voucherUsage.length);
  const hasV = report.voucherUsage.length > 0;
  const vTotal = ws4.addRow([
    "TOTAL VOUCHER",
    hasV ? { formula: `SUM(B${vStart}:B${vEnd})` } : 0,
    hasV ? { formula: `SUM(C${vStart}:C${vEnd})` } : 0,
    hasV ? { formula: `SUM(D${vStart}:D${vEnd})` } : 0,
    "",
  ]);
  styleTotalRow(vTotal);
  vTotal.getCell(2).numFmt = QTY_FMT;
  vTotal.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
  vTotal.getCell(3).numFmt = RP_FMT;
  vTotal.getCell(3).alignment = { vertical: "middle", horizontal: "right" };
  vTotal.getCell(4).numFmt = RP_FMT;
  vTotal.getCell(4).alignment = { vertical: "middle", horizontal: "right" };
  autoFitSheet(ws4);

  // ========================================================================
  // SHEET 5: Rincian Transaksi & Opname
  // ========================================================================
  const ws5 = wb.addWorksheet("Rincian Transaksi & Opname");
  applyBanner(
    ws5,
    `AUDIT TRANSAKSI & LOG STOCK OPNAME — ${store.name.toUpperCase()}`,
    14,
    store,
    startDate,
    endDate,
    printedAt
  );

  const txHeader = ws5.addRow([
    "Tanggal",
    "Jam",
    "No. Order",
    "Status",
    "Kasir",
    "Channel",
    "Metode Bayar",
    "Daftar Item",
    "Omzet Kotor",
    "Diskon",
    "Omzet Bersih",
    "Pajak & Service",
    "Total Dibayar",
    "Catatan / Void",
  ]);
  styleTableHeader(txHeader);
  ws5.views = [{ state: "frozen", ySplit: txHeader.number }];

  const txStart = txHeader.number + 1;
  report.allTxRows.forEach((tx, idx) => {
    const rowNum = txStart + idx;
    const r = ws5.addRow([
      tx.tanggal,
      tx.jam,
      tx.noOrder,
      tx.statusLabel,
      tx.kasir,
      tx.channel,
      tx.metodeBayar,
      tx.daftarItem,
      tx.subtotalKotor,
      tx.diskon,
      { formula: `I${rowNum}-J${rowNum}` },
      tx.pajakService,
      tx.totalDibayar,
      tx.catatan,
    ]);
    styleDataRow(r, idx % 2 === 1);
    for (let c = 9; c <= 13; c++) {
      r.getCell(c).numFmt = RP_FMT;
      r.getCell(c).alignment = { vertical: "middle", horizontal: "right" };
    }
  });

  const txEnd = Math.max(txStart, txHeader.number + report.allTxRows.length);
  const hasTx = report.allTxRows.length > 0;
  const txTotal = ws5.addRow([
    "TOTAL (SEMUA)",
    "",
    "",
    "",
    "",
    "",
    "",
    `${report.allTxRows.length} order (${report.totalOrders} lunas)`,
    hasTx ? { formula: `SUM(I${txStart}:I${txEnd})` } : 0,
    hasTx ? { formula: `SUM(J${txStart}:J${txEnd})` } : 0,
    hasTx ? { formula: `SUM(K${txStart}:K${txEnd})` } : 0,
    hasTx ? { formula: `SUM(L${txStart}:L${txEnd})` } : 0,
    hasTx ? { formula: `SUM(M${txStart}:M${txEnd})` } : 0,
    "",
  ]);
  styleTotalRow(txTotal);
  for (let c = 9; c <= 13; c++) {
    txTotal.getCell(c).numFmt = RP_FMT;
    txTotal.getCell(c).alignment = { vertical: "middle", horizontal: "right" };
  }

  ws5.addRow([]);
  const opHeader = ws5.addRow([
    "LOG STOCK OPNAME",
    "Waktu",
    "Nama Item",
    "Tipe",
    "Stok Sistem",
    "Stok Fisik",
    "Selisih",
    "Staf Pengubah",
    "Catatan",
  ]);
  styleTableHeader(opHeader);

  if (report.opnameLogs.length === 0) {
    const r = ws5.addRow(["-", "-", "Belum ada log stock opname pada periode ini", "-", 0, 0, 0, "-", "-"]);
    styleDataRow(r, false);
  } else {
    report.opnameLogs.forEach((log, idx) => {
      const r = ws5.addRow([
        idx + 1,
        new Date(log.created_at).toLocaleString("id-ID"),
        log.item_name,
        log.item_type,
        Number(log.system_qty || 0),
        Number(log.actual_qty || 0),
        Number(log.difference || 0),
        log.updated_by_staff || "-",
        log.notes || "-",
      ]);
      styleDataRow(r, idx % 2 === 1);
      for (let c = 5; c <= 7; c++) {
        r.getCell(c).numFmt = QTY_FMT;
        r.getCell(c).alignment = { vertical: "middle", horizontal: "right" };
      }
    });
  }
  autoFitSheet(ws5);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = store.name
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  a.href = url;
  a.download = `Laporan-Mukaro-${safeName || store.slug}-${startDate}-sd-${endDate}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
