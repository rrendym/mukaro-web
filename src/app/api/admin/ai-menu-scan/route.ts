import { NextRequest, NextResponse } from "next/server";
import { callGemini, getGeminiApiKey, parseJsonSafe } from "@/lib/gemini";

export interface ScannedMenuItem {
  name: string;
  price: number;
  category: string;
  description: string;
}

interface MenuScanRequestPayload {
  imageBase64?: string;
  mimeType?: string;
  existingCategories?: string[];
}

interface RawAiMenuScanResponse {
  items?: Array<{
    name?: unknown;
    price?: unknown;
    category?: unknown;
    description?: unknown;
  }>;
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function stripDataUrlPrefix(base64: string): string {
  const commaIdx = base64.indexOf(",");
  if (base64.startsWith("data:") && commaIdx !== -1) {
    return base64.slice(commaIdx + 1).trim();
  }
  return base64.trim();
}

function sanitizePrice(rawPrice: unknown): number {
  if (typeof rawPrice === "number") {
    if (!Number.isFinite(rawPrice) || rawPrice < 0) return 0;
    return Math.round(rawPrice);
  }
  if (typeof rawPrice === "string") {
    const lower = rawPrice.toLowerCase().trim();
    if (!lower) return 0;

    // Handle shorthand like "25k" or "25rb"
    const kMatch = lower.match(/^(\d+(?:[.,]\d+)?)\s*(k|rb|ribu)$/);
    if (kMatch) {
      const num = parseFloat(kMatch[1].replace(",", "."));
      return Number.isFinite(num) && num >= 0 ? Math.round(num * 1000) : 0;
    }

    const digitsOnly = lower.replace(/[^\d]/g, "");
    if (!digitsOnly) return 0;
    const parsed = parseInt(digitsOnly, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }
  return 0;
}

function sanitizeItems(
  rawItems: RawAiMenuScanResponse["items"],
  existingCategories: string[]
): ScannedMenuItem[] {
  if (!Array.isArray(rawItems)) return [];

  const categoryLookup = new Map(
    existingCategories.map((c) => [c.trim().toLowerCase(), c.trim()])
  );

  const cleaned: ScannedMenuItem[] = [];
  for (const item of rawItems) {
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    if (!name) continue;

    const rawCategory =
      typeof item?.category === "string" && item.category.trim()
        ? item.category.trim()
        : "Umum";
    const matchedCategory =
      categoryLookup.get(rawCategory.toLowerCase()) || rawCategory;

    const description =
      typeof item?.description === "string" ? item.description.trim() : "";

    cleaned.push({
      name,
      price: sanitizePrice(item?.price),
      category: matchedCategory,
      description,
    });
  }

  return cleaned;
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

    const body = (await req.json().catch(() => null)) as MenuScanRequestPayload | null;
    if (!body?.imageBase64) {
      return NextResponse.json(
        { error: "Gambar menu wajib diunggah." },
        { status: 400 }
      );
    }

    const mimeType = body.mimeType?.trim() || "image/jpeg";
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          error:
            "Format gambar tidak didukung. Gunakan JPG, PNG, atau WEBP.",
        },
        { status: 400 }
      );
    }

    const cleanBase64 = stripDataUrlPrefix(body.imageBase64);
    if (!cleanBase64 || cleanBase64.length < 32) {
      return NextResponse.json(
        { error: "Data gambar tidak valid atau kosong." },
        { status: 400 }
      );
    }

    const existingCategories = Array.isArray(body.existingCategories)
      ? body.existingCategories
          .filter((c): c is string => typeof c === "string" && c.trim() !== "")
          .map((c) => c.trim())
      : [];

    const categoryHint =
      existingCategories.length > 0
        ? `Kategori yang sudah ada di outlet: ${existingCategories.join(", ")}. Gunakan nama kategori tersebut jika cocok, atau buat nama kategori singkat yang sesuai jika belum ada.`
        : `Kelompokkan setiap menu ke kategori singkat yang sesuai (misal: Kopi, Non-Kopi, Makanan Berat, Camilan, Dessert).`;

    const prompt = `Ekstrak seluruh item menu yang terlihat pada foto daftar menu / papan menu / catatan menu ini.
${categoryHint}

Aturan ekstraksi:
1. Kembalikan HANYA JSON valid dengan format:
{
  "items": [
    {
      "name": "Nama Menu",
      "price": 18000,
      "category": "Nama Kategori",
      "description": "Deskripsi singkat jika ada di foto, atau string kosong"
    }
  ]
}
2. "price" HARUS berupa angka integer bersih dalam Rupiah tanpa "Rp", tanpa titik/koma (contoh: 18000). Jika tertulis "18k" atau "18rb" atau "18.0", konversi ke 18000. Jika harga buram/tidak terbaca/tidak tercantum, isi 0.
3. Jangan menggabungkan beberapa menu berbeda menjadi satu baris.
4. Jika foto bukan daftar menu atau tidak ada teks menu yang terbaca, kembalikan {"items": []}.`;

    const rawText = await callGemini(apiKey, {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    });

    const parsed = parseJsonSafe<RawAiMenuScanResponse>(rawText);
    const items = sanitizeItems(parsed?.items, existingCategories);

    return NextResponse.json({
      items,
      count: items.length,
    });
  } catch (err) {
    console.error("[AI Menu Scan] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Gagal mengekstrak menu dari foto.",
      },
      { status: 500 }
    );
  }
}
