import React from "react";
import Link from "next/link";
import { Lock, MessageCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Store } from "@/types/database";

interface SubscriptionPaywallProps {
  store: Store;
  formattedExpiredAt: string;
}

export function SubscriptionPaywall({
  store,
  formattedExpiredAt,
}: SubscriptionPaywallProps) {
  const adminWa =
    process.env.NEXT_PUBLIC_MUKARO_ADMIN_WA || "6281234567890";
  const waText = encodeURIComponent(
    `Halo Admin Mukaro, saya ingin memperpanjang langganan outlet "${store.name}" (${store.slug}) paket Rp 99.000/bulan.`
  );
  const waUrl = `https://wa.me/${adminWa}?text=${waText}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
          {/* Yellow Browser Bar */}
          <div className="h-9 bg-[#2563EB] border-b-[1.5px] border-[#2563EB] px-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
            </div>
            <span className="text-[11px] font-extrabold tracking-tight text-slate-900">
              mukaro.id/billing
            </span>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-slate-200 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6 text-rose-700" />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-extrabold uppercase tracking-wide">
                  Langganan Berakhir
                </span>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mt-1">
                  Masa Aktif Langganan Habis
                </h1>
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                  Akses Dashboard Owner, Kasir POS, dan Menu QR untuk outlet{" "}
                  <strong className="text-slate-900">{store.name}</strong>{" "}
                  sementara dikunci.
                </p>
              </div>
            </div>

            {/* Billing Details Box */}
            <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-semibold">
                  Jatuh Tempo Terakhir
                </span>
                <span className="font-extrabold text-rose-700 font-mono tabular-nums">
                  {formattedExpiredAt}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-slate-900">
                    Paket Mukaro Pro (Perpanjangan)
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Akses penuh QR Self-Order, POS, Stok &amp; QRIS
                  </p>
                </div>
                <p className="text-lg font-extrabold text-slate-900 font-mono tabular-nums">
                  Rp 99.000
                  <span className="text-xs font-semibold text-neutral-500">
                    /bulan
                  </span>
                </p>
              </div>
              <ul className="space-y-1.5 pt-1 text-[11px] text-neutral-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Semua data menu, resep, dan riwayat order tetap aman</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Aktivasi instan oleh tim Mukaro setelah konfirmasi</span>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-5 rounded-xl bg-[#2563EB] text-white text-sm font-extrabold flex items-center justify-center gap-2 hover:bg-[#1D4ED8] transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Perpanjang via WhatsApp Admin Mukaro</span>
              </a>
              <Link
                href="/"
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-neutral-600 hover:text-slate-900 hover:border-[#2563EB] flex items-center justify-center gap-1.5 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Beranda</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
