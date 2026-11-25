"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Lock,
  Mail,
  Store as StoreIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { slugify } from "@/lib/format";
import { MukaroLogo } from "@/components/MukaroLogo";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleStoreNameChange = (val: string) => {
    setStoreName(val);
    setStoreSlug(slugify(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!isSupabaseConfigured()) {
      setError(
        "Supabase belum dikonfigurasi. Tambahkan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local."
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "forgot") {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );
        if (resetErr) throw resetErr;
        setInfo(
          "Tautan reset password telah dikirim ke email Anda. Silakan cek kotak masuk atau folder spam."
        );
        return;
      }

      if (mode === "login") {
        const { data: authData, error: authError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Gagal mendapatkan data pengguna.");

        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .select("slug")
          .eq("owner_id", authData.user.id)
          .limit(1)
          .single();

        const superadminEmail = (
          process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL || ""
        )
          .toLowerCase()
          .trim();
        const isSuperadmin =
          Boolean(superadminEmail) &&
          (authData.user.email || "").toLowerCase().trim() === superadminEmail;

        if (storeError || !storeData) {
          if (isSuperadmin) {
            router.push("/superadmin");
            router.refresh();
            return;
          }
          throw new Error(
            "Akun ini belum memiliki toko terdaftar. Silakan daftar toko baru."
          );
        }

        router.push(`/${storeData.slug}/admin/menu`);
        router.refresh();
      } else {
        const cleanSlug = slugify(storeSlug);
        if (!storeName.trim() || !cleanSlug) {
          throw new Error("Nama toko dan slug URL wajib diisi.");
        }

        const { data: authData, error: signUpError } =
          await supabase.auth.signUp({
            email,
            password,
          });

        if (signUpError) throw signUpError;

        if (!authData.user) {
          throw new Error("Pendaftaran gagal. Silakan coba lagi.");
        }

        if (authData.session) {
          const { error: insertError } = await supabase.from("stores").insert({
            owner_id: authData.user.id,
            name: storeName.trim(),
            slug: cleanSlug,
            tagline: "Selamat datang di toko kami",
          });

          if (insertError) throw insertError;

          router.push(`/${cleanSlug}/admin/menu`);
          router.refresh();
        } else {
          setInfo(
            "Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi sebelum login."
          );
          setMode("login");
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan autentikasi.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#0F172A] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>
          <Link
            href="/kopi-senja"
            className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition"
          >
            Lihat Demo Menu &rarr;
          </Link>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-7 sm:p-8 space-y-6">
          <div className="space-y-2">
            <MukaroLogo size="sm" showDomain />
            <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-[#0F172A] pt-2">
              {mode === "login"
                ? "Masuk Dashboard Owner"
                : mode === "register"
                  ? "Daftarkan Toko Baru"
                  : "Reset Password"}
            </h1>
            <p className="text-xs text-[#475569] leading-relaxed">
              {mode === "login"
                ? "Kelola menu, kasir POS, stok bahan baku, dan QR outlet Anda."
                : mode === "register"
                  ? "Buat akun owner dan mulai gunakan menu digital Mukaro gratis 14 hari."
                  : "Masukkan email akun Anda untuk menerima tautan pemulihan password."}
            </p>
          </div>

          {mode !== "forgot" && (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setInfo(null);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition ${
                  mode === "login"
                    ? "bg-white text-[#0F172A] shadow-xs border border-[#E2E8F0]"
                    : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                  setInfo(null);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition ${
                  mode === "register"
                    ? "bg-white text-[#0F172A] shadow-xs border border-[#E2E8F0]"
                    : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                Daftar Toko
              </button>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {info && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Nama Kafe / Resto
                  </label>
                  <div className="relative">
                    <StoreIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => handleStoreNameChange(e.target.value)}
                      placeholder="Contoh: Kopi Senja"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#2563EB] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Slug URL Toko
                  </label>
                  <div className="flex items-center rounded-xl border border-[#E2E8F0] overflow-hidden focus-within:border-[#2563EB] transition">
                    <span className="px-3 py-2.5 bg-[#F8FAFC] text-xs font-mono font-medium text-[#475569] border-r border-[#E2E8F0]">
                      mukaro.id/
                    </span>
                    <input
                      type="text"
                      required
                      value={storeSlug}
                      onChange={(e) => setStoreSlug(slugify(e.target.value))}
                      placeholder="kopi-senja"
                      className="flex-1 px-3 py-2.5 text-sm font-mono focus:outline-none bg-transparent"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@kopisenja.id"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#2563EB] transition"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#0F172A]">
                    Password
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setError(null);
                        setInfo(null);
                      }}
                      className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                    >
                      Lupa password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#2563EB] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0F172A]"
                    aria-label="Toggle password"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {mode === "login"
                  ? "Masuk Dashboard"
                  : mode === "register"
                    ? "Buat Toko Sekarang"
                    : "Kirim Tautan Reset Password"}
              </span>
            </button>

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setInfo(null);
                }}
                className="w-full py-2 text-xs font-semibold text-[#475569] hover:text-[#0F172A] transition"
              >
                &larr; Kembali ke halaman Masuk
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
