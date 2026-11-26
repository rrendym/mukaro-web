"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Menu as MenuIcon,
  X,
  QrCode,
  Printer,
  MessageCircle,
  CreditCard,
  Bike,
  UtensilsCrossed,
  ShoppingBag,
  Zap,
} from "lucide-react";
import { MukaroLogo } from "@/components/MukaroLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  HeroDashboardMockup,
  QrMenuMockup,
  PosCashierMockup,
  LiveKitchenMockup,
  RecipeStockMockup,
  RevenueChartMockup,
  StepInputMenuMini,
  StepPrintQrMini,
  StepMonitorSalesMini,
} from "@/components/landing/ProductMockups";

const ADMIN_WA_URL =
  "https://wa.me/6282118699431?text=Halo%20Admin%20Mukaro%2C%20saya%20tertarik%20pakai%20sistem%20QR%20Self-Order%20%26%20POS%20untuk%20usaha%20saya.";

const ECOSYSTEM_TOP = [
  { name: "QRIS", icon: QrCode },
  { name: "GoFood", icon: Bike },
  { name: "GrabFood", icon: ShoppingBag },
  { name: "ShopeeFood", icon: UtensilsCrossed },
];

const ECOSYSTEM_BOTTOM = [
  { name: "Midtrans", icon: CreditCard },
  { name: "WhatsApp", icon: MessageCircle },
  { name: "Thermal 58mm", icon: Printer },
];

const ECOSYSTEM_ALL = [...ECOSYSTEM_TOP, ...ECOSYSTEM_BOTTOM];

