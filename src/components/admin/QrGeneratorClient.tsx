"use client";

import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode as QrIcon } from "lucide-react";
import { Store } from "@/types/database";

interface QrItem {
  label: string;
  url: string;
  dataUrl: string;
  fileName: string;
}

export function QrGeneratorClient({
  store,
  appUrl,
}: {
  store: Store;
  appUrl: string;
}) {
  const [tableCount, setTableCount] = useState(10);
  const [qrItems, setQrItems] = useState<QrItem[]>([]);

  const cleanBaseUrl = appUrl.replace(/\/+$/, "");

  const targets = useMemo(() => {
    if (store.order_mode === "table") {
      const count = Math.min(100, Math.max(1, Number(tableCount) || 1));
      return Array.from({ length: count }, (_, idx) => {
        const num = String(idx + 1).padStart(2, "0");
        return {
          label: `Meja ${num}`,
          url: `${cleanBaseUrl}/${store.slug}?meja=${num}`,
          fileName: `qr-${store.slug}-meja-${num}.png`,
        };
      });
    }
    return [
      {
        label:
          store.order_mode === "hybrid"
            ? "QR Utama (Hybrid)"
            : "QR Utama (Counter)",
        url: `${cleanBaseUrl}/${store.slug}`,
        fileName: `qr-${store.slug}.png`,
      },
    ];
  }, [store.order_mode, store.slug, tableCount, cleanBaseUrl]);

  useEffect(() => {
    let active = true;
    const generateAll = async () => {
      const generated = await Promise.all(
        targets.map(async (t) => {
          const dataUrl = await QRCode.toDataURL(t.url, {
            width: 600,
            margin: 2,
            color: {
              dark: "#1A1A1A",
              light: "#FFFFFF",
            },
          });
          return { ...t, dataUrl };
        })
      );
      if (active) setQrItems(generated);
    };
    generateAll();
    return () => {
      active = false;
    };
  }, [targets]);

  const handleDownloadPng = async (item: QrItem) => {
    // Draw a crisp printable card on canvas (QR + Store Name + Table Label)
    const canvas = document.createElement("canvas");
    canvas.width = 700;
    canvas.height = 840;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Top accent bar
    ctx.fillStyle = store.accent_color || "#C8102E";
    ctx.fillRect(0, 0, canvas.width, 20);

    // Store Name
    ctx.fillStyle = "#1A1A1A";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(store.name, canvas.width / 2, 85);

    // Label (Meja / Counter)
    ctx.fillStyle = store.accent_color || "#C8102E";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(item.label, canvas.width / 2, 132);

    // QR Image
    const img = new Image();
    img.src = item.dataUrl;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
    });
    ctx.drawImage(img, 75, 165, 550, 550);

    // Scan instruction + URL
    ctx.fillStyle = "#525252";
    ctx.font = "600 20px sans-serif";
    ctx.fillText("Scan untuk lihat menu & pesan", canvas.width / 2, 755);

    ctx.fillStyle = "#A3A3A3";
    ctx.font = "16px sans-serif";
    ctx.fillText("Powered by Mukaro", canvas.width / 2, 800);

    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = item.fileName;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            QR Code Generator
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Mode aktif:{" "}
            <span className="font-bold text-slate-900 dark:text-slate-100 uppercase">
              {store.order_mode}
            </span>
          </p>
        </div>

        {store.order_mode === "table" && (
          <div className="flex items-center gap-3 bg-white dark:bg-[#111827] px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Jumlah Meja:
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={tableCount}
              onChange={(e) => setTableCount(Number(e.target.value))}
              className="w-20 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-center font-mono tabular-nums focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        )}
      </div>

      <div
        className={`grid gap-5 ${
          store.order_mode === "table"
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            : "grid-cols-1 max-w-sm"
        }`}
      >
        {qrItems.map((item) => (
          <div
            key={item.fileName}
            className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center space-y-3 hover:border-[#2563EB] transition"
          >
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-slate-100">
              <QrIcon
                className="w-4 h-4"
                style={{ color: store.accent_color || "#C8102E" }}
              />
              <span>{item.label}</span>
            </div>

            <div className="p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]">
              <img
                src={item.dataUrl}
                alt={item.label}
                className="w-44 h-44 object-contain"
              />
            </div>

            <p className="text-[11px] text-neutral-400 break-all line-clamp-1">
              {item.url}
            </p>

            <button
              type="button"
              onClick={() => handleDownloadPng(item)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#2563EB] text-white text-xs font-extrabold hover:bg-[#1D4ED8] transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
