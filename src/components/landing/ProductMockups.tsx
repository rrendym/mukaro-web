import React from "react";
import {
  QrCode,
  ShoppingBag,
  BellRing,
  CheckCircle2,
  TrendingUp,
  Printer,
  Package,
  Store,
  Plus,
} from "lucide-react";

export function HeroDashboardMockup() {
  const bars = [
    { h: "38%", label: "09:00" },
    { h: "52%", label: "11:00" },
    { h: "84%", label: "13:00" },
    { h: "64%", label: "15:00" },
    { h: "96%", label: "17:00", peak: true },
    { h: "78%", label: "19:00" },
    { h: "56%", label: "21:00" },
  ];

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl overflow-hidden text-left">
      {/* Browser Top Chrome */}
      <div className="h-10 bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
        </div>
        <div className="px-3 py-1 rounded-md bg-white border border-[#E2E8F0] text-[11px] font-mono text-[#475569]">
          mukaro.id/kopi-senja/admin
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-semibold text-[#475569]">
            Live Sync
          </span>
        </div>
      </div>

      {/* App Shell */}
      <div className="grid grid-cols-12 min-h-[340px]">
        {/* Mini Sidebar */}
        <div className="hidden md:flex md:col-span-3 bg-[#0F172A] text-white p-4 flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#2563EB] flex items-center justify-center text-[11px] font-extrabold">
                M
              </div>
              <span className="text-xs font-bold tracking-tight">
                Kopi Senja
              </span>
            </div>
            <div className="space-y-1 text-[11px]">
              {[
                { name: "Dashboard", active: true },
                { name: "Pesanan Live", badge: "4" },
                { name: "Kasir POS" },
                { name: "Menu & Varian" },
                { name: "Stok & Opname" },
                { name: "QR Meja" },
              ].map((item) => (
                <div
                  key={item.name}
                  className={`px-2.5 py-2 rounded-lg flex items-center justify-between ${
                    item.active
                      ? "bg-[#2563EB] text-white font-semibold"
                      : "text-slate-400"
                  }`}
                >
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded-full bg-white/15 text-[10px] font-mono tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>Outlet Buka • 12 Meja QR</span>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="col-span-12 md:col-span-9 bg-[#F8FAFC] p-4 sm:p-5 space-y-4">
          {/* 4 KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Omzet Hari Ini", val: "Rp 4.850.000", delta: "+18.4%" },
              { label: "Total Order", val: "142", delta: "+24 order" },
              { label: "QRIS Otomatis", val: "76%", delta: "108 trx" },
              { label: "Rata-rata Order", val: "Rp 34.150", delta: "+6.2%" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="bg-white rounded-xl border border-[#E2E8F0] p-3"
              >
                <p className="text-[11px] font-medium text-[#475569]">
                  {kpi.label}
                </p>
                <p className="text-sm font-bold text-[#0F172A] font-mono tabular-nums mt-1">
                  {kpi.val}
                </p>
                <p className="text-[10px] font-semibold text-emerald-600 font-mono tabular-nums mt-0.5">
                  {kpi.delta}
                </p>
              </div>
            ))}
          </div>

          {/* Chart + Live Order Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Bar Chart */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F172A]">
                  Penjualan per Jam
                </span>
                <span className="text-[11px] font-mono tabular-nums text-[#2563EB] font-semibold">
                  Peak 17:00
                </span>
              </div>
              <div className="h-32 flex items-end justify-between gap-2 pt-3 border-b border-[#E2E8F0] pb-2">
                {bars.map((b) => (
                  <div
                    key={b.label}
                    className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                  >
                    <div
                      className={`w-full max-w-[28px] rounded-t-md ${
                        b.peak ? "bg-[#2563EB]" : "bg-[#CBD5E1]"
                      }`}
                      style={{ height: b.h }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#475569]">
                {bars.map((b) => (
                  <span key={b.label}>{b.label}</span>
                ))}
              </div>
            </div>

            {/* Live Tickets */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F172A]">
                  Antrean Masuk
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] text-[10px] font-semibold">
                  Real-time
                </span>
              </div>
              {[
                {
                  id: "#MKR-1042",
                  table: "Meja 04",
                  items: "2x Kopi Susu, 1x Croissant",
                  total: "Rp 70.000",
                  status: "LUNAS",
                },
                {
                  id: "#MKR-1041",
                  table: "GoFood",
                  items: "1x Matcha Latte, 1x Katsu",
                  total: "Rp 80.000",
                  status: "PROSES",
                },
                {
                  id: "#MKR-1040",
                  table: "Meja 09",
                  items: "3x Americano Ice",
                  total: "Rp 66.000",
                  status: "SIAP",
                },
              ].map((o) => (
                <div
                  key={o.id}
                  className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono font-bold text-[#0F172A]">
                        {o.id}
                      </span>
                      <span className="text-[10px] font-semibold text-[#475569]">
                        • {o.table}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#475569] truncate">
                      {o.items}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-mono font-bold tabular-nums text-[#0F172A]">
                      {o.total}
                    </p>
                    <span className="text-[9px] font-bold text-[#2563EB]">
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QrMenuMockup() {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#2563EB] text-white text-[10px] font-bold">
              Meja 04
            </span>
            <span className="text-xs font-bold text-[#0F172A]">Kopi Senja</span>
          </div>
          <QrCode className="w-4 h-4 text-[#475569]" />
        </div>

        <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-[#0F172A]">
                Es Kopi Susu Senja
              </p>
              <p className="text-[10px] text-[#475569]">
                Arabika house blend &amp; gula aren
              </p>
            </div>
            <span className="text-xs font-mono font-bold tabular-nums text-[#0F172A]">
              Rp 24.000
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-[#0F172A] text-white text-[10px] font-semibold">
              Ice
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white border border-[#E2E8F0] text-[#475569] text-[10px]">
              Hot
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[#2563EB]/10 border border-[#2563EB]/30 text-[#2563EB] text-[10px] font-semibold">
              Less Sugar
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white border border-[#E2E8F0] text-[#475569] text-[10px]">
              +Oat Milk
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-mono font-semibold text-[#475569]">
            2 item di keranjang
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-[11px] font-bold font-mono tabular-nums">
            Bayar QRIS • Rp 48.000
          </span>
        </div>
      </div>
    </div>
  );
}

export function PosCashierMockup() {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 space-y-3">
        <div className="flex items-center gap-1.5">
          {["Walk-in", "GoFood", "GrabFood", "ShopeeFood"].map((ch, idx) => (
            <span
              key={ch}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                idx === 0
                  ? "bg-[#0F172A] text-white"
                  : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569]"
              }`}
            >
              {ch}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-2.5">
          <div className="col-span-7 grid grid-cols-2 gap-2">
            {[
              { n: "Kopi Susu", p: "Rp 24.000" },
              { n: "Matcha Latte", p: "Rp 29.000" },
              { n: "Croissant", p: "Rp 22.000" },
              { n: "Katsu Don", p: "Rp 38.000" },
            ].map((m) => (
              <div
                key={m.n}
                className="p-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex flex-col justify-between gap-1.5"
              >
                <span className="text-[10px] font-bold text-[#0F172A] truncate">
                  {m.n}
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tabular-nums text-[#475569]">
                    {m.p}
                  </span>
                  <span className="w-4 h-4 rounded-full bg-[#2563EB] text-white flex items-center justify-center">
                    <Plus className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="col-span-5 rounded-lg border border-[#E2E8F0] p-2.5 flex flex-col justify-between bg-white">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-[10px] font-bold text-[#0F172A]">
                <ShoppingBag className="w-3 h-3 text-[#2563EB]" />
                <span>Struk Kasir</span>
              </div>
              <div className="text-[10px] text-[#475569] flex justify-between font-mono tabular-nums">
                <span>1x Kopi Susu</span>
                <span>24.000</span>
              </div>
              <div className="text-[10px] text-[#475569] flex justify-between font-mono tabular-nums">
                <span>1x Croissant</span>
                <span>22.000</span>
              </div>
            </div>
            <div className="pt-2 border-t border-[#E2E8F0] space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold font-mono tabular-nums text-[#0F172A]">
                <span>Total</span>
                <span>Rp 46.000</span>
              </div>
              <div className="w-full py-1 rounded-md bg-[#2563EB] text-white text-[10px] font-bold text-center">
                Bayar Tunai / QRIS
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LiveKitchenMockup() {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        <div className="bg-[#0F172A] text-white px-3.5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="w-3.5 h-3.5 text-[#60A5FA]" />
            <span className="text-xs font-mono font-bold tabular-nums">
              #MKR-1042
            </span>
            <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-semibold">
              Meja 04
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
            LUNAS • QRIS
          </span>
        </div>

        <div className="p-3.5 space-y-2.5">
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="font-semibold text-[#0F172A]">
                2x Es Kopi Susu Senja
              </span>
              <span className="font-mono tabular-nums text-[#475569]">
                Rp 48.000
              </span>
            </div>
            <p className="text-[10px] text-[#475569] pl-3">
              Ice, Less Sugar, +Oat Milk
            </p>
            <div className="flex justify-between">
              <span className="font-semibold text-[#0F172A]">
                1x French Butter Croissant
              </span>
              <span className="font-mono tabular-nums text-[#475569]">
                Rp 22.000
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[#E2E8F0]">
            <span className="flex-1 py-1.5 rounded-lg bg-[#2563EB] text-white text-[11px] font-bold text-center">
              Mulai Buat
            </span>
            <span className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-[11px] font-semibold text-[#0F172A] inline-flex items-center gap-1">
              <Printer className="w-3 h-3" />
              58mm
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecipeStockMockup() {
  const items = [
    { name: "Biji Kopi Arabika", qty: "1.450 gr", pct: "72%", ok: true },
    { name: "Susu UHT Full Cream", qty: "4.200 ml", pct: "84%", ok: true },
    { name: "French Butter Croissant", qty: "3 pcs", pct: "18%", ok: false },
  ];

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A]">
            <Package className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Stok Bahan Baku &amp; Resep</span>
          </div>
          <span className="text-[10px] font-mono text-[#475569]">
            Auto-deduct
          </span>
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.name}
              className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#0F172A]">
                  {item.name}
                </span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    item.ok ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {item.qty}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    item.ok ? "bg-[#2563EB]" : "bg-rose-500"
                  }`}
                  style={{ width: item.pct }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RevenueChartMockup() {
  const days = [
    { d: "Sen", h: "45%", v: "3.1jt" },
    { d: "Sel", h: "58%", v: "4.0jt" },
    { d: "Rab", h: "50%", v: "3.5jt" },
    { d: "Kam", h: "72%", v: "4.9jt" },
    { d: "Jum", h: "88%", v: "6.1jt" },
    { d: "Sab", h: "100%", v: "7.2jt", peak: true },
    { d: "Min", h: "82%", v: "5.7jt" },
  ];

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
      <div className="lg:col-span-8 bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#2563EB]" />
            <span className="text-xs font-bold text-[#0F172A]">
              Grafik Omzet Mingguan
            </span>
          </div>
          <span className="text-xs font-mono font-bold tabular-nums text-[#0F172A]">
            Rp 34.500.000
          </span>
        </div>

        <div className="h-28 flex items-end justify-between gap-3 pt-2 border-b border-[#E2E8F0] pb-2">
          {days.map((item) => (
            <div
              key={item.d}
              className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
            >
              <span className="text-[9px] font-mono tabular-nums text-[#475569]">
                {item.v}
              </span>
              <div
                className={`w-full max-w-[36px] rounded-t-md ${
                  item.peak ? "bg-[#2563EB]" : "bg-blue-200"
                }`}
                style={{ height: item.h }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] font-mono text-[#475569]">
          {days.map((item) => (
            <span key={item.d} className="flex-1 text-center">
              {item.d}
            </span>
          ))}
        </div>
      </div>

      <div className="lg:col-span-4 space-y-2.5">
        {[
          { ch: "QR Self-Order", pct: "54%", amt: "Rp 18.630.000" },
          { ch: "Kasir Walk-in", pct: "28%", amt: "Rp 9.660.000" },
          { ch: "GoFood & GrabFood", pct: "18%", amt: "Rp 6.210.000" },
        ].map((row) => (
          <div
            key={row.ch}
            className="bg-white rounded-xl border border-[#E2E8F0] p-3 flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold text-[#0F172A]">{row.ch}</p>
              <p className="text-[11px] font-mono tabular-nums text-[#475569]">
                {row.amt}
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#2563EB] text-[11px] font-mono font-bold tabular-nums">
              {row.pct}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StepInputMenuMini() {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-2">
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-2.5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-[#0F172A]">
            Es Kopi Susu Senja
          </p>
          <p className="text-[10px] font-mono tabular-nums text-[#475569]">
            Reg: Rp 24.000 • Ojol: Rp 29.000
          </p>
        </div>
        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold">
          Aktif
        </span>
      </div>
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-2.5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-[#0F172A]">
            Uji Matcha Latte
          </p>
          <p className="text-[10px] font-mono tabular-nums text-[#475569]">
            3 Grup Varian • Resep 12gr
          </p>
        </div>
        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold">
          Aktif
        </span>
      </div>
    </div>
  );
}

export function StepPrintQrMini() {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 flex items-center gap-3">
      <div className="w-16 h-16 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0">
        <QrCode className="w-10 h-10 text-[#0F172A]" />
      </div>
      <div className="space-y-1 min-w-0">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-[#2563EB] text-[10px] font-bold">
          <Store className="w-3 h-3" />
          Meja 01 – Meja 20
        </span>
        <p className="text-[11px] font-bold text-[#0F172A] truncate">
          qr-kopi-senja-meja-04.png
        </p>
        <p className="text-[10px] text-[#475569]">
          Siap cetak PNG resolusi tinggi
        </p>
      </div>
    </div>
  );
}

export function StepMonitorSalesMini() {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-2">
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <p className="text-[11px] font-bold text-[#0F172A]">
              QRIS Otomatis Lunas
            </p>
            <p className="text-[10px] font-mono text-[#475569]">
              #MKR-1042 • Meja 04
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono font-bold tabular-nums text-[#2563EB]">
          +Rp 70.000
        </span>
      </div>
      <div className="bg-white rounded-lg border border-[#E2E8F0] px-2.5 py-2 flex items-center justify-between text-[10px] text-[#475569]">
        <span>Stok bahan terpotong otomatis</span>
        <span className="font-mono font-semibold text-[#0F172A]">
          Real-time
        </span>
      </div>
    </div>
  );
}
