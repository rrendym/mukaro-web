"use client";

import React from "react";
import { Store } from "@/types/database";
import { formatRupiah } from "@/lib/format";
import { ComputedReportData } from "@/lib/report-export";

interface ReportsPrintViewProps {
  store: Store;
  startDate: string;
  endDate: string;
  printedAt: string;
  report: ComputedReportData;
}

export function ReportsPrintView({
  store,
  startDate,
  endDate,
  printedAt,
  report,
}: ReportsPrintViewProps) {
  return (
    <div className="hidden print:block text-slate-900 bg-white text-[11px] leading-snug space-y-5">
      {/* 1. Kop Laporan & Identitas Periode */}
      <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Laporan Eksekutif &amp; Audit Operasional
          </p>
          <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">
            {store.name}
          </h1>
          <p className="text-[10px] text-slate-600">
            Outlet: /{store.slug} • Kasir On-Duty:{" "}
            <strong>{store.active_staff_name || "-"}</strong>
          </p>
        </div>
        <div className="text-right text-[10px] space-y-0.5">
          <p>
            Periode: <strong>{startDate}</strong> s/d <strong>{endDate}</strong>
          </p>
          <p>Dicetak: {printedAt}</p>
          <p>Total Order Lunas: {report.totalOrders} trx</p>
        </div>
      </div>

      {/* 2. Ringkasan Keuangan, Pajak & Kas Closing */}
      <div className="grid grid-cols-2 gap-4 print-break-inside-avoid">
        <div className="border border-slate-300 rounded-lg p-3 space-y-1.5">
          <h2 className="text-xs font-extrabold uppercase tracking-wide border-b border-slate-200 pb-1">
            Ringkasan Keuangan &amp; Pajak
          </h2>
          <div className="flex justify-between">
            <span>Total Transaksi Sukses</span>
            <strong className="font-mono">{report.totalOrders} trx</strong>
          </div>
          <div className="flex justify-between">
            <span>Omzet Kotor (Subtotal Item)</span>
            <strong className="font-mono">{formatRupiah(report.totalGross)}</strong>
          </div>
          <div className="flex justify-between">
            <span>Total Diskon / Voucher</span>
            <strong className="font-mono">-{formatRupiah(report.totalDiscount)}</strong>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1">
            <span className="font-bold">Omzet Bersih (Kotor - Diskon)</span>
            <strong className="font-mono">{formatRupiah(report.totalNet)}</strong>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Pajak (PB1/Tax)</span>
            <span className="font-mono">{formatRupiah(report.totalTax)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Service Charge</span>
            <span className="font-mono">{formatRupiah(report.totalService)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Penerimaan Pelanggan</span>
            <strong className="font-mono">{formatRupiah(report.totalCollected)}</strong>
          </div>
          <div className="flex justify-between">
            <span>Total Estimasi HPP</span>
            <span className="font-mono">{formatRupiah(report.totalHpp)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1">
            <span className="font-bold">
              Estimasi Laba Kotor ({(report.grossMarginRatio * 100).toFixed(1)}%)
            </span>
            <strong className="font-mono">{formatRupiah(report.totalProfit)}</strong>
          </div>
          <div className="flex justify-between">
            <span>Rata-rata Nilai Order (AOV)</span>
            <strong className="font-mono">{formatRupiah(report.aov)}</strong>
          </div>
        </div>

        <div className="space-y-3">
          <div className="border border-slate-300 rounded-lg p-3 space-y-1.5">
            <h2 className="text-xs font-extrabold uppercase tracking-wide border-b border-slate-200 pb-1">
              Rekonsiliasi Kas Closing
            </h2>
            <div className="flex justify-between">
              <span>Modal Awal Deposit Kasir</span>
              <strong className="font-mono">{formatRupiah(report.cashInitial)}</strong>
            </div>
            <div className="flex justify-between">
              <span>+ Pemasukan Tunai (Cash)</span>
              <strong className="font-mono">+{formatRupiah(report.cashSales)}</strong>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
              <span>Estimasi Sisa Kas Closing</span>
              <strong className="font-mono">
                {formatRupiah(report.estimatedClosingCash)}
              </strong>
            </div>
            <div className="flex justify-between text-slate-600 pt-0.5">
              <span>Total Non-Tunai (QRIS + Ojol)</span>
              <strong className="font-mono">{formatRupiah(report.nonCashSales)}</strong>
            </div>
          </div>

          {/* 3. Kontrol Risiko & Pola Operasional */}
          <div className="border border-slate-300 rounded-lg p-3 space-y-1.5">
            <h2 className="text-xs font-extrabold uppercase tracking-wide border-b border-slate-200 pb-1">
              Kontrol Risiko &amp; Pola Operasional
            </h2>
            <div className="flex justify-between">
              <span>Order Batal / Void / Refund</span>
              <strong className="font-mono">
                {report.voidRefundCount} trx ({formatRupiah(report.voidRefundAmount)})
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Jam Tersibuk (Peak Hour)</span>
              <strong className="font-mono">{report.peakHourLabel}</strong>
            </div>
            <div className="flex justify-between">
              <span>Hari Teramai</span>
              <strong className="font-mono">{report.busiestDayLabel}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Rekap per Kasir / Shift On-Duty */}
      <div className="print-break-inside-avoid space-y-1.5">
        <h2 className="text-xs font-extrabold uppercase tracking-wide">
          Rekap Setoran per Kasir / Shift On-Duty
        </h2>
        <table className="w-full border-collapse border border-slate-300 text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2 py-1 text-left">Nama Kasir</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Jml Transaksi</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Tunai (Cash)</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Non-Tunai</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Total Omzet</th>
            </tr>
          </thead>
          <tbody>
            {report.cashierSummary.length === 0 ? (
              <tr>
                <td colSpan={5} className="border border-slate-300 px-2 py-1.5 text-center text-slate-500">
                  Tidak ada data transaksi pada periode ini.
                </td>
              </tr>
            ) : (
              report.cashierSummary.map((k) => (
                <tr key={k.cashierName}>
                  <td className="border border-slate-300 px-2 py-1 font-semibold">{k.cashierName}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{k.txCount}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(k.cashTotal)}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(k.nonCashTotal)}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono font-bold">{formatRupiah(k.grandTotal)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Tabel Rekap Harian */}
      <div className="space-y-1.5">
        <h2 className="text-xs font-extrabold uppercase tracking-wide">
          Rekap Penjualan Harian ({report.dailyBreakdown.length} Hari)
        </h2>
        <table className="w-full border-collapse border border-slate-300 text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2 py-1 text-left">Tanggal</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Trx</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Omzet Kotor</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Diskon</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Omzet Bersih</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Tunai</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Non-Tunai</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Est. Laba Kotor</th>
            </tr>
          </thead>
          <tbody>
            {report.dailyBreakdown.length === 0 ? (
              <tr>
                <td colSpan={8} className="border border-slate-300 px-2 py-1.5 text-center text-slate-500">
                  Belum ada transaksi pada periode ini.
                </td>
              </tr>
            ) : (
              <>
                {report.dailyBreakdown.map((d) => (
                  <tr key={d.date}>
                    <td className="border border-slate-300 px-2 py-1 font-mono">{d.date}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">{d.txCount}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(d.gross)}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(d.discount)}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono font-bold">{formatRupiah(d.net)}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(d.cash)}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(d.nonCash)}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(d.profit)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold">
                  <td className="border border-slate-300 px-2 py-1">TOTAL</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{report.totalOrders}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(report.totalGross)}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(report.totalDiscount)}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(report.totalNet)}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(report.cashSales)}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(report.nonCashSales)}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(report.totalProfit)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Tabel Rincian Penjualan per Menu / Item */}
      <div className="space-y-1.5 print-page-break">
        <h2 className="text-xs font-extrabold uppercase tracking-wide">
          Rincian Penjualan per Menu / Item ({report.menuPerformance.length} Menu)
        </h2>
        <table className="w-full border-collapse border border-slate-300 text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2 py-1 text-left">#</th>
              <th className="border border-slate-300 px-2 py-1 text-left">Nama Menu</th>
              <th className="border border-slate-300 px-2 py-1 text-left">Kategori</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Qty</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Omzet Item</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Est. HPP</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Est. Laba</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Kontribusi</th>
            </tr>
          </thead>
          <tbody>
            {report.menuPerformance.length === 0 ? (
              <tr>
                <td colSpan={8} className="border border-slate-300 px-2 py-1.5 text-center text-slate-500">
                  Belum ada penjualan menu pada periode ini.
                </td>
              </tr>
            ) : (
              report.menuPerformance.map((m) => (
                <tr key={m.name}>
                  <td className="border border-slate-300 px-2 py-1 font-mono">#{m.rank}</td>
                  <td className="border border-slate-300 px-2 py-1 font-semibold">{m.name}</td>
                  <td className="border border-slate-300 px-2 py-1">{m.category}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{m.qty}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(m.omzet)}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(m.hpp)}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono font-bold">{formatRupiah(m.profit)}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                    {(m.contributionPct * 100).toFixed(1)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 6. Rincian Channel Pembayaran & Efektivitas Voucher */}
      <div className="grid grid-cols-2 gap-4 print-break-inside-avoid">
        <div className="space-y-1.5">
          <h2 className="text-xs font-extrabold uppercase tracking-wide">
            Rincian Metode &amp; Channel Pembayaran
          </h2>
          <table className="w-full border-collapse border border-slate-300 text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-2 py-1 text-left">Metode / Channel</th>
                <th className="border border-slate-300 px-2 py-1 text-right">Trx</th>
                <th className="border border-slate-300 px-2 py-1 text-right">Nominal</th>
                <th className="border border-slate-300 px-2 py-1 text-right">Porsi</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(report.paymentMethods).map((pm) => {
                const pct =
                  report.totalCollected > 0
                    ? ((pm.omzet / report.totalCollected) * 100).toFixed(1)
                    : "0.0";
                return (
                  <tr key={pm.label}>
                    <td className="border border-slate-300 px-2 py-1 font-semibold">{pm.label}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">{pm.count}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(pm.omzet)}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xs font-extrabold uppercase tracking-wide">
            Efektivitas Voucher &amp; Promo
          </h2>
          <table className="w-full border-collapse border border-slate-300 text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-2 py-1 text-left">Voucher / Promo</th>
                <th className="border border-slate-300 px-2 py-1 text-right">Pakai</th>
                <th className="border border-slate-300 px-2 py-1 text-right">Total Diskon</th>
                <th className="border border-slate-300 px-2 py-1 text-right">Nilai Order</th>
              </tr>
            </thead>
            <tbody>
              {report.voucherUsage.length === 0 ? (
                <tr>
                  <td colSpan={4} className="border border-slate-300 px-2 py-1.5 text-center text-slate-500">
                    Tidak ada pemakaian voucher pada periode ini.
                  </td>
                </tr>
              ) : (
                report.voucherUsage.map((v) => (
                  <tr key={v.label}>
                    <td className="border border-slate-300 px-2 py-1 font-semibold">{v.label}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">{v.count}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(v.totalDiscount)}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatRupiah(v.totalOrderValue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Audit Stok Opname, Stok Menipis & Lembar Verifikasi Atasan */}
      <div className="space-y-3 print-break-inside-avoid">
        <h2 className="text-xs font-extrabold uppercase tracking-wide">
          Audit Stock Opname &amp; Daftar Stok Menipis
        </h2>

        {report.largestOpnameDiff && (
          <p className="text-[10px] border border-slate-300 bg-slate-50 rounded px-2.5 py-1.5">
            <strong>Sorotan Selisih Terbesar:</strong> {report.largestOpnameDiff.item_name} (
            {report.largestOpnameDiff.difference > 0
              ? `+${report.largestOpnameDiff.difference}`
              : report.largestOpnameDiff.difference}
            ) • Staf: {report.largestOpnameDiff.updated_by_staff || "-"}
          </p>
        )}

        <table className="w-full border-collapse border border-slate-300 text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2 py-1 text-left">Waktu</th>
              <th className="border border-slate-300 px-2 py-1 text-left">Item</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Sistem</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Fisik</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Selisih</th>
              <th className="border border-slate-300 px-2 py-1 text-left">Staf</th>
              <th className="border border-slate-300 px-2 py-1 text-left">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {report.opnameLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="border border-slate-300 px-2 py-1.5 text-center text-slate-500">
                  Tidak ada log stock opname pada periode ini.
                </td>
              </tr>
            ) : (
              report.opnameLogs.slice(0, 15).map((l) => (
                <tr key={l.id}>
                  <td className="border border-slate-300 px-2 py-1 font-mono">
                    {new Date(l.created_at).toLocaleDateString("id-ID")}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 font-semibold">{l.item_name}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{l.system_qty}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{l.actual_qty}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono font-bold">
                    {l.difference > 0 ? `+${l.difference}` : l.difference}
                  </td>
                  <td className="border border-slate-300 px-2 py-1">{l.updated_by_staff || "-"}</td>
                  <td className="border border-slate-300 px-2 py-1">{l.notes || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {report.lowStockItems.length > 0 && (
          <div className="border border-slate-300 rounded p-2.5 text-[10px]">
            <p className="font-bold mb-1">
              Stok Menipis / Perlu Restock ({report.lowStockItems.length} item):
            </p>
            <p className="text-slate-700">
              {report.lowStockItems
                .map((i) => `${i.name} (sisa ${i.currentQty} ${i.unit}, min ${i.minQty})`)
                .join(" • ")}
            </p>
          </div>
        )}

        {/* Lembar Verifikasi & Tanda Tangan Atasan */}
        <div className="border border-slate-300 rounded-lg p-3 space-y-4 mt-4 print-break-inside-avoid">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-700">
              Status Rekonsiliasi &amp; Catatan Review Atasan:
            </p>
            <div className="h-12 border-b border-dashed border-slate-300 mt-2" />
          </div>
          <div className="grid grid-cols-2 gap-8 pt-2 text-center text-[10px]">
            <div>
              <p className="font-semibold">Dibuat Oleh (Kasir / Admin)</p>
              <div className="h-14" />
              <p className="border-t border-slate-400 pt-1 inline-block px-6">
                ({store.active_staff_name || "____________________"})
              </p>
            </div>
            <div>
              <p className="font-semibold">Diperiksa Oleh (Owner / Atasan)</p>
              <div className="h-14" />
              <p className="border-t border-slate-400 pt-1 inline-block px-6">
                (____________________)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
