"use client";

import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Settings,
  ToggleLeft,
  ToggleRight,
  Users,
  Wallet,
  X,
  AlertCircle,
} from "lucide-react";
import {
  AffiliateCommission,
  AffiliateProfile,
  Store,
} from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/format";
import { isSelfReferralCommission } from "@/lib/affiliate";
import {
  AFFILIATE_SETTINGS_KEY,
  AffiliateSettingsConfig,
} from "@/lib/affiliate-settings";

interface AffiliateManagementPanelProps {
  stores: Store[];
  profiles: AffiliateProfile[];
  onProfilesChange: React.Dispatch<React.SetStateAction<AffiliateProfile[]>>;
  commissions: AffiliateCommission[];
  onCommissionsChange: React.Dispatch<
    React.SetStateAction<AffiliateCommission[]>
  >;
  initialSettings: AffiliateSettingsConfig;
}

interface PartnerFormState {
  mode: "create" | "edit";
  userId: string;
  fullName: string;
  whatsapp: string;
  referralCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  customCommissionPercent: string;
  isActive: boolean;
}

const EMPTY_FORM: PartnerFormState = {
  mode: "create",
  userId: "",
  fullName: "",
  whatsapp: "",
  referralCode: "",
  bankName: "",
  accountNumber: "",
  accountHolder: "",
  customCommissionPercent: "",
  isActive: true,
};

