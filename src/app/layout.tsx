import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#2563EB",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://mukaro.id"),
  title: {
    default: "Mukaro — Platform QR Self-Order & POS Resto Modern",
    template: "%s | Mukaro",
  },
  description:
    "Platform SaaS multi-tenant QR Self-Order, Kasir POS, Manajemen Stok Resep, dan Pembayaran QRIS untuk kafe, restoran, dan food court di Indonesia.",
  openGraph: {
    title: "Mukaro — Ubah Antrean Kafe Jadi Transaksi Otomatis",
    description:
      "Sistem QR Self-Order, kasir POS, layar dapur live, stok bahan baku, dan pembayaran QRIS instan dengan 0% komisi transaksi.",
    url: "https://mukaro.id",
    siteName: "Mukaro",
    locale: "id_ID",
    type: "website",
  },
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%232563EB'/><path d='M7 22V10.5C7 9.67 7.67 9 8.5 9h1.6c.55 0 1.05.3 1.3.78L16 18.2l4.6-8.42c.25-.48.75-.78 1.3-.78h1.6c.83 0 1.5.67 1.5 1.5V22' stroke='%23FFFFFF' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round' fill='none'/></svg>",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#FFFFFF] text-[#0F172A]">
        {children}
      </body>
    </html>
  );
}
