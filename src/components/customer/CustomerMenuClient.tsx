"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Search,
  ShoppingBag,
  MessageCircle,
  ClipboardList,
  Plus,
  Store as StoreIcon,
  AlertCircle,
  X,
  TicketPercent,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  CartItem,
  Category,
  Menu,
  OrderStatus,
  SelectedVariant,
  Store,
  Voucher,
} from "@/types/database";
import { buildWhatsAppUrl, formatRupiah } from "@/lib/format";
import { normalizePromoPosters } from "@/lib/promo-settings";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MenuDetailModal } from "./MenuDetailModal";
import { CartDrawer } from "./CartDrawer";

interface CustomerMenuClientProps {
  store: Store;
  categories: Category[];
  menus: Menu[];
  vouchers?: Voucher[];
  mejaParam?: string;
}

interface StoredCustomerOrder {
  orderId: string;
  orderNumber: string;
  total: number;
  createdAt: string;
  orderStatus?: OrderStatus;
}

const IN_PROGRESS_STATUSES = new Set<OrderStatus>([
  "pending_payment",
  "queued",
  "preparing",
  "packing",
  "ready",
]);

function getOrderStatusLabel(status?: OrderStatus): {
  label: string;
  tone: string;
} {
  switch (status) {
    case "pending_payment":
      return {
        label: "Menunggu Bayar",
        tone: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      };
    case "queued":
      return {
        label: "Dalam Antrean",
        tone: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      };
    case "preparing":
      return {
        label: "Sedang Dibuat",
        tone: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      };
    case "packing":
      return {
        label: "Dikemas",
        tone: "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      };
    case "ready":
      return {
        label: "Siap Diambil",
        tone: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      };
    case "completed":
      return {
        label: "Selesai",
        tone: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      };
    case "cancelled":
      return {
        label: "Dibatalkan",
        tone: "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      };
    default:
      return {
        label: "Diproses",
        tone: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      };
  }
}

export function CustomerMenuClient({
  store,
  categories,
  menus,
  vouchers = [],
  mejaParam,
}: CustomerMenuClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [activeMenu, setActiveMenu] = useState<Menu | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderStatusOpen, setIsOrderStatusOpen] = useState(false);

  // Promo modal & copy state
  const [nowMs] = useState(() => Date.now());
  const activeVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (!v.is_active) return false;
      if (v.valid_from && new Date(v.valid_from).getTime() > nowMs) return false;
      if (v.valid_until && new Date(v.valid_until).getTime() < nowMs) return false;
      return true;
    });
  }, [vouchers, nowMs]);

  const [isPromoModalOpen, setIsPromoModalOpen] = useState(
    () => activeVouchers.length > 0
  );
  const [promoIndex, setPromoIndex] = useState(0);
  const [copiedVoucherCode, setCopiedVoucherCode] = useState<string | null>(
    null
  );

  // Hero Poster Carousel state
  const posters = useMemo(
    () => normalizePromoPosters(store.promo_posters, store.banner_url),
    [store.promo_posters, store.banner_url]
  );
  const [posterIndex, setPosterIndex] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Customer Orders ("Pesanan Saya") persisted in session/device
  const ordersStorageKey = `mukaro_customer_orders_${store.id}`;
  const [customerOrders, setCustomerOrders] = useState<StoredCustomerOrder[]>(
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(ordersStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setCustomerOrders(parsed);
          }
        }
      } catch {
        // Ignore storage read errors
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ordersStorageKey]);

  const orderIdsKey = useMemo(
    () =>
      customerOrders
        .slice(0, 15)
        .map((o) => o.orderId)
        .join(","),
    [customerOrders]
  );

  // Refresh live order statuses from Supabase
  useEffect(() => {
    if (!orderIdsKey || !isSupabaseConfigured()) return;
    let active = true;
    const ids = orderIdsKey.split(",").filter(Boolean);

    const syncStatuses = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("orders")
          .select("id, order_status")
          .in("id", ids);

        if (!active || !data) return;
        const statusMap = new Map<string, OrderStatus>();
        for (const row of data) {
          statusMap.set(row.id, row.order_status as OrderStatus);
        }
        setCustomerOrders((prev) => {
          let changed = false;
          const next = prev.map((item) => {
            const live = statusMap.get(item.orderId);
            if (live && live !== item.orderStatus) {
              changed = true;
              return { ...item, orderStatus: live };
            }
            return item;
          });
          if (changed && typeof window !== "undefined") {
            try {
              window.localStorage.setItem(
                ordersStorageKey,
                JSON.stringify(next)
              );
            } catch {
              // Ignore
            }
          }
          return changed ? next : prev;
        });
      } catch {
        // Ignore network errors
      }
    };

    syncStatuses();
    const timer = setInterval(syncStatuses, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [orderIdsKey, ordersStorageKey, isOrderStatusOpen]);

  // Auto-slide Hero Poster Carousel
  useEffect(() => {
    if (posters.length <= 1 || isCarouselPaused) return;
    const timer = setInterval(() => {
      setPosterIndex((prev) => (prev + 1) % posters.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [posters.length, isCarouselPaused]);

  // Lock body scroll for Promo Modal or Pesanan Saya Modal
  useEffect(() => {
    if (!isPromoModalOpen && !isOrderStatusOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPromoModalOpen(false);
        setIsOrderStatusOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isPromoModalOpen, isOrderStatusOpen]);

  const activePromo =
    activeVouchers.length > 0
      ? activeVouchers[promoIndex % activeVouchers.length]
      : null;

  const hasInProgressOrder = useMemo(
    () =>
      customerOrders.some(
        (o) => !o.orderStatus || IN_PROGRESS_STATUSES.has(o.orderStatus)
      ),
    [customerOrders]
  );

  const handleCopyVoucher = async (code: string) => {
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setCopiedVoucherCode(code);
      setTimeout(() => setCopiedVoucherCode(null), 2000);
    }
  };

  const accentColor = store.accent_color || "#C8102E";

  const tableBadgeText = useMemo(() => {
    if (store.order_mode === "table") {
      return mejaParam ? `Meja ${mejaParam}` : "Dine-in";
    }
    return "Order Counter";
  }, [store.order_mode, mejaParam]);

  const filteredMenus = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menus.filter((menu) => {
      const matchCat =
        selectedCategoryId === "all" || menu.category_id === selectedCategoryId;
      const matchSearch =
        !q ||
        menu.name.toLowerCase().includes(q) ||
        (menu.description || "").toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [menus, selectedCategoryId, searchQuery]);

  const handleAddToCart = (
    menu: Menu,
    qty: number,
    selectedVariants: SelectedVariant[],
    notes: string
  ) => {
    if (!store.is_open) return;
    const variantKey = selectedVariants
      .map((v) => `${v.group}:${v.optionName}`)
      .sort()
      .join("|");
    const cartKey = `${menu.id}__${variantKey}__${notes}`;
    const extraPrice = selectedVariants.reduce(
      (sum, v) => sum + (v.price || 0),
      0
    );
    const unitPrice = Number(menu.price) + extraPrice;

    setCart((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        return prev.map((i) =>
          i.cartKey === cartKey ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [
        ...prev,
        { cartKey, menu, qty, selectedVariants, unitPrice, notes },
      ];
    });
  };

  const handleUpdateQty = (cartKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartKey === cartKey
            ? { ...item, qty: item.qty + delta }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const handleRemoveItem = (cartKey: string) => {
    setCart((prev) => prev.filter((item) => item.cartKey !== cartKey));
  };

  const handleOrderConfirmed = (summary: {
    orderId: string;
    orderNumber: string;
    total: number;
    createdAt: string;
  }) => {
    const newEntry: StoredCustomerOrder = {
      ...summary,
      orderStatus: "pending_payment",
    };
    setCustomerOrders((prev) => {
      const next = [
        newEntry,
        ...prev.filter((o) => o.orderId !== summary.orderId),
      ].slice(0, 15);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(ordersStorageKey, JSON.stringify(next));
        } catch {
          // Ignore
        }
      }
      return next;
    });
  };

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.qty,
    0
  );

  const isMenuOutOfStock = (menu: Menu) => {
    if (!menu.is_available) return true;
    if (menu.stock_mode === "direct" && menu.stock_qty <= 0) return true;
    return false;
  };

  const safePosterIndex =
    posters.length > 0 ? posterIndex % posters.length : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Compact Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="customer-sticky-header-inner max-w-5xl mx-auto px-3 sm:px-5 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Store Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
            ) : (
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-xs"
                style={{ backgroundColor: accentColor }}
              >
                {store.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 truncate leading-tight tracking-tight">
                {store.name}
              </h1>
              <span
                className={`mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold leading-none border ${
                  store.is_open
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    store.is_open ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                {store.is_open ? "Toko Buka" : "Toko Tutup"}
              </span>
            </div>
          </div>

          {/* Right: Table Badge, Promo Chip, WA, Theme, Cart */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-xs"
              style={{ backgroundColor: accentColor }}
            >
              {tableBadgeText}
            </span>

            {activeVouchers.length > 0 && (
              <button
                type="button"
                onClick={() => setIsPromoModalOpen(true)}
                aria-label="Lihat Promo Aktif"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px] font-extrabold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
              >
                <TicketPercent className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Promo</span>
              </button>
            )}

            {store.show_wa && store.wa_number && (
              <a
                href={buildWhatsAppUrl(
                  store.wa_number,
                  store.name,
                  tableBadgeText
                )}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Hubungi WhatsApp Resto"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white dark:bg-[#090D16] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            )}

            <ThemeToggle />

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label="Keranjang"
              className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white dark:bg-[#090D16] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <ShoppingBag className="w-4 h-4" />
              {totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center font-mono tabular-nums"
                  style={{ backgroundColor: accentColor }}
                >
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-5 pt-4 pb-28 space-y-4 sm:space-y-5">
        {/* Store Closed Guard Banner */}
        {!store.is_open && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-3.5 flex items-center gap-3 text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="text-xs sm:text-sm leading-snug">
              <span className="font-extrabold">Toko sedang tutup.</span>{" "}
              Anda tetap dapat melihat daftar menu, namun tombol tambah dan
              checkout sementara dinonaktifkan.
            </div>
          </div>
        )}

        {/* Pill Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 dark:text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Cari menu favorit di ${store.name}...`}
            className="w-full pl-11 pr-10 py-2.5 sm:py-3 rounded-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-neutral-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#2563EB] shadow-xs transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Hapus pencarian"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Auto-Sliding Hero Promo Poster Carousel (no voucher text overlaid) */}
        {posters.length > 0 && (
          <section
            aria-label="Poster Promo"
            onMouseEnter={() => setIsCarouselPaused(true)}
            onMouseLeave={() => setIsCarouselPaused(false)}
            onTouchStart={(e) => {
              setIsCarouselPaused(true);
              touchStartX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              const startX = touchStartX.current;
              const endX = e.changedTouches[0]?.clientX ?? null;
              if (startX !== null && endX !== null && posters.length > 1) {
                const diff = startX - endX;
                if (Math.abs(diff) > 40) {
                  setPosterIndex((prev) =>
                    diff > 0
                      ? (prev + 1) % posters.length
                      : (prev - 1 + posters.length) % posters.length
                  );
                }
              }
              touchStartX.current = null;
              setIsCarouselPaused(false);
            }}
            className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800 shadow-sm group"
          >
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${safePosterIndex * 100}%)`,
              }}
            >
              {posters.map((posterUrl, idx) => (
                <div
                  key={`${posterUrl}-${idx}`}
                  className="w-full shrink-0 aspect-[16/7] sm:aspect-[16/6] max-h-[260px] bg-slate-100 dark:bg-[#111827]"
                >
                  <img
                    src={posterUrl}
                    alt={`Poster Promo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            {posters.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setPosterIndex(
                      (prev) => (prev - 1 + posters.length) % posters.length
                    )
                  }
                  aria-label="Poster sebelumnya"
                  className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 hover:bg-black/65 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPosterIndex((prev) => (prev + 1) % posters.length)
                  }
                  aria-label="Poster berikutnya"
                  className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 hover:bg-black/65 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-xs">
                  {posters.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPosterIndex(idx)}
                      aria-label={`Slide ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === safePosterIndex
                          ? "w-5 bg-white"
                          : "w-1.5 bg-white/55 hover:bg-white/80"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* Horizontal Circular Categories with Generous Padding (No Ring Clipping) */}
        <section>
          <div className="flex items-start gap-2.5 sm:gap-3.5 overflow-x-auto no-scrollbar py-2.5 px-2 -mx-2">
            {/* All Category */}
            <button
              type="button"
              onClick={() => setSelectedCategoryId("all")}
              className="flex flex-col items-center gap-1.5 shrink-0 min-w-[64px] sm:min-w-[72px] group"
            >
              <div
                className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-white dark:bg-[#111827] border transition ${
                  selectedCategoryId === "all"
                    ? "ring-2 ring-offset-2 ring-offset-[#F8FAFC] dark:ring-offset-[#090D16] border-transparent shadow-sm"
                    : "border-slate-200 dark:border-slate-800 group-hover:border-[#2563EB]/40"
                }`}
                style={
                  selectedCategoryId === "all"
                    ? ({ "--tw-ring-color": accentColor } as React.CSSProperties)
                    : undefined
                }
              >
                <StoreIcon
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  style={
                    selectedCategoryId === "all"
                      ? { color: accentColor }
                      : undefined
                  }
                />
              </div>
              <span
                className={`text-[11px] sm:text-xs font-semibold text-center leading-tight whitespace-nowrap ${
                  selectedCategoryId === "all"
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-neutral-500 dark:text-slate-400"
                }`}
              >
                Semua
              </span>
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className="flex flex-col items-center gap-1.5 shrink-0 min-w-[64px] sm:min-w-[72px] group"
                >
                  <div
                    className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-white dark:bg-[#111827] border transition ${
                      isSelected
                        ? "ring-2 ring-offset-2 ring-offset-[#F8FAFC] dark:ring-offset-[#090D16] border-transparent shadow-sm"
                        : "border-slate-200 dark:border-slate-800 group-hover:border-[#2563EB]/40"
                    }`}
                    style={
                      isSelected
                        ? ({
                            "--tw-ring-color": accentColor,
                          } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-neutral-500 dark:text-slate-400">
                        {cat.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs font-semibold text-center leading-tight whitespace-nowrap ${
                      isSelected
                        ? "text-slate-900 dark:text-slate-100"
                        : "text-neutral-500 dark:text-slate-400"
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Responsive Menu Grid */}
        <section>
          {filteredMenus.length === 0 ? (
            <div className="bg-white dark:bg-[#111827] rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800">
              <p className="text-sm font-semibold text-neutral-500 dark:text-slate-400">
                Menu tidak ditemukan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredMenus.map((menu) => {
                const outOfStock = isMenuOutOfStock(menu);
                const disabled = outOfStock || !store.is_open;
                return (
                  <div
                    key={menu.id}
                    onClick={() => {
                      if (!outOfStock) setActiveMenu(menu);
                    }}
                    className={`bg-white dark:bg-[#111827] rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 flex flex-col shadow-xs transition ${
                      outOfStock
                        ? "opacity-60 cursor-not-allowed"
                        : "cursor-pointer hover:border-[#2563EB] hover:shadow-md"
                    }`}
                  >
                    {/* 1:1 Photo */}
                    <div className="relative aspect-square bg-slate-100 dark:bg-[#090D16] overflow-hidden">
                      {menu.image_url ? (
                        <img
                          src={menu.image_url}
                          alt={menu.name}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400 dark:text-slate-600">
                          No Image
                        </div>
                      )}

                      {menu.badge && (
                        <span
                          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide text-white shadow-xs"
                          style={{ backgroundColor: accentColor }}
                        >
                          {menu.badge}
                        </span>
                      )}

                      {outOfStock && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="px-3 py-1 rounded-full bg-white/95 dark:bg-[#111827]/95 text-slate-900 dark:text-slate-100 text-xs font-extrabold shadow-sm">
                            Habis
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Details */}
                    <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-1">
                          {menu.name}
                        </h3>
                        {menu.description && (
                          <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {menu.description}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                            {formatRupiah(Number(menu.price))}
                          </span>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!disabled) setActiveMenu(menu);
                            }}
                            aria-label={`Tambah ${menu.name}`}
                            className="w-8 h-8 rounded-full text-white flex items-center justify-center transition active:scale-90 disabled:bg-neutral-300 dark:disabled:bg-slate-700 disabled:text-neutral-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed shrink-0"
                            style={
                              !disabled
                                ? { backgroundColor: accentColor }
                                : undefined
                            }
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        {!store.is_open && (
                          <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                            Toko sedang tutup
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Subtle Powered by Mukaro Footer */}
        <footer className="pt-6 pb-4 text-center">
          <p className="text-xs text-neutral-400 dark:text-slate-500 font-medium">
            Powered by{" "}
            <Link
              href="/"
              className="text-neutral-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-semibold transition"
            >
              Mukaro
            </Link>
          </p>
        </footer>
      </main>

      {/* Persistent Bottom Bar: "Pesanan Saya" + Cart / Checkout */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-5xl mx-auto px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2.5">
          {/* Pesanan Saya Button with Small Processing Dot (no count number) */}
          <button
            type="button"
            onClick={() => setIsOrderStatusOpen(true)}
            className="relative inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 hover:border-[#2563EB] transition shrink-0"
          >
            <span className="relative inline-flex">
              <ClipboardList className="w-4 h-4 text-[#2563EB]" />
              {hasInProgressOrder && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#090D16] animate-pulse"
                  aria-label="Ada pesanan sedang diproses"
                />
              )}
            </span>
            <span>Pesanan Saya</span>
          </button>

          {/* Checkout / Cart Button */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            disabled={totalItems === 0 || !store.is_open}
            className="flex-1 sm:flex-none sm:min-w-[240px] py-2.5 px-4 rounded-full text-white shadow-md flex items-center justify-between gap-3 transition active:scale-[0.99] disabled:opacity-55 disabled:cursor-not-allowed"
            style={{
              backgroundColor:
                totalItems > 0 && store.is_open ? accentColor : "#64748B",
            }}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span className="text-xs sm:text-sm font-bold font-mono tabular-nums">
                {!store.is_open
                  ? "Toko Tutup"
                  : totalItems > 0
                    ? `${totalItems} Item`
                    : "Keranjang"}
              </span>
            </div>
            <span className="text-xs sm:text-sm font-extrabold font-mono tabular-nums">
              {totalItems > 0 ? formatRupiah(totalPrice) : "Pilih Menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Menu Detail Modal */}
      {activeMenu && (
        <MenuDetailModal
          menu={activeMenu}
          accentColor={accentColor}
          isStoreOpen={store.is_open}
          onClose={() => setActiveMenu(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Cart Summary Drawer */}
      {isCartOpen && (
        <CartDrawer
          store={store}
          cart={cart}
          mejaParam={mejaParam}
          tableLabel={tableBadgeText}
          onClose={() => setIsCartOpen(false)}
          onUpdateQty={handleUpdateQty}
          onRemoveItem={handleRemoveItem}
          onClearCart={() => setCart([])}
          onOrderConfirmed={handleOrderConfirmed}
        />
      )}

      {/* Floating Promo Modal with Backdrop Blur */}
      {isPromoModalOpen &&
        activePromo &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm"
            onClick={() => setIsPromoModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Promo Spesial"
          >
            <div
              className="w-full max-w-sm max-h-[88dvh] flex flex-col overflow-hidden bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Promo Accent Header */}
              <div
                className="px-5 py-4 text-white flex items-center justify-between shrink-0"
                style={{ backgroundColor: accentColor }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-extrabold uppercase tracking-wider">
                    Promo Spesial {store.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(false)}
                  aria-label="Tutup modal promo"
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Promo Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                <div className="text-center space-y-1.5">
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    {activePromo.discount_type === "percent"
                      ? `Diskon ${activePromo.discount_value}%`
                      : `Potongan ${formatRupiah(
                          Number(activePromo.discount_value)
                        )}`}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-slate-400">
                    {Number(activePromo.min_order || 0) > 0
                      ? `Minimal belanja ${formatRupiah(
                          Number(activePromo.min_order)
                        )}`
                      : "Tanpa minimal belanja"}
                  </p>
                  {activePromo.valid_until && (
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Berlaku s/d{" "}
                      {new Date(activePromo.valid_until).toLocaleString(
                        "id-ID",
                        {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  )}
                </div>

                {/* Code & 1-Tap Copy */}
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#090D16] border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between gap-2">
                  <span className="font-mono text-base font-extrabold tracking-widest text-slate-900 dark:text-slate-100">
                    {activePromo.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyVoucher(activePromo.code)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-extrabold text-white transition shadow-xs shrink-0"
                    style={{ backgroundColor: accentColor }}
                  >
                    {copiedVoucherCode === activePromo.code ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Kode</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Multi-promo switcher */}
                {activeVouchers.length > 1 && (
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setPromoIndex(
                          (i) =>
                            (i - 1 + activeVouchers.length) %
                            activeVouchers.length
                        )
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Sebelumnya</span>
                    </button>
                    <span className="text-xs font-mono text-neutral-500 dark:text-slate-400">
                      {(promoIndex % activeVouchers.length) + 1}/
                      {activeVouchers.length}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPromoIndex((i) => (i + 1) % activeVouchers.length)
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <span>Berikutnya</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Pesanan Saya Modal */}
      {isOrderStatusOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4"
            onClick={() => setIsOrderStatusOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Pesanan Saya"
          >
            <div
              className="w-full max-w-md max-h-[85dvh] flex flex-col overflow-hidden bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Pesanan Saya
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOrderStatusOpen(false)}
                  aria-label="Tutup Pesanan Saya"
                  className="w-8 h-8 rounded-full bg-[#F8FAFC] dark:bg-[#090D16] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3">
                {customerOrders.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-slate-400 py-8 text-center">
                    Belum ada pesanan pada sesi ini.
                  </p>
                ) : (
                  customerOrders.map((order) => {
                    const statusBadge = getOrderStatusLabel(order.orderStatus);
                    return (
                      <div
                        key={order.orderId}
                        className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#090D16] border border-slate-200 dark:border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                            {order.orderNumber}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.tone}`}
                          >
                            {statusBadge.label}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-neutral-600 dark:text-slate-300 font-mono tabular-nums">
                          Total: {formatRupiah(order.total)}
                        </p>
                        <Link
                          href={`/${store.slug}/order/${order.orderId}`}
                          className="inline-block mt-1 px-4 py-2 rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: accentColor }}
                        >
                          Lacak Status Live &rarr;
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
