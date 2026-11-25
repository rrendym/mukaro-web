"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Banknote,
  QrCode,
  ShoppingBag,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  CartItem,
  Category,
  Menu,
  OrderSource,
  SelectedVariant,
  Store,
} from "@/types/database";
import { formatRupiah, generateOrderNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { deductOrderStock } from "@/lib/stock";
import { MenuDetailModal } from "@/components/customer/MenuDetailModal";

const ORDER_SOURCES: { key: OrderSource; label: string }[] = [
  { key: "walk_in", label: "Walk-in" },
  { key: "gofood", label: "GoFood" },
  { key: "grabfood", label: "GrabFood" },
  { key: "shopeefood", label: "ShopeeFood" },
];

export function PosCashierClient({
  store,
  categories,
  menus,
}: {
  store: Store;
  categories: Category[];
  menus: Menu[];
}) {
  const router = useRouter();
  const [mobilePane, setMobilePane] = useState<"menu" | "cart">("menu");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [orderSource, setOrderSource] = useState<OrderSource>("walk_in");
  const [walkInPayment, setWalkInPayment] = useState<"cash" | "qris">("cash");
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [variantModalMenu, setVariantModalMenu] = useState<Menu | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<string | null>(null);

  const isOjol = orderSource !== "walk_in";
  const accentColor = store.accent_color || "#C8102E";

  const getEffectiveBasePrice = (menu: Menu) => {
    if (isOjol && menu.ojol_price != null && Number(menu.ojol_price) > 0) {
      return Number(menu.ojol_price);
    }
    return Number(menu.price);
  };

  const computedCart = useMemo(() => {
    return cart.map((item) => {
      const base = getEffectiveBasePrice(item.menu);
      const extra = item.selectedVariants.reduce(
        (s, v) => s + Number(v.price || 0),
        0
      );
      return { ...item, unitPrice: base + extra };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, orderSource]);

  const filteredMenus = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menus.filter((m) => {
      const matchCat = catFilter === "all" || m.category_id === catFilter;
      const matchSearch = !q || m.name.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [menus, catFilter, search]);

  const handleMenuClick = (menu: Menu) => {
    if (!menu.is_available) return;
    if (menu.variants && menu.variants.length > 0) {
      setVariantModalMenu(menu);
    } else {
      handleAddToCart(menu, 1, [], "");
    }
  };

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
    const base = getEffectiveBasePrice(menu);
    const extra = selectedVariants.reduce((s, v) => s + Number(v.price || 0), 0);

    setCart((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        return prev.map((i) =>
          i.cartKey === cartKey ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [
        ...prev,
        { cartKey, menu, qty, selectedVariants, unitPrice: base + extra, notes },
      ];
    });
  };

  const updateQty = (cartKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.cartKey === cartKey ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const subtotal = computedCart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const taxAmount = Math.round(subtotal * (Number(store.tax_percent || 0) / 100));
  const serviceAmount = Math.round(subtotal * (Number(store.service_percent || 0) / 100));
  const grandTotal = subtotal + taxAmount + serviceAmount;

  const cashReceivedNum = Number(cashReceived || 0);
  const cashChange = Math.max(0, cashReceivedNum - grandTotal);

  const handleSubmitOrder = async () => {
    if (computedCart.length === 0) return;
    setSubmitting(true);
    setSuccessOrder(null);

    const supabase = createClient();
    const orderNumber = generateOrderNumber();
    const paymentMethod = isOjol ? "ojol_platform" : walkInPayment;

    try {
      const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .insert({
          store_id: store.id,
          order_number: orderNumber,
          customer_name:
            customerName.trim() ||
            (isOjol ? orderSource.toUpperCase() : "Walk-in"),
          table_number: tableNumber.trim() || null,
          order_type: isOjol ? "ojol" : "dine_in",
          order_source: orderSource,
          payment_method: paymentMethod,
          payment_status: "paid",
          order_status: "queued",
          subtotal,
          tax_amount: taxAmount,
          service_amount: serviceAmount,
          discount_amount: 0,
          total_amount: grandTotal,
        })
        .select("*")
        .single();

      if (orderErr || !orderData) throw orderErr;

      const itemsPayload = computedCart.map((item) => ({
        order_id: orderData.id,
        menu_id: item.menu.id,
        menu_name: item.menu.name,
        qty: item.qty,
        unit_price: item.unitPrice,
        selected_variants: item.selectedVariants,
        item_notes: item.notes || null,
        subtotal: item.unitPrice * item.qty,
      }));

      await supabase.from("order_items").insert(itemsPayload);
      await deductOrderStock(supabase, orderData.id);

      setCart([]);
      setCustomerName("");
      setTableNumber("");
      setCashReceived("");
      setSuccessOrder(orderData.order_number);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const cartItemCount = computedCart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-slate-900">
            Kasir POS &amp; Channel Ojol
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Input pesanan walk-in atau GoFood/GrabFood/ShopeeFood dengan harga otomatis.
          </p>
        </div>

        {/* Mobile pane switcher */}
        <div className="lg:hidden grid grid-cols-2 gap-1 p-1 bg-white border border-slate-200 rounded-2xl">
          <button
            type="button"
            onClick={() => setMobilePane("menu")}
            className={`py-2 px-4 rounded-xl text-xs font-semibold transition ${
              mobilePane === "menu"
                ? "bg-[#2563EB] text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pilih Menu
          </button>
          <button
            type="button"
            onClick={() => setMobilePane("cart")}
            className={`py-2 px-4 rounded-xl text-xs font-semibold transition ${
              mobilePane === "cart"
                ? "bg-[#2563EB] text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Struk ({cartItemCount})
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successOrder && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Order {successOrder} berhasil dicatat &amp; masuk antrean dapur!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT: Receipt Cart & Payment */}
        <div
          className={`lg:col-span-5 bg-white rounded-2xl border border-slate-200 flex flex-col gap-4 p-5 h-fit sticky top-6 ${
            mobilePane === "cart" ? "block" : "hidden lg:flex"
          }`}
        >
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                Struk ({orderSource.toUpperCase()})
              </h2>
            </div>
            {computedCart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Kosongkan
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Cart Items */}
            {computedCart.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Klik menu di sebelah kanan untuk menambahkan ke struk.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {computedCart.map((item) => (
                  <div
                    key={item.cartKey}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {item.menu.name}
                      </p>
                      {item.selectedVariants.length > 0 && (
                        <p className="text-[10px] text-slate-500 truncate">
                          {item.selectedVariants.map((v) => v.optionName).join(", ")}
                        </p>
                      )}
                      <p className="text-xs font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                        {formatRupiah(item.unitPrice * item.qty)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQty(item.cartKey, -1)}
                        className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-[#2563EB] transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-mono font-bold tabular-nums">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.cartKey, 1)}
                        className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-[#2563EB] transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((prev) =>
                            prev.filter((c) => c.cartKey !== item.cartKey)
                          )
                        }
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Customer / Table */}
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={isOjol ? "Kode Driver/Order" : "Nama Pelanggan"}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 transition"
              />
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="No. Meja (opsional)"
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 transition"
              />
            </div>

            {/* Walk-in Payment Method & Cash Calculator */}
            {!isOjol ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWalkInPayment("cash")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      walkInPayment === "cash"
                        ? "bg-[#2563EB] text-white border-[#2563EB]"
                        : "border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Tunai</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalkInPayment("qris")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      walkInPayment === "qris"
                        ? "bg-[#2563EB] text-white border-[#2563EB]"
                        : "border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>QRIS</span>
                  </button>
                </div>

                {walkInPayment === "cash" && (
                  <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-900">
                      Uang Diterima (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-mono font-bold tabular-nums focus:outline-none focus:border-[#2563EB]"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "Uang Pas", val: grandTotal },
                        { label: "20rb", val: 20000 },
                        { label: "50rb", val: 50000 },
                        { label: "100rb", val: 100000 },
                      ].map((q) => (
                        <button
                          key={q.label}
                          type="button"
                          onClick={() => setCashReceived(String(q.val))}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold hover:border-[#2563EB] transition"
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs font-bold pt-1">
                      <span className="text-slate-600">Kembalian:</span>
                      <span className="text-[#059669] font-mono tabular-nums">
                        {formatRupiah(cashChange)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-700 font-semibold">
                Tercatat sebagai <strong>ojol_platform</strong> (Lunas) —
                terpisah dari uang tunai laci kasir.
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-slate-200 pt-3 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatRupiah(subtotal)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Pajak ({store.tax_percent}%)</span>
                  <span className="font-mono tabular-nums">{formatRupiah(taxAmount)}</span>
                </div>
              )}
              {serviceAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Service ({store.service_percent}%)</span>
                  <span className="font-mono tabular-nums">{formatRupiah(serviceAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-slate-900 pt-1 border-t border-slate-200">
                <span>Total</span>
                <span className="font-mono tabular-nums">{formatRupiah(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            type="button"
            disabled={computedCart.length === 0 || submitting}
            onClick={handleSubmitOrder}
            className="w-full py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition active:scale-[0.99]"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span className="font-mono tabular-nums">
              Bayar {formatRupiah(grandTotal)}
            </span>
          </button>
        </div>

        {/* RIGHT: Menu Grid */}
        <div
          className={`lg:col-span-7 space-y-4 ${
            mobilePane === "menu" ? "block" : "hidden lg:block"
          }`}
        >
          {/* Order Source Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ORDER_SOURCES.map((src) => (
              <button
                key={src.key}
                type="button"
                onClick={() => setOrderSource(src.key)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition ${
                  orderSource === src.key
                    ? "bg-[#2563EB] text-white border-[#2563EB]"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                {src.label}
              </button>
            ))}
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari menu..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 transition"
              />
            </div>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#2563EB]"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredMenus.map((menu) => {
              const displayPrice = getEffectiveBasePrice(menu);
              const disabled = !menu.is_available;
              return (
                <button
                  key={menu.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleMenuClick(menu)}
                  className={`bg-white rounded-2xl p-3.5 border border-slate-200 text-left flex flex-col justify-between gap-2 transition ${
                    disabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:border-[#2563EB] active:scale-[0.98]"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 line-clamp-2">
                      {menu.name}
                    </p>
                    {isOjol && menu.ojol_price != null && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                        Harga Ojol
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold font-mono tabular-nums text-slate-900">
                      {formatRupiah(displayPrice)}
                    </span>
                    <span className="w-7 h-7 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center transition">
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {variantModalMenu && (
        <MenuDetailModal
          menu={{
            ...variantModalMenu,
            price: getEffectiveBasePrice(variantModalMenu),
          }}
          accentColor={accentColor}
          isStoreOpen={true}
          onClose={() => setVariantModalMenu(null)}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
}
