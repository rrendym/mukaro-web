"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Plus,
  ExternalLink,
  Lock,
  Unlock,
  CalendarPlus,
  Loader2,
} from "lucide-react";
import { Store, SubscriptionStatus } from "@/types/database";
import { MukaroLogo } from "@/components/MukaroLogo";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/format";

export function SuperadminClient({
  initialStores,
  adminEmail,
}: {
  initialStores: Store[];
  adminEmail: string;
}) {
  const [stores, setStores] = useState<Store[]>(initialStores);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus>("active");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExtend = async (store: Store, days: number) => {
    setBusyId(store.id);
    setError(null);
    const base =
      new Date(store.expired_at) > new Date()
        ? new Date(store.expired_at)
        : new Date();
    const nextExpired = new Date(
      base.getTime() + days * 24 * 60 * 60 * 1000
    ).toISOString();

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("stores")
      .update({
        subscription_status: "active",
        expired_at: nextExpired,
      })
      .eq("id", store.id)
      .select("*")
      .single();

    if (err) {
      setError(err.message);
    } else if (data) {
      setStores((prev) =>
        prev.map((s) => (s.id === store.id ? (data as Store) : s))
      );
    }
    setBusyId(null);
  };

  const handleToggleLock = async (store: Store) => {
    setBusyId(store.id);
    setError(null);
    const nextStatus: SubscriptionStatus =
      store.subscription_status === "expired" ? "active" : "expired";

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("stores")
      .update({ subscription_status: nextStatus })
      .eq("id", store.id)
      .select("*")
      .single();

    if (err) {
      setError(err.message);
    } else if (data) {
      setStores((prev) =>
        prev.map((s) => (s.id === store.id ? (data as Store) : s))
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
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MukaroLogo size="sm" showDomain />
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Superadmin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-mono text-slate-500">
              {adminEmail}
            </span>
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
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-slate-900">
            Manajemen Tenant Mukaro
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola seluruh toko terdaftar, masa aktif langganan, dan buat
            outlet klien baru.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
            {error}
          </div>
        )}

        {/* Create Store Form */}
        <form
          onSubmit={handleCreateStore}
          className="bg-white rounded-2xl p-5 border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">
              Slug URL *
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="kopi-nusantara"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">
              Status Awal
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:border-[#2563EB]"
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

        {/* Store List */}
        <div className="space-y-3">
          {stores.map((s) => {
            const isExpired =
              s.subscription_status === "expired" ||
              new Date() > new Date(s.expired_at);

            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">
                      {s.name}
                    </h3>
                    <span className="text-xs font-mono text-slate-500">
                      /{s.slug}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isExpired
                          ? "bg-rose-50 text-rose-700"
                          : s.subscription_status === "trial"
                            ? "bg-blue-50 text-[#2563EB]"
                            : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {s.subscription_status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Jatuh tempo:{" "}
                    <strong className="text-slate-900 font-mono tabular-nums">
                      {new Date(s.expired_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => handleExtend(s, 30)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>+30 Hari</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => handleExtend(s, 365)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>+1 Tahun</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => handleToggleLock(s)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                      s.subscription_status === "expired"
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                    }`}
                  >
                    {s.subscription_status === "expired" ? (
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
                  <Link
                    href={`/${s.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                    aria-label="Lihat toko"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-600" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
