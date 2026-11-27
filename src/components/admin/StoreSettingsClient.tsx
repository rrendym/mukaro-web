"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  X,
  Users,
  Wallet,
} from "lucide-react";
import { OrderMode, Store } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { compressImageFile } from "@/lib/image-compression";

const ACCENT_PRESETS = [
  { name: "Crimson Red", hex: "#C8102E" },
  { name: "Espresso", hex: "#4A2C2A" },
  { name: "Matcha", hex: "#15803D" },
  { name: "Cobalt", hex: "#1D4ED8" },
  { name: "Amber Gold", hex: "#D97706" },
  { name: "Charcoal", hex: "#1A1A1A" },
];

export function StoreSettingsClient({ store }: { store: Store }) {
  const router = useRouter();
  const [name, setName] = useState(store.name);
  const [tagline, setTagline] = useState(store.tagline || "");
  const [logoUrl, setLogoUrl] = useState(store.logo_url || "");
  const [accentColor, setAccentColor] = useState(
    store.accent_color || "#C8102E"
  );
  const [bannerUrl, setBannerUrl] = useState(store.banner_url || "");
  const [bannerTitle, setBannerTitle] = useState(store.banner_title || "");
  const [bannerSubtitle, setBannerSubtitle] = useState(
    store.banner_subtitle || ""
  );
  const [showBanner, setShowBanner] = useState(store.show_banner);
  const [orderMode, setOrderMode] = useState<OrderMode>(store.order_mode);
  const [waNumber, setWaNumber] = useState(store.wa_number || "");
  const [showWa, setShowWa] = useState(store.show_wa);
  const [taxPercent, setTaxPercent] = useState(String(store.tax_percent ?? 0));
  const [servicePercent, setServicePercent] = useState(
    String(store.service_percent ?? 0)
  );
  const [staffPin, setStaffPin] = useState(store.staff_pin || "1234");
  const [cashDrawerInitial, setCashDrawerInitial] = useState(
    String(store.cash_drawer_initial ?? 0)
  );
  const [stockPin, setStockPin] = useState(store.stock_pin || "1234");
  const [showStockPin, setShowStockPin] = useState(false);
  const [supervisorPin, setSupervisorPin] = useState(
    store.supervisor_pin || store.staff_pin || "1234"
  );
  const [showSupervisorPin, setShowSupervisorPin] = useState(false);
  const [companyName, setCompanyName] = useState(store.company_name || "");
  const [npwp, setNpwp] = useState(store.npwp || "");
  const [staffList, setStaffList] = useState<string[]>(
    Array.isArray(store.staff_list) ? store.staff_list : []
  );
  const [newStaffName, setNewStaffName] = useState("");
  const [activeStaffName, setActiveStaffName] = useState(
    store.active_staff_name || ""
  );
  const [staticQrisUrl, setStaticQrisUrl] = useState(
    store.static_qris_url || ""
  );
  const [midtransServerKey, setMidtransServerKey] = useState(
    store.midtrans_server_key || ""
  );
  const [midtransClientKey, setMidtransClientKey] = useState(
    store.midtrans_client_key || ""
  );

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingQris, setUploadingQris] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Account Password Change state
  const [accountEmail, setAccountEmail] = useState<string>("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurPass, setShowCurPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfPass, setShowConfPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setAccountEmail(data.user.email);
      }
    });
  }, []);

  const handleChangePassword = async () => {
    setPassError(null);
    setPassSuccess(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPassError("Semua kolom password wajib diisi.");
      return;
    }
    if (newPassword.length < 6) {
      setPassError("Password baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPassError("Konfirmasi password baru tidak cocok.");
      return;
    }
    if (!accountEmail) {
      setPassError("Email akun tidak ditemukan. Silakan login ulang.");
      return;
    }

    setChangingPass(true);
    try {
      const supabase = createClient();
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: accountEmail,
        password: currentPassword,
      });
      if (verifyErr) {
        throw new Error("Password saat ini salah.");
      }

      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateErr) throw updateErr;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPassSuccess("Password akun berhasil diperbarui!");
    } catch (err) {
      setPassError(
        err instanceof Error ? err.message : "Gagal mengubah password."
      );
    } finally {
      setChangingPass(false);
    }
  };

  const handleUploadAsset = async (
    file: File,
    folder: "logo" | "banner" | "qris",
    setLoading: (val: boolean) => void,
    setUrl: (url: string) => void
  ) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Format file tidak valid. Gunakan gambar JPG, PNG, atau WEBP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Ukuran file melebihi batas maksimal 2MB.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const compressed = await compressImageFile(file, {
        maxWidth: folder === "logo" ? 500 : 1400,
        maxHeight: folder === "logo" ? 500 : 900,
        targetMaxBytes: 200 * 1024,
      });
      const supabase = createClient();
      const filePath = `${store.id}/${folder}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("stores")
        .upload(filePath, compressed, {
          contentType: "image/jpeg",
          upsert: true,
        });
      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage
        .from("stores")
        .getPublicUrl(filePath);
      setUrl(data.publicUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengunggah gambar."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedToast(false);

    try {
      const supabase = createClient();
      const basePayload = {
        name: name.trim(),
        tagline: tagline.trim() || null,
        logo_url: logoUrl.trim() || null,
        accent_color: accentColor,
        banner_url: bannerUrl.trim() || null,
        banner_title: bannerTitle.trim() || null,
        banner_subtitle: bannerSubtitle.trim() || null,
        show_banner: showBanner,
        order_mode: orderMode,
        wa_number: waNumber.trim() || null,
        show_wa: showWa,
        tax_percent: Number(taxPercent || 0),
        service_percent: Number(servicePercent || 0),
        staff_pin: staffPin.trim() || "1234",
        cash_drawer_initial: Math.max(0, Number(cashDrawerInitial || 0)),
        static_qris_url: staticQrisUrl.trim() || null,
        midtrans_server_key: midtransServerKey.trim() || null,
        midtrans_client_key: midtransClientKey.trim() || null,
      };

      const { error: updateErr } = await supabase
        .from("stores")
        .update({
          ...basePayload,
          company_name: companyName.trim() || null,
          npwp: npwp.trim() || null,
          stock_pin: stockPin.trim() || "1234",
          supervisor_pin: supervisorPin.trim() || "1234",
          staff_list: staffList,
          active_staff_name: activeStaffName.trim() || null,
        })
        .eq("id", store.id);

      if (updateErr) {
        const msg = updateErr.message.toLowerCase();
        if (
          msg.includes("stock_pin") ||
          msg.includes("supervisor_pin") ||
          msg.includes("company_name") ||
          msg.includes("npwp") ||
          msg.includes("staff_list") ||
          msg.includes("active_staff_name")
        ) {
          const { error: fallbackErr } = await supabase
            .from("stores")
            .update(basePayload)
            .eq("id", store.id);
          if (fallbackErr) throw fallbackErr;
        } else {
          throw updateErr;
        }
      }

      setSavedToast(true);
      router.refresh();
      setTimeout(() => setSavedToast(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menyimpan pengaturan."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Pengaturan Toko &amp; Tampilan
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Atur identitas brand, warna aksen, banner promo, mode pemesanan, dan
            pajak.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || uploadingLogo || uploadingBanner || uploadingQris}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-extrabold hover:bg-[#1D4ED8] transition disabled:opacity-60"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>Simpan Pengaturan</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/20 text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      {savedToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/30 text-xs text-emerald-700 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Pengaturan toko berhasil disimpan!</span>
        </div>
      )}

      {/* Identitas & Warna */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-5">
        <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Identitas Brand &amp; Warna Aksen
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-neutral-400">Logo</span>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs font-bold cursor-pointer hover:border-[#2563EB] transition">
              {uploadingLogo ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{uploadingLogo ? "Mengunggah..." : "Upload Logo Resto"}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f)
                    handleUploadAsset(
                      f,
                      "logo",
                      setUploadingLogo,
                      setLogoUrl
                    );
                }}
                className="hidden"
              />
            </label>
            <p className="text-[11px] text-neutral-500">
              Rekomendasi rasio 1:1. Otomatis dikompres di bawah 200KB.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Nama Resto / Kafe
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Tagline Singkat
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Contoh: Seduh hangat setiap hari"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
            Warna Aksen Utama
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer p-0.5 bg-white dark:bg-[#111827]"
            />
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.hex}
                type="button"
                onClick={() => setAccentColor(preset.hex)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition ${
                  accentColor.toLowerCase() === preset.hex.toLowerCase()
                    ? "border-[#2563EB] bg-[#F8FAFC] dark:bg-[#090D16]"
                    : "border-slate-200 dark:border-slate-800 hover:border-[#2563EB]/40"
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: preset.hex }}
                />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Promo Banner */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Hero Promo Banner
            </h2>
            <p className="text-xs text-neutral-500">
              Tampilkan banner promo di bagian atas menu customer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBanner(!showBanner)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showBanner ? "bg-emerald-600" : "bg-neutral-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-[#111827] transition-transform ${
                showBanner ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="space-y-3">
          {bannerUrl && (
            <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-[#F8FAFC] dark:bg-[#090D16]">
              <img
                src={bannerUrl}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs font-bold cursor-pointer hover:border-[#2563EB] transition">
            {uploadingBanner ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span>
              {uploadingBanner ? "Mengunggah..." : "Upload Gambar Banner"}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f)
                  handleUploadAsset(
                    f,
                    "banner",
                    setUploadingBanner,
                    setBannerUrl
                  );
              }}
              className="hidden"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Judul Promo
            </label>
            <input
              type="text"
              value={bannerTitle}
              onChange={(e) => setBannerTitle(e.target.value)}
              placeholder="Promo Senja Hemat 20%"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Subjudul Promo
            </label>
            <input
              type="text"
              value={bannerSubtitle}
              onChange={(e) => setBannerSubtitle(e.target.value)}
              placeholder="Berlaku setiap hari pukul 15.00 - 18.00"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>
        </div>
      </div>

      {/* Mode Pemesanan */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Mode Pemesanan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              value: "table" as OrderMode,
              title: "QR Per Meja",
              desc: "Setiap meja memiliki QR unik (?meja=01) dan otomatis menampilkan nomor meja.",
            },
            {
              value: "counter" as OrderMode,
              title: "1 QR Counter / Food Court",
              desc: "Satu QR utama untuk pesan ambil di counter kasir.",
            },
            {
              value: "hybrid" as OrderMode,
              title: "Hybrid (Dine-in / Takeaway)",
              desc: "Satu QR utama, pelanggan memilih Makan di Sini atau Takeaway saat checkout.",
            },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setOrderMode(opt.value)}
              className={`p-4 rounded-2xl border text-left transition ${
                orderMode === opt.value
                  ? "border-[#2563EB] bg-[#F8FAFC] dark:bg-[#090D16]"
                  : "border-slate-200 dark:border-slate-800 hover:border-[#2563EB]/40"
              }`}
            >
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{opt.title}</p>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                {opt.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* WhatsApp & Pajak */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-5">
        <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          WhatsApp Kasir &amp; Pajak
        </h2>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#090D16]">
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Aktifkan Tombol WhatsApp Kasir
            </p>
            <p className="text-[11px] text-neutral-500">
              Menampilkan ikon WhatsApp di header menu customer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowWa(!showWa)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showWa ? "bg-emerald-600" : "bg-neutral-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-[#111827] transition-transform ${
                showWa ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Nomor WhatsApp Kasir
            </label>
            <input
              type="text"
              value={waNumber}
              onChange={(e) => setWaNumber(e.target.value)}
              placeholder="6281234567890"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-mono tabular-nums focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Pajak Resto / PB1 (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-mono tabular-nums focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Service Charge (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={servicePercent}
              onChange={(e) => setServicePercent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-mono tabular-nums focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>
        </div>
      </div>

      {/* Operasional Kasir, Modal Awal & Daftar Karyawan */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-[#2563EB]" />
          <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Operasional Kasir, Modal Awal &amp; Daftar Karyawan
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Nama PT / Perusahaan (Opsional)
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="PT Senja Kuliner Nusantara"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-sm focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              NPWP Perusahaan (Opsional)
            </label>
            <input
              type="text"
              value={npwp}
              onChange={(e) => setNpwp(e.target.value)}
              placeholder="01.234.567.8-901.000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-sm font-mono focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Modal Awal / Deposit Kasir (Rp)
            </label>
            <input
              type="number"
              min={0}
              step={10000}
              value={cashDrawerInitial}
              onChange={(e) => setCashDrawerInitial(e.target.value)}
              placeholder="300000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-sm font-bold font-mono tabular-nums focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Karyawan Sedang Bertugas (On-Duty)
            </label>
            <select
              value={activeStaffName}
              onChange={(e) => setActiveStaffName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-sm font-semibold focus:outline-none focus:border-[#2563EB] transition"
            >
              <option value="">-- Belum dipilih --</option>
              {staffList.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              PIN Khusus Stok &amp; Opname
            </label>
            <div className="relative">
              <input
                type={showStockPin ? "text" : "password"}
                value={stockPin}
                onChange={(e) => setStockPin(e.target.value)}
                placeholder="1234"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-sm font-bold font-mono tabular-nums focus:outline-none focus:border-[#2563EB] transition"
              />
              <button
                type="button"
                onClick={() => setShowStockPin((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Tampilkan/Sembunyikan PIN Stok"
              >
                {showStockPin ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              PIN Supervisor (Untuk Void / Refund Pesanan)
            </label>
            <div className="relative">
              <input
                type={showSupervisorPin ? "text" : "password"}
                value={supervisorPin}
                onChange={(e) => setSupervisorPin(e.target.value)}
                placeholder="1234"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-sm font-bold font-mono tabular-nums focus:outline-none focus:border-[#2563EB] transition"
              />
              <button
                type="button"
                onClick={() => setShowSupervisorPin((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Tampilkan/Sembunyikan PIN Supervisor"
              >
                {showSupervisorPin ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
            <Users className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Daftar Karyawan / Kasir</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const trimmed = newStaffName.trim();
                  if (trimmed && !staffList.includes(trimmed)) {
                    setStaffList((prev) => [...prev, trimmed]);
                    if (!activeStaffName) setActiveStaffName(trimmed);
                    setNewStaffName("");
                  }
                }
              }}
              placeholder="Tambah nama karyawan (misal: Budi)"
              className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-xs focus:outline-none focus:border-[#2563EB]"
            />
            <button
              type="button"
              onClick={() => {
                const trimmed = newStaffName.trim();
                if (!trimmed || staffList.includes(trimmed)) return;
                setStaffList((prev) => [...prev, trimmed]);
                if (!activeStaffName) setActiveStaffName(trimmed);
                setNewStaffName("");
              }}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>

          {staffList.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {staffList.map((st) => (
                <span
                  key={st}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                    activeStaffName === st
                      ? "bg-blue-50 dark:bg-blue-950/50 border-[#2563EB] text-[#2563EB]"
                      : "bg-[#F8FAFC] dark:bg-[#090D16] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <span>{st}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffList((prev) => prev.filter((item) => item !== st));
                      if (activeStaffName === st) setActiveStaffName("");
                    }}
                    className="text-slate-400 hover:text-rose-600"
                    aria-label={`Hapus ${st}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Keamanan Staf & Pembayaran QRIS / Midtrans */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-5">
        <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          PIN Staf &amp; Pembayaran QRIS / Midtrans
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              PIN Staf (Untuk Void Order)
            </label>
            <input
              type="text"
              required
              value={staffPin}
              onChange={(e) => setStaffPin(e.target.value)}
              placeholder="1234"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold font-mono tabular-nums focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Midtrans Server Key (Opsional)
            </label>
            <input
              type="password"
              value={midtransServerKey}
              onChange={(e) => setMidtransServerKey(e.target.value)}
              placeholder="SB-Mid-server-..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Midtrans Client Key (Opsional)
            </label>
            <input
              type="text"
              value={midtransClientKey}
              onChange={(e) => setMidtransClientKey(e.target.value)}
              placeholder="SB-Mid-client-..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>
        </div>

        <div className="pt-2 space-y-3">
          <label className="block text-xs font-bold text-slate-900 dark:text-slate-100">
            Upload QRIS Statis Toko (Digunakan jika Midtrans belum diisi)
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {staticQrisUrl && (
              <img
                src={staticQrisUrl}
                alt="QRIS Statis"
                className="w-24 h-24 rounded-2xl object-contain border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-1"
              />
            )}
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs font-bold cursor-pointer hover:border-[#2563EB] transition w-fit">
              {uploadingQris ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>
                {uploadingQris ? "Mengunggah..." : "Upload Gambar QRIS Statis"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f)
                    handleUploadAsset(
                      f,
                      "qris",
                      setUploadingQris,
                      setStaticQrisUrl
                    );
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Keamanan Akun & Ubah Password */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Keamanan Akun &amp; Ubah Password
            </h2>
          </div>
          {accountEmail && (
            <span className="text-xs font-mono text-neutral-500 bg-[#F8FAFC] dark:bg-[#090D16] px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">
              {accountEmail}
            </span>
          )}
        </div>

        {passError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/20 text-xs text-rose-700 font-medium">
            {passError}
          </div>
        )}

        {passSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/30 text-xs text-emerald-700 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{passSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Password Saat Ini
            </label>
            <div className="relative">
              <input
                type={showCurPass ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Password lama"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-[#2563EB] transition"
              />
              <button
                type="button"
                onClick={() => setShowCurPass(!showCurPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              >
                {showCurPass ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Password Baru
            </label>
            <div className="relative">
              <input
                type={showNewPass ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-[#2563EB] transition"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              >
                {showNewPass ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <input
                type={showConfPass ? "text" : "password"}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-[#2563EB] transition"
              />
              <button
                type="button"
                onClick={() => setShowConfPass(!showConfPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              >
                {showConfPass ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={changingPass}
            onClick={handleChangePassword}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition disabled:opacity-60"
          >
            {changingPass && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Ubah Password</span>
          </button>
        </div>
      </div>
    </form>
  );
}
