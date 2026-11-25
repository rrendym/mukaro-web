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
} from "lucide-react";
import { Store } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/format";

interface AdminShellProps {
  store: Store;
  userEmail?: string;
  children: React.ReactNode;
}

interface SidebarContentProps {
  store: Store;
  userEmail: string;
  isOpen: boolean;
  togglingOpen: boolean;
  pathname: string;
  isSuperadmin: boolean;
  navItems: {
    label: string;
    href: string;
    exact?: boolean;
    icon: React.ComponentType<{ className?: string }>;
  }[];
  onCloseMobile: () => void;
  onToggleStoreOpen: () => void;
  onSignOut: () => void;
}

function SidebarContent({
  store,
  userEmail,
  isOpen,
  togglingOpen,
  pathname,
  isSuperadmin,
  navItems,
  onCloseMobile,
  onToggleStoreOpen,
  onSignOut,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full justify-between p-4 bg-white border-r border-slate-200 text-slate-900 overflow-y-auto">
      <div className="space-y-6">
        {/* Top Brand: Blue Geometric Mukaro Logo */}
        <div className="px-2 pt-1 flex items-center justify-between">
          <Link
            href={`/${store.slug}/admin`}
            className="inline-flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center shrink-0">
              <svg
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
              >
                <path
                  d="M7 23V9.5C7 8.67157 7.67157 8 8.5 8H10.2C10.75 8 11.25 8.3 11.5 8.78L16 17.2L20.5 8.78C20.75 8.3 21.25 8 21.8 8H23.5C24.3284 8 25 8.67157 25 9.5V23"
                  stroke="#FFFFFF"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="16" cy="23" r="2.2" fill="#93C5FD" />
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-extrabold tracking-[-0.03em] text-slate-900">
                Mukaro
              </span>
              <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
                Merchant POS
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition ${
                  active
                    ? "bg-blue-50 text-[#2563EB] font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Sidebar: Store Status Card + Profile */}
      <div className="space-y-3 pt-4 border-t border-slate-200 mt-4">
        {isSuperadmin && (
          <Link
            href="/superadmin"
            onClick={onCloseMobile}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100/70 transition"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Panel Superadmin</span>
          </Link>
        )}

        {/* Store Status Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center gap-2.5">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {store.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {store.name}
              </p>
              <p className="text-[11px] font-mono text-slate-500 truncate">
                /{store.slug}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={togglingOpen}
            onClick={onToggleStoreOpen}
            className="w-full py-2 px-3 rounded-lg bg-white border border-slate-200 text-xs font-semibold flex items-center justify-between hover:border-slate-300 transition cursor-pointer"
          >
            <span className="flex items-center gap-2 text-slate-900">
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
            <p className="text-[11px] font-medium text-slate-500 truncate">
              {userEmail || "Owner Outlet"}
            </p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            title="Keluar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition shrink-0"
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
  userEmail = "",
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(initialStore.is_open);
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");

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
      label: "Pengaturan Toko",
      href: `/${initialStore.slug}/admin/settings`,
      icon: Settings,
    },
    {
      label: "QR Code",
      href: `/${initialStore.slug}/admin/qr`,
      icon: QrCode,
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
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-white sticky top-0 h-screen shrink-0">
        <SidebarContent
          store={initialStore}
          userEmail={userEmail}
          isOpen={isOpen}
          togglingOpen={togglingOpen}
          pathname={pathname}
          isSuperadmin={isSuperadmin}
          navItems={navItems}
          onCloseMobile={() => setMobileNavOpen(false)}
          onToggleStoreOpen={handleToggleStoreOpen}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Mobile & Tablet Slide-Over Drawer */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-slate-900/40 backdrop-blur-[1px]"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="w-72 h-full bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent
              store={initialStore}
              userEmail={userEmail}
              isOpen={isOpen}
              togglingOpen={togglingOpen}
              pathname={pathname}
              isSuperadmin={isSuperadmin}
              navItems={navItems}
              onCloseMobile={() => setMobileNavOpen(false)}
              onToggleStoreOpen={handleToggleStoreOpen}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Left: Mobile Menu Toggle + Greeting */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Buka navigasi"
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-[-0.02em] text-slate-900 truncate">
                Halo, {initialStore.name}
              </h2>
              <p className="text-xs text-slate-500 hidden sm:block truncate">
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
                className="bg-[#F8FAFC] rounded-full pl-9 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:border-[#2563EB] focus:bg-white focus:outline-none w-48 xl:w-60 transition"
              />
            </form>

            <Link
              href={`/${initialStore.slug}/admin/orders`}
              aria-label="Pesanan Live"
              className="relative w-10 h-10 rounded-full bg-[#F8FAFC] border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-white transition"
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

      {/* Ritual Buka Toko Modal */}
      {showOpenRitual && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
          onClick={() => setShowOpenRitual(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold tracking-[-0.02em] text-slate-900">
                  Ritual Buka Toko
                </h3>
                <p className="text-xs text-slate-500">
                  Tetapkan target penjualan dan modal laci kasir hari ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOpenRitual(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmOpenRitual} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-900">
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold tabular-nums focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                  Modal Awal Laci Kasir (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={drawerInput}
                  onChange={(e) => setDrawerInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold tabular-nums focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15"
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
    </div>
  );
}
