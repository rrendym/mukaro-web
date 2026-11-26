"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
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
} from "lucide-react";
import { MukaroLogo } from "@/components/MukaroLogo";
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

const SOCIAL_PROOF_BRANDS = [
  "Kopi Senja",
  "Ruang Seduh",
  "Teras Pagi",
  "Matcha Lab",
  "Bites & Co",
  "Kantin Kota",
];

const ECOSYSTEM_ITEMS = [
  { name: "QRIS", icon: QrCode, offset: "translate-y-6 md:translate-y-8" },
  { name: "GoFood", icon: Bike, offset: "translate-y-3 md:translate-y-4" },
  {
    name: "GrabFood",
    icon: ShoppingBag,
    offset: "translate-y-1 md:translate-y-1",
  },
  {
    name: "ShopeeFood",
    icon: UtensilsCrossed,
    offset: "translate-y-0",
  },
  {
    name: "Midtrans",
    icon: CreditCard,
    offset: "translate-y-1 md:translate-y-1",
  },
  {
    name: "WhatsApp",
    icon: MessageCircle,
    offset: "translate-y-3 md:translate-y-4",
  },
  {
    name: "Thermal 58mm",
    icon: Printer,
    offset: "translate-y-6 md:translate-y-8",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Sejak pakai QR meja Mukaro, jam makan siang tidak pernah menumpuk di kasir. Customer pesan sendiri, barista tinggal buat.",
    author: "Raka Pratama",
    cafe: "Kopi Senja, Jakarta Selatan",
  },
  {
    quote:
      "Harga GoFood dan GrabFood bisa dipisah otomatis dari harga dine-in. Rekap omzet malam jadi beres dalam dua menit.",
    author: "Nadia Kusuma",
    cafe: "Ruang Seduh, Bandung",
  },
  {
    quote:
      "Fitur stok resepnya menyelamatkan margin kami. Susu dan biji kopi langsung terpotong tiap kali ada order masuk.",
    author: "Dimas Wijaya",
    cafe: "Teras Pagi Coffee, Yogyakarta",
  },
  {
    quote:
      "Setup cuma lima menit tanpa beli alat kasir mahal. Pakai tablet lama di bar dan printer Bluetooth 58mm sudah langsung jalan.",
    author: "Sinta Maharani",
    cafe: "Matcha Lab, Surabaya",
  },
  {
    quote:
      "Notifikasi suara di layar dapur dan badge meja bikin orderan jarang tertukar. Anak dapur jadi jauh lebih tenang saat ramai.",
    author: "Bagas Aditya",
    cafe: "Bites & Co, Tangerang",
  },
  {
    quote:
      "Di food court kami ada 6 tenant. Masing-masing punya link menu dan QR sendiri, semuanya terpantau rapi dari satu platform.",
    author: "Hendra Gunawan",
    cafe: "Kantin Kota, Semarang",
  },
];

