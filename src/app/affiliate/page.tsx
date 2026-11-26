"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Coins,
  Handshake,
  HelpCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { MukaroLogo } from "@/components/MukaroLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/format";

const AFFILIATE_FAQS = [
  {
    q: "Bagaimana cara kerja komisi 30% Mukaro?",
    a: "Komisi 30% diberikan dari setiap aktivasi dan perpanjangan paket berbayar merchant yang mendaftar lewat link referral Anda, hingga Rp 90.000/outlet/bulan (Starter Rp 24.000, Pro Rp 45.000, Enterprise Rp 90.000).",
  },
  {
    q: "Apakah pendaftaran affiliate gratis dan butuh modal?",
    a: "100% gratis tanpa syarat deposit, biaya pendaftaran, atau kewajiban membeli paket langganan terlebih dahulu.",
  },
  {
    q: "Kapan dan bagaimana komisi bisa dicairkan?",
    a: "Pencairan dapat diajukan langsung dari Dashboard Partner ke rekening bank atau e-wallet (BCA, Mandiri, BRI, BNI, GoPay, DANA, OVO) setelah memiliki minimal 2 outlet aktif berbayar dan saldo komisi minimal Rp 50.000.",
  },
  {
    q: "Bagaimana cara mendapatkan banyak merchant aktif lebih cepat?",
    a: "Tawarkan langsung ke kedai kopi, rumah makan, warmindo, atau UMKM kuliner di sekitar Anda dengan memanfaatkan materi promosi siap pakai di Dashboard Partner (template WhatsApp, script video pendek, dan broadcast komunitas) serta tawarkan masa uji coba gratis 14 hari tanpa risiko bagi calon merchant.",
  },
  {
    q: "Bagaimana cara mempromosikan Mukaro jika belum punya banyak followers?",
    a: "Anda bisa menawarkan langsung ke kedai kopi, resto, warmindo, atau tenant kuliner di sekitar Anda menggunakan materi promosi siap pakai (template WhatsApp, script video pendek, dan broadcast grup) yang sudah tersedia di Dashboard Partner.",
  },
];

function generateReferralCode(name: string): string {
  const prefix = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "M");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${suffix}`;
}

export default function AffiliatePage() {
  const router = useRouter();
  const [simOutlets, setSimOutlets] = useState(10);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
  const [alreadyPartner, setAlreadyPartner] = useState(false);

  // Registration form
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setLoggedInUserId(data.user.id);
        supabase
          .from("affiliate_profiles")
          .select("user_id")
          .eq("user_id", data.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (profile) setAlreadyPartner(true);
          });
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!isSupabaseConfigured()) {
      setError("Supabase belum dikonfigurasi.");
      return;
    }

    if (!fullName.trim() || !whatsapp.trim()) {
      setError("Nama lengkap dan nomor WhatsApp wajib diisi.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    try {
      let targetUserId = loggedInUserId;

      if (!targetUserId) {
        const { data: authData, error: signUpErr } =
          await supabase.auth.signUp({
            email: email.trim(),
            password,
          });
        if (signUpErr) throw signUpErr;
        if (!authData.user) {
          throw new Error("Gagal membuat akun partner.");
        }
        if (!authData.session) {
          setInfo(
            "Akun berhasil dibuat! Silakan verifikasi email Anda lalu masuk melalui halaman /login."
          );
          setSubmitting(false);
          return;
        }
        targetUserId = authData.user.id;
      }

      const referralCode = generateReferralCode(fullName);
      const { error: insertErr } = await supabase
        .from("affiliate_profiles")
        .insert({
          user_id: targetUserId,
          full_name: fullName.trim(),
          whatsapp: whatsapp.trim(),
          referral_code: referralCode,
        });

      if (insertErr) throw insertErr;

      router.push("/partner");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mendaftar sebagai partner."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Header */}
      <header className="animate-nav-enter sticky top-0 z-30 bg-white/85 dark:bg-[#090D16]/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <MukaroLogo size="sm" />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Beranda</span>
            </Link>
            <Link
              href="/partner"
              className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition"
            >
              Dashboard Partner
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">
        {/* Hero & Simulator */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-xs font-bold text-[#2563EB]">
              <Handshake className="w-4 h-4" />
              <span>Program Affiliate &amp; Partner Mukaro</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.03em] text-slate-900 dark:text-slate-100 leading-[1.1]">
              Dapatkan Komisi{" "}
              <span className="text-[#2563EB] font-mono">30%</span> dari Setiap
              Outlet Bergabung
            </h1>

            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Rekomendasikan Mukaro ke pemilik kedai kopi, resto, warmindo, atau
              tenant food court. Mereka dapat bonus{" "}
              <strong className="text-slate-900 dark:text-slate-100">
                +7 hari ekstra trial
              </strong>
              , dan Anda mendapat komisi tunai langsung saat mereka aktif
              berlangganan.
            </p>

            {/* Tier Commission Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { plan: "Starter", comm: 24000 },
                { plan: "Pro", comm: 45000 },
                { plan: "Enterprise", comm: 90000 },
              ].map((t) => (
                <div
                  key={t.plan}
                  className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-1"
                >
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Paket {t.plan}
                  </p>
                  <p className="text-lg font-extrabold font-mono tabular-nums text-[#2563EB]">
                    {formatRupiah(t.comm)}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    per aktivasi
                  </p>
                </div>
              ))}
            </div>

            {/* Interactive Earning Simulator */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#2563EB]" />
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Simulasi Penghasilan (Paket Pro)
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] text-xs font-mono font-bold tabular-nums">
                  {simOutlets} Outlet
                </span>
              </div>

              <input
                type="range"
                min={1}
                max={50}
                value={simOutlets}
                onChange={(e) => setSimOutlets(Number(e.target.value))}
                className="w-full accent-[#2563EB] cursor-pointer"
              />

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Estimasi Komisi Anda
                </span>
                <span className="text-2xl font-extrabold font-mono tabular-nums text-emerald-600">
                  {formatRupiah(simOutlets * 45000)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Free Partner Registration Form */}
          <div className="lg:col-span-6">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-7 sm:p-8 shadow-sm space-y-5">
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>100% Gratis • Tanpa Biaya Langganan</span>
                </span>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  Daftar Partner Affiliate Gratis
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Dapatkan link referral unik Anda dan mulai bagikan sekarang.
                </p>
              </div>

              {alreadyPartner ? (
                <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Akun Anda sudah terdaftar sebagai Partner!</span>
                  </div>
                  <Link
                    href="/partner"
                    className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <span>Buka Dashboard Partner</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-xs text-rose-700 font-medium">
                      {error}
                    </div>
                  )}
                  {info && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-xs text-emerald-700 font-medium">
                      {info}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                      Nomor WhatsApp Aktif *
                    </label>
                    <input
                      type="text"
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="081234567890"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  {!loggedInUserId && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="partner@email.com"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:border-[#2563EB]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                          Password *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:border-[#2563EB]"
                        />
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Daftar Partner Affiliate Gratis</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* FAQ Accordion Section */}
        <section className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2563EB]">
              <HelpCircle className="w-4 h-4" />
              <span>Pertanyaan Umum Partner</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.03em] text-slate-900 dark:text-slate-100">
              FAQ Program Affiliate Mukaro
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Semua yang perlu Anda ketahui sebelum mulai menghasilkan komisi 30%.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {AFFILIATE_FAQS.map((item, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div
                  key={item.q}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#111827] overflow-hidden"
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
                    <div className="animate-dropdown-enter px-5 pb-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <ScrollToTopButton />
    </div>
  );
}
