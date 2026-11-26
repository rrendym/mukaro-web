"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Share2,
  Clock,
  Wallet,
  CheckCircle2,
  Building2,
  MessageCircle,
  LogOut,
  Loader2,
  Calculator,
  Megaphone,
  LayoutDashboard,
  ShieldAlert,
} from "lucide-react";
import {
  AffiliateCommission,
  AffiliateProfile,
  PlanTier,
} from "@/types/database";
import { MukaroLogo } from "@/components/MukaroLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import { formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { isSelfReferralCommission } from "@/lib/affiliate";

interface PartnerDashboardClientProps {
  profile: AffiliateProfile;
  commissions: AffiliateCommission[];
  userEmail: string;
}

const SIM_PLANS: { key: PlanTier; label: string; price: number; comm: number }[] =
  [
    { key: "starter", label: "Starter Rp 79rb", price: 79000, comm: 24000 },
    { key: "pro", label: "Pro Rp 149rb", price: 149000, comm: 45000 },
    {
      key: "enterprise",
      label: "Enterprise Rp 299rb",
      price: 299000,
      comm: 90000,
    },
  ];

export function PartnerDashboardClient({
  profile: initialProfile,
  commissions,
  userEmail,
}: PartnerDashboardClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [activeTab, setActiveTab] = useState<"overview" | "promo">("overview");
  const [copied, setCopied] = useState(false);
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);

  // Commission Simulator State
  const [simOutlets, setSimOutlets] = useState(5);
  const [simPlan, setSimPlan] = useState<PlanTier>("pro");

  // Bank form
  const [bankName, setBankName] = useState(profile.bank_name || "");
  const [accountNumber, setAccountNumber] = useState(
    profile.account_number || ""
  );
  const [accountHolder, setAccountHolder] = useState(
    profile.account_holder || ""
  );
  const [savingBank, setSavingBank] = useState(false);
  const [bankSaved, setBankSaved] = useState(false);

  const referralLink = `https://mukaro-web-project.vercel.app/?ref=${profile.referral_code}`;

  const stats = useMemo(() => {
    let pending = 0;
    let available = 0;
    let paid = 0;
    const activeOutletIds = new Set<string>();

    for (const c of commissions) {
      const selfRef = isSelfReferralCommission(c, profile);
      if (selfRef) continue;

      const amt = Number(c.commission_amount || 0);
      if (c.status === "pending_trial") pending += amt;
      else if (c.status === "available") available += amt;
      else if (c.status === "paid") paid += amt;

      if (c.stores?.subscription_status === "active") {
        activeOutletIds.add(c.referred_store_id);
      }
    }

    return {
      pending,
      available,
      paid,
      activePaidCount: activeOutletIds.size,
    };
  }, [commissions, profile]);

  const activeSimPlan =
    SIM_PLANS.find((p) => p.key === simPlan) || SIM_PLANS[1];
  const simMonthlyIncome = simOutlets * activeSimPlan.comm;

  const promoTemplates = useMemo(
    () => [
      {
        id: "wa_owner",
        title: "Pesan Penawaran WhatsApp ke Pemilik Kedai",
        badge: "Direct Outreach",
        text: `Halo Kak, izin sharing solusi buat kedai/restonya nih 🙏\n\nSekarang pelanggan bisa langsung scan QR di meja untuk pesan & bayar QRIS otomatis (0% potongan komisi), order langsung bunyi di layar dapur, plus ada kasir POS & stok resep otomatis.\n\nCobain gratis dulu 21 hari (bonus +7 hari lewat link khusus partner) tanpa kartu kredit:\n${referralLink}`,
      },
      {
        id: "tiktok_reels",
        title: "Hook & Script Video Pendek TikTok / Reels",
        badge: "Short Video",
        text: `[HOOK 0-3 DETIK]\n"Punya kedai kopi atau tempat makan tapi kasir masih sering keteteran pas jam ramai?"\n\n[ISI]\n"Pakai Mukaro aja! Pelanggan tinggal scan QR di meja, pilih varian sendiri, bayar QRIS langsung masuk rekening 100% tanpa potongan komisi. Orderan otomatis masuk ke kasir POS, layar dapur, dan langsung potong stok bahan baku."\n\n[CTA]\n"Coba gratis 21 hari lewat link referral di bio atau daftar di sini:"\n${referralLink}`,
      },
      {
        id: "group_broadcast",
        title: "Broadcast Grup Komunitas Kuliner / UMKM",
        badge: "Komunitas",
        text: `Info buat rekan-rekan pemilik Kedai Kopi, Resto, Warmindo, atau Booth Kuliner! ☕🍜\n\nYuk rapikan antrean & pembukuan outlet pakai sistem QR Self-Order + Kasir POS Mukaro:\n✅ 0% potongan komisi transaksi\n✅ Harga menu terpisah untuk Dine-in & Ojol\n✅ Cetak struk thermal 58mm & laporan Google Sheets\n\nDaftar lewat link ini untuk dapat total 21 hari uji coba gratis:\n${referralLink}`,
      },
    ],
    [referralLink]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyTemplate = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTemplateId(id);
      setTimeout(() => setCopiedTemplateId(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleShareWa = () => {
    const text = encodeURIComponent(
      `Pakai Mukaro untuk QR Self-Order & Kasir POS kedai/resto kamu! Daftar lewat link ini untuk dapat BONUS +7 hari ekstra trial (total 21 hari gratis): ${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    setBankSaved(false);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("affiliate_profiles")
      .update({
        bank_name: bankName.trim() || null,
        account_number: accountNumber.trim() || null,
        account_holder: accountHolder.trim() || null,
      })
      .eq("user_id", profile.user_id)
      .select("*")
      .single();

    if (!error && data) {
      setProfile(data as AffiliateProfile);
      setBankSaved(true);
      setTimeout(() => setBankSaved(false), 3000);
    }
    setSavingBank(false);
  };

  const handleRequestWithdraw = () => {
    const msg = encodeURIComponent(
      `Halo Admin Mukaro, saya Partner Affiliate "${profile.full_name}" (Kode: ${profile.referral_code}, Email: ${userEmail}) ingin mengajukan pencairan komisi siap cair sebesar ${formatRupiah(stats.available)} (${stats.activePaidCount} outlet aktif berbayar).\nRekening: ${bankName || "-"} / ${accountNumber || "-"} a.n ${accountHolder || "-"}`
    );
    window.open(
      `https://wa.me/6282118699431?text=${msg}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const minOutletsRequired = 2;
  const remainingOutletsNeeded = Math.max(
    0,
    minOutletsRequired - stats.activePaidCount
  );
  const canWithdraw =
    stats.activePaidCount >= minOutletsRequired && stats.available > 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100">
      <header className="animate-nav-enter bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <MukaroLogo size="sm" />
            </Link>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] text-xs font-bold">
              Partner Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href="/"
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Beranda
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-slate-900 dark:text-slate-100">
              Halo, {profile.full_name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Bagikan link referral Anda untuk mendapatkan komisi 30% dari setiap
              outlet yang aktif berlangganan.
            </p>
          </div>

          {/* Partner Mode Tabs */}
          <div className="inline-flex p-1 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "overview"
                  ? "bg-[#2563EB] text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard &amp; Komisi</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("promo")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "promo"
                  ? "bg-[#2563EB] text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Materi Promosi Siap Pakai</span>
            </button>
          </div>
        </div>

        {/* Referral Link Card */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                Link Referral Partner Anda
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kode Unik:{" "}
                <strong className="font-mono text-slate-900 dark:text-slate-100">
                  {profile.referral_code}
                </strong>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? "Tersalin!" : "Salin Link"}</span>
              </button>
              <button
                type="button"
                onClick={handleShareWa}
                className="px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Bagikan ke WhatsApp</span>
              </button>
            </div>
          </div>

          <div className="px-4 py-3 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
            {referralLink}
          </div>
        </div>

        {activeTab === "promo" ? (
          /* Promo Materials Tab */
          <div key="promo" className="space-y-4 animate-page-enter">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Materi Promosi Siap Pakai
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Klik salin pada template di bawah ini — link referral unik Anda
                sudah otomatis disisipkan di akhir teks.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {promoTemplates.map((tpl) => {
                const isCopied = copiedTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] text-[10px] font-bold">
                          {tpl.badge}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {tpl.title}
                      </h3>
                      <pre className="whitespace-pre-wrap font-sans text-xs text-slate-600 dark:text-slate-400 leading-relaxed p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800">
                        {tpl.text}
                      </pre>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyTemplate(tpl.id, tpl.text)}
                      className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{isCopied ? "Teks Tersalin!" : "Salin Teks"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* Commission Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-stagger">
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Pending Trial
                  </p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                    {formatRupiah(stats.pending)}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Menunggu toko upgrade aktif
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Komisi Siap Cair
                  </p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-[#2563EB] mt-1">
                    {formatRupiah(stats.available)}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Syarat: min. 2 outlet aktif berbayar
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Sudah Ditransfer
                  </p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 mt-1">
                    {formatRupiah(stats.paid)}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Total payout berhasil
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Commission Simulator */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#2563EB]" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Kalkulator Simulasi Komisi Pasif (30% / Bulan)
                  </h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SIM_PLANS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setSimPlan(p.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        simPlan === p.key
                          ? "bg-[#2563EB] text-white border-[#2563EB]"
                          : "bg-[#F8FAFC] dark:bg-[#090D16] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#2563EB]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">
                    Jumlah Outlet Aktif Dirujuk
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] font-mono font-bold tabular-nums">
                    {simOutlets} Outlet
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={simOutlets}
                  onChange={(e) => setSimOutlets(Number(e.target.value))}
                  className="w-full accent-[#2563EB] cursor-pointer"
                />
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Estimasi Penghasilan Pasif Bulanan ({simOutlets} ×{" "}
                    {formatRupiah(activeSimPlan.comm)})
                  </span>
                  <span className="text-xl font-extrabold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(simMonthlyIncome)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bank Account & Payout + Referral History */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleSaveBank}
                className="lg:col-span-5 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 h-fit"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#2563EB]" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Rekening Pencairan Komisi
                  </h2>
                </div>

                {/* Progress Bar: Minimum 2 Active Paid Outlets */}
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Syarat Pencairan Komisi
                    </span>
                    <span className="font-mono font-bold text-[#2563EB]">
                      {Math.min(stats.activePaidCount, minOutletsRequired)}/
                      {minOutletsRequired} Outlet Aktif
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        stats.activePaidCount >= minOutletsRequired
                          ? "bg-emerald-500"
                          : "bg-[#2563EB]"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (stats.activePaidCount / minOutletsRequired) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {remainingOutletsNeeded > 0
                      ? `${stats.activePaidCount}/2 Outlet Aktif — Ajak ${remainingOutletsNeeded} outlet aktif lagi untuk membuka pencairan komisi.`
                      : "2/2 Outlet Aktif terpenuhi! Anda dapat mengajukan pencairan komisi."}
                  </p>
                </div>

                {bankSaved && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
                    Data rekening berhasil disimpan!
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Nama Bank / E-Wallet
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="BCA / Mandiri / BRI / GoPay"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Nomor Rekening
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="1234567890"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-mono focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Nama Pemilik Rekening
                  </label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="Sesuai buku tabungan"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    disabled={savingBank}
                    className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#2563EB] text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    {savingBank && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <span>Simpan Rekening</span>
                  </button>

                  <button
                    type="button"
                    disabled={!canWithdraw}
                    onClick={handleRequestWithdraw}
                    className="w-full py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>
                      {canWithdraw
                        ? "Ajukan Pencairan Komisi"
                        : remainingOutletsNeeded > 0
                          ? `Butuh ${remainingOutletsNeeded} Outlet Aktif Lagi`
                          : "Saldo Siap Cair Rp 0"}
                    </span>
                  </button>
                </div>
              </form>

              {/* Referral History Table */}
              <div className="lg:col-span-7 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Riwayat &amp; Funnel Outlet Rujukan ({commissions.length})
                </h2>

                {commissions.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
                    Belum ada outlet yang mendaftar menggunakan kode referral
                    Anda.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                          <th className="py-2.5 pr-3 font-semibold">
                            Nama Outlet
                          </th>
                          <th className="py-2.5 pr-3 font-semibold">
                            Status Outlet
                          </th>
                          <th className="py-2.5 pr-3 font-semibold">Komisi</th>
                          <th className="py-2.5 font-semibold">
                            Status Komisi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {commissions.map((c) => {
                          const selfRef = isSelfReferralCommission(c, profile);
                          const displayAmount = selfRef
                            ? 0
                            : c.commission_amount;
                          const storeStatus = c.stores?.subscription_status;

                          const funnelBadge = selfRef
                            ? {
                                label: "Self-Referral",
                                cls: "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300",
                              }
                            : storeStatus === "active"
                              ? {
                                  label: "Aktif Berbayar",
                                  cls: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300",
                                }
                              : storeStatus === "expired"
                                ? {
                                    label: "Expired",
                                    cls: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
                                  }
                                : {
                                    label: "Masa Trial",
                                    cls: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300",
                                  };

                          return (
                            <tr key={c.id}>
                              <td className="py-3 pr-3">
                                <p className="font-bold text-slate-900 dark:text-slate-100">
                                  {c.stores?.name || "Outlet"}
                                </p>
                                <p className="text-[10px] font-mono uppercase text-slate-500">
                                  Paket {c.plan_name}
                                </p>
                              </td>
                              <td className="py-3 pr-3">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${funnelBadge.cls}`}
                                >
                                  {selfRef && (
                                    <ShieldAlert className="w-3 h-3" />
                                  )}
                                  {funnelBadge.label}
                                </span>
                              </td>
                              <td className="py-3 pr-3 font-mono tabular-nums font-bold">
                                {formatRupiah(displayAmount)}
                              </td>
                              <td className="py-3">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    selfRef
                                      ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"
                                      : c.status === "paid"
                                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700"
                                        : c.status === "available"
                                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#2563EB]"
                                          : "bg-amber-50 dark:bg-amber-950/50 text-amber-700"
                                  }`}
                                >
                                  {selfRef
                                    ? "Invalid (Self-Referral)"
                                    : c.status === "paid"
                                      ? "Sudah Cair"
                                      : c.status === "available"
                                        ? "Siap Cair"
                                        : "Pending Trial"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
      <ScrollToTopButton />
    </div>
  );
}
