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
  TrendingUp,
  Users,
  Clock,
  Wallet,
  MessageCircle,
  Megaphone,
  Save,
  AlertTriangle,
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
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, slugify } from "@/lib/format";
import {
  DEFAULT_LANDING_PROMO,
  LANDING_PROMO_KEY,
  LandingPromoConfig,
} from "@/lib/promo-settings";
import {
  isSelfReferralCommission,
  normalizeAffiliatePhone,
} from "@/lib/affiliate";

const PLAN_COMMISSION: Record<PlanTier, number> = {
  starter: 24000,
  pro: 45000,
  enterprise: 90000,
};

const PLAN_MRR: Record<PlanTier, number> = {
  starter: 79000,
  pro: 149000,
  enterprise: 299000,
};

function formatWaPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return `62${digits}`;
}

export function SuperadminClient({
  initialStores,
  initialProfiles = [],
  initialCommissions = [],
  menuCounts = {},
  orderCounts = {},
  initialPromoConfig = DEFAULT_LANDING_PROMO,
  adminEmail,
}: {
  initialStores: Store[];
  initialProfiles?: AffiliateProfile[];
  initialCommissions?: AffiliateCommission[];
  menuCounts?: Record<string, number>;
  orderCounts?: Record<string, number>;
  initialPromoConfig?: LandingPromoConfig;
  adminEmail: string;
}) {
  const [activeTab, setActiveTab] = useState<"tenants" | "affiliate" | "promo">(
    "tenants"
  );
  const [tenantFilter, setTenantFilter] = useState<
    "all" | "expiring" | "expired" | "no_menu"
  >("all");
  const [stores, setStores] = useState<Store[]>(initialStores);
  const [profiles] = useState<AffiliateProfile[]>(initialProfiles);
  const [commissions, setCommissions] =
    useState<AffiliateCommission[]>(initialCommissions);
  const [nowMs] = useState(() => Date.now());

  // Promo & Popup CMS State
  const [promoConfig, setPromoConfig] =
    useState<LandingPromoConfig>(initialPromoConfig);
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoSavedMsg, setPromoSavedMsg] = useState<string | null>(null);

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
    return Array.from(map.entries()).map(([groupKey, groupStores]) => {
      const primaryStore = groupStores[0];
      const totalMenus = groupStores.reduce(
        (sum, st) => sum + (menuCounts[st.id] || 0),
        0
      );
      const totalOrders = groupStores.reduce(
        (sum, st) => sum + (orderCounts[st.id] || 0),
        0
      );
      const expMs = new Date(primaryStore.expired_at).getTime();
      const daysRemaining = Math.ceil((expMs - nowMs) / (1000 * 60 * 60 * 24));
      const isExpired =
        primaryStore.subscription_status === "expired" || daysRemaining < 0;
      const isExpiringSoon =
        !isExpired && daysRemaining >= 0 && daysRemaining <= 3;

      return {
        groupKey,
        ownerId: primaryStore?.owner_id || null,
        primaryStore,
        stores: groupStores,
        totalMenus,
        totalOrders,
        daysRemaining,
        isExpired,
        isExpiringSoon,
      };
    });
  }, [stores, menuCounts, orderCounts, nowMs]);

  const profileMap = useMemo(() => {
    const m = new Map<string, AffiliateProfile>();
    for (const p of profiles) {
      m.set(p.user_id, p);
    }
    return m;
  }, [profiles]);

  // SaaS Financial KPIs
  const saasKpis = useMemo(() => {
    let mrr = 0;
    let activePaidCount = 0;
    let trialCount = 0;

    for (const g of ownerGroups) {
      if (g.isExpired) continue;
      if (g.primaryStore.subscription_status === "active") {
        activePaidCount += 1;
        const plan = (g.primaryStore.plan_tier || "pro") as PlanTier;
        mrr += PLAN_MRR[plan] || 149000;
      } else if (g.primaryStore.subscription_status === "trial") {
        trialCount += 1;
      }
    }

    const pendingPayoutTotal = commissions
      .filter((c) => {
        const partner = profileMap.get(c.referrer_user_id);
        return c.status !== "paid" && !isSelfReferralCommission(c, partner);
      })
      .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

    const availablePayoutTotal = commissions
      .filter((c) => {
        const partner = profileMap.get(c.referrer_user_id);
        return (
          c.status === "available" && !isSelfReferralCommission(c, partner)
        );
      })
      .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

    return {
      mrr,
      activePaidCount,
      trialCount,
      pendingPayoutTotal,
      availablePayoutTotal,
    };
  }, [ownerGroups, commissions, profileMap]);

  const filterCounts = useMemo(() => {
    return {
      all: ownerGroups.length,
      expiring: ownerGroups.filter((g) => g.isExpiringSoon).length,
      expired: ownerGroups.filter((g) => g.isExpired).length,
      no_menu: ownerGroups.filter((g) => g.totalMenus === 0).length,
    };
  }, [ownerGroups]);

  const filteredGroups = useMemo(() => {
    if (tenantFilter === "expiring") {
      return ownerGroups.filter((g) => g.isExpiringSoon);
    }
    if (tenantFilter === "expired") {
      return ownerGroups.filter((g) => g.isExpired);
    }
    if (tenantFilter === "no_menu") {
      return ownerGroups.filter((g) => g.totalMenus === 0);
    }
    return ownerGroups;
  }, [ownerGroups, tenantFilter]);

  const activateReferralCommissionIfNeeded = async (
    supabase: ReturnType<typeof createClient>,
    targetStores: Store[]
  ) => {
    for (const st of targetStores) {
      const existing = commissions.find((c) => c.referred_store_id === st.id);
      if (existing && existing.status === "pending_trial") {
        const refProfile = profileMap.get(existing.referrer_user_id);
        const selfRef =
          isSelfReferralCommission(existing, refProfile) ||
          (refProfile &&
            (refProfile.user_id === st.owner_id ||
              (normalizeAffiliatePhone(refProfile.whatsapp) !== "" &&
                normalizeAffiliatePhone(refProfile.whatsapp) ===
                  normalizeAffiliatePhone(st.wa_number))));

        const { data: updatedComm } = await supabase
          .from("affiliate_commissions")
          .update(
            selfRef
              ? { status: "invalid_self_referral", commission_amount: 0 }
              : { status: "available" }
          )
          .eq("id", existing.id)
          .select(
            "*, stores(id, name, slug, owner_id, wa_number, subscription_status, plan_tier, expired_at)"
          )
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
        if (refProfile) {
          const selfRef =
            refProfile.user_id === st.owner_id ||
            (normalizeAffiliatePhone(refProfile.whatsapp) !== "" &&
              normalizeAffiliatePhone(refProfile.whatsapp) ===
                normalizeAffiliatePhone(st.wa_number));
          const plan = (st.plan_tier || "pro") as PlanTier;
          const amt = selfRef ? 0 : PLAN_COMMISSION[plan] || 45000;
          const { data: insertedComm } = await supabase
            .from("affiliate_commissions")
            .insert({
              referrer_user_id: refProfile.user_id,
              referred_store_id: st.id,
              plan_name: plan,
              commission_amount: amt,
              status: selfRef ? "invalid_self_referral" : "available",
            })
            .select(
              "*, stores(id, name, slug, owner_id, wa_number, subscription_status, plan_tier, expired_at)"
            )
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

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPromo(true);
    setPromoSavedMsg(null);
    setError(null);

    const supabase = createClient();
    const { error: upsertErr } = await supabase.from("app_settings").upsert(
      {
        key: LANDING_PROMO_KEY,
        value: promoConfig,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (upsertErr) {
      setError(upsertErr.message);
    } else {
      setPromoSavedMsg("Pengaturan popup promosi berhasil disimpan!");
    }
    setSavingPromo(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-slate-100">
      <header className="animate-nav-enter bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
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

          <div className="inline-flex flex-wrap p-1 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("tenants")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
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
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "affiliate"
                  ? "bg-[#2563EB] text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <Handshake className="w-3.5 h-3.5" />
              <span>Affiliate &amp; Payout ({commissions.length})</span>
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
              <span>Promo &amp; Popup</span>
            </button>
          </div>
        </div>

        {/* 1. SaaS Financial KPIs (MRR & Payout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-stagger">
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Estimasi MRR Bulanan</span>
              <TrendingUp className="w-4 h-4 text-[#2563EB]" />
            </div>
            <p className="text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {formatRupiah(saasKpis.mrr)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Dari {saasKpis.activePaidCount} akun berbayar aktif
            </p>
          </div>

          <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Merchant Aktif Berbayar</span>
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {saasKpis.activePaidCount}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Starter / Pro / Enterprise
            </p>
          </div>

          <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Merchant Masa Trial</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {saasKpis.trialCount}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {filterCounts.expiring} akan habis ≤ 3 hari
            </p>
          </div>

          <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Pending Payout Affiliate</span>
              <Wallet className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {formatRupiah(saasKpis.pendingPayoutTotal)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Siap transfer: {formatRupiah(saasKpis.availablePayoutTotal)}
            </p>
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

            {/* Quick Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: "all", label: `Semua (${filterCounts.all})` },
                {
                  key: "expiring",
                  label: `Akan Habis ≤ 3 Hari (${filterCounts.expiring})`,
                },
                { key: "expired", label: `Expired (${filterCounts.expired})` },
                {
                  key: "no_menu",
                  label: `Belum Input Menu (${filterCounts.no_menu})`,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() =>
                    setTenantFilter(
                      tab.key as "all" | "expiring" | "expired" | "no_menu"
                    )
                  }
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    tenantFilter === tab.key
                      ? "bg-[#2563EB] text-white border-[#2563EB]"
                      : "bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#2563EB]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Grouped Owner / Store List */}
            <div className="space-y-4">
              {filteredGroups.length === 0 ? (
                <div className="bg-white dark:bg-[#111827] rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                  Tidak ada merchant pada filter ini.
                </div>
              ) : (
                filteredGroups.map(
                  ({
                    groupKey,
                    ownerId,
                    primaryStore,
                    stores: groupStores,
                    totalMenus,
                    totalOrders,
                    daysRemaining,
                    isExpired,
                    isExpiringSoon,
                  }) => {
                    const currentMax = primaryStore.max_outlets || 1;
                    const expiredDateStr = new Date(
                      primaryStore.expired_at
                    ).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });

                    const waPhone = formatWaPhone(primaryStore.wa_number);
                    const waText = encodeURIComponent(
                      `Halo Kak ${primaryStore.name}, masa aktif paket Mukaro untuk outlet *${primaryStore.name}* (${expiredDateStr}) ${
                        isExpired
                          ? "sudah berakhir"
                          : `tinggal ${Math.max(0, daysRemaining)} hari lagi`
                      }. Yuk perpanjang agar sistem QR Self-Order & Kasir POS tetap berjalan lancar!`
                    );
                    const waFollowUpUrl = waPhone
                      ? `https://wa.me/${waPhone}?text=${waText}`
                      : `https://wa.me/?text=${waText}`;

                    const onboardingBadge =
                      totalOrders > 0
                        ? {
                            label: `Aktif Transaksi (${totalOrders})`,
                            cls: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300",
                          }
                        : totalMenus > 0
                          ? {
                              label: `Menu Siap (${totalMenus}), Belum Order`,
                              cls: "bg-blue-50 dark:bg-blue-950/60 text-[#2563EB]",
                            }
                          : {
                              label: "Belum Input Menu",
                              cls: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300",
                            };

                    return (
                      <div
                        key={groupKey}
                        className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                {primaryStore.name}
                              </h3>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                                {groupStores.length} / {currentMax} Cabang
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold uppercase text-slate-700 dark:text-slate-300">
                                {(primaryStore.plan_tier || "pro").toUpperCase()}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  isExpired
                                    ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"
                                    : primaryStore.subscription_status ===
                                        "trial"
                                      ? "bg-blue-50 dark:bg-blue-950/60 text-[#2563EB]"
                                      : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                                }`}
                              >
                                {primaryStore.subscription_status}
                              </span>

                              {/* Expiry Alert Badge */}
                              {isExpired ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                                  <AlertTriangle className="w-3 h-3" />
                                  Expired
                                </span>
                              ) : isExpiringSoon ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-bold">
                                  <AlertTriangle className="w-3 h-3" />
                                  {daysRemaining === 0
                                    ? "Habis Hari Ini"
                                    : `H-${daysRemaining}`}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-mono font-semibold">
                                  H-{daysRemaining}
                                </span>
                              )}

                              {/* Onboarding Health Badge */}
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${onboardingBadge.cls}`}
                              >
                                {onboardingBadge.label}
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
                                {expiredDateStr}
                              </strong>
                              {primaryStore.wa_number && (
                                <span className="ml-2 font-mono text-slate-500 dark:text-slate-400">
                                  • WA: {primaryStore.wa_number}
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* 1-Click Follow-Up WA */}
                            <a
                              href={waFollowUpUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Follow Up WA</span>
                            </a>

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
                  }
                )
              )}
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
                            {formatRupiah(displayAmount)}
                          </td>
                          <td className="py-3 pr-4">
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
                              {selfRef ? "Invalid (Self-Referral)" : c.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {!selfRef && c.status === "available" && (
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

        {activeTab === "promo" && (
          <form
            onSubmit={handleSavePromo}
            className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Kontrol Popup Promosi Landing Page
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Atur status aktif, judul, deskripsi, dan tombol CTA popup
                  promosi di halaman utama (`app_settings`).
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPromoConfig((prev) => ({
                    ...prev,
                    enabled: !prev.enabled,
                  }))
                }
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  promoConfig.enabled
                    ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                Status: {promoConfig.enabled ? "AKTIF" : "NONAKTIF"}
              </button>
            </div>

            {promoSavedMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{promoSavedMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Owner Tab Settings */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                  Tab Pengguna Baru (Pemilik Usaha)
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Judul Promo
                  </label>
                  <input
                    type="text"
                    value={promoConfig.ownerTitle}
                    onChange={(e) =>
                      setPromoConfig((prev) => ({
                        ...prev,
                        ownerTitle: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    rows={3}
                    value={promoConfig.ownerDesc}
                    onChange={(e) =>
                      setPromoConfig((prev) => ({
                        ...prev,
                        ownerDesc: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Teks Tombol CTA
                  </label>
                  <input
                    type="text"
                    value={promoConfig.ownerCta}
                    onChange={(e) =>
                      setPromoConfig((prev) => ({
                        ...prev,
                        ownerCta: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Affiliate Tab Settings */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Tab Partner Affiliate
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Judul Promo
                  </label>
                  <input
                    type="text"
                    value={promoConfig.affiliateTitle}
                    onChange={(e) =>
                      setPromoConfig((prev) => ({
                        ...prev,
                        affiliateTitle: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    rows={3}
                    value={promoConfig.affiliateDesc}
                    onChange={(e) =>
                      setPromoConfig((prev) => ({
                        ...prev,
                        affiliateDesc: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Teks Tombol CTA
                  </label>
                  <input
                    type="text"
                    value={promoConfig.affiliateCta}
                    onChange={(e) =>
                      setPromoConfig((prev) => ({
                        ...prev,
                        affiliateCta: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPromo}
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {savingPromo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Simpan Pengaturan Promo</span>
              </button>
            </div>
          </form>
        )}
      </main>
      <ScrollToTopButton />
    </div>
  );
}
