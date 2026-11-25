import { Category, Menu, Store } from "@/types/database";

export const DEMO_STORE: Store = {
  id: "demo-kopi-senja-id",
  owner_id: null,
  name: "Kopi Senja",
  slug: "kopi-senja",
  tagline: "Seduh hangat setiap hari",
  logo_url:
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=200&q=80",
  accent_color: "#C8102E",
  banner_url:
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
  banner_title: "Promo Senja Hemat 20%",
  banner_subtitle:
    "Nikmati Es Kopi Susu Gula Aren + Butter Croissant hanya Rp 39.000 setiap hari pukul 15.00 - 18.00.",
  show_banner: true,
  order_mode: "table",
  wa_number: "6281234567890",
  show_wa: true,
  tax_percent: 10,
  service_percent: 5,
  is_open: true,
  daily_sales_target: 0,
  cash_drawer_initial: 0,
  staff_pin: "1234",
  midtrans_server_key: null,
  midtrans_client_key: null,
  static_qris_url: null,
  subscription_status: "active",
  expired_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
};

export const DEMO_CATEGORIES: Category[] = [
  {
    id: "cat-coffee",
    store_id: "demo-kopi-senja-id",
    name: "Coffee",
    image_url:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80",
    sort_order: 1,
  },
  {
    id: "cat-non-coffee",
    store_id: "demo-kopi-senja-id",
    name: "Non-Coffee",
    image_url:
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=300&q=80",
    sort_order: 2,
  },
  {
    id: "cat-pastry",
    store_id: "demo-kopi-senja-id",
    name: "Pastry",
    image_url:
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=300&q=80",
    sort_order: 3,
  },
  {
    id: "cat-meals",
    store_id: "demo-kopi-senja-id",
    name: "Meals",
    image_url:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80",
    sort_order: 4,
  },
];

export const DEMO_MENUS: Menu[] = [
  {
    id: "menu-1",
    store_id: "demo-kopi-senja-id",
    category_id: "cat-coffee",
    name: "Es Kopi Susu Senja",
    description:
      "Espresso house blend arabika dengan susu segar creamy dan gula aren organik pilihan.",
    price: 24000,
    ojol_price: 29000,
    image_url:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80",
    badge: "BESTSELLER",
    is_available: true,
    stock_mode: "none",
    stock_qty: 0,
    min_stock: 5,
    variants: [
      {
        group: "Suhu",
        required: true,
        options: [
          { name: "Ice", price: 0 },
          { name: "Hot", price: 0 },
        ],
      },
      {
        group: "Level Gula",
        required: true,
        options: [
          { name: "Normal", price: 0 },
          { name: "Less Sugar", price: 0 },
        ],
      },
      {
        group: "Add-on",
        required: false,
        options: [
          { name: "Extra Shot Espresso", price: 6000 },
          { name: "Oat Milk", price: 8000 },
        ],
      },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "menu-2",
    store_id: "demo-kopi-senja-id",
    category_id: "cat-coffee",
    name: "Caramel Macchiato",
    description:
      "Perpaduan espresso lembut, steamed milk, dan saus karamel rumahan yang wangi.",
    price: 28000,
    ojol_price: 34000,
    image_url:
      "https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=600&q=80",
    badge: "PROMO",
    is_available: true,
    stock_mode: "none",
    stock_qty: 0,
    min_stock: 5,
    variants: [
      {
        group: "Suhu",
        required: true,
        options: [
          { name: "Ice", price: 0 },
          { name: "Hot", price: 0 },
        ],
      },
      {
        group: "Add-on",
        required: false,
        options: [{ name: "Extra Caramel Drizzle", price: 4000 }],
      },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "menu-3",
    store_id: "demo-kopi-senja-id",
    category_id: "cat-non-coffee",
    name: "Uji Matcha Latte",
    description:
      "Pure matcha grade A dari Uji, Jepang, dikocok dengan susu segar rendah lemak.",
    price: 29000,
    ojol_price: 35000,
    image_url:
      "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
    badge: "BARU",
    is_available: true,
    stock_mode: "none",
    stock_qty: 0,
    min_stock: 5,
    variants: [
      {
        group: "Suhu",
        required: true,
        options: [
          { name: "Ice", price: 0 },
          { name: "Hot", price: 0 },
        ],
      },
      {
        group: "Add-on",
        required: false,
        options: [
          { name: "Cheese Foam", price: 6000 },
          { name: "Oat Milk", price: 8000 },
        ],
      },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "menu-4",
    store_id: "demo-kopi-senja-id",
    category_id: "cat-pastry",
    name: "French Butter Croissant",
    description:
      "Pastry renyah berlapis-lapis dipanggang segar setiap pagi dengan mentega Prancis.",
    price: 22000,
    ojol_price: 26000,
    image_url:
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    badge: "BESTSELLER",
    is_available: true,
    stock_mode: "direct",
    stock_qty: 18,
    min_stock: 5,
    variants: [
      {
        group: "Penyajian",
        required: true,
        options: [
          { name: "Hangatkan", price: 0 },
          { name: "Suhu Ruang", price: 0 },
        ],
      },
      {
        group: "Saus Pendamping",
        required: false,
        options: [
          { name: "Selai Stroberi", price: 4000 },
          { name: "Cokelat Hazelnut", price: 5000 },
        ],
      },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "menu-5",
    store_id: "demo-kopi-senja-id",
    category_id: "cat-pastry",
    name: "Pain au Chocolat",
    description:
      "Croissant lembut berisi dua batang cokelat hitam Belgia yang lumer di dalam.",
    price: 25000,
    ojol_price: 29000,
    image_url:
      "https://images.unsplash.com/photo-1530610476181-d83430b64dcd?auto=format&fit=crop&w=600&q=80",
    badge: null,
    is_available: true,
    stock_mode: "direct",
    stock_qty: 12,
    min_stock: 5,
    variants: [
      {
        group: "Penyajian",
        required: true,
        options: [
          { name: "Hangatkan", price: 0 },
          { name: "Suhu Ruang", price: 0 },
        ],
      },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "menu-6",
    store_id: "demo-kopi-senja-id",
    category_id: "cat-meals",
    name: "Chicken Katsu Donburi",
    description:
      "Nasi hangat pulen dengan ayam katsu renyah, telur setengah matang, dan saus tare spesial.",
    price: 38000,
    ojol_price: 45000,
    image_url:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
    badge: "BESTSELLER",
    is_available: true,
    stock_mode: "direct",
    stock_qty: 15,
    min_stock: 5,
    variants: [
      {
        group: "Level Pedas",
        required: true,
        options: [
          { name: "Tidak Pedas", price: 0 },
          { name: "Sedang", price: 0 },
          { name: "Pedas", price: 0 },
        ],
      },
      {
        group: "Add-on",
        required: false,
        options: [
          { name: "Extra Telur", price: 5000 },
          { name: "Extra Nasi", price: 6000 },
        ],
      },
    ],
    created_at: new Date().toISOString(),
  },
];
