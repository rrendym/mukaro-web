import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ReferralTracker } from "@/components/ReferralTracker";

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
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
    icon: "/mukaro-logo.jpg",
    shortcut: "/mukaro-logo.jpg",
    apple: "/mukaro-logo.jpg",
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
      <body className="min-h-full flex flex-col font-sans bg-[#FFFFFF] dark:bg-[#090D16] text-[#0F172A] dark:text-slate-100">
        <ThemeProvider>
          <ReferralTracker />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