export function AffiliateManagementPanel({
  stores,
  profiles,
  onProfilesChange,
  commissions,
  onCommissionsChange,
  initialSettings,
}: AffiliateManagementPanelProps) {
  const [settings, setSettings] =
    useState<AffiliateSettingsConfig>(initialSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  const [commissionFilter, setCommissionFilter] = useState<
    "all" | "available" | "pending_trial" | "paid"
  >("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formState, setFormState] = useState<PartnerFormState>(EMPTY_FORM);
  const [savingPartner, setSavingPartner] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const profileMap = useMemo(() => {
    const m = new Map<string, AffiliateProfile>();
    for (const p of profiles) {
      m.set(p.user_id, p);
    }
    return m;
  }, [profiles]);

  // Registered store owners who don't have an affiliate profile yet
  const availableOwners = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ ownerId: string; storeName: string; wa: string }> = [];
    for (const st of stores) {
      if (!st.owner_id || seen.has(st.owner_id) || profileMap.has(st.owner_id)) {
        continue;
      }
      seen.add(st.owner_id);
      list.push({
        ownerId: st.owner_id,
        storeName: st.name,
        wa: st.wa_number || "",
      });
    }
    return list;
  }, [stores, profileMap]);

  // Partner stats computed from commissions & referred stores
  const partnerStats = useMemo(() => {
    const stats = new Map<
      string,
      { referralCount: number; totalCommission: number; pendingCommission: number }
    >();

    for (const p of profiles) {
      stats.set(p.user_id, {
        referralCount: 0,
        totalCommission: 0,
        pendingCommission: 0,
      });
    }

    for (const c of commissions) {
      const partner = profileMap.get(c.referrer_user_id);
      const selfRef = isSelfReferralCommission(c, partner);
      const entry = stats.get(c.referrer_user_id) || {
        referralCount: 0,
        totalCommission: 0,
        pendingCommission: 0,
      };
      entry.referralCount += 1;
      if (!selfRef) {
        const amt = Number(c.commission_amount || 0);
        entry.totalCommission += amt;
        if (c.status !== "paid") {
          entry.pendingCommission += amt;
        }
      }
      stats.set(c.referrer_user_id, entry);
    }

    return stats;
  }, [profiles, commissions, profileMap]);

  const filteredCommissions = useMemo(() => {
    if (commissionFilter === "all") return commissions;
    return commissions.filter((c) => c.status === commissionFilter);
  }, [commissions, commissionFilter]);

  const persistSettings = async (
    nextSettings: AffiliateSettingsConfig,
    successMsg: string
  ) => {
    const supabase = createClient();
    const { error } = await supabase.from("app_settings").upsert(
      {
        key: AFFILIATE_SETTINGS_KEY,
        value: nextSettings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      throw new Error(error.message);
    }
    setSettings(nextSettings);
    setFeedback({ type: "success", message: successMsg });
  };

  const handleSaveGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setFeedback(null);
    try {
      await persistSettings(
        settings,
        "Pengaturan komisi affiliate global berhasil disimpan."
      );
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal menyimpan pengaturan affiliate.",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTogglePartnerActive = async (userId: string) => {
    setBusyId(`toggle:${userId}`);
    setFeedback(null);
    const current = settings.partnerOverrides[userId];
    const nextActive = !(current?.isActive ?? true);
    const nextSettings: AffiliateSettingsConfig = {
      ...settings,
      partnerOverrides: {
        ...settings.partnerOverrides,
        [userId]: {
          isActive: nextActive,
          customCommissionPercent: current?.customCommissionPercent ?? null,
          notes: current?.notes,
        },
      },
    };

    try {
      await persistSettings(
        nextSettings,
        `Status partner berhasil diubah menjadi ${
          nextActive ? "Aktif" : "Nonaktif"
        }.`
      );
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : "Gagal mengubah status partner.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const openCreateModal = () => {
    const firstOwner = availableOwners[0];
    setFormState({
      ...EMPTY_FORM,
      mode: "create",
      userId: firstOwner?.ownerId || "",
      fullName: firstOwner ? `Partner ${firstOwner.storeName}` : "",
      whatsapp: firstOwner?.wa || "",
    });
    setFormModalOpen(true);
  };

  const openEditModal = (partner: AffiliateProfile) => {
    const override = settings.partnerOverrides[partner.user_id];
    setFormState({
      mode: "edit",
      userId: partner.user_id,
      fullName: partner.full_name,
      whatsapp: partner.whatsapp,
      referralCode: partner.referral_code,
      bankName: partner.bank_name || "",
      accountNumber: partner.account_number || "",
      accountHolder: partner.account_holder || "",
      customCommissionPercent:
        override?.customCommissionPercent != null
          ? String(override.customCommissionPercent)
          : "",
      isActive: override?.isActive ?? true,
    });
    setFormModalOpen(true);
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = formState.userId.trim();
    const fullName = formState.fullName.trim();
    const whatsapp = formState.whatsapp.trim();
    const referralCode = formState.referralCode
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "");

    if (!userId || !fullName || !whatsapp || !referralCode) {
      setFeedback({
        type: "error",
        message:
          "User ID, Nama Partner, WhatsApp, dan Kode Referral wajib diisi.",
      });
      return;
    }

    setSavingPartner(true);
    setFeedback(null);
    const supabase = createClient();

    try {
      const payload = {
        full_name: fullName,
        whatsapp,
        referral_code: referralCode,
        bank_name: formState.bankName.trim() || null,
        account_number: formState.accountNumber.trim() || null,
        account_holder: formState.accountHolder.trim() || null,
      };

      if (formState.mode === "create") {
        const { data, error } = await supabase
          .from("affiliate_profiles")
          .insert({
            user_id: userId,
            ...payload,
          })
          .select("*")
          .single();

        if (error) throw error;
        if (data) {
          onProfilesChange((prev) => [data as AffiliateProfile, ...prev]);
        }
      } else {
        const { data, error } = await supabase
          .from("affiliate_profiles")
          .update(payload)
          .eq("user_id", userId)
          .select("*")
          .single();

        if (error) throw error;
        if (data) {
          onProfilesChange((prev) =>
            prev.map((p) =>
              p.user_id === userId ? (data as AffiliateProfile) : p
            )
          );
        }
      }

      const customPct =
        formState.customCommissionPercent.trim() !== "" &&
        !Number.isNaN(Number(formState.customCommissionPercent))
          ? Math.min(
              100,
              Math.max(0, Math.round(Number(formState.customCommissionPercent)))
            )
          : null;

      const nextSettings: AffiliateSettingsConfig = {
        ...settings,
        partnerOverrides: {
          ...settings.partnerOverrides,
          [userId]: {
            isActive: formState.isActive,
            customCommissionPercent: customPct,
          },
        },
      };

      await persistSettings(
        nextSettings,
        formState.mode === "create"
          ? `Partner ${fullName} (${referralCode}) berhasil ditambahkan.`
          : `Data partner ${fullName} berhasil diperbarui.`
      );
      setFormModalOpen(false);
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal menyimpan data partner affiliate.",
      });
    } finally {
      setSavingPartner(false);
    }
  };

  const handleUpdateCommissionStatus = async (
    commissionId: string,
    nextStatus: "pending_trial" | "available" | "paid"
  ) => {
    setBusyId(commissionId);
    setFeedback(null);
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from("affiliate_commissions")
        .update({
          status: nextStatus,
          paid_at: nextStatus === "paid" ? new Date().toISOString() : null,
        })
        .eq("id", commissionId)
        .select(
          "*, stores(id, name, slug, owner_id, wa_number, subscription_status, plan_tier, expired_at)"
        )
        .single();

      if (error) throw error;

      if (data) {
        onCommissionsChange((prev) =>
          prev.map((c) =>
            c.id === commissionId ? (data as AffiliateCommission) : c
          )
        );
      }

      const labelMap = {
        pending_trial: "Pending Trial",
        available: "Siap Cair (Available)",
        paid: "Sudah Ditransfer (Paid)",
      };
      setFeedback({
        type: "success",
        message: `Status komisi berhasil diperbarui menjadi ${labelMap[nextStatus]}.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : "Gagal memperbarui status komisi.",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 1. Pengaturan Komisi Affiliate Global */}
      <form
        onSubmit={handleSaveGlobalSettings}
        className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Pengaturan Komisi Affiliate
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur status program dan nominal/persentase komisi default partner.
              </p>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={settings.programEnabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  programEnabled: e.target.checked,
                }))
              }
              className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span>Program Affiliate Aktif</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Komisi Default (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={settings.defaultCommissionPercent}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  defaultCommissionPercent: Number(e.target.value || 0),
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Komisi Paket Starter (Rp)
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              value={settings.starterCommission}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  starterCommission: Number(e.target.value || 0),
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Komisi Paket Pro (Rp)
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              value={settings.proCommission}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  proCommission: Number(e.target.value || 0),
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Komisi Paket Enterprise (Rp)
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              value={settings.enterpriseCommission}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  enterpriseCommission: Number(e.target.value || 0),
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingSettings}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition disabled:opacity-60"
          >
            {savingSettings ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Simpan Pengaturan Komisi</span>
          </button>
        </div>
      </form>

      {/* 2. Daftar Partner Affiliate */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Daftar Partner Affiliate ({profiles.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kelola kode referral, komisi khusus partner, dan status aktif/nonaktif.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Partner Affiliate</span>
          </button>
        </div>

        {profiles.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
            Belum ada partner affiliate terdaftar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pr-4 font-semibold">Partner</th>
                  <th className="py-2.5 pr-4 font-semibold">Kode Referral</th>
                  <th className="py-2.5 pr-4 font-semibold">Referral</th>
                  <th className="py-2.5 pr-4 font-semibold">Total Komisi</th>
                  <th className="py-2.5 pr-4 font-semibold">Rate</th>
                  <th className="py-2.5 pr-4 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {profiles.map((p) => {
                  const st = partnerStats.get(p.user_id) || {
                    referralCount: 0,
                    totalCommission: 0,
                    pendingCommission: 0,
                  };
                  const override = settings.partnerOverrides[p.user_id];
                  const isActive = override?.isActive ?? true;
                  const rateLabel =
                    override?.customCommissionPercent != null
                      ? `${override.customCommissionPercent}% (Custom)`
                      : `${settings.defaultCommissionPercent}% (Default)`;

                  return (
                    <tr key={p.user_id}>
                      <td className="py-3 pr-4">
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {p.full_name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          WA: {p.whatsapp}
                          {p.bank_name ? ` • ${p.bank_name}` : ""}
                        </p>
                      </td>
                      <td className="py-3 pr-4 font-mono font-bold text-[#2563EB]">
                        {p.referral_code}
                      </td>
                      <td className="py-3 pr-4 font-mono tabular-nums">
                        {st.referralCount} outlet
                      </td>
                      <td className="py-3 pr-4 font-mono tabular-nums font-bold">
                        {formatRupiah(st.totalCommission)}
                      </td>
                      <td className="py-3 pr-4 text-[11px] font-semibold">
                        {rateLabel}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isActive
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busyId === `toggle:${p.user_id}`}
                            onClick={() => handleTogglePartnerActive(p.user_id)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-[#2563EB] inline-flex items-center gap-1 transition"
                            title={
                              isActive ? "Nonaktifkan partner" : "Aktifkan partner"
                            }
                          >
                            {isActive ? (
                              <ToggleRight className="w-3.5 h-3.5 text-[#059669]" />
                            ) : (
                              <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span>{isActive ? "Nonaktifkan" : "Aktifkan"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#2563EB] transition"
                            aria-label={`Edit ${p.full_name}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Daftar Komisi & Pencairan */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Daftar Komisi &amp; Payout Partner
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verifikasi komisi siap cair dan tandai status transfer partner.
              </p>
            </div>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800">
            {[
              { key: "all" as const, label: "Semua" },
              { key: "available" as const, label: "Siap Cair" },
              { key: "pending_trial" as const, label: "Pending Trial" },
              { key: "paid" as const, label: "Paid" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setCommissionFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  commissionFilter === tab.key
                    ? "bg-[#2563EB] text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredCommissions.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
            Belum ada komisi affiliate pada filter ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pr-4 font-semibold">Partner</th>
                  <th className="py-2.5 pr-4 font-semibold">Rekening</th>
                  <th className="py-2.5 pr-4 font-semibold">Outlet Referral</th>
                  <th className="py-2.5 pr-4 font-semibold">Komisi</th>
                  <th className="py-2.5 pr-4 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCommissions.map((c) => {
                  const partner = profileMap.get(c.referrer_user_id);
                  const selfRef = isSelfReferralCommission(c, partner);
                  const displayAmount = selfRef ? 0 : c.commission_amount;
                  return (
                    <tr key={c.id}>
                      <td className="py-3 pr-4">
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {partner?.full_name || "Partner"}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500">
                          {partner?.referral_code || "-"} •{" "}
                          {partner?.whatsapp || "-"}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-[11px]">
                        {partner?.bank_name ? (
                          <div>
                            <p className="font-semibold">{partner.bank_name}</p>
                            <p className="font-mono text-slate-500">
                              {partner.account_number} ({partner.account_holder})
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">Belum diisi</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-semibold">
                        {c.stores?.name || "-"} ({c.plan_name.toUpperCase()})
                      </td>
                      <td className="py-3 pr-4 font-mono tabular-nums font-bold">
                        {formatRupiah(displayAmount)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            selfRef
                              ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"
                              : c.status === "paid"
                                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                                : c.status === "available"
                                  ? "bg-blue-50 dark:bg-blue-950/60 text-[#2563EB]"
                                  : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {selfRef ? "Invalid (Self-Referral)" : c.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {!selfRef && c.status === "pending_trial" && (
                          <button
                            type="button"
                            disabled={busyId === c.id}
                            onClick={() =>
                              handleUpdateCommissionStatus(c.id, "available")
                            }
                            className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold inline-flex items-center gap-1 transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aktifkan (Siap Cair)</span>
                          </button>
                        )}
                        {!selfRef && c.status === "available" && (
                          <button
                            type="button"
                            disabled={busyId === c.id}
                            onClick={() =>
                              handleUpdateCommissionStatus(c.id, "paid")
                            }
                            className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-semibold inline-flex items-center gap-1 transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Tandai Paid (Cair)</span>
                          </button>
                        )}
                        {!selfRef && c.status === "paid" && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {c.paid_at
                              ? new Date(c.paid_at).toLocaleDateString("id-ID")
                              : "Lunas"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit Partner Affiliate */}
      {formModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
          onClick={() => setFormModalOpen(false)}
        >
          <form
            onSubmit={handleSavePartner}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                {formState.mode === "create"
                  ? "Tambah Partner Affiliate"
                  : "Edit Pengaturan Partner"}
              </h3>
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formState.mode === "create" && (
              <div className="space-y-2">
                {availableOwners.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Pilih Owner Terdaftar (Opsional)
                    </label>
                    <select
                      value={formState.userId}
                      onChange={(e) => {
                        const selected = availableOwners.find(
                          (o) => o.ownerId === e.target.value
                        );
                        setFormState((prev) => ({
                          ...prev,
                          userId: e.target.value,
                          fullName: selected
                            ? `Partner ${selected.storeName}`
                            : prev.fullName,
                          whatsapp: selected?.wa || prev.whatsapp,
                        }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100"
                    >
                      {availableOwners.map((o) => (
                        <option key={o.ownerId} value={o.ownerId}>
                          {o.storeName} ({o.ownerId.slice(0, 8)}...)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    User ID (UUID Supabase Auth)
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.userId}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, userId: e.target.value }))
                    }
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nama Partner *
                </label>
                <input
                  type="text"
                  required
                  value={formState.fullName}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      fullName: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  No. WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={formState.whatsapp}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      whatsapp: e.target.value,
                    }))
                  }
                  placeholder="628123456789"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Kode Referral *
                </label>
                <input
                  type="text"
                  required
                  value={formState.referralCode}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      referralCode: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="MUKARO30"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs font-mono uppercase text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Komisi Khusus (% — Opsional)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={formState.customCommissionPercent}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      customCommissionPercent: e.target.value,
                    }))
                  }
                  placeholder={`Default (${settings.defaultCommissionPercent}%)`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Bank
                </label>
                <input
                  type="text"
                  value={formState.bankName}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      bankName: e.target.value,
                    }))
                  }
                  placeholder="BCA / Mandiri"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  No. Rekening
                </label>
                <input
                  type="text"
                  value={formState.accountNumber}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      accountNumber: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Atas Nama
                </label>
                <input
                  type="text"
                  value={formState.accountHolder}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      accountHolder: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    isActive: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-slate-300 text-[#2563EB]"
              />
              <span>Partner Aktif</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingPartner}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold disabled:opacity-60"
              >
                {savingPartner && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Partner</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
