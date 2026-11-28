"use client";

import React, { useMemo, useState } from "react";
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
} from "lucide-react";
import {
  CartItem,
  Category,
  Menu,
  SelectedVariant,
  Store,
  Voucher,
} from "@/types/database";
import { buildWhatsAppUrl, formatRupiah } from "@/lib/format";
import { MenuDetailModal } from "./MenuDetailModal";
import { CartDrawer } from "./CartDrawer";

interface CustomerMenuClientProps {
  store: Store;
  categories: Category[];
  menus: Menu[];
  vouchers?: Voucher[];
  mejaParam?: string;
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
  const [copiedVoucherCode, setCopiedVoucherCode] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());
  const [recentOrder, setRecentOrder] = useState<{
    orderId: string;
    orderNumber: string;
    total: number;
    createdAt: string;
  } | null>(null);

  const runningBarVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (!v.is_active || !v.show_in_customer_bar) return false;
      if (v.valid_from && new Date(v.valid_from).getTime() > nowMs) return false;
      if (v.valid_until && new Date(v.valid_until).getTime() < nowMs) return false;
      return true;
    });
  }, [vouchers, nowMs]);

  const handleCopyVoucher = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedVoucherCode(code);
      setTimeout(() => setCopiedVoucherCode(null), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const accentColor = store.accent_color || "#C8102E";

  // Determine left header badge
  const tableBadgeText = useMemo(() => {
    if (store.order_mode === "table") {
      return mejaParam ? `Meja ${mejaParam}` : "Dine-in";
    }
    return "Order Counter";
  }, [store.order_mode, mejaParam]);

  // Filter menus
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Promo Running Bar */}
      {runningBarVouchers.length > 0 && (
        <div
          className="w-full text-white text-xs py-2 px-4 overflow-x-auto"
          style={{ backgroundColor: accentColor }}
        >
          <div className="max-w-5xl mx-auto flex items-center gap-3 whitespace-nowrap">
            <span className="inline-flex items-center gap-1 font-extrabold uppercase tracking-wider text-[10px] bg-white/20 px-2 py-0.5 rounded-full shrink-0">
              <TicketPercent className="w-3 h-3" />
              Promo Aktif
            </span>
            <div className="flex items-center gap-3 overflow-x-auto">
              {runningBarVouchers.map((v) => {
                const discLabel =
                  v.discount_type === "percent"
                    ? `Diskon ${v.discount_value}%`
                    : `Potongan ${formatRupiah(Number(v.discount_value))}`;
                const minLabel =
                  Number(v.min_order || 0) > 0
                    ? ` (Min. ${formatRupiah(Number(v.min_order))})`
                    : "";
                const untilLabel = v.valid_until
                  ? ` • s/d ${new Date(v.valid_until).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "";
                const isCopied = copiedVoucherCode === v.code;

                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleCopyVoucher(v.code)}
                    className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 px-3 py-1 rounded-full transition shrink-0"
                    title="Klik untuk salin kode voucher"
                  >
                    <span className="font-semibold">
                      {discLabel}
                      {minLabel}
                      {untilLabel}
                    </span>
                    <span className="font-mono font-extrabold bg-white text-slate-900 px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1">
                      {v.code}
                      {isCopied ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </span>
                    {isCopied && (
                      <span className="text-[10px] font-bold">Tersalin!</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Minimalist Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200">
        <div className="customer-sticky-header-inner max-w-5xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Table / Counter Badge */}
          <div className="flex items-center shrink-0">
            <span
              className="px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold text-white shadow-xs"
              style={{ backgroundColor: accentColor }}
            >
              {tableBadgeText}
            </span>
          </div>

          {/* Center: Store Logo, Name & Tagline */}
          <div className="flex items-center gap-2.5 min-w-0 justify-center">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: accentColor }}
              >
                {store.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 text-left">
              <h1 className="text-sm font-extrabold text-slate-900 truncate leading-tight tracking-tight">
                {store.name}
              </h1>
              {store.tagline && (
                <p className="text-[11px] text-neutral-500 truncate leading-tight">
                  {store.tagline}
                </p>
              )}
            </div>
          </div>

          {/* Right: WA, Order Status, Cart */}
          <div className="flex items-center gap-1.5 shrink-0">
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
                className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-emerald-700 hover:bg-emerald-50 transition"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={() => setIsOrderStatusOpen(true)}
              aria-label="Status Pesanan"
              className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-900 hover:bg-[#F8FAFC] transition"
            >
              <ClipboardList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label="Keranjang"
              className="relative w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-900 hover:bg-[#F8FAFC] transition"
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
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-4 pb-28 space-y-5">
        {/* Store Closed Banner */}
        {!store.is_open && (
          <div className="bg-rose-50 border border-rose-200/20 rounded-2xl p-3.5 flex items-center gap-3 text-rose-700">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold">Toko sedang tutup.</span> Pemesanan
              sementara dinonaktifkan, namun Anda tetap dapat melihat daftar menu.
            </div>
          </div>
        )}

        {/* Pill Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Cari menu di ${store.name}...`}
            className="w-full pl-11 pr-4 py-3 rounded-full bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#2563EB] transition"
          />
        </div>

        {/* Hero Promo Banner */}
        {store.show_banner && (store.banner_url || store.banner_title) && (
          <div className="relative rounded-3xl overflow-hidden bg-[#2563EB] text-white shadow-sm min-h-[150px] sm:min-h-[180px] flex items-end">
            {store.banner_url && (
              <img
                src={store.banner_url}
                alt={store.banner_title || "Promo"}
                className="absolute inset-0 w-full h-full object-cover opacity-75"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
            <div className="relative z-10 p-5 sm:p-6 max-w-xl">
              {store.banner_title && (
                <h2 className="text-lg sm:text-2xl font-extrabold leading-tight tracking-tight">
                  {store.banner_title}
                </h2>
              )}
              {store.banner_subtitle && (
                <p className="text-xs sm:text-sm text-white/90 mt-1 line-clamp-2">
                  {store.banner_subtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Horizontal Circular Categories */}
        <section>
          <div className="flex items-start gap-4 overflow-x-auto no-scrollbar py-1">
            {/* All Category */}
            <button
              type="button"
              onClick={() => setSelectedCategoryId("all")}
              className="flex flex-col items-center gap-1.5 shrink-0 group"
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center bg-white border transition ${
                  selectedCategoryId === "all"
                    ? "ring-2 ring-offset-2 ring-offset-[#F8FAFC] border-transparent"
                    : "border-slate-200 group-hover:border-[#2563EB]/30"
                }`}
                style={
                  selectedCategoryId === "all"
                    ? ({ "--tw-ring-color": accentColor } as React.CSSProperties)
                    : undefined
                }
              >
                <StoreIcon
                  className="w-6 h-6"
                  style={
                    selectedCategoryId === "all"
                      ? { color: accentColor }
                      : { color: "#525252" }
                  }
                />
              </div>
              <span
                className={`text-xs font-semibold ${
                  selectedCategoryId === "all"
                    ? "text-slate-900"
                    : "text-neutral-500"
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
                  className="flex flex-col items-center gap-1.5 shrink-0 group"
                >
                  <div
                    className={`w-14 h-14 rounded-full overflow-hidden bg-white border transition ${
                      isSelected
                        ? "ring-2 ring-offset-2 ring-offset-[#F8FAFC] border-transparent"
                        : "border-slate-200 group-hover:border-[#2563EB]/30"
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
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-neutral-500">
                        {cat.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold max-w-[70px] truncate ${
                      isSelected ? "text-slate-900" : "text-neutral-500"
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Menu Grid */}
        <section>
          {filteredMenus.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
              <p className="text-sm font-semibold text-neutral-500">
                Menu tidak ditemukan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {filteredMenus.map((menu) => {
                const outOfStock = isMenuOutOfStock(menu);
                const disabled = outOfStock || !store.is_open;
                return (
                  <div
                    key={menu.id}
                    onClick={() => {
                      if (!outOfStock) setActiveMenu(menu);
                    }}
                    className={`bg-white rounded-2xl overflow-hidden border border-slate-200 flex flex-col transition ${
                      outOfStock
                        ? "opacity-55 cursor-not-allowed"
                        : "cursor-pointer hover:border-[#2563EB]"
                    }`}
                  >
                    {/* 1:1 Photo */}
                    <div className="relative aspect-square bg-[#F8FAFC] overflow-hidden">
                      {menu.image_url ? (
                        <img
                          src={menu.image_url}
                          alt={menu.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">
                          No Image
                        </div>
                      )}

                      {/* Badge */}
                      {menu.badge && (
                        <span
                          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide text-white shadow-xs"
                          style={{ backgroundColor: accentColor }}
                        >
                          {menu.badge}
                        </span>
                      )}

                      {/* Out of stock overlay */}
                      {outOfStock && (
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                          <span className="px-3 py-1 rounded-full bg-white/95 text-slate-900 text-xs font-extrabold shadow-sm">
                            Habis
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Details */}
                    <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                          {menu.name}
                        </h3>
                        {menu.description && (
                          <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                            {menu.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-sm font-extrabold text-slate-900 font-mono tabular-nums">
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
                          className="w-8 h-8 rounded-full text-white flex items-center justify-center transition active:scale-90 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                          style={
                            !disabled
                              ? { backgroundColor: accentColor }
                              : undefined
                          }
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Subtle Powered by Mukaro Footer */}
        <footer className="pt-8 pb-4 text-center">
          <p className="text-xs text-neutral-400 font-medium">
            Powered by{" "}
            <Link
              href="/"
              className="text-neutral-500 hover:text-slate-900 font-semibold transition"
            >
              Mukaro
            </Link>
          </p>
        </footer>
      </main>

      {/* Floating Checkout Bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-xl mx-auto">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full py-3.5 px-5 rounded-full text-white shadow-xl flex items-center justify-between transition active:scale-[0.99]"
            style={{ backgroundColor: accentColor }}
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5" />
              <span className="text-sm font-bold font-mono tabular-nums">{totalItems} Item</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold font-mono tabular-nums">
                {formatRupiah(totalPrice)}
              </span>
              <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-bold">
                Checkout
              </span>
            </div>
          </button>
        </div>
      )}

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
          onOrderConfirmed={(summary) => setRecentOrder(summary)}
        />
      )}

      {/* Order Status Modal */}
      {isOrderStatusOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
          onClick={() => setIsOrderStatusOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Status Pesanan
              </h3>
              <button
                type="button"
                onClick={() => setIsOrderStatusOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F8FAFC] flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {recentOrder ? (
              <div className="p-4 rounded-2xl bg-[#F8FAFC] space-y-2">
                <p className="text-xs text-neutral-500">Pesanan Terakhir</p>
                <p className="text-base font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
                  {recentOrder.orderNumber}
                </p>
                <p className="text-sm font-semibold text-neutral-700 font-mono tabular-nums">
                  Total: {formatRupiah(recentOrder.total)}
                </p>
                <Link
                  href={`/${store.slug}/order/${recentOrder.orderId}`}
                  className="inline-block mt-1 px-4 py-2 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  Lacak Status Live &rarr;
                </Link>
              </div>
            ) : (
              <p className="text-sm text-neutral-500 py-4 text-center">
                Belum ada pesanan aktif pada sesi ini.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
