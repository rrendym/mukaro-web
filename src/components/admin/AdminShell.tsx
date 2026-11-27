"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BellRing,
  Calculator,
  UtensilsCrossed,
  Boxes,
  TicketPercent,
  Settings,
  QrCode,
  ExternalLink,
  LogOut,
  Menu as MenuIcon,
  X,
  ShieldCheck,
  Loader2,
  Search,
  Bell,
  FileSpreadsheet,
  Plus,
  Handshake,
  BookOpen,
} from "lucide-react";
import { Store } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, slugify } from "@/lib/format";
import { getStorePlanTier } from "@/lib/subscription";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MukaroLogo } from "@/components/MukaroLogo";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

interface AdminShellProps {
  store: Store;
  ownerStores?: Store[];
  userEmail?: string;
  children: React.ReactNode;
}

interface SidebarContentProps {
  store: Store;
  ownerStores: Store[];
  canAddBranch: boolean;
  userEmail: string;
  isOpen: boolean;
  togglingOpen: boolean;
  pathname: string;
  isSuperadmin: boolean;
  navItems: {
    label: string;
    href: string;
    exact?: boolean;
    badge?: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
  onCloseMobile: () => void;
  onSwitchStore: (slug: string) => void;
  onOpenAddBranch: () => void;
  onToggleStoreOpen: () => void;
  onSignOut: () => void;
}

function SidebarContent({
  store,
  ownerStores,
  canAddBranch,
  userEmail,
  isOpen,
  togglingOpen,
  pathname,
  isSuperadmin,
  navItems,
  onCloseMobile,
  onSwitchStore,
  onOpenAddBranch,
  onToggleStoreOpen,
  onSignOut,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full justify-between p-4 bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 overflow-y-auto">
      <div className="space-y-6">
        {/* Top Brand: Blue Geometric Mukaro Logo */}
        <div className="px-2 pt-1 flex items-center justify-between">
          <Link
            href={`/${store.slug}/admin`}
            className="inline-flex items-center"
          >
            <MukaroLogo size="sm" subtitle="Merchant POS" />
          </Link>

          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Outlet Switcher Dropdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Cabang Aktif ({ownerStores.length})
            </span>
            {canAddBranch && (
              <button
                type="button"
                onClick={onOpenAddBranch}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Tambah Cabang</span>
              </button>
            )}
          </div>
          <select
            value={store.slug}
            onChange={(e) => onSwitchStore(e.target.value)}
            aria-label="Pilih cabang outlet"
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB]"
          >
            {ownerStores.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.name} (/{s.slug})
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 active:scale-[0.98] ${
                  active
                    ? "bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 hover:translate-x-0.5 font-medium"
                }`}
              >
                {active && (
                  <span
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#2563EB]"
                    aria-hidden="true"
                  />
                )}
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded bg-[#2563EB] text-white text-[9px] font-bold tracking-wider">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Sidebar: Store Status Card + Profile */}
      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
        {isSuperadmin && (
          <Link
            href="/superadmin"
            onClick={onCloseMobile}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#2563EB] bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100/70 transition"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Panel Superadmin</span>
          </Link>
        )}

        <Link
          href="/partner"
          onClick={onCloseMobile}
          className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-[#2563EB] transition"
        >
          <Handshake className="w-4 h-4 text-[#2563EB] shrink-0" />
          <span>Partner Affiliate (30%)</span>
        </Link>

        {/* Store Status Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2.5">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-800 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {store.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {store.name}
              </p>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                /{store.slug}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={togglingOpen}
            onClick={onToggleStoreOpen}
            className="w-full py-2 px-3 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs font-semibold flex items-center justify-between hover:border-slate-300 transition cursor-pointer"
          >
            <span className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOpen ? "bg-emerald-600" : "bg-rose-600"
                }`}
              />
              {isOpen ? "Toko Buka" : "Toko Tutup"}
            </span>
            <span className="text-[11px] font-semibold text-[#2563EB]">
              Ubah
            </span>
          </button>
        </div>

        {/* Compact Profile + Sign Out */}
        <div className="flex items-center justify-between px-2 py-1">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              {userEmail || "Owner Outlet"}
            </p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            title="Keluar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({
  store: initialStore,
  ownerStores = [initialStore],
  userEmail = "",
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(initialStore.is_open);
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");

