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
  summary: string;
  prioritySteps: string[];
  targetCalculation: string;
  promoAndBundling: string[];
  copywritingIdeas: string[];
}

const VALID_MODES: AdvisorMode[] = ["audit", "target", "promo", "chat"];

function formatCurrencyId(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

function normalizeResult(
  parsed: Partial<AdvisorStructuredResult> | null,
  fallbackText: string
): AdvisorStructuredResult {
  if (!parsed) {
    return {
      summary: fallbackText,
      prioritySteps: [],
      targetCalculation: "",
      promoAndBundling: [],
      copywritingIdeas: [],
    };
  }

  const toStringArray = (val: unknown): string[] =>
    Array.isArray(val)
      ? val
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
      : [];

  return {
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : fallbackText,
    prioritySteps: toStringArray(parsed.prioritySteps),
    targetCalculation:
      typeof parsed.targetCalculation === "string"
        ? parsed.targetCalculation.trim()
        : "",
    promoAndBundling: toStringArray(parsed.promoAndBundling),
    copywritingIdeas: toStringArray(parsed.copywritingIdeas),
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
    const question = body.question?.trim() || "";

    if (mode === "chat" && !question) {
      return NextResponse.json(
        { error: "Tuliskan pertanyaan terlebih dahulu untuk mode tanya jawab." },
        { status: 400 }
      );
    }

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
        : "Belum ada data menu terlaris.";

    const lowMenuText =
      metrics.lowMenus && metrics.lowMenus.length > 0
        ? metrics.lowMenus
            .map((m) => `- ${m.name}: ${m.qty} terjual`)
            .join("\n")
        : "Tidak ada data menu penjualan rendah.";

    const modeFocusMap: Record<AdvisorMode, string> = {
      audit:
        "Fokus pada AUDIT PENJUALAN menyeluruh: evaluasi kesehatan omzet, AOV, menu bintang vs menu sepi, serta kebocoran peluang di jam sepi.",
      target:
        "Fokus pada STRATEGI KEJAR TARGET: hitung kekurangan omzet per hari, jumlah transaksi tambahan yang dibutuhkan berdasar AOV, dan taktik konkret mencapainya sebelum periode berakhir.",
      promo:
        "Fokus pada IDE PROMO & COPYWRITING: rancang paket bundling antara menu terlaris dan menu sepi, promo jam sepi, serta caption siap pakai untuk WhatsApp/Instagram.",
      chat: `Fokus menjawab pertanyaan spesifik owner berikut secara langsung dan aplikatif: "${question}"`,
    };

    const systemInstruction = `Kamu adalah "Mukaro AI Advisor", konsultan bisnis F&B, kedai, kafe, dan toko ritel Indonesia yang sangat praktis, lugas, dan berorientasi tindakan nyata (actionable).
Aturan penting:
- Gunakan Bahasa Indonesia yang natural, profesional, hangat, namun to-the-point untuk pemilik usaha.
- Selalu rujuk angka nyata dari data outlet yang diberikan (omzet, AOV, transaksi, jam ramai/sepi, nama menu asli). Jangan mengarang angka penjualan yang tidak ada.
- Berikan hitungan konkret (misal target harian, berapa transaksi tambahan per hari berdasarkan AOV, estimasi harga bundling).
- Kembalikan HANYA JSON valid dengan struktur persis berikut:
{
  "summary": "Ringkasan kondisi bisnis saat ini dalam 2-4 kalimat yang jelas.",
  "prioritySteps": ["Langkah prioritas 1 yang bisa dilakukan hari ini", "Langkah 2", "Langkah 3"],
  "targetCalculation": "Hitungan target harian / kebutuhan transaksi / proyeksi omzet dalam 2-3 kalimat.",
  "promoAndBundling": ["Ide bundling atau promo konkret 1 (sebut nama menu & harga saran)", "Ide 2"],
  "copywritingIdeas": ["Ide copywriting singkat siap posting WA/IG/banner 1", "Ide 2"]
}`;

    const userPrompt = `Data Outlet:
- Nama Outlet: ${outletName}
- Mode Analisis: ${mode.toUpperCase()} — ${modeFocusMap[mode]}
- Omzet Berjalan: ${formatCurrencyId(currentRevenue)}
- Target Omzet: ${targetRevenue != null ? formatCurrencyId(targetRevenue) : "Belum diisi"}
- Sisa Hari: ${daysRemaining != null ? `${daysRemaining} hari` : "Tidak disebutkan"}
- Kekurangan Target: ${remainingTarget != null ? formatCurrencyId(remainingTarget) : "-"}
- Kebutuhan Omzet/Hari: ${neededPerDay != null ? formatCurrencyId(neededPerDay) : "-"}

Metrik Penjualan:
- Total Transaksi: ${metrics.totalTransactions ?? 0}
- Rata-rata Nilai Transaksi (AOV): ${formatCurrencyId(metrics.aov ?? 0)}
- Perbandingan Periode Sebelumnya: ${metrics.previousPeriodComparison || "Belum tersedia"}
- Jam Ramai: ${metrics.peakHours || "Belum terdeteksi"}
- Jam Sepi: ${metrics.quietHours || "Belum terdeteksi"}

Top Menu Terlaris:
${topMenuText}

Menu Penjualan Rendah / Belum Laku:
${lowMenuText}

${question ? `Konteks / Pertanyaan Tambahan Owner:\n${question}` : ""}`;

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
        maxOutputTokens: 1600,
        responseMimeType: "application/json",
      },
    });

    const parsed = parseJsonSafe<Partial<AdvisorStructuredResult>>(rawText);
    const result = normalizeResult(parsed, rawText);

    return NextResponse.json({
      mode,
      outletName,
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