const FAQS = [
  {
    q: "Apakah QRIS di Mukaro dikenakan potongan tambahan dari Mukaro?",
    a: "Tidak. Mukaro mengenakan 0% potongan komisi transaksi. Dana QRIS langsung masuk ke akun Midtrans atau rekening QRIS Statis milik usaha Anda sendiri.",
  },
  {
    q: "Bagaimana jika kedai belum punya akun Midtrans?",
    a: "Anda tetap bisa langsung berjualan dengan mengunggah gambar QRIS Statis toko atau menerima pembayaran tunai di kasir.",
  },
  {
    q: "Apakah bisa cetak struk ke printer thermal 58mm?",
    a: "Bisa. Mukaro menyediakan pratinjau dan layout cetak khusus kertas thermal 58mm langsung dari browser di HP, tablet, maupun laptop kasir.",
  },
  {
    q: "Apakah perlu beli perangkat kasir (hardware) khusus?",
    a: "Tidak perlu. Mukaro berjalan 100% di browser modern — cocok untuk Kedai Kopi, Resto, Warmindo, hingga Food Court memakai tablet, laptop, atau HP yang sudah ada.",
  },
  {
    q: "Bagaimana jika koneksi internet di outlet sedang lambat?",
    a: "Tampilan menu customer dioptimalkan ringan dengan kompresi gambar otomatis di bawah 200KB sehingga tetap cepat dibuka lewat jaringan seluler.",
  },
  {
    q: "Bisakah membedakan harga menu Dine-in dengan GoFood/GrabFood?",
    a: "Bisa. Setiap menu memiliki kolom Harga Reguler dan Harga Khusus Ojol yang otomatis aktif saat kasir memilih channel GoFood, GrabFood, atau ShopeeFood.",
  },
  {
    q: "Apakah ada masa coba gratis sebelum berlangganan?",
    a: "Ya, setiap outlet baru otomatis mendapatkan masa uji coba gratis penuh selama 14 hari tanpa perlu kartu kredit.",
  },
  {
    q: "Apakah data stok bahan baku dan order aman jika masa aktif habis?",
    a: "Seluruh data menu, resep, dan riwayat transaksi tersimpan aman. Setelah perpanjangan aktif kembali, Anda langsung bisa melanjutkan operasional.",
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const pricing = {
    starter: billingCycle === "monthly" ? "Rp 79.000" : "Rp 63.000",
    pro: billingCycle === "monthly" ? "Rp 149.000" : "Rp 119.000",
    enterprise: billingCycle === "monthly" ? "Rp 299.000" : "Rp 239.000",
  };

  const leftFaqs = FAQS.slice(0, 4);
  const rightFaqs = FAQS.slice(4, 8);

  const renderFaqCard = (item: { q: string; a: string }, idx: number) => {
    const isOpen = openFaqIdx === idx;
    return (
      <div
        key={item.q}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden"
      >
        <button
          type="button"
          onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
          className="w-full px-5 py-4 text-left flex items-center justify-between gap-3 cursor-pointer"
        >
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {item.q}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {isOpen && (
          <div className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-3">
            {item.a}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* 1. Minimalist Sticky Navbar */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-[#090D16]/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0">
            <MukaroLogo size="sm" />
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a
              href="#fitur"
              className="hover:text-slate-900 dark:hover:text-white transition"
            >
              Fitur
            </a>
            <a
              href="#ekosistem"
              className="hover:text-slate-900 dark:hover:text-white transition"
            >
              Ekosistem
            </a>
            <a
              href="#cara-kerja"
              className="hover:text-slate-900 dark:hover:text-white transition"
            >
              Cara Kerja
            </a>
            <a
              href="#harga"
              className="hover:text-slate-900 dark:hover:text-white transition"
            >
              Harga
            </a>
            <a
              href="#faq"
              className="hover:text-slate-900 dark:hover:text-white transition"
            >
              FAQ
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-[#2563EB] transition"
            >
              Masuk
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition"
            >
              Mulai Gratis
            </Link>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <MenuIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-4 py-4 space-y-3">
            <div className="flex flex-col space-y-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <a
                href="#fitur"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-slate-900 dark:hover:text-white"
              >
                Fitur
              </a>
              <a
                href="#ekosistem"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-slate-900 dark:hover:text-white"
              >
                Ekosistem
              </a>
              <a
                href="#cara-kerja"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-slate-900 dark:hover:text-white"
              >
                Cara Kerja
              </a>
              <a
                href="#harga"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-slate-900 dark:hover:text-white"
              >
                Harga
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-slate-900 dark:hover:text-white"
              >
                FAQ
              </a>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2.5">
              <Link
                href="/login"
                className="py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-center text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                Masuk
              </Link>
              <Link
                href="/login"
                className="py-2.5 rounded-lg bg-[#2563EB] text-center text-sm font-semibold text-white"
              >
                Mulai Gratis
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* 2. Centered Hero + Soft Blue Glow UI Showcase */}
        <section className="pt-14 pb-20 sm:pt-20 sm:pb-28 px-4 sm:px-6 overflow-hidden">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F8FAFC] dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-[#2563EB]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
              <span>
                QR Self-Order &amp; POS untuk Kedai Kopi, Resto, Warmindo, Food
                Court &amp; Cloud Kitchen
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] text-slate-900 dark:text-slate-100 leading-[1.08] max-w-4xl mx-auto">
              Ubah Antrean Usaha Kuliner Jadi Transaksi Otomatis
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Dari kedai kopi, resto keluarga, warmindo, food court, hingga
              cloud kitchen — pelanggan scan QR di meja, pilih varian, dan bayar
              QRIS langsung dari HP. Order otomatis masuk kasir POS, layar
              dapur, dan memotong stok bahan baku.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/kopi-senja"
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] hover:bg-[#F8FAFC] dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-semibold transition inline-flex items-center justify-center gap-2"
              >
                <span>Coba Demo Menu</span>
                <ArrowRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition inline-flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Mulai Gratis 14 Hari</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* 2 Structured Micro-Indicator Rows */}
            <div className="pt-2 flex flex-col items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F8FAFC] dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0" />
                <span>
                  <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    0% potongan komisi transaksi
                  </strong>{" "}
                  — seluruh omzet masuk 100% ke rekening Anda
                </span>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F8FAFC] dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
                <Zap className="w-4 h-4 text-[#2563EB] shrink-0" />
                <span>
                  <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    Setup instan dalam 5 menit
                  </strong>{" "}
                  — langsung pakai dari HP, tablet, atau laptop
                </span>
              </div>
            </div>
          </div>

          {/* Dashboard Showcase with Soft Blue Glow */}
          <div className="max-w-5xl mx-auto mt-12 relative">
            <div
              className="absolute -inset-x-6 -bottom-8 top-10 bg-[#2563EB]/20 blur-3xl rounded-full pointer-events-none"
              aria-hidden="true"
            />
            <div className="relative z-10">
              <HeroDashboardMockup />
            </div>
          </div>
        </section>

        {/* 3. Bento Feature Grid */}
        <section
          id="fitur"
          className="py-20 sm:py-24 px-4 sm:px-6 border-t border-slate-200 dark:border-slate-800"
        >
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                Operasional Terintegrasi
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-slate-900 dark:text-slate-100">
                Fitur Lengkap Operasional Usaha Kuliner
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Semua kebutuhan pemesanan mandiri, kasir POS, dapur, hingga
                kontrol bahan baku dalam satu sistem yang bersih dan cepat.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Row 1 Left */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-100">
                    QR Self-Order Meja
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Customer scan QR unik per meja, pilih suhu, level pedas,
                    gula, atau topping tambahan tanpa perlu antre di depan
                    kasir.
                  </p>
                </div>
                <QrMenuMockup />
              </div>

              {/* Row 1 Right */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-100">
                    Kasir Manual POS &amp; Ojol
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Catat pesanan walk-in maupun GoFood, GrabFood, dan
                    ShopeeFood dengan harga khusus ojol yang otomatis
                    menyesuaikan.
                  </p>
                </div>
                <PosCashierMockup />
              </div>

              {/* Row 2 Left */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-100">
                    Layar Dapur Live &amp; Struk 58mm
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Order lunas langsung berbunyi di layar dapur secara
                    real-time. Update status dari antrean hingga siap diambil,
                    plus cetak struk thermal 58mm.
                  </p>
                </div>
                <LiveKitchenMockup />
              </div>

              {/* Row 2 Right */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-100">
                    Stok Resep &amp; Stock Opname
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Hubungkan gramasi bahan baku ke setiap menu. Setiap transaksi
                    otomatis memotong stok dan memberi peringatan saat menipis.
                  </p>
                </div>
                <RecipeStockMockup />
              </div>

              {/* Row 3 Full Width */}
              <div className="md:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-5">
                <div className="max-w-2xl space-y-2">
                  <h3 className="text-lg font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-100">
                    Analitik Omzet &amp; Rekap Google Sheets / PDF
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Pantau performa penjualan harian, kontribusi omzet per
                    channel, jam paling ramai, serta export laporan 3 tab siap
                    Google Sheets &amp; PDF.
                  </p>
                </div>
                <RevenueChartMockup />
              </div>
            </div>
          </div>
        </section>

        {/* 4. Symmetrical App Ecosystem (Mobile 4+3 Grid, Desktop 1 Centered Row) */}
        <section
          id="ekosistem"
          className="py-20 sm:py-24 px-4 sm:px-6 bg-[#F8FAFC] dark:bg-[#0B1120] border-y border-slate-200 dark:border-slate-800"
        >
          <div className="max-w-5xl mx-auto text-center space-y-10">
            {/* Mobile (< 640px): 4 icons top row + 3 icons centered bottom row */}
            <div className="sm:hidden">
              <div className="grid grid-cols-4 gap-2.5 justify-items-center">
                {ECOSYSTEM_TOP.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.name}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100">
                        <Icon className="w-6 h-6 text-[#2563EB]" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-2.5 mt-2.5">
                {ECOSYSTEM_BOTTOM.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.name}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100">
                        <Icon className="w-6 h-6 text-[#2563EB]" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop (sm+): 1 centered row */}
            <div className="hidden sm:flex flex-wrap justify-center gap-5">
              {ECOSYSTEM_ALL.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.name}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-center text-slate-900 dark:text-slate-100 hover:border-[#2563EB] transition">
                      <Icon className="w-6 h-6 text-[#2563EB]" />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="max-w-2xl mx-auto space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                Ekosistem Terbuka
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-slate-900 dark:text-slate-100">
                Terhubung dengan Ekosistem F&amp;B
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                Dari pembayaran QRIS Midtrans, pencatatan pesanan aplikasi ojol,
                notifikasi WhatsApp kasir, hingga printer struk thermal 58mm —
                semuanya siap bekerja bersama tanpa konfigurasi rumit.
              </p>
            </div>
          </div>
        </section>

        {/* 5. 3 Langkah Mudah */}
        <section id="cara-kerja" className="py-20 sm:py-24 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                Alur Cepat
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-slate-900 dark:text-slate-100">
                Mulai Operasional dalam 3 Langkah
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  title: "Input Menu & Varian",
                  desc: "Upload foto menu, atur harga reguler & ojol, serta tambahkan pilihan varian suhu, level pedas, atau add-on.",
                  mockup: <StepInputMenuMini />,
                },
                {
                  step: "02",
                  title: "Cetak QR Meja",
                  desc: "Generate QR Code otomatis untuk setiap nomor meja atau counter kasir dalam format PNG siap cetak.",
                  mockup: <StepPrintQrMini />,
                },
                {
                  step: "03",
                  title: "Terima Order & Pantau Omzet",
                  desc: "Pelanggan scan dan bayar QRIS. Order langsung masuk dapur, stok terpotong, omzet tercatat rapi.",
                  mockup: <StepMonitorSalesMini />,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 flex flex-col justify-between gap-5"
                >
                  <div className="space-y-2">
                    <span className="inline-block font-mono tabular-nums text-xs font-bold text-[#2563EB] bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md">
                      Langkah {item.step}
                    </span>
                    <h3 className="text-lg font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  {item.mockup}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Bold & Contrasting 3-Tier Pricing Section */}
        <section
          id="harga"
          className="py-20 sm:py-24 px-4 sm:px-6 bg-slate-950 text-white relative overflow-hidden"
        >
          <div
            className="absolute inset-x-0 top-0 h-80 bg-[#2563EB]/25 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="max-w-6xl mx-auto space-y-14 relative z-10">
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Harga Transparan
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-white">
                Pilih Paket Sesuai Skala Bisnis
              </h2>
              <p className="text-sm sm:text-base text-slate-300">
                Mulai gratis 14 hari tanpa kartu kredit. 0% komisi per
                transaksi.
              </p>

              {/* Billing Toggle */}
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    billingCycle === "monthly"
                      ? "bg-[#2563EB] text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Bulanan
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer ${
                    billingCycle === "yearly"
                      ? "bg-[#2563EB] text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>Tahunan</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                    Hemat 20%
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch pt-2">
              {/* Starter */}
              <div className="rounded-2xl border-2 border-slate-800 bg-slate-900/90 p-7 flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Starter</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Untuk kedai kopi rintisan, warmindo &amp; booth minuman.
                    </p>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl md:text-5xl font-extrabold font-mono tabular-nums tracking-[-0.03em] text-white">
                      {pricing.starter}
                    </span>
                    <span className="text-xs text-slate-400">/bln</span>
                  </div>
                  <ul className="space-y-2.5 pt-2 text-sm text-slate-300">
                    {[
                      "1 Outlet aktif",
                      "Maksimal 10 meja QR",
                      "Kasir POS manual",
                      "Cetak struk thermal 58mm",
                      "QRIS Statis & pembayaran tunai",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/login"
                  className="w-full py-3 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-800/60 text-center text-sm font-semibold text-white transition"
                >
                  Pilih Starter
                </Link>
              </div>

              {/* Pro (Highlighted & Elevated) */}
              <div className="rounded-2xl border-2 border-[#3B82F6] bg-gradient-to-b from-[#1E3A8A] to-[#0F172A] p-7 ring-4 ring-blue-500/20 md:-translate-y-3 flex flex-col justify-between gap-6 relative shadow-2xl">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-[#2563EB] border border-blue-400 text-white text-[11px] font-extrabold tracking-wider uppercase">
                  PALING DIMINATI
                </span>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Pro</h3>
                    <p className="text-xs text-blue-200 mt-1">
                      Untuk kedai kopi, resto &amp; cloud kitchen penuh.
                    </p>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl md:text-5xl font-extrabold font-mono tabular-nums tracking-[-0.03em] text-white">
                      {pricing.pro}
                    </span>
                    <span className="text-xs text-blue-200">/bln</span>
                  </div>
                  <ul className="space-y-2.5 pt-2 text-sm text-slate-100">
                    {[
                      "Meja QR Unlimited",
                      "QRIS Otomatis Midtrans",
                      "Harga terpisah GoFood / Grab / Shopee",
                      "Stok Resep & Stock Opname",
                      "Voucher Promo & PIN Staf Void",
                      "Rekap Perkembangan Penjualan & Export Google Sheets (3 Tab) / PDF",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/login"
                  className="w-full py-3.5 rounded-xl bg-white hover:bg-blue-50 text-center text-sm font-bold text-[#1E3A8A] transition shadow-md"
                >
                  Mulai Gratis 14 Hari
                </Link>
              </div>

              {/* Enterprise */}
              <div className="rounded-2xl border-2 border-slate-800 bg-slate-900/90 p-7 flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Enterprise</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Untuk multi-cabang &amp; pengelola food court.
                    </p>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl md:text-5xl font-extrabold font-mono tabular-nums tracking-[-0.03em] text-white">
                      {pricing.enterprise}
                    </span>
                    <span className="text-xs text-slate-400">/bln</span>
                  </div>
                  <p className="text-[11px] font-medium text-blue-300 bg-blue-950/60 border border-blue-900 rounded-lg px-3 py-2">
                    Cabang tambahan di atas 3 outlet hanya{" "}
                    <strong className="font-mono">+Rp 75.000</strong> / outlet /
                    bulan.
                  </p>
                  <ul className="space-y-2.5 pt-1 text-sm text-slate-300">
                    {[
                      "Hingga 3 Outlet / Tenant",
                      "Laporan konsolidasi lintas cabang",
                      "Dukungan multi-kasir & dapur",
                      "Rekap Perkembangan Penjualan & Export Google Sheets (3 Tab) / PDF",
                      "Pendampingan onboarding prioritas",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/login"
                  className="w-full py-3 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-800/60 text-center text-sm font-semibold text-white transition"
                >
                  Pilih Enterprise
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 7. FAQ 2 Independent Columns */}
        <section
          id="faq"
          className="py-20 sm:py-24 px-4 sm:px-6 bg-[#F8FAFC] dark:bg-[#0B1120] border-t border-slate-200 dark:border-slate-800"
        >
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                Bantuan
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-slate-900 dark:text-slate-100">
                Pertanyaan yang Sering Diajukan
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="flex flex-col gap-4">
                {leftFaqs.map((item, idx) => renderFaqCard(item, idx))}
              </div>
              <div className="flex flex-col gap-4">
                {rightFaqs.map((item, idx) => renderFaqCard(item, idx + 4))}
              </div>
            </div>

            <div className="text-center pt-2">
              <a
                href={ADMIN_WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold transition shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Masih ada pertanyaan? Chat Admin Mukaro</span>
              </a>
            </div>
          </div>
        </section>

        {/* 8. Cobalt Blue CTA Banner */}
        <section className="py-16 px-4 sm:px-6 bg-white dark:bg-[#090D16]">
          <div className="max-w-6xl mx-auto rounded-3xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white p-10 md:p-14 text-center space-y-5">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] max-w-2xl mx-auto">
              Siap Otomatiskan Pemesanan di Usaha Kuliner Anda?
            </h2>
            <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto">
              Daftarkan outlet Anda sekarang, cetak QR meja dalam hitungan
              menit, dan nikmati uji coba gratis 14 hari.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-[#2563EB] hover:bg-blue-50 text-sm font-bold transition shadow-sm"
              >
                <span>Buat Akun Gratis Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer 4 Kolom + Giant Watermark */}
      <footer className="bg-[#FFFFFF] dark:bg-[#090D16] border-t border-slate-200 dark:border-slate-800 pt-14 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-8 pb-12">
          <div className="col-span-2 md:col-span-1 space-y-3">
            <MukaroLogo size="sm" showDomain />
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Platform QR Self-Order &amp; Kasir POS modern untuk kedai kopi,
              resto, warmindo, food court, hingga cloud kitchen di Indonesia.
            </p>
          </div>

          <div className="space-y-2.5 text-sm">
            <p className="font-bold text-slate-900 dark:text-slate-100">
              Produk
            </p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <a
                  href="#fitur"
                  className="hover:text-slate-900 dark:hover:text-white"
                >
                  QR Self-Order
                </a>
              </li>
              <li>
                <a
                  href="#fitur"
                  className="hover:text-slate-900 dark:hover:text-white"
                >
                  Kasir POS &amp; Ojol
                </a>
              </li>
              <li>
                <a
                  href="#harga"
                  className="hover:text-slate-900 dark:hover:text-white"
                >
                  Harga Paket
                </a>
              </li>
              <li>
                <Link
                  href="/kopi-senja"
                  className="hover:text-slate-900 dark:hover:text-white"
                >
                  Demo Outlet
                </Link>
              </li>
              <li>
                <Link
                  href="/affiliate"
                  className="text-[#2563EB] font-semibold hover:underline"
                >
                  Program Affiliate
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5 text-sm">
            <p className="font-bold text-slate-900 dark:text-slate-100">
              Bantuan
            </p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <a
                  href="#cara-kerja"
                  className="hover:text-slate-900 dark:hover:text-white"
                >
                  Cara Kerja
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="hover:text-slate-900 dark:hover:text-white"
                >
                  FAQ
                </a>
              </li>
              <li>
                <Link
                  href="/login"
                  className="hover:text-slate-900 dark:hover:text-white"
                >
                  Masuk Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5 text-sm">
            <p className="font-bold text-slate-900 dark:text-slate-100">
              Legal
            </p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <span>Syarat &amp; Ketentuan</span>
              </li>
              <li>
                <span>Kebijakan Privasi</span>
              </li>
              <li>
                <span>Keamanan Pembayaran</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Giant Watermark */}
        <div
          className="select-none pointer-events-none text-center overflow-hidden leading-none pt-2"
          aria-hidden="true"
        >
          <span className="block text-[20vw] sm:text-[160px] lg:text-[210px] font-extrabold tracking-[-0.05em] text-slate-200/75 dark:text-slate-800/60 -mb-[0.18em]">
            Mukaro
          </span>
        </div>
      </footer>

      {/* Floating WhatsApp CTA */}
      <a
        href={ADMIN_WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat Admin Mukaro via WhatsApp"
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-[#10B981] hover:bg-[#059669] text-white text-xs sm:text-sm font-bold shadow-lg transition hover:scale-[1.03]"
      >
        <MessageCircle className="w-4 h-4 shrink-0" />
        <span>Chat Admin</span>
      </a>
    </div>
  );
}
