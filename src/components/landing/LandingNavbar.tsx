"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { MukaroLogo } from "@/components/MukaroLogo";

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-[1.5px] border-[#141413]">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
        {/* Left: Mukaro Logo */}
        <Link href="/" className="inline-flex items-center shrink-0">
          <MukaroLogo size="sm" subtitle="QR POS & Self-Order" />
        </Link>

        {/* Right (Desktop) */}
        <nav className="hidden lg:flex items-center gap-7">
          <a
            href="#fitur"
            className="text-sm font-bold text-[#141413] hover:text-[#1E7F5C] transition"
          >
            Fitur
          </a>
          <a
            href="#cara-kerja"
            className="text-sm font-bold text-[#141413] hover:text-[#1E7F5C] transition"
          >
            Cara Kerja
          </a>
          <a
            href="#harga"
            className="text-sm font-bold text-[#141413] hover:text-[#1E7F5C] transition"
          >
            Harga
          </a>
          <Link
            href="/login"
            className="text-sm font-bold text-[#141413] hover:underline"
          >
            Masuk
          </Link>
          <Link
            href="/kopi-senja"
            className="px-5 py-2 rounded-xl bg-[#F7B928] border-[1.5px] border-[#141413] text-sm font-extrabold text-[#141413] shadow-[2px_2px_0px_#141413] hover:translate-y-[-1px] transition"
          >
            Coba Demo
          </Link>
        </nav>

        {/* Right (Tablet & Mobile) */}
        <div className="flex lg:hidden items-center gap-2.5">
          <Link
            href="/kopi-senja"
            className="px-3.5 py-1.5 rounded-xl bg-[#F7B928] border-[1.5px] border-[#141413] text-xs font-extrabold text-[#141413]"
          >
            Coba Demo
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle Menu"
            className="p-2 rounded-xl border-[1.5px] border-[#141413] text-[#141413] bg-white"
          >
            {mobileOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="lg:hidden border-t-[1.5px] border-[#141413] bg-white px-5 py-4 space-y-3">
          <a
            href="#fitur"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-bold text-[#141413]"
          >
            Fitur
          </a>
          <a
            href="#cara-kerja"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-bold text-[#141413]"
          >
            Cara Kerja
          </a>
          <a
            href="#harga"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-bold text-[#141413]"
          >
            Harga
          </a>
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="block w-full text-center py-2.5 rounded-xl bg-[#141413] text-white text-sm font-bold"
          >
            Masuk Dashboard
          </Link>
        </div>
      )}
    </header>
  );
}
