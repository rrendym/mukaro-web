import { NextRequest, NextResponse } from "next/server";
import { callGemini, getGeminiApiKey, parseJsonSafe } from "@/lib/gemini";

export type AdvisorMode = "audit" | "target" | "promo" | "chat";

export interface AdvisorMetrics {
  totalTransactions?: number;
  aov?: number;
  previousPeriodComparison?: string;
  topMenus?: Array<{ name: string; qty: number; revenue?: number }>;
  lowMenus?: Array<{ name: string; qty: number }>;
  peakHours?: string;
  quietHours?: string;
}

export interface AdvisorRequestPayload {
  outletName?: string;
  mode?: AdvisorMode;
  targetRevenue?: number | null;
  currentRevenue?: number;
  daysRemaining?: number | null;
  metrics?: AdvisorMetrics;
  question?: string;
}

export interface AdvisorStructuredResult {
  headline: string;
  diagnosis: string;
  actionPlan: string[];
  mathBreakdown: string;
  promoCopy: string;
}

const VALID_MODES: AdvisorMode[] = ["audit", "target", "promo", "chat"];

function formatCurrencyId(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

function cleanPlainText(raw: string): string {
  return raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .replace(
      /"?(headline|diagnosis|actionPlan|mathBreakdown|promoCopy|summary|prioritySteps|targetCalculation|promoAndBundling|copywritingIdeas)"?\s*:\s*/gi,
      ""
    )
    .replace(/[{}\[\]]/g, "")
    .replace(/\\n/g, "\n")
    .replace(/^[\s,"']+|[\s,"']+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeStringField(val: unknown, fallback = ""): string {
  if (typeof val === "string") {
    return val.replace(/\\n/g, "\n").trim();
  }
  if (Array.isArray(val)) {
    return val
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean)
      .join("\n\n");
  }
  return fallback;
}

function normalizeResult(
  parsed: Partial<AdvisorStructuredResult> | null,
  rawFallback: string,
  outletName: string,
  isPreLaunch: boolean
): AdvisorStructuredResult {
  if (!parsed) {
    const cleaned = cleanPlainText(rawFallback);
    return {
      headline: isPreLaunch
        ? `Playbook Kejar Order Pertama — ${outletName}`
        : `Ringkasan Strategi — ${outletName}`,
      diagnosis:
        cleaned ||
        "Analisis selesai diproses. Silakan jalankan ulang untuk detail lebih spesifik.",
      actionPlan: [],
      mathBreakdown: "",
      promoCopy: "",
    };
  }

  const actionPlan = Array.isArray(parsed.actionPlan)
    ? parsed.actionPlan
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];

  const headline = normalizeStringField(
    parsed.headline,
    isPreLaunch
      ? `Fokus Pre-Launch: Kejar 10–20 Order Pertama ${outletName}`
      : `Prioritas Aksi — ${outletName}`
  );

  const diagnosis = normalizeStringField(
    parsed.diagnosis,
    cleanPlainText(rawFallback)
  );

  const mathBreakdown = normalizeStringField(parsed.mathBreakdown);
  const promoCopy = normalizeStringField(parsed.promoCopy);

  return {
    headline,
    diagnosis,
    actionPlan,
    mathBreakdown,
    promoCopy,
  };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY belum dikonfigurasi pada environment server. Tambahkan GEMINI_API_KEY di file .env.local atau environment hosting.",
        },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as AdvisorRequestPayload | null;
    if (!body) {
      return NextResponse.json(
        { error: "Payload JSON tidak valid." },
        { status: 400 }
      );
    }

    const mode: AdvisorMode = VALID_MODES.includes(body.mode as AdvisorMode)
      ? (body.mode as AdvisorMode)
      : "audit";

    const outletName = body.outletName?.trim() || "Outlet Anda";
    const currentRevenue = Number(body.currentRevenue ?? 0) || 0;
    const targetRevenue =
      body.targetRevenue != null && !Number.isNaN(Number(body.targetRevenue))
        ? Number(body.targetRevenue)
        : null;
    const daysRemaining =
      body.daysRemaining != null && !Number.isNaN(Number(body.daysRemaining))
        ? Math.max(0, Math.round(Number(body.daysRemaining)))
        : null;
    const metrics = body.metrics || {};
    const totalTransactions = Number(metrics.totalTransactions ?? 0) || 0;
    const aov = Number(metrics.aov ?? 0) || 0;
    const question = body.question?.trim() || "";

    if (mode === "chat" && !question) {
      return NextResponse.json(
        { error: "Tuliskan pertanyaan terlebih dahulu untuk mode tanya jawab." },
        { status: 400 }
      );
    }

    const isPreLaunch = currentRevenue === 0 || totalTransactions === 0;

    const remainingTarget =
      targetRevenue != null ? Math.max(0, targetRevenue - currentRevenue) : null;
    const neededPerDay =
      remainingTarget != null && daysRemaining != null && daysRemaining > 0
        ? Math.ceil(remainingTarget / daysRemaining)
        : null;

    const topMenuText =
      metrics.topMenus && metrics.topMenus.length > 0
        ? metrics.topMenus
            .map(
              (m) =>
                `- ${m.name}: ${m.qty} terjual${
                  m.revenue != null ? ` (${formatCurrencyId(m.revenue)})` : ""
                }`
            )
            .join("\n")
        : "Belum ada histori menu terjual.";

    const lowMenuText =
      metrics.lowMenus && metrics.lowMenus.length > 0
        ? metrics.lowMenus
            .map((m) => `- ${m.name}: ${m.qty} terjual`)
            .join("\n")
        : "Belum ada daftar menu penjualan rendah.";

    const modeFocusMap: Record<AdvisorMode, string> = {
      audit: isPreLaunch
        ? "AUDIT KESIAPAN PRE-LAUNCH: outlet belum mencatat omzet/transaksi. Berikan playbook taktis untuk mencetak 10–20 order pertama secepat mungkin (cek daya tarik menu pancingan, harga psikologis, eksekusi QR/Kasir, dan distribusi link order)."
        : "AUDIT PENJUALAN TAJAM: bedah performa omzet, AOV, ketimpangan menu bintang vs menu sepi, dan kebocoran omzet di jam sepi. Langsung tunjuk masalah & peluang terbesarnya.",
      target: isPreLaunch
        ? "STRATEGI KEJAR TARGET DARI NOL: hitung kebutuhan omzet & order per hari untuk mencapai target, lalu pecah menjadi target harian (misal 5–10 order/hari) dengan skema promo pembuka."
        : "STRATEGI KEJAR TARGET: hitung selisih target, kebutuhan omzet/hari, dan jumlah transaksi tambahan/hari berdasarkan AOV aktual, lalu berikan taktik eksekusi harian yang realistis.",
      promo: isPreLaunch
        ? "IDE PROMO GRAND OPENING / ORDER PERTAMA: rancang promo pancingan (early bird, tebus murah, atau paket berdua) + skrip broadcast WhatsApp/IG/TikTok siap sebar hari ini."
        : "IDE PROMO & BUNDLING BERBASIS DATA: pasangkan menu terlaris dengan menu sepi menjadi paket bundling bernilai tinggi, buat promo jam sepi, dan siapkan teks promosi WA/IG/TikTok siap pakai.",
      chat: `JAWAB PERTANYAAN SPESIFIK OWNER: "${question}". Jawab langsung ke inti solusi yang bisa dieksekusi hari ini.`,
    };

    const systemInstruction = `Kamu adalah "Mukaro AI Advisor", konsultan bisnis F&B dan UMKM Indonesia yang berpengalaman, tajam, suportif, lugas, dan berorientasi eksekusi cepat.

Gaya komunikasi wajib:
- Langsung ke poin tindakan. DILARANG pakai kalimat klise/robotik seperti "Sebagai AI...", "Halo, saya siap membantu...", atau sekadar mengulang "belum ada data penjualan".
- Jika kondisi masih PRE-LAUNCH (omzet Rp 0 atau 0 transaksi): perlakukan sebagai misi **Kejar 10–20 Order Pertama**. Berikan playbook praktis: audit harga & menu pancingan (hero item), skema promo grand opening/early bird/bundling pembuka, dan skrip broadcast WhatsApp + postingan IG/TikTok lokal yang langsung bisa disalin.
- Jika sudah ada data penjualan: rujuk angka nyata dari data outlet (omzet, transaksi, AOV, nama menu asli, jam ramai/sepi, selisih target & kebutuhan harian). Jangan mengarang angka transaksi yang tidak ada di data.

Format output WAJIB berupa JSON valid murni (tanpa teks di luar JSON) dengan 5 field persis berikut:
{
  "headline": "1 kalimat judul strategi paling berdampak (maks 14 kata, tajam & memotivasi)",
  "diagnosis": "2-4 kalimat analisis kondisi & peluang terbesar saat ini secara lugas",
  "actionPlan": [
    "Langkah eksekusi konkret 1 yang bisa dilakukan hari ini (sertakan detail cara/targetnya)",
    "Langkah eksekusi konkret 2",
    "Langkah eksekusi konkret 3",
    "Langkah eksekusi konkret 4"
  ],
  "mathBreakdown": "Hitungan target omzet per hari, estimasi jumlah order tambahan per hari (berdasar AOV aktual atau estimasi tiket rata-rata jika masih nol), atau skema hitung harga bundling/margin promo.",
  "promoCopy": "1 teks promosi lengkap siap salin untuk WhatsApp Broadcast / IG Story / TikTok caption (boleh pakai baris baru dan emoji secukupnya agar menarik)."
}`;

    const userPrompt = `Data Outlet:
- Nama Outlet: ${outletName}
- Status Data: ${isPreLaunch ? "FASE PRE-LAUNCH / BELUM ADA TRANSAKSI (Omzet Rp 0)" : "AKTIF BERJALAN"}
- Mode Analisis: ${mode.toUpperCase()} — ${modeFocusMap[mode]}
- Omzet Berjalan: ${formatCurrencyId(currentRevenue)}
- Target Omzet: ${targetRevenue != null ? formatCurrencyId(targetRevenue) : "Belum diisi"}
- Sisa Hari: ${daysRemaining != null ? `${daysRemaining} hari` : "Tidak disebutkan"}
- Kekurangan Target: ${remainingTarget != null ? formatCurrencyId(remainingTarget) : "-"}
- Kebutuhan Omzet/Hari: ${neededPerDay != null ? formatCurrencyId(neededPerDay) : "-"}

Metrik Penjualan:
- Total Transaksi: ${totalTransactions}
- Rata-rata Nilai Transaksi (AOV): ${aov > 0 ? formatCurrencyId(aov) : "Belum terbentuk (gunakan asumsi tiket wajar Rp 25.000–Rp 35.000 bila perlu hitung proyeksi order)"}
- Perbandingan Periode Sebelumnya: ${metrics.previousPeriodComparison || "Belum tersedia"}
- Jam Ramai: ${metrics.peakHours || "Belum terdeteksi"}
- Jam Sepi: ${metrics.quietHours || "Belum terdeteksi"}

Top Menu Terlaris:
${topMenuText}

Menu Penjualan Rendah / Belum Laku:
${lowMenuText}

${question ? `Pertanyaan / Konteks Tambahan Owner:\n${question}` : ""}`;

    const rawText = await callGemini(apiKey, {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 2400,
        responseMimeType: "application/json",
      },
    });

    const parsed = parseJsonSafe<Partial<AdvisorStructuredResult>>(rawText);
    const result = normalizeResult(parsed, rawText, outletName, isPreLaunch);

    return NextResponse.json({
      mode,
      outletName,
      isPreLaunch,
      result,
    });
  } catch (err) {
    console.error("[AI Advisor] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Gagal memproses analisis Mukaro AI Advisor.",
      },
      { status: 500 }
    );
  }
}
