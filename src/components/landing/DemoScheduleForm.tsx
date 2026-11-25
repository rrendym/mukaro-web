"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export function DemoScheduleForm() {
  const [contact, setContact] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return;
    setSubmitted(true);
    setContact("");
  };

  if (submitted) {
    return (
      <div className="p-3 rounded-xl bg-white border-[1.5px] border-[#141413] flex items-center gap-2 text-xs font-bold text-[#141413]">
        <CheckCircle2 className="w-4 h-4 text-[#1E7F5C] shrink-0" />
        <span>Jadwal demo diterima! Tim kami akan segera menghubungi Anda.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <input
        type="text"
        required
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="Email / No. WhatsApp Kafe"
        className="w-full px-3.5 py-2.5 rounded-xl bg-white border-[1.5px] border-[#141413] text-xs font-semibold text-[#141413] placeholder:text-neutral-400 focus:outline-none"
      />
      <button
        type="submit"
        className="w-full py-2.5 px-4 rounded-xl bg-[#141413] text-white text-xs font-extrabold hover:bg-neutral-800 transition cursor-pointer"
      >
        Jadwalkan Demo Kafe
      </button>
    </form>
  );
}