const FAQS = [
  {
    q: "Apakah QRIS di Mukaro dikenakan potongan tambahan dari Mukaro?",
    a: "Tidak. Mukaro mengenakan 0% potongan komisi transaksi. Dana QRIS langsung masuk ke akun Midtrans atau rekening QRIS Statis milik kedai Anda sendiri.",
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
    a: "Tidak perlu. Mukaro berjalan 100% di browser modern — Anda bisa menggunakan tablet, laptop, atau HP yang sudah ada.",
  },
  {
    q: "Bagaimana jika koneksi internet di kafe sedang lambat?",
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

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F172A] flex flex-col">
      {/* 1. Minimalist Sticky Navbar */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0">
            <MukaroLogo size="sm" />
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#475569]">
            <a href="#fitur" className="hover:text-[#0F172A] transition">
              Fitur
            </a>
            <a href="#ekosistem" className="hover:text-[#0F172A] transition">
              Ekosistem
            </a>
            <a href="#cara-kerja" className="hover:text-[#0F172A] transition">
              Cara Kerja
            </a>
            <a href="#harga" className="hover:text-[#0F172A] transition">
              Harga
            </a>
            <a href="#faq" className="hover:text-[#0F172A] transition">
              FAQ
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-[#0F172A] hover:text-[#2563EB] transition"
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

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
            className="md:hidden p-2 rounded-lg border border-[#E2E8F0] text-[#0F172A]"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <MenuIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E2E8F0] bg-white px-4 py-4 space-y-3">
            <div className="flex flex-col space-y-2 text-sm font-medium text-[#475569]">
              <a
                href="#fitur"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#0F172A]"
              >
                Fitur
              </a>
              <a
                href="#ekosistem"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#0F172A]"
              >
                Ekosistem
              </a>
              <a
                href="#cara-kerja"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#0F172A]"
              >
                Cara Kerja
              </a>
              <a
                href="#harga"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#0F172A]"
              >
                Harga
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#0F172A]"
              >
                FAQ
              </a>
            </div>
            <div className="pt-2 border-t border-[#E2E8F0] grid grid-cols-2 gap-2.5">
              <Link
                href="/login"
                className="py-2.5 rounded-lg border border-[#E2E8F0] text-center text-sm font-semibold text-[#0F172A]"
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
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#2563EB]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
              <span>QR Self-Order &amp; POS untuk Bisnis F&amp;B</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] text-[#0F172A] leading-[1.08] max-w-4xl mx-auto">
              Ubah Antrean Kafe Jadi Transaksi Otomatis
            </h1>

            <p className="text-base sm:text-lg text-[#475569] max-w-2xl mx-auto leading-relaxed">
              Pelanggan scan QR di meja, pilih varian, dan bayar QRIS langsung
              dari HP. Pesanan otomatis masuk ke kasir POS, layar dapur, dan
              memotong stok bahan baku secara real-time.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/kopi-senja"
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-sm font-semibold transition inline-flex items-center justify-center gap-2"
              >
                <span>Coba Demo Menu</span>
                <ArrowRight className="w-4 h-4 text-[#475569]" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition inline-flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Mulai Gratis 14 Hari</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <p className="text-xs font-medium text-[#475569]">
              <span className="font-mono tabular-nums font-semibold text-[#0F172A]">
                0%
              </span>{" "}
              potongan komisi transaksi • Setup dalam{" "}
              <span className="font-mono tabular-nums font-semibold text-[#0F172A]">
                5 menit
              </span>
            </p>
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

        {/* 3. Social Proof Logo Strip */}
        <section className="py-10 border-y border-[#E2E8F0] bg-[#F8FAFC] px-4 sm:px-6">
          <div className="max-w-6xl mx-auto text-center space-y-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Dipercaya berbagai kafe, kedai kopi, dan tenant kuliner
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 items-center">
              {SOCIAL_PROOF_BRANDS.map((brand) => (
                <div
                  key={brand}
                  className="text-base sm:text-lg font-extrabold tracking-[-0.03em] text-slate-400 select-none"
                >
                  {brand}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Bento Feature Grid */}
        <section id="fitur" className="py-20 sm:py-24 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                Operasional Terintegrasi
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-[#0F172A]">
                Fitur Lengkap Operasional Kafe
              </h2>
              <p className="text-sm sm:text-base text-[#475569]">
                Semua kebutuhan pemesanan mandiri, kasir POS, dapur, hingga
                kontrol bahan baku dalam satu sistem yang bersih dan cepat.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Row 1 Left */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold tracking-[-0.02em] text-[#0F172A]">
                    QR Self-Order Meja
                  </h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    Customer scan QR unik per meja, pilih suhu, level gula, atau
                    topping tambahan tanpa perlu antre di depan kasir.
                  </p>
                </div>
                <QrMenuMockup />
              </div>

              {/* Row 1 Right */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold tracking-[-0.02em] text-[#0F172A]">
                    Kasir Manual POS &amp; Ojol
                  </h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    Catat pesanan walk-in maupun GoFood, GrabFood, dan
                    ShopeeFood dengan harga khusus ojol yang otomatis
                    menyesuaikan.
                  </p>
                </div>
                <PosCashierMockup />
              </div>

              {/* Row 2 Left */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold tracking-[-0.02em] text-[#0F172A]">
                    Layar Dapur Live &amp; Struk 58mm
                  </h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    Order lunas langsung berbunyi di layar dapur secara
                    real-time. Update status dari antrean hingga siap diambil,
                    plus cetak struk thermal 58mm.
                  </p>
                </div>
                <LiveKitchenMockup />
              </div>

              {/* Row 2 Right */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold tracking-[-0.02em] text-[#0F172A]">
                    Stok Resep &amp; Stock Opname
                  </h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    Hubungkan gramasi bahan baku ke setiap menu. Setiap transaksi
                    otomatis memotong stok dan memberi peringatan saat menipis.
                  </p>
                </div>
                <RecipeStockMockup />
              </div>

              {/* Row 3 Full Width */}
              <div className="md:col-span-2 rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-5">
                <div className="max-w-2xl space-y-2">
                  <h3 className="text-lg font-bold tracking-[-0.02em] text-[#0F172A]">
                    Analitik Omzet &amp; Jam Sibuk Real-Time
                  </h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    Pantau performa penjualan harian, kontribusi omzet per
                    channel, jam paling ramai, serta menu terlaris langsung dari
                    HP owner.
                  </p>
                </div>
                <RevenueChartMockup />
              </div>
            </div>
          </div>
        </section>

        {/* 5. Curved App Ecosystem */}
        <section
          id="ekosistem"
          className="py-20 sm:py-24 px-4 sm:px-6 bg-[#F8FAFC] border-y border-[#E2E8F0] overflow-hidden"
        >
          <div className="max-w-5xl mx-auto text-center space-y-12">
            {/* Arch Row */}
            <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-3 sm:gap-4 pb-6">
              {ECOSYSTEM_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.name}
                    className={`${item.offset} flex flex-col items-center gap-2`}
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-center text-[#0F172A] hover:border-[#2563EB] hover:text-[#2563EB] transition">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold text-[#475569]">
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
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-[#0F172A]">
                Terhubung dengan Ekosistem F&amp;B
              </h2>
              <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
                Dari pembayaran QRIS Midtrans, pencatatan pesanan aplikasi ojol,
                notifikasi WhatsApp kasir, hingga printer struk thermal 58mm —
                semuanya siap bekerja bersama tanpa konfigurasi rumit.
              </p>
            </div>
          </div>
        </section>

        {/* 6. 3 Langkah Mudah */}
        <section id="cara-kerja" className="py-20 sm:py-24 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                Alur Cepat
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-[#0F172A]">
                Mulai Operasional dalam 3 Langkah
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  title: "Input Menu & Varian",
                  desc: "Upload foto menu, atur harga reguler & ojol, serta tambahkan pilihan varian suhu atau add-on.",
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
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-6 flex flex-col justify-between gap-5"
                >
                  <div className="space-y-2">
                    <span className="inline-block font-mono tabular-nums text-xs font-bold text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-md">
                      Langkah {item.step}
                    </span>
                    <h3 className="text-lg font-bold tracking-[-0.02em] text-[#0F172A]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#475569] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  {item.mockup}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Testimoni Klien (3x2 Grid) */}
        <section className="py-20 sm:py-24 px-4 sm:px-6 bg-[#F8FAFC] border-y border-[#E2E8F0]">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                Testimoni Mitra
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-[#0F172A]">
                Kata Pemilik Kafe &amp; Tenant
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.author}
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-6 flex flex-col justify-between gap-5"
                >
                  <p className="text-sm text-[#0F172A] leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="pt-4 border-t border-[#E2E8F0]">
                    <p className="text-sm font-bold text-[#0F172A]">
                      {t.author}
                    </p>
                    <p className="text-xs text-[#475569]">{t.cafe}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. 3-Tier Pricing Section */}
        <section id="harga" className="py-20 sm:py-24 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                Harga Transparan
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-[#0F172A]">
                Pilih Paket Sesuai Skala Bisnis
              </h2>
              <p className="text-sm sm:text-base text-[#475569]">
                Mulai gratis 14 hari tanpa kartu kredit. 0% komisi per
                transaksi.
              </p>

              {/* Billing Toggle */}
              <div className="inline-flex items-center p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                    billingCycle === "monthly"
                      ? "bg-white text-[#0F172A] shadow-xs border border-[#E2E8F0]"
                      : "text-[#475569]"
                  }`}
                >
                  Bulanan
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 ${
                    billingCycle === "yearly"
                      ? "bg-white text-[#0F172A] shadow-xs border border-[#E2E8F0]"
                      : "text-[#475569]"
                  }`}
                >
                  <span>Tahunan</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[#2563EB] text-[10px] font-mono font-bold">
                    Hemat 20%
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* Starter */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-7 flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#0F172A]">
                      Starter
                    </h3>
                    <p className="text-xs text-[#475569] mt-1">
                      Untuk kedai kopi rintisan &amp; booth minuman.
                    </p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-mono tabular-nums tracking-[-0.03em] text-[#0F172A]">
                      {pricing.starter}
                    </span>
                    <span className="text-xs text-[#475569]">/bln</span>
                  </div>
                  <ul className="space-y-2.5 pt-2 text-sm text-[#475569]">
                    {[
                      "1 Outlet aktif",
                      "Maksimal 10 meja QR",
                      "Kasir POS manual",
                      "Cetak struk thermal 58mm",
                      "QRIS Statis & pembayaran tunai",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/login"
                  className="w-full py-3 rounded-xl border border-[#E2E8F0] hover:border-[#0F172A] text-center text-sm font-semibold text-[#0F172A] transition"
                >
                  Pilih Starter
                </Link>
              </div>

              {/* Pro (Highlighted) */}
              <div className="rounded-2xl border-2 border-[#2563EB] bg-white p-7 shadow-lg flex flex-col justify-between gap-6 relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#2563EB] text-white text-[11px] font-bold">
                  Paling Populer
                </span>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#0F172A]">Pro</h3>
                    <p className="text-xs text-[#475569] mt-1">
                      Untuk kafe &amp; resto dengan operasional penuh.
                    </p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-mono tabular-nums tracking-[-0.03em] text-[#0F172A]">
                      {pricing.pro}
                    </span>
                    <span className="text-xs text-[#475569]">/bln</span>
                  </div>
                  <ul className="space-y-2.5 pt-2 text-sm text-[#475569]">
                    {[
                      "Meja QR Unlimited",
                      "QRIS Otomatis Midtrans",
                      "Harga terpisah GoFood / Grab / Shopee",
                      "Stok Resep & Stock Opname",
                      "Voucher Promo & PIN Staf Void",
                      "Rekap Perkembangan Penjualan & Export Google Sheets (3 Tab) / PDF",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/login"
                  className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-center text-sm font-semibold text-white transition"
                >
                  Mulai Gratis 14 Hari
                </Link>
              </div>

              {/* Enterprise */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-7 flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#0F172A]">
                      Enterprise
                    </h3>
                    <p className="text-xs text-[#475569] mt-1">
                      Untuk multi-cabang &amp; pengelola food court.
                    </p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-mono tabular-nums tracking-[-0.03em] text-[#0F172A]">
                      {pricing.enterprise}
                    </span>
                    <span className="text-xs text-[#475569]">/bln</span>
                  </div>
                  <ul className="space-y-2.5 pt-2 text-sm text-[#475569]">
                    {[
                      "Hingga 3 Outlet / Tenant",
                      "Laporan konsolidasi lintas cabang",
                      "Dukungan multi-kasir & dapur",
                      "Rekap Perkembangan Penjualan & Export Google Sheets (3 Tab) / PDF",
                      "Pendampingan onboarding prioritas",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/login"
                  className="w-full py-3 rounded-xl border border-[#E2E8F0] hover:border-[#0F172A] text-center text-sm font-semibold text-[#0F172A] transition"
                >
                  Pilih Enterprise
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 9. FAQ 2 Kolom */}
        <section
          id="faq"
          className="py-20 sm:py-24 px-4 sm:px-6 bg-[#F8FAFC] border-t border-[#E2E8F0]"
        >
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                Bantuan
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-[#0F172A]">
                Pertanyaan yang Sering Diajukan
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {FAQS.map((item, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div
                    key={item.q}
                    className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-3"
                    >
                      <span className="text-sm font-bold text-[#0F172A]">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#475569] shrink-0 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-sm text-[#475569] leading-relaxed border-t border-[#E2E8F0] pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 10. Cobalt Blue CTA Banner */}
        <section className="py-16 px-4 sm:px-6 bg-white">
          <div className="max-w-6xl mx-auto rounded-3xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white p-10 md:p-14 text-center space-y-5">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] max-w-2xl mx-auto">
              Siap Otomatiskan Pemesanan di Kafe Anda?
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
      <footer className="bg-[#FFFFFF] border-t border-[#E2E8F0] pt-14 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-8 pb-12">
          <div className="col-span-2 md:col-span-1 space-y-3">
            <MukaroLogo size="sm" showDomain />
            <p className="text-xs text-[#475569] leading-relaxed">
              Platform QR Self-Order &amp; Kasir POS modern untuk kafe,
              restoran, dan food court di Indonesia.
            </p>
          </div>

          <div className="space-y-2.5 text-sm">
            <p className="font-bold text-[#0F172A]">Produk</p>
            <ul className="space-y-2 text-xs text-[#475569]">
              <li>
                <a href="#fitur" className="hover:text-[#0F172A]">
                  QR Self-Order
                </a>
              </li>
              <li>
                <a href="#fitur" className="hover:text-[#0F172A]">
                  Kasir POS &amp; Ojol
                </a>
              </li>
              <li>
                <a href="#harga" className="hover:text-[#0F172A]">
                  Harga Paket
                </a>
              </li>
              <li>
                <Link href="/kopi-senja" className="hover:text-[#0F172A]">
                  Demo Outlet
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5 text-sm">
            <p className="font-bold text-[#0F172A]">Bantuan</p>
            <ul className="space-y-2 text-xs text-[#475569]">
              <li>
                <a href="#cara-kerja" className="hover:text-[#0F172A]">
                  Cara Kerja
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#0F172A]">
                  FAQ
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#0F172A]">
                  Masuk Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5 text-sm">
            <p className="font-bold text-[#0F172A]">Legal</p>
            <ul className="space-y-2 text-xs text-[#475569]">
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
          <span className="block text-[20vw] sm:text-[160px] lg:text-[210px] font-extrabold tracking-[-0.05em] text-slate-200/75 -mb-[0.18em]">
            Mukaro
          </span>
        </div>
      </footer>
    </div>
  );
}
