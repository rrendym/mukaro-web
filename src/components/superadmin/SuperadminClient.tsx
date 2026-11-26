"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Plus,
  ExternalLink,
  Lock,
  Unlock,
  CalendarPlus,
  Loader2,
  Building2,
  Handshake,
  CheckCircle2,
} from "lucide-react";
import {
  AffiliateCommission,
  AffiliateProfile,
  PlanTier,
  Store,
  SubscriptionStatus,
} from "@/types/database";
import { MukaroLogo } from "@/components/MukaroLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, slugify } from "@/lib/format";

const PLAN_COMMISSION: Record<PlanTier, number> = {
  starter: 24000,
  pro: 45000,
  enterprise: 90000,
};

export function SuperadminClient({
  initialStores,
  initialProfiles = [],
  initialCommissions = [],
  adminEmail,
}: {
  initialStores: Store[];
  initialProfiles?: AffiliateProfile[];
  initialCommissions?: AffiliateCommission[];
  adminEmail: string;
}) {
  const [activeTab, setActiveTab] = useState<"tenants" | "affiliate">(
    "tenants"
  );
  const [stores, setStores] = useState<Store[]>(initialStores);
  const [profiles] = useState<AffiliateProfile[]>(initialProfiles);
  const [commissions, setCommissions] =
    useState<AffiliateCommission[]>(initialCommissions);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus>("active");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Group stores by owner_id (unowned stores stay separate by store.id)
  const ownerGroups = useMemo(() => {
    const map = new Map<string, Store[]>();
    for (const s of stores) {
      const key = s.owner_id || `unowned:${s.id}`;
      const list = map.get(key) || [];
      list.push(s);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([groupKey, groupStores]) => ({
      groupKey,
      ownerId: groupStores[0]?.owner_id || null,
      primaryStore: groupStores[0],
      stores: groupStores,
    }));
  }, [stores]);

  const profileMap = useMemo(() => {
    const m = new Map<string, AffiliateProfile>();
    for (const p of profiles) {
      m.set(p.user_id, p);
    }
    return m;
  }, [profiles]);

  const activateReferralCommissionIfNeeded = async (
    supabase: ReturnType<typeof createClient>,
    targetStores: Store[]
  ) => {
    for (const st of targetStores) {
      const existing = commissions.find((c) => c.referred_store_id === st.id);
      if (existing && existing.status === "pending_trial") {
        const { data: updatedComm } = await supabase
          .from("affiliate_commissions")
          .update({ status: "available" })
          .eq("id", existing.id)
          .select("*, stores(name, slug, subscription_status, plan_tier)")
          .single();
        if (updatedComm) {
          setCommissions((prev) =>
            prev.map((c) =>
              c.id === existing.id ? (updatedComm as AffiliateCommission) : c
            )
          );
        }
      } else if (!existing && st.referred_by_code) {
        const refProfile = profiles.find(
          (p) =>
            p.referral_code.toUpperCase() ===
            st.referred_by_code?.toUpperCase()
        );
        if (refProfile && refProfile.user_id !== st.owner_id) {
          const plan = (st.plan_tier || "pro") as PlanTier;
          const amt = PLAN_COMMISSION[plan] || 45000;
          const { data: insertedComm } = await supabase
            .from("affiliate_commissions")
            .insert({
              referrer_user_id: refProfile.user_id,
              referred_store_id: st.id,
              plan_name: plan,
              commission_amount: amt,
              status: "available",
            })
            .select("*, stores(name, slug, subscription_status, plan_tier)")
            .single();
          if (insertedComm) {
            setCommissions((prev) => [
              insertedComm as AffiliateCommission,
              ...prev,
            ]);
          }
        }
      }
    }
  };

  const handleExtendGroup = async (
    groupStores: Store[],
    ownerId: string | null,
    days: number
  ) => {
    const lead = groupStores[0];
    setBusyId(lead.id);
    setError(null);

    const base =
      new Date(lead.expired_at) > new Date()
        ? new Date(lead.expired_at)
        : new Date();
    const nextExpired = new Date(
      base.getTime() + days * 24 * 60 * 60 * 1000
    ).toISOString();

    const supabase = createClient();
    const query = supabase
      .from("stores")
      .update({
        subscription_status: "active",
        expired_at: nextExpired,
      });

    const { data, error: err } = ownerId
      ? await query.eq("owner_id", ownerId).select("*")
      : await query.eq("id", lead.id).select("*");

    if (err) {
      setError(err.message);
    } else if (data) {
      const updatedMap = new Map((data as Store[]).map((s) => [s.id, s]));
      setStores((prev) => prev.map((s) => updatedMap.get(s.id) || s));
      await activateReferralCommissionIfNeeded(supabase, data as Store[]);
    }
    setBusyId(null);
  };

  const handleToggleLockGroup = async (
    groupStores: Store[],
    ownerId: string | null
  ) => {
    const lead = groupStores[0];
    setBusyId(lead.id);
    setError(null);
    const nextStatus: SubscriptionStatus =
      lead.subscription_status === "expired" ? "active" : "expired";

    const supabase = createClient();
    const query = supabase
      .from("stores")
      .update({ subscription_status: nextStatus });

    const { data, error: err } = ownerId
      ? await query.eq("owner_id", ownerId).select("*")
      : await query.eq("id", lead.id).select("*");

    if (err) {
      setError(err.message);
    } else if (data) {
      const updatedMap = new Map((data as Store[]).map((s) => [s.id, s]));
      setStores((prev) => prev.map((s) => updatedMap.get(s.id) || s));
      if (nextStatus === "active") {
        await activateReferralCommissionIfNeeded(supabase, data as Store[]);
      }
    }
    setBusyId(null);
  };

  const handleUpdateMaxOutlets = async (
    lead: Store,
    ownerId: string | null,
    nextMax: number
  ) => {
    setBusyId(lead.id);
    setError(null);
    const supabase = createClient();
    const safeMax = Math.max(1, nextMax);
    const nextPlan: PlanTier =
      safeMax > 1 ? "enterprise" : (lead.plan_tier as PlanTier) || "pro";

    const query = supabase
      .from("stores")
      .update({ max_outlets: safeMax, plan_tier: nextPlan });

    const { data, error: err } = ownerId
      ? await query.eq("owner_id", ownerId).select("*")
      : await query.eq("id", lead.id).select("*");

    if (err) {
      setError(err.message);
    } else if (data) {
      const updatedMap = new Map((data as Store[]).map((s) => [s.id, s]));
      setStores((prev) => prev.map((s) => updatedMap.get(s.id) || s));
    }
    setBusyId(null);
  };

  const handleMarkPaid = async (commissionId: string) => {
    setBusyId(commissionId);
    setError(null);
    const supabase = createClient();

    const { data, error: err } = await supabase
      .from("affiliate_commissions")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", commissionId)
      .select("*, stores(name, slug, subscription_status, plan_tier)")
      .single();

    if (err) {
      setError(err.message);
    } else if (data) {
      setCommissions((prev) =>
        prev.map((c) =>
          c.id === commissionId ? (data as AffiliateCommission) : c
        )
      );
    }
    setBusyId(null);
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = slugify(slug);
    if (!name.trim() || !cleanSlug) return;

    setCreating(true);
    setError(null);
    const supabase = createClient();

    const { data, error: err } = await supabase
      .from("stores")
      .insert({
        name: name.trim(),
        slug: cleanSlug,
        tagline: "Outlet Mukaro",
        subscription_status: status,
        expired_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
      .select("*")
      .single();

    if (err) {
      setError(err.message);
    } else if (data) {
      setStores((prev) => [data as Store, ...prev]);
      setName("");
      setSlug("");
    }
    setCreating(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-slate-100">
      <header className="bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MukaroLogo size="sm" showDomain />
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Superadmin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-mono text-slate-500 dark:text-slate-400">
              {adminEmail}
            </span>
            <ThemeToggle />
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition"
            >
              Beranda
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-slate-900 dark:text-slate-100">
              Manajemen Tenant &amp; Affiliate
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kelola seluruh toko terdaftar, kuota cabang Multi-Outlet, dan
              pencairan komisi partner.
            </p>
          </div>

          <div className="inline-flex p-1 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("tenants")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "tenants"
                  ? "bg-[#2563EB] text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Tenant &amp; Outlet ({stores.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("affiliate")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "affiliate"
                  ? "bg-[#2563EB] text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <Handshake className="w-3.5 h-3.5" />
              <span>Affiliate &amp; Payout ({commissions.length})</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-xs text-rose-700 font-semibold">
            {error}
          </div>
        )}

        {activeTab === "tenants" && (
          <div className="space-y-6">
            {/* Create Store Form */}
            <form
              onSubmit={handleCreateStore}
              className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Nama Toko *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSlug(slugify(e.target.value));
                  }}
                  placeholder="Contoh: Kopi Nusantara"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Slug URL *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="kopi-nusantara"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-mono focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Status Awal
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as SubscriptionStatus)
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-[#111827] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="active">Active (30 Hari)</option>
                  <option value="trial">Trial</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={creating}
                className="py-2.5 px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                {creating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Buat Toko Klien</span>
              </button>
            </form>

            {/* Grouped Owner / Store List */}
            <div className="space-y-4">
              {ownerGroups.map(({ groupKey, ownerId, primaryStore, stores: groupStores }) => {
                const isExpired =
                  primaryStore.subscription_status === "expired" ||
                  new Date() > new Date(primaryStore.expired_at);
                const currentMax = primaryStore.max_outlets || 1;

                return (
                  <div
                    key={groupKey}
                    className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {primaryStore.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                            {groupStores.length} / {currentMax} Cabang
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isExpired
                                ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700"
                                : primaryStore.subscription_status === "trial"
                                  ? "bg-blue-50 dark:bg-blue-950/60 text-[#2563EB]"
                                  : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700"
                            }`}
                          >
                            {primaryStore.subscription_status}
                          </span>
                          {primaryStore.referred_by_code && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-[10px] font-mono font-bold">
                              Ref: {primaryStore.referred_by_code}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Jatuh tempo:{" "}
                          <strong className="text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                            {new Date(primaryStore.expired_at).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </strong>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Max Outlets Selector */}
                        <select
                          value={currentMax}
                          disabled={busyId === primaryStore.id}
                          onChange={(e) =>
                            handleUpdateMaxOutlets(
                              primaryStore,
                              ownerId,
                              Number(e.target.value)
                            )
                          }
                          aria-label="Kuota maksimal outlet"
                          className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] text-xs font-semibold"
                        >
                          {[1, 3, 5, 10, 20].map((n) => (
                            <option key={n} value={n}>
                              Max {n} Cabang
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={busyId === primaryStore.id}
                          onClick={() =>
                            handleExtendGroup(groupStores, ownerId, 30)
                          }
                          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                          <span>+30 Hari</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyId === primaryStore.id}
                          onClick={() =>
                            handleExtendGroup(groupStores, ownerId, 365)
                          }
                          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                          <span>+1 Tahun</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyId === primaryStore.id}
                          onClick={() =>
                            handleToggleLockGroup(groupStores, ownerId)
                          }
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                            primaryStore.subscription_status === "expired"
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                          }`}
                        >
                          {primaryStore.subscription_status === "expired" ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Aktifkan</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Kunci</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Branch Pills */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {groupStores.map((branch) => (
                        <Link
                          key={branch.id}
                          href={`/${branch.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-[#2563EB] transition"
                        >
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {branch.name}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            /{branch.slug}
                          </span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "affiliate" && (
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Daftar Komisi &amp; Payout Partner
            </h2>

            {commissions.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
                Belum ada komisi affiliate tercatat.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 pr-4 font-semibold">Partner</th>
                      <th className="py-2.5 pr-4 font-semibold">Rekening</th>
                      <th className="py-2.5 pr-4 font-semibold">
                        Outlet Referral
                      </th>
                      <th className="py-2.5 pr-4 font-semibold">Komisi</th>
                      <th className="py-2.5 pr-4 font-semibold">Status</th>
                      <th className="py-2.5 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {commissions.map((c) => {
                      const partner = profileMap.get(c.referrer_user_id);
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
                                <p className="font-semibold">
                                  {partner.bank_name}
                                </p>
                                <p className="font-mono text-slate-500">
                                  {partner.account_number} (
                                  {partner.account_holder})
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400">
                                Belum diisi
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-4 font-semibold">
                            {c.stores?.name || "-"} ({c.plan_name.toUpperCase()})
                          </td>
                          <td className="py-3 pr-4 font-mono tabular-nums font-bold">
                            {formatRupiah(c.commission_amount)}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                c.status === "paid"
                                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700"
                                  : c.status === "available"
                                    ? "bg-blue-50 dark:bg-blue-950/60 text-[#2563EB]"
                                    : "bg-amber-50 dark:bg-amber-950/50 text-amber-700"
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {c.status === "available" && (
                              <button
                                type="button"
                                disabled={busyId === c.id}
                                onClick={() => handleMarkPaid(c.id)}
                                className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Tandai Sudah Ditransfer</span>
                              </button>
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
        )}
      </main>
    </div>
  );
}
