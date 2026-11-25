export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function sanitizeWaNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    return "62" + digits.slice(1);
  }
  return digits;
}

export function getDaysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function generateOrderNumber(): string {
  return `MKR-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function buildWhatsAppUrl(
  waNumber: string,
  storeName: string,
  tableLabel?: string | null,
  customMessage?: string
): string {
  const cleanPhone = sanitizeWaNumber(waNumber);
  const defaultMsg = tableLabel
    ? `Halo ${storeName}, saya dari ${tableLabel} ingin bertanya mengenai pesanan.`
    : `Halo ${storeName}, saya ingin bertanya mengenai pesanan.`;
  const text = encodeURIComponent(customMessage || defaultMsg);
  return `https://wa.me/${cleanPhone}?text=${text}`;
}
