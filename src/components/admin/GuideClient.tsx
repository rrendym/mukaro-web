"use client";

import React, { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ArrowRight,
  MessageCircle,
  QrCode,
  Calculator,
  Split,
  BellRing,
  Printer,
  Settings,
  UtensilsCrossed,
  Boxes,
  Sparkles,
} from "lucide-react";
import { Store } from "@/types/database";

const ADMIN_WA_GUIDE_URL =
  "https://wa.me/6282118699431?text=Halo%20Admin%20Mukaro%2C%20saya%20butuh%20bantuan%20terkait%20setup%20atau%20penggunaan%20dashboard%20outlet.";

const EMPTY_STEPS: string[] = [];

export function GuideClient({ store }: { store: Store }) {
  const storageKey = `mukaro_setup_guide_${store.id}`;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handleStorage = (e: StorageEvent) => {
        if (e.key === storageKey) onStoreChange();
      };
      window.addEventListener("storage", handleStorage);
      window.addEventListener("mukaro-guide-change", onStoreChange);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("mukaro-guide-change", onStoreChange);
      };
    },
    [storageKey]
  );

  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(storageKey) || "[]";
    } catch {
      return "[]";
    }
  }, [storageKey]);

  const rawChecked = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => "[]"
  );

  let checkedIds: string[] = EMPTY_STEPS;
  try {
    const parsed = JSON.parse(rawChecked);
    if (Array.isArray(parsed)) checkedIds = parsed;
  } catch {
    checkedIds = EMPTY_STEPS;
  }

  const toggleStep = (id: string) => {
    const next = checkedIds.includes(id)
      ? checkedIds.filter((item) => item !== id)
      : [...checkedIds, id];
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      window.dispatchEvent(new Event("mukaro-guide-change"));
    } catch {
      // Ignore storage write errors
    }
  };

  const setupSteps = [
    {
      id: "profile_qris",
      num: "01",
      title: "Isi Profil & QRIS Toko",
      desc: "Lengkapi nama outlet, jam buka, pajak/service, serta unggah gambar QRIS Statis atau sambungkan Midtrans.",
      href: `/${store.slug}/admin/settings`,
      cta: "Buka Pengaturan Toko",
      icon: Settings,
    },
    {
      id: "menu_variants",
      num: "02",
      title: "Tambah Menu & Varian",
      desc: "Buat kategori, upload foto menu, atur harga reguler & harga khusus Ojol, serta tambah varian suhu/pedas/topping.",
      href: `/${store.slug}/admin/menu`,
      cta: "Kelola Menu",
      icon: UtensilsCrossed,
    },
    {
      id: "recipe_stock",
      num: "03",
      title: "Atur Bahan Baku & Resep Auto-Deduct",
      desc: "Input stok bahan baku (gram/ml/pcs) dan tautkan ke resep menu agar stok terpotong otomatis setiap transaksi.",
      href: `/${store.slug}/admin/inventory`,
      cta: "Atur Stok & Resep",
      icon: Boxes,
    },
    {
      id: "print_qr",
      num: "04",
      title: "Cetak QR Meja",
      desc: "Generate QR Code unik untuk setiap nomor meja atau area kasir, lalu unduh format PNG untuk dicetak dan ditempel.",
      href: `/${store.slug}/admin/qr`,
      cta: "Generate QR Meja",
      icon: QrCode,
    },
    {
      id: "first_order",
      num: "05",
      title: "Tes Order Pertama",
      desc: "Coba scan menu customer atau input order percobaan di Kasir POS untuk memastikan notifikasi dapur & stok berjalan lancar.",
      href: `/${store.slug}/admin/pos`,
      cta: "Buka Kasir POS",
      icon: Sparkles,
    },
  ];

  const completedCount = setupSteps.filter((s) =>
    checkedIds.includes(s.id)
  ).length;
  const progressPct = Math.round((completedCount / setupSteps.length) * 100);

  const sopCards = [
    {
      title: "1. Pengaturan Awal Outlet, PT/NPWP & PIN Keamanan",
      badge: "Pengaturan Toko",
      icon: Settings,
      points: [
        "Buka Pengaturan Toko untuk mengisi Nama PT / Perusahaan & NPWP (otomatis tampil di kop laporan PDF, Excel, dan struk thermal).",
        "Atur Modal Awal / Deposit Kasir, PIN Khusus Stok & Opname, PIN Supervisor (untuk Void/Refund), Daftar Karyawan, serta Kasir On-Duty aktif.",
        "Unggah gambar QRIS Statis atau masukkan kunci Midtrans dan aktifkan pajak/service charge sesuai kebijakan outlet.",
      ],
    },
    {
      title: "2. Kasir POS, Varian/Add-On & Cetak Resi (58mm / 80mm / A4)",
      badge: "Kasir POS",
      icon: Calculator,
      points: [
        "Pilih shift lewat dropdown cepat Kasir On-Duty di header Kasir POS agar nama kasir otomatis tercetak di setiap struk.",
        "Klik kartu menu untuk memilih varian/add-on (area opsi bisa di-scroll rapi) atau klik ikon silang (X) untuk membatalkan item secara instan.",
        "Mendukung Split Bill (pisah per item atau bagi rata) serta cetak resi dengan pilihan ukuran kertas 58mm, 80mm, atau A4.",
      ],
    },
    {
      title: "3. Pesanan Live, Alarm Berulang & Kontrol Void Supervisor",
      badge: "Pesanan Live",
      icon: BellRing,
      points: [
        "Aktifkan suara di Pesanan Live — alarm pesanan baru akan berbunyi berulang hingga pesanan diproses atau tombol Hentikan Alarm diklik.",
        "Klik Cetak untuk membuka modal resi berlatar kertas putih kontras tinggi (aman di Dark Mode) dengan pemilih kertas 58mm / 80mm / A4.",
        "Pembatalan / Void order wajib memasukkan PIN Supervisor dan Alasan Pembatalan agar tercatat transparan di audit laporan.",
      ],
    },
    {
      title: "4. Restok Cepat, Stock Opname & Filter Riwayat Stok",
      badge: "Stok & Opname",
      icon: Boxes,
      points: [
        "Pilih Nama Staf dan masukkan PIN Khusus Stok satu kali di awal sesi, lalu gunakan tombol preset +10, +50, +100 untuk Restok Cepat atau isi Stok Fisik Aktual.",
        "Gunakan tombol Filter Stok Menipis / Habis untuk fokus pada item yang perlu segera di-restock.",
        "Saring Riwayat Stock Opname berdasarkan Hari Ini, Kemarin, 7/30 Hari, rentang tanggal, hingga jam tertentu lengkap dengan audit nama staf.",
      ],
    },
    {
      title: "5. Voucher Running Bar & Laporan 1 Bulan (PDF / ExcelJS)",
      badge: "Voucher & Rekap",
      icon: Printer,
      points: [
        "Di halaman Voucher, centang Tampilkan di Running Bar Halaman Menu Customer dan atur tanggal & jam berlaku promo agar ticker tampil otomatis di menu pelanggan.",
        "Di Rekap & Export, masukkan Uang Tunai Fisik di Laci saat closing untuk menghitung Selisih Kas (Over / Short) secara otomatis.",
        "Gunakan Download Ringkasan PDF untuk laporan audit atasan atau Download Laporan Google Sheets (.xlsx) 5 sheet berumus dinamis (mendukung mode Semua Cabang HQ).",
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#2563EB] uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>Panduan &amp; Tutorial</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-[-0.03em] text-slate-900 dark:text-slate-100">
            Pusat Panduan Operasional {store.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Ikuti checklist setup awal untuk owner dan SOP harian untuk staf
            kasir maupun dapur.
          </p>
        </div>

        <a
          href={ADMIN_WA_GUIDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs sm:text-sm font-bold shadow-sm transition shrink-0"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Tanya Admin via WhatsApp</span>
        </a>
      </div>

      {/* Section 1: Checklist Setup Awal Owner (5 Langkah) */}
      <section className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Checklist Setup Awal Owner (5 Langkah)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Centang setiap langkah yang sudah selesai Anda kerjakan. Progress
              tersimpan otomatis di browser ini.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                {completedCount}/{setupSteps.length} Selesai
              </span>
              <div className="w-28 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-1">
                <div
                  className="h-full bg-[#2563EB] transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {setupSteps.map((step) => {
            const checked = checkedIds.includes(step.id);
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  checked
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/70"
                    : "bg-[#F8FAFC] dark:bg-[#090D16] border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    onClick={() => toggleStep(step.id)}
                    aria-label={`Tandai ${step.title}`}
                    className="mt-0.5 shrink-0 text-[#2563EB] cursor-pointer"
                  >
                    {checked ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 hover:text-[#2563EB] transition" />
                    )}
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] font-mono text-[10px] font-bold">
                        Langkah {step.num}
                      </span>
                      <h3
                        className={`text-sm font-bold ${
                          checked
                            ? "line-through text-slate-500 dark:text-slate-400"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>

                <Link
                  href={step.href}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 hover:border-[#2563EB] text-xs font-semibold text-slate-900 dark:text-slate-100 transition shrink-0"
                >
                  <Icon className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>{step.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2: SOP Harian Karyawan Kasir & Dapur */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            SOP Harian Karyawan Kasir &amp; Dapur
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Panduan ringkas operasional harian agar tim kasir dan dapur bekerja
            cepat tanpa salah catat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sopCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {card.title}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                    {card.badge}
                  </span>
                </div>

                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {card.points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 shrink-0" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Direct Help CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-extrabold">
            Butuh Bantuan Setup Outlet atau Pelatihan Tim?
          </h3>
          <p className="text-xs text-blue-100">
            Tim support Mukaro siap membantu Anda mulai dari input menu hingga
            setting printer thermal 58mm.
          </p>
        </div>
        <a
          href={ADMIN_WA_GUIDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs sm:text-sm font-bold shadow-md transition shrink-0"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Tanya Admin via WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
