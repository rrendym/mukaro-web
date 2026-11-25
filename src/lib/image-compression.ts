/**
 * Compresses an image File in the browser using HTML5 Canvas
 * so that the resulting Blob is under targetMaxBytes (default 200KB).
 */
export async function compressImageFile(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    targetMaxBytes?: number;
  } = {}
): Promise<File> {
  const maxWidth = options.maxWidth ?? 1200;
  const maxHeight = options.maxHeight ?? 1200;
  const targetMaxBytes = options.targetMaxBytes ?? 200 * 1024; // 200KB

  const imageUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Gagal membaca file gambar."));
      el.src = imageUrl;
    });

    let width = img.naturalWidth;
    let height = img.naturalHeight;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context tidak tersedia.");
    }

    // Fill white background for transparent PNGs converted to JPEG
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.85;
    let blob = await canvasToBlob(canvas, "image/jpeg", quality);

    // Iteratively reduce quality until under 200KB
    while (blob.size > targetMaxBytes && quality > 0.25) {
      quality -= 0.1;
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }

    // If still larger than 200KB, scale dimensions down further
    if (blob.size > targetMaxBytes) {
      const scale = 0.7;
      canvas.width = Math.max(320, Math.round(width * scale));
      canvas.height = Math.max(320, Math.round(height * scale));
      const resizedCtx = canvas.getContext("2d");
      if (resizedCtx) {
        resizedCtx.fillStyle = "#FFFFFF";
        resizedCtx.fillRect(0, 0, canvas.width, canvas.height);
        resizedCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
        blob = await canvasToBlob(canvas, "image/jpeg", 0.7);
      }
    }

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Gagal mengompres gambar."));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}
