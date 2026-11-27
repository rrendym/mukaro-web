"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Target,
  TrendingUp,
  Megaphone,
  Send,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Calculator,
  ListChecks,
  MessageSquare,
} from "lucide-react";
import { formatRupiah } from "@/lib/format";
import type {
  AdvisorMetrics,
  AdvisorMode,
  AdvisorStructuredResult,
} from "@/app/api/admin/ai-advisor/route";

interface MukaroAiAdvisorPanelProps {
  outletName: string;
  currentRevenue: number;
  defaultTargetRevenue: number | null;
  defaultDaysRemaining: number;
  metrics: AdvisorMetrics;
}

export function MukaroAiAdvisorPanel({
  outletName,
  currentRevenue,
  defaultTargetRevenue,
  defaultDaysRemaining,
  metrics,
}: MukaroAiAdvisorPanelProps) {
  const [targetInput, setTargetInput] = useState<string>(
    defaultTargetRevenue && defaultTargetRevenue > 0
      ? String(defaultTargetRevenue)
      : ""
  );
  const [daysInput, setDaysInput] = useState<string>(
    String(Math.max(1, defaultDaysRemaining))
  );
  const [question, setQuestion] = useState("");
  const [activeMode, setActiveMode] = useState<AdvisorMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdvisorStructuredResult | null>(null);
  const [copied, setCopied] = useState(false);

  const parsedTarget =
    targetInput.trim() !== "" && !Number.isNaN(Number(targetInput))
      ? Math.max(0, Number(targetInput))
      : null;

  const parsedDays =
    daysInput.trim() !== "" && !Number.isNaN(Number(daysInput))
      ? Math.max(0, Math.round(Number(daysInput)))
      : null;

  const runAdvisor = async (mode: AdvisorMode) => {
    if (mode === "chat" && !question.trim()) {
      setError("Tuliskan pertanyaan Anda terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError(null);
    setActiveMode(mode);
    setCopied(false);

    try {
      const res = await fetch("/api/admin/ai-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletName,
          mode,
          targetRevenue: parsedTarget,
          currentRevenue,
          daysRemaining: parsedDays,
          metrics,
          question: question.trim(),
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        result?: AdvisorStructuredResult;
        error?: string;
      } | null;

      if (!res.ok) {
        throw new Error(
          data?.error || "Gagal menghubungi Mukaro AI Advisor."
        );
      }

      if (!data?.result) {
        throw new Error("Respons AI tidak lengkap. Silakan coba lagi.");
      }

      setResult(data.result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memproses analisis AI."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResult = async () => {
    if (!result) return;
    const sections: string[] = [
      `MUKARO AI ADVISOR — ${outletName}`,
      `Ringkasan:\n${result.summary}`,
    ];
    if (result.targetCalculation) {
      sections.push(`Hitungan Target:\n${result.targetCalculation}`);
    }
    if (result.prioritySteps.length > 0) {
      sections.push(
        `Langkah Prioritas:\n${result.prioritySteps
          .map((s, i) => `${i + 1}. ${s}`)
          .join("\n")}`
      );
    }
    if (result.promoAndBundling.length > 0) {
      sections.push(
        `Ide Promo & Bundling:\n${result.promoAndBundling
          .map((p) => `- ${p}`)
          .join("\n")}`
      );
    }
    if (result.copywritingIdeas.length > 0) {
      sections.push(
        `Ide Copywriting:\n${result.copywritingIdeas
          .map((c) => `- ${c}`)
          .join("\n")}`
      );
    }

    try {
      await navigator.clipboard.writeText(sections.join("\n\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Gagal menyalin ke clipboard.");
    }
  };

  return (
    <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Mukaro AI Advisor
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-[#2563EB]">
                Gemini AI
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Analisis otomatis dari data penjualan 30 hari terakhir ({formatRupiah(currentRevenue)},{" "}
              {metrics.totalTransactions ?? 0} transaksi).
            </p>
          </div>
        </div>

        {result && (
          <button
            type="button"
            onClick={handleCopyResult}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#090D16] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#2563EB] transition w-fit"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#059669]" />
                <span className="text-[#059669]">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Hasil</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Target & Days Inputs + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
        <div className="lg:col-span-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Target Omzet Periode Ini (Rp)
          </label>
          <input
            type="number"
            min={0}
            step={50000}
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            placeholder="Contoh: 15000000"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB] transition"
          />
        </div>

        <div className="lg:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Sisa Hari
          </label>
          <input
            type="number"
            min={0}
            max={365}
            value={daysInput}
            onChange={(e) => setDaysInput(e.target.value)}
            placeholder="7"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB] transition"
          />
        </div>

        <div className="lg:col-span-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => runAdvisor("audit")}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-60 ${
              activeMode === "audit"
                ? "bg-[#1D4ED8] text-white"
                : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Audit Penjualan</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => runAdvisor("target")}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition disabled:opacity-60 ${
              activeMode === "target"
                ? "bg-blue-50 dark:bg-blue-950/60 border-[#2563EB] text-[#2563EB]"
                : "bg-[#F8FAFC] dark:bg-[#090D16] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-[#2563EB]"
            }`}
          >
            <Target className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Strategi Kejar Target</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => runAdvisor("promo")}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition disabled:opacity-60 ${
              activeMode === "promo"
                ? "bg-blue-50 dark:bg-blue-950/60 border-[#2563EB] text-[#2563EB]"
                : "bg-[#F8FAFC] dark:bg-[#090D16] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-[#2563EB]"
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Ide Promo &amp; Caption</span>
          </button>
        </div>
      </div>

      {/* Free-form Question */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runAdvisor("chat");
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <div className="relative flex-1">
          <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Lagi stuck? Tanya apa saja, misal: 'Cara naikin penjualan jam 2 siang gimana?'"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] transition"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition disabled:opacity-60 shrink-0"
        >
          {loading && activeMode === "chat" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>Tanya AI</span>
        </button>
      </form>

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-6 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
          <span>Mukaro AI sedang menganalisis data penjualan {outletName}...</span>
        </div>
      )}

      {/* Result State */}
      {!loading && result && (
        <div className="space-y-4 pt-1">
          {/* Summary */}
          <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
              Ringkasan Kondisi
            </p>
            <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line">
              {result.summary}
            </p>
          </div>

          {/* Target Calculation */}
          {result.targetCalculation && (
            <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                <Calculator className="w-3.5 h-3.5" />
                <span>Hitungan Target &amp; Proyeksi</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line">
                {result.targetCalculation}
              </p>
            </div>
          )}

          {/* Grid for Steps, Promo, Copywriting */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {result.prioritySteps.length > 0 && (
              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <ListChecks className="w-4 h-4 text-[#059669]" />
                  <span>Langkah Prioritas</span>
                </div>
                <ol className="space-y-2 text-xs text-slate-700 dark:text-slate-300 list-decimal list-inside">
                  {result.prioritySteps.map((step, i) => (
                    <li key={i} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {result.promoAndBundling.length > 0 && (
              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <Megaphone className="w-4 h-4 text-[#2563EB]" />
                  <span>Ide Promo &amp; Bundling</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                  {result.promoAndBundling.map((promo, i) => (
                    <li key={i} className="leading-relaxed">
                      {promo}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.copywritingIdeas.length > 0 && (
              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Ide Copywriting Siap Pakai</span>
                </div>
                <div className="space-y-2">
                  {result.copywritingIdeas.map((copyText, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
                    >
                      {copyText}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
