export type OrderMode = "table" | "counter" | "hybrid";
export type SubscriptionStatus = "trial" | "active" | "expired";
export type PlanTier = "starter" | "pro" | "enterprise";
export type MenuBadge = "BESTSELLER" | "PROMO" | "BARU";
export type StockMode = "none" | "direct" | "recipe";

export type OrderStatus =
  | "pending_payment"
  | "queued"
  | "preparing"
  | "packing"
  | "ready"
  | "completed"
  | "cancelled";

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";
export type OrderSource = "qr_menu" | "walk_in" | "gofood" | "grabfood" | "shopeefood";
export type PaymentMethod = "qris" | "cash" | "ojol_platform";

export interface VariantOption {
  name: string;
  price: number;
}

export interface VariantGroup {
  group: string;
  required: boolean;
  options: VariantOption[];
}

export interface Store {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  tagline: string | null;
  logo_url: string | null;
  accent_color: string;
  banner_url: string | null;
  banner_title: string | null;
  banner_subtitle: string | null;
  show_banner: boolean;
  order_mode: OrderMode;
  wa_number: string | null;
  show_wa: boolean;
  tax_percent: number;
  service_percent: number;
  is_open: boolean;
  daily_sales_target: number;
  cash_drawer_initial: number;
  staff_pin: string;
  midtrans_server_key: string | null;
  midtrans_client_key: string | null;
  static_qris_url: string | null;
  subscription_status: SubscriptionStatus;
  plan_tier?: PlanTier | null;
  expired_at: string;
  created_at: string;
}

export interface Category {
  id: string;
  store_id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
}

export interface Menu {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  ojol_price: number | null;
  hpp?: number | null;
  image_url: string | null;
  badge: MenuBadge | null;
  is_available: boolean;
  stock_mode: StockMode;
  stock_qty: number;
  min_stock: number;
  variants: VariantGroup[];
  created_at: string;
}

export interface SelectedVariant {
  group: string;
  optionName: string;
  price: number;
}

export interface CartItem {
  cartKey: string;
  menu: Menu;
  qty: number;
  selectedVariants: SelectedVariant[];
  unitPrice: number;
  notes: string;
}

export interface Ingredient {
  id: string;
  store_id: string;
  name: string;
  unit: string;
  stock_qty: number;
  min_stock: number;
  updated_at: string;
}

export interface MenuRecipe {
  id: string;
  menu_id: string;
  ingredient_id: string;
  qty_needed: number;
}

export interface StockOpnameLog {
  id: string;
  store_id: string;
  item_name: string;
  item_type: string;
  system_qty: number;
  actual_qty: number;
  difference: number;
  notes: string | null;
  created_at: string;
}

export interface Voucher {
  id: string;
  store_id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order: number;
  is_active: boolean;
}

export interface Order {
  id: string;
  store_id: string;
  order_number: string;
  customer_name: string | null;
  table_number: string | null;
  order_type: string;
  order_source: OrderSource | string;
  payment_method: PaymentMethod | string | null;
  payment_status: PaymentStatus | string;
  order_status: OrderStatus | string;
  subtotal: number;
  tax_amount: number;
  service_amount: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  void_reason: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_id: string | null;
  menu_name: string;
  qty: number;
  unit_price: number;
  selected_variants: SelectedVariant[];
  item_notes: string | null;
  subtotal: number;
}