  // Add Branch Modal State
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchSlug, setBranchSlug] = useState("");
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);

  // Ritual Buka Toko Modal State
  const [showOpenRitual, setShowOpenRitual] = useState(false);
  const [targetInput, setTargetInput] = useState(
    String(initialStore.daily_sales_target || "")
  );
  const [drawerInput, setDrawerInput] = useState(
    String(initialStore.cash_drawer_initial || "")
  );

  const superadminEmail = process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL || "";
  const isSuperadmin =
    Boolean(superadminEmail) &&
    userEmail.toLowerCase() === superadminEmail.toLowerCase();

  const planTier = getStorePlanTier(initialStore);
  const maxOutlets = Math.max(
    initialStore.max_outlets || (planTier === "enterprise" ? 3 : 1),
    1
  );
  const canAddBranch =
    planTier === "enterprise" && ownerStores.length < maxOutlets;

  const handleSwitchStore = (targetSlug: string) => {
    setMobileNavOpen(false);
    if (targetSlug !== initialStore.slug) {
      router.push(`/${targetSlug}/admin`);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBranchError(null);
    const cleanSlug = slugify(branchSlug);
    if (!branchName.trim() || !cleanSlug) {
      setBranchError("Nama cabang dan slug URL wajib diisi.");
      return;
    }

    setCreatingBranch(true);
    try {
      const supabase = createClient();
      const { error: insertErr } = await supabase.from("stores").insert({
        owner_id: initialStore.owner_id,
        name: branchName.trim(),
        slug: cleanSlug,
        tagline: `Cabang ${branchName.trim()}`,
        plan_tier: "enterprise",
        max_outlets: maxOutlets,
        subscription_status: initialStore.subscription_status,
        expired_at: initialStore.expired_at,
      });

      if (insertErr) throw insertErr;

      setShowAddBranch(false);
      setBranchName("");
      setBranchSlug("");
      router.push(`/${cleanSlug}/admin/menu`);
      router.refresh();
    } catch (err) {
      setBranchError(
        err instanceof Error ? err.message : "Gagal menambahkan cabang baru."
      );
    } finally {
      setCreatingBranch(false);
    }
  };

  const navItems = [
    {
      label: "Dashboard",
      href: `/${initialStore.slug}/admin`,
      exact: true,
      icon: LayoutDashboard,
    },
    {
      label: "Pesanan Live",
      href: `/${initialStore.slug}/admin/orders`,
      icon: BellRing,
    },
    {
      label: "Kasir POS",
      href: `/${initialStore.slug}/admin/pos`,
      icon: Calculator,
    },
    {
      label: "Menu & Kategori",
      href: `/${initialStore.slug}/admin/menu`,
      icon: UtensilsCrossed,
    },
    {
      label: "Stok & Opname",
      href: `/${initialStore.slug}/admin/inventory`,
      icon: Boxes,
    },
    {
      label: "Voucher",
      href: `/${initialStore.slug}/admin/vouchers`,
      icon: TicketPercent,
    },
    {
      label: "Rekap & Export",
      href: `/${initialStore.slug}/admin/reports`,
      badge: planTier === "starter" ? "PRO" : undefined,
      icon: FileSpreadsheet,
    },
    {
      label: "Pengaturan Toko",
      href: `/${initialStore.slug}/admin/settings`,
      icon: Settings,
    },
    {
      label: "QR Code",
      href: `/${initialStore.slug}/admin/qr`,
      icon: QrCode,
    },
    {
      label: "Panduan & Tutorial",
      href: `/${initialStore.slug}/admin/guide`,
      icon: BookOpen,
    },
  ];

  const handleToggleStoreOpen = async () => {
    if (!isOpen) {
      setTargetInput(String(initialStore.daily_sales_target || 1000000));
      setDrawerInput(String(initialStore.cash_drawer_initial || 200000));
      setShowOpenRitual(true);
      return;
    }

    setTogglingOpen(true);
    setIsOpen(false);
    const supabase = createClient();
    const { error } = await supabase
      .from("stores")
      .update({ is_open: false })
      .eq("id", initialStore.id);
    if (error) {
      setIsOpen(true);
    } else {
      router.refresh();
    }
    setTogglingOpen(false);
  };

  const handleConfirmOpenRitual = async (e: React.FormEvent) => {
    e.preventDefault();
    setTogglingOpen(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("stores")
      .update({
        is_open: true,
        daily_sales_target: Number(targetInput || 0),
        cash_drawer_initial: Number(drawerInput || 0),
      })
      .eq("id", initialStore.id);

    if (!error) {
      setIsOpen(true);
      setShowOpenRitual(false);
      router.refresh();
    }
    setTogglingOpen(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearch.trim()) return;
    router.push(`/${initialStore.slug}/admin/menu`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-white dark:bg-[#111827] sticky top-0 h-screen shrink-0 print:hidden">
        <SidebarContent
          store={initialStore}
          ownerStores={ownerStores}
          canAddBranch={canAddBranch}
          userEmail={userEmail}
          isOpen={isOpen}
          togglingOpen={togglingOpen}
          pathname={pathname}
          isSuperadmin={isSuperadmin}
          navItems={navItems}
          onCloseMobile={() => setMobileNavOpen(false)}
          onSwitchStore={handleSwitchStore}
          onOpenAddBranch={() => {
            setMobileNavOpen(false);
            setShowAddBranch(true);
          }}
          onToggleStoreOpen={handleToggleStoreOpen}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Mobile & Tablet Slide-Over Drawer */}
      {mobileNavOpen && (
        <div
          className="animate-backdrop-enter fixed inset-0 z-50 lg:hidden bg-slate-900/40 backdrop-blur-[1px]"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="animate-drawer-left w-72 h-full bg-white dark:bg-[#111827] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent
              store={initialStore}
              ownerStores={ownerStores}
              canAddBranch={canAddBranch}
              userEmail={userEmail}
              isOpen={isOpen}
              togglingOpen={togglingOpen}
              pathname={pathname}
              isSuperadmin={isSuperadmin}
              navItems={navItems}
              onCloseMobile={() => setMobileNavOpen(false)}
              onSwitchStore={handleSwitchStore}
              onOpenAddBranch={() => {
                setMobileNavOpen(false);
                setShowAddBranch(true);
              }}
              onToggleStoreOpen={handleToggleStoreOpen}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="animate-nav-enter sticky top-0 z-30 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 print:hidden">
          {/* Left: Mobile Menu Toggle + Greeting */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Buka navigasi"
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800/60"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-100 truncate">
                Halo, {initialStore.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block truncate">
                Kelola operasional outlet, kasir POS, dan stok harian Anda.
              </p>
            </div>
          </div>

          {/* Right: Quick Search Pill + Notification Bell + Store Shortcut */}
          <div className="flex items-center gap-2.5 shrink-0">
            <form
              onSubmit={handleQuickSearchSubmit}
              className="hidden md:flex items-center relative"
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Cari menu cepat..."
                className="bg-[#F8FAFC] dark:bg-[#090D16] rounded-full pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-slate-200 dark:border-slate-800 focus:border-[#2563EB] focus:bg-white dark:bg-[#111827] focus:outline-none w-48 xl:w-60 transition"
              />
            </form>

            <ThemeToggle />

            <Link
              href={`/${initialStore.slug}/admin/orders`}
              aria-label="Pesanan Live"
              className="relative w-10 h-10 rounded-full bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-white dark:bg-[#111827] transition"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#2563EB] border-2 border-white" />
            </Link>

            <Link
              href={`/${initialStore.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition"
            >
              <span className="hidden sm:inline">Menu Customer</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Add Branch Modal */}
      {showAddBranch && (
        <div
          className="animate-backdrop-enter fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
          onClick={() => setShowAddBranch(false)}
        >
          <div
            className="animate-modal-enter w-full max-w-md bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  Tambah Cabang Baru
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kuota cabang terpakai: {ownerStores.length} / {maxOutlets}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBranch(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {branchError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-xs text-rose-700 font-medium">
                {branchError}
              </div>
            )}

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                  Nama Cabang *
                </label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => {
                    setBranchName(e.target.value);
                    setBranchSlug(slugify(e.target.value));
                  }}
                  placeholder="Contoh: Kopi Senja Kemang"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                  Slug URL Cabang *
                </label>
                <input
                  type="text"
                  required
                  value={branchSlug}
                  onChange={(e) => setBranchSlug(slugify(e.target.value))}
                  placeholder="kopi-senja-kemang"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <button
                type="submit"
                disabled={creatingBranch}
                className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {creatingBranch && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Buat Cabang Sekarang</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Ritual Buka Toko Modal */}
      {showOpenRitual && (
        <div
          className="animate-backdrop-enter fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
          onClick={() => setShowOpenRitual(false)}
        >
          <div
            className="animate-modal-enter w-full max-w-md bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold tracking-[-0.02em] text-slate-900 dark:text-slate-100">
                  Ritual Buka Toko
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tetapkan target penjualan dan modal laci kasir hari ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOpenRitual(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmOpenRitual} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Target Penjualan Hari Ini (Rp) *
                  </label>
                  {initialStore.daily_sales_target > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setTargetInput(String(initialStore.daily_sales_target))
                      }
                      className="text-[11px] font-semibold text-[#2563EB] hover:underline"
                    >
                      Samakan kemarin (
                      {formatRupiah(Number(initialStore.daily_sales_target))})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  required
                  min={0}
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-mono font-bold tabular-nums focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                  Modal Awal Laci Kasir (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={drawerInput}
                  onChange={(e) => setDrawerInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-mono font-bold tabular-nums focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              <button
                type="submit"
                disabled={togglingOpen}
                className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {togglingOpen && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Buka Toko Sekarang</span>
              </button>
            </form>
          </div>
        </div>
      )}

      <ScrollToTopButton
        hiddenWhenModalOpen={showAddBranch || showOpenRitual || mobileNavOpen}
      />
    </div>
  );
}
