"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  TicketPercent,
  Megaphone,
  Clock,
  Pencil,
  X,
  ImagePlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Store, Voucher } from "@/types/database";
import { formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { compressImageFile } from "@/lib/image-compression";
import { normalizePromoPosters } from "@/lib/promo-settings";

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function formatValidityWindow(v: Voucher): string | null {
  if (!v.valid_from && !v.valid_until) return null;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  if (v.valid_from && v.valid_until) {
    return `${fmt(v.valid_from)} – ${fmt(v.valid_until)}`;
  }
  if (v.valid_from) return `Mulai ${fmt(v.valid_from)}`;
  return `Sampai ${fmt(v.valid_until!)}`;
}

export function VouchersManagerClient({
  store,
  initialVouchers,
}: {
  store: Store;
  initialVouchers: Voucher[];
}) {
  const router = useRouter();
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);

  // Create form state (isolated from Edit modal)
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    "percent"
  );
  const [discountValue, setDiscountValue] = useState("10");
  const [minOrder, setMinOrder] = useState("0");
  const [showInCustomerBar, setShowInCustomerBar] = useState(false);
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Separate Edit Voucher modal state
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editDiscountType, setEditDiscountType] = useState<"percent" | "fixed">(
    "percent"
  );
  const [editDiscountValue, setEditDiscountValue] = useState("10");
  const [editMinOrder, setEditMinOrder] = useState("0");
  const [editShowInCustomerBar, setEditShowInCustomerBar] = useState(false);
  const [editValidFrom, setEditValidFrom] = useState("");
  const [editValidUntil, setEditValidUntil] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Promo posters state (auto-save to stores.promo_posters)
  const [posters, setPosters] = useState<string[]>(() =>
    normalizePromoPosters(store.promo_posters, store.banner_url)
  );
  const [posterBusy, setPosterBusy] = useState(false);
  const [posterStatus, setPosterStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!editingVoucher) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !editSaving) {
        setEditingVoucher(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [editingVoucher, editSaving]);

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg((cur) => (cur === msg ? null : cur));
    }, 3000);
  };

  const resetCreateForm = () => {
    setCode("");
    setDiscountType("percent");
    setDiscountValue("10");
    setMinOrder("0");
    setShowInCustomerBar(false);
    setValidFrom("");
    setValidUntil("");
    setErrorMsg(null);
  };

  const openEditModal = (v: Voucher) => {
    setEditingVoucher(v);
    setEditCode(v.code);
    setEditDiscountType(v.discount_type);
    setEditDiscountValue(String(v.discount_value));
    setEditMinOrder(String(v.min_order ?? 0));
    setEditShowInCustomerBar(Boolean(v.show_in_customer_bar));
    setEditValidFrom(toDatetimeLocal(v.valid_from));
    setEditValidUntil(toDatetimeLocal(v.valid_until));
    setEditError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const valNum = Number(discountValue || 0);
    const minNum = Number(minOrder || 0);

    if (!cleanCode) {
      setErrorMsg("Kode voucher wajib diisi.");
      return;
    }
    if (valNum <= 0) {
      setErrorMsg("Nilai diskon harus lebih besar dari 0.");
      return;
    }
    if (discountType === "percent" && valNum > 100) {
      setErrorMsg("Diskon persen maksimal 100%.");
      return;
    }
    if (
      validFrom &&
      validUntil &&
      new Date(validUntil).getTime() < new Date(validFrom).getTime()
    ) {
      setErrorMsg("Tanggal berakhir tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    const supabase = createClient();

    const basePayload = {
      store_id: store.id,
      code: cleanCode,
      discount_type: discountType,
      discount_value: valNum,
      min_order: Math.max(0, minNum),
    };

    const extendedPayload = {
      ...basePayload,
      show_in_customer_bar: showInCustomerBar,
      valid_from: validFrom ? new Date(validFrom).toISOString() : null,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
    };

    try {
      let { data, error } = await supabase
        .from("vouchers")
        .insert({ ...extendedPayload, is_active: true })
        .select("*")
        .single();

      if (
        error &&
        (error.message.includes("show_in_customer_bar") ||
          error.message.includes("valid_from") ||
          error.message.includes("valid_until"))
      ) {
        const retry = await supabase
          .from("vouchers")
          .insert({ ...basePayload, is_active: true })
          .select("*")
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;
      if (data) {
        setVouchers((prev) => [data as Voucher, ...prev]);
      }
      resetCreateForm();
      showToast(`Voucher ${cleanCode} berhasil dibuat.`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menyimpan voucher."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVoucher) return;

    const cleanCode = editCode.trim().toUpperCase();
    const valNum = Number(editDiscountValue || 0);
    const minNum = Number(editMinOrder || 0);

    if (!cleanCode) {
      setEditError("Kode voucher wajib diisi.");
      return;
    }
    if (valNum <= 0) {
      setEditError("Nilai diskon harus lebih besar dari 0.");
      return;
    }
    if (editDiscountType === "percent" && valNum > 100) {
      setEditError("Diskon persen maksimal 100%.");
      return;
    }
    if (
      editValidFrom &&
      editValidUntil &&
      new Date(editValidUntil).getTime() < new Date(editValidFrom).getTime()
    ) {
      setEditError(
        "Tanggal berakhir tidak boleh lebih awal dari tanggal mulai."
      );
      return;
    }

    setEditSaving(true);
    setEditError(null);
    const supabase = createClient();

    const basePayload = {
      code: cleanCode,
      discount_type: editDiscountType,
      discount_value: valNum,
      min_order: Math.max(0, minNum),
    };

    const extendedPayload = {
      ...basePayload,
      show_in_customer_bar: editShowInCustomerBar,
      valid_from: editValidFrom ? new Date(editValidFrom).toISOString() : null,
      valid_until: editValidUntil
        ? new Date(editValidUntil).toISOString()
        : null,
    };

    try {
      let { data, error } = await supabase
        .from("vouchers")
        .update(extendedPayload)
        .eq("id", editingVoucher.id)
        .select("*")
        .single();

      if (
        error &&
        (error.message.includes("show_in_customer_bar") ||
          error.message.includes("valid_from") ||
          error.message.includes("valid_until"))
      ) {
        const retry = await supabase
          .from("vouchers")
          .update(basePayload)
          .eq("id", editingVoucher.id)
          .select("*")
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;
      if (data) {
        setVouchers((prev) =>
          prev.map((item) =>
            item.id === editingVoucher.id ? (data as Voucher) : item
          )
        );
      }
      setEditingVoucher(null);
      showToast(`Voucher ${cleanCode} berhasil diperbarui.`);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Gagal memperbarui voucher."
      );
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggle = async (v: Voucher) => {
    const next = !v.is_active;
    setVouchers((prev) =>
      prev.map((item) => (item.id === v.id ? { ...item, is_active: next } : item))
    );
    const supabase = createClient();
    await supabase
      .from("vouchers")
      .update({ is_active: next })
      .eq("id", v.id);
  };

  const handleToggleRunningBar = async (v: Voucher) => {
    const next = !v.show_in_customer_bar;
    setVouchers((prev) =>
      prev.map((item) =>
        item.id === v.id ? { ...item, show_in_customer_bar: next } : item
      )
    );
    const supabase = createClient();
    const { error } = await supabase
      .from("vouchers")
      .update({ show_in_customer_bar: next })
      .eq("id", v.id);

    if (error) {
      setVouchers((prev) =>
        prev.map((item) =>
          item.id === v.id ? { ...item, show_in_customer_bar: !next } : item
        )
      );
      setErrorMsg(
        "Kolom show_in_customer_bar belum dimigrasi. Jalankan supabase_operational_updates.sql di Supabase."
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus voucher ini?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("vouchers").delete().eq("id", id);
    if (!error) {
      setVouchers((prev) => prev.filter((v) => v.id !== id));
      if (editingVoucher?.id === id) setEditingVoucher(null);
    }
  };

  const persistPosters = async (
    nextPosters: string[],
    prevPosters: string[],
    successText: string
  ) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("stores")
      .update({ promo_posters: nextPosters })
      .eq("id", store.id);

    if (error) {
      setPosters(prevPosters);
      setPosterStatus({
        type: "error",
        text: error.message.includes("promo_posters")
          ? "Kolom promo_posters belum dimigrasi. Jalankan supabase_promo_posters.sql di Supabase."
          : `Gagal menyimpan poster promo: ${error.message}`,
      });
      return;
    }

    setPosters(nextPosters);
    setPosterStatus({ type: "success", text: successText });
    router.refresh();
  };

  const handleUploadPosters = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    setPosterBusy(true);
    setPosterStatus(null);
    const prevPosters = [...posters];
    const uploadedUrls: string[] = [];

    try {
      const supabase = createClient();
      for (const file of files) {
        const compressed = await compressImageFile(file, {
          maxWidth: 1400,
          maxHeight: 900,
          targetMaxBytes: 240 * 1024,
        });
        const filePath = `${store.id}/promo-poster-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}.jpg`;
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
        if (data?.publicUrl) {
          uploadedUrls.push(data.publicUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        const nextPosters = normalizePromoPosters([
          ...prevPosters,
          ...uploadedUrls,
        ]);
        await persistPosters(
          nextPosters,
          prevPosters,
          `${uploadedUrls.length} poster promo berhasil diunggah dan tersimpan otomatis.`
        );
      }
    } catch (err) {
      setPosters(prevPosters);
      setPosterStatus({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Gagal mengunggah poster promo.",
      });
    } finally {
      setPosterBusy(false);
    }
  };

  const handleRemovePoster = async (index: number) => {
    const prevPosters = [...posters];
    const nextPosters = posters.filter((_, idx) => idx !== index);
    setPosters(nextPosters);
    setPosterBusy(true);
    setPosterStatus(null);
    try {
      await persistPosters(
        nextPosters,
        prevPosters,
        "Poster promo dihapus dan perubahan tersimpan otomatis."
      );
    } finally {
      setPosterBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Manajemen Voucher &amp; Poster Promo
        </h1>
        <p className="text-xs text-neutral-500 dark:text-slate-400 mt-0.5">
          Kelola kode promo, jadwal berlaku, serta poster carousel untuk halaman Menu Customer.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Promo Posters Auto-Save Section */}
      <section className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-[#2563EB]" />
              <span>Poster Promo (Hero Carousel Customer)</span>
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-slate-400 mt-0.5">
              Upload atau hapus poster langsung tersimpan otomatis ke database tanpa tombol simpan tambahan.
            </p>
          </div>

          <label
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-extrabold cursor-pointer transition shrink-0 ${
              posterBusy ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            {posterBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImagePlus className="w-4 h-4" />
            )}
            <span>{posterBusy ? "Menyimpan..." : "Upload Poster Promo"}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={posterBusy}
              onChange={handleUploadPosters}
              className="hidden"
            />
          </label>
        </div>

        {posterStatus && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              posterStatus.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300"
            }`}
          >
            {posterStatus.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{posterStatus.text}</span>
          </div>
        )}

        {posters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-xs text-neutral-500 dark:text-slate-400">
            Belum ada poster promo. Unggah gambar poster (disarankan rasio 16:7 atau landscape) agar tampil sebagai hero carousel di Menu Customer.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {posters.map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090D16] aspect-[16/8]"
              >
                <img
                  src={url}
                  alt={`Poster Promo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/75 text-white text-[10px] font-bold">
                  Slide #{idx + 1}
                </span>
                <button
                  type="button"
                  disabled={posterBusy}
                  onClick={() => handleRemovePoster(idx)}
                  aria-label={`Hapus poster ${idx + 1}`}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white shadow-sm transition disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Create New Voucher Only */}
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 h-fit"
        >
          <div className="flex items-center gap-2">
            <TicketPercent className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Buat Voucher Baru
            </h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
              Kode Voucher *
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SENJA10"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-sm font-bold uppercase text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                Tipe
              </label>
              <select
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as "percent" | "fixed")
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
              >
                <option value="percent">Persen (%)</option>
                <option value="fixed">Nominal (Rp)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                Nilai
              </label>
              <input
                type="number"
                required
                min={1}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
              Minimal Belanja (Rp)
            </label>
            <input
              type="number"
              min={0}
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          {/* Waktu Berlaku Promo */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
              <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Jadwal Waktu Berlaku (Opsional)</span>
            </label>
            <div className="space-y-2">
              <div>
                <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Mulai Berlaku
                </span>
                <input
                  type="datetime-local"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Berakhir Pada
                </span>
                <input
                  type="datetime-local"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          </div>

          {/* Running Bar Toggle */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={showInCustomerBar}
              onChange={(e) => setShowInCustomerBar(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB]"
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug">
              Tampilkan di Popup / Info Promo Menu Customer
            </span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-extrabold hover:bg-[#1D4ED8] flex items-center justify-center gap-1.5 transition disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            <span>{saving ? "Menyimpan..." : "Simpan Voucher"}</span>
          </button>
        </form>

        {/* Right Panel: Voucher List */}
        <div className="lg:col-span-2 space-y-3">
          {vouchers.length === 0 ? (
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800 text-sm text-neutral-500 dark:text-slate-400">
              Belum ada voucher promo.
            </div>
          ) : (
            vouchers.map((v) => {
              const validityText = formatValidityWindow(v);
              return (
                <div
                  key={v.id}
                  className="bg-white dark:bg-[#111827] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#2563EB] transition"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        {v.code}
                      </span>
                      <span className="text-xs font-bold text-[#059669] dark:text-emerald-400 font-mono tabular-nums">
                        {v.discount_type === "percent"
                          ? `Diskon ${v.discount_value}%`
                          : `Potongan ${formatRupiah(Number(v.discount_value))}`}
                      </span>
                      {v.show_in_customer_bar && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 text-[10px] font-bold">
                          <Megaphone className="w-3 h-3" />
                          Info Promo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-slate-400 font-mono tabular-nums">
                      Minimal order: {formatRupiah(Number(v.min_order || 0))}
                    </p>
                    {validityText && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#2563EB]" />
                        <span>Berlaku: {validityText}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleRunningBar(v)}
                      title="Toggle tampil di Info Promo Customer"
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 transition ${
                        v.show_in_customer_bar
                          ? "bg-blue-50 dark:bg-blue-950/50 border-[#2563EB] text-[#2563EB] dark:text-blue-400"
                          : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#2563EB]"
                      }`}
                    >
                      <Megaphone className="w-3 h-3" />
                      <span>Info Promo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggle(v)}
                      aria-label={`Toggle aktif ${v.code}`}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        v.is_active
                          ? "bg-emerald-600"
                          : "bg-neutral-300 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          v.is_active ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(v)}
                      className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                      aria-label={`Edit ${v.code}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(v.id)}
                      className="p-2 rounded-xl text-neutral-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                      aria-label={`Hapus ${v.code}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Separate Edit Voucher Modal */}
      {editingVoucher &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-[2px]"
            onClick={() => {
              if (!editSaving) setEditingVoucher(null);
            }}
            role="dialog"
            aria-modal="true"
            aria-label={`Edit Voucher ${editingVoucher.code}`}
          >
            <div
              className="w-full max-w-lg max-h-[88dvh] flex flex-col overflow-hidden bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <TicketPercent className="w-4 h-4 text-[#2563EB]" />
                  <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    Edit Voucher Promo
                  </h2>
                </div>
                <button
                  type="button"
                  disabled={editSaving}
                  onClick={() => setEditingVoucher(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  aria-label="Tutup modal edit"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                id="edit-voucher-form"
                onSubmit={handleUpdateModalSubmit}
                className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4"
              >
                {editError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-300">
                    {editError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Kode Voucher *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090D16] text-sm font-bold uppercase text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB] transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                      Tipe
                    </label>
                    <select
                      value={editDiscountType}
                      onChange={(e) =>
                        setEditDiscountType(
                          e.target.value as "percent" | "fixed"
                        )
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-white dark:bg-[#090D16] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value="percent">Persen (%)</option>
                      <option value="fixed">Nominal (Rp)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                      Nilai
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={editDiscountValue}
                      onChange={(e) => setEditDiscountValue(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090D16] text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Minimal Belanja (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editMinOrder}
                    onChange={(e) => setEditMinOrder(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090D16] text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                    <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Jadwal Waktu Berlaku (Opsional)</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Mulai Berlaku
                      </span>
                      <input
                        type="datetime-local"
                        value={editValidFrom}
                        onChange={(e) => setEditValidFrom(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090D16] text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Berakhir Pada
                      </span>
                      <input
                        type="datetime-local"
                        value={editValidUntil}
                        onChange={(e) => setEditValidUntil(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090D16] text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editShowInCustomerBar}
                    onChange={(e) => setEditShowInCustomerBar(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB]"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug">
                    Tampilkan di Popup / Info Promo Menu Customer
                  </span>
                </label>
              </form>

              <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090D16] flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  disabled={editSaving}
                  onClick={() => setEditingVoucher(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="edit-voucher-form"
                  disabled={editSaving}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition disabled:opacity-60"
                >
                  {editSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editSaving ? "Menyimpan..." : "Simpan Perubahan"}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
