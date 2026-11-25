-- ============================================================================
-- MUKARO (mukaro.id) - Multi-Tenant SaaS QR Self-Order & POS Resto
-- Supabase PostgreSQL Schema, RLS Policies, Storage & Seed Data (Tahap 1)
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. CORE MULTI-TENANT TABLES
-- ============================================================================

-- Stores (Tenants)
CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  tagline text,
  logo_url text,
  accent_color text DEFAULT '#C8102E',
  banner_url text,
  banner_title text,
  banner_subtitle text,
  show_banner boolean DEFAULT true,
  order_mode text CHECK (order_mode IN ('table', 'counter', 'hybrid')) DEFAULT 'table',
  wa_number text,
  show_wa boolean DEFAULT false,
  tax_percent numeric DEFAULT 0,
  service_percent numeric DEFAULT 0,
  is_open boolean DEFAULT true,
  daily_sales_target numeric DEFAULT 0,
  cash_drawer_initial numeric DEFAULT 0,
  staff_pin text DEFAULT '1234',
  midtrans_server_key text,
  midtrans_client_key text,
  static_qris_url text,
  subscription_status text CHECK (subscription_status IN ('trial', 'active', 'expired')) DEFAULT 'trial',
  expired_at timestamptz DEFAULT (now() + interval '14 days'),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS static_qris_url text;

CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON public.stores(owner_id);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  image_url text,
  sort_order int DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_categories_store_id ON public.categories(store_id);

-- Menus
CREATE TABLE IF NOT EXISTS public.menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  ojol_price numeric,
  image_url text,
  badge text CHECK (badge IS NULL OR badge IN ('BESTSELLER', 'PROMO', 'BARU')),
  is_available boolean DEFAULT true,
  stock_mode text CHECK (stock_mode IN ('none', 'direct', 'recipe')) DEFAULT 'none',
  stock_qty int DEFAULT 0,
  min_stock int DEFAULT 5,
  variants jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menus_store_id ON public.menus(store_id);
CREATE INDEX IF NOT EXISTS idx_menus_category_id ON public.menus(category_id);

-- ============================================================================
-- 2. SUPPORTING TABLES FOR TAHAP 2 (POS, INVENTORY, VOUCHERS, ORDERS)
-- ============================================================================

-- Ingredients
CREATE TABLE IF NOT EXISTS public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'gram',
  stock_qty numeric DEFAULT 0,
  min_stock numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Menu Recipes
CREATE TABLE IF NOT EXISTS public.menu_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  qty_needed numeric NOT NULL DEFAULT 1
);

-- Stock Opname Logs
CREATE TABLE IF NOT EXISTS public.stock_opname_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  item_type text NOT NULL,
  system_qty numeric NOT NULL DEFAULT 0,
  actual_qty numeric NOT NULL DEFAULT 0,
  difference numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Vouchers
CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text CHECK (discount_type IN ('percent', 'fixed')) DEFAULT 'percent',
  discount_value numeric NOT NULL DEFAULT 0,
  min_order numeric DEFAULT 0,
  is_active boolean DEFAULT true
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  customer_name text,
  table_number text,
  order_type text DEFAULT 'dine_in',
  order_source text DEFAULT 'qr_menu',
  payment_method text,
  payment_status text DEFAULT 'unpaid',
  order_status text DEFAULT 'pending',
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  service_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  void_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS void_reason text;

CREATE INDEX IF NOT EXISTS idx_orders_store_created_at ON public.orders(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_store_status ON public.orders(store_id, order_status);

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_id uuid REFERENCES public.menus(id) ON DELETE SET NULL,
  menu_name text NOT NULL,
  qty int NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  selected_variants jsonb DEFAULT '[]'::jsonb,
  item_notes text,
  subtotal numeric NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opname_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- STORES: Public read, authenticated owner can insert/update/delete own store
DROP POLICY IF EXISTS "Public can view stores" ON public.stores;
CREATE POLICY "Public can view stores"
  ON public.stores FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create their own store" ON public.stores;
CREATE POLICY "Authenticated users can create their own store"
  ON public.stores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their own store" ON public.stores;
CREATE POLICY "Owners can update their own store"
  ON public.stores FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete their own store" ON public.stores;
CREATE POLICY "Owners can delete their own store"
  ON public.stores FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Superadmin can manage all stores" ON public.stores;
CREATE POLICY "Superadmin can manage all stores"
  ON public.stores FOR ALL
  TO authenticated
  USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'rendyca03@gmail.com')
  WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'rendyca03@gmail.com');

-- CATEGORIES: Public read, store owner can insert/update/delete
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
  ON public.categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Owners can manage their categories" ON public.categories;
CREATE POLICY "Owners can manage their categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = categories.store_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = categories.store_id AND s.owner_id = auth.uid()
    )
  );

-- MENUS: Public read, store owner can insert/update/delete
DROP POLICY IF EXISTS "Public can view menus" ON public.menus;
CREATE POLICY "Public can view menus"
  ON public.menus FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Owners can manage their menus" ON public.menus;
CREATE POLICY "Owners can manage their menus"
  ON public.menus FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = menus.store_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = menus.store_id AND s.owner_id = auth.uid()
    )
  );

-- TAHAP 2 TABLES: Store owner can manage their own store's records
DROP POLICY IF EXISTS "Owners can manage ingredients" ON public.ingredients;
CREATE POLICY "Owners can manage ingredients"
  ON public.ingredients FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = ingredients.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = ingredients.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can manage menu_recipes" ON public.menu_recipes;
CREATE POLICY "Owners can manage menu_recipes"
  ON public.menu_recipes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.menus m
      JOIN public.stores s ON s.id = m.store_id
      WHERE m.id = menu_recipes.menu_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menus m
      JOIN public.stores s ON s.id = m.store_id
      WHERE m.id = menu_recipes.menu_id AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can manage stock_opname_logs" ON public.stock_opname_logs;
CREATE POLICY "Owners can manage stock_opname_logs"
  ON public.stock_opname_logs FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = stock_opname_logs.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = stock_opname_logs.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Public can view active vouchers" ON public.vouchers;
CREATE POLICY "Public can view active vouchers"
  ON public.vouchers FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Owners can manage vouchers" ON public.vouchers;
CREATE POLICY "Owners can manage vouchers"
  ON public.vouchers FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = vouchers.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = vouchers.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
CREATE POLICY "Public can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
CREATE POLICY "Public can view orders"
  ON public.orders FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can update pending orders" ON public.orders;
CREATE POLICY "Public can update pending orders"
  ON public.orders FOR UPDATE
  USING (payment_status = 'pending')
  WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can manage orders" ON public.orders;
CREATE POLICY "Owners can manage orders"
  ON public.orders FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = orders.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = orders.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Public can create order_items" ON public.order_items;
CREATE POLICY "Public can create order_items"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view order_items" ON public.order_items;
CREATE POLICY "Public can view order_items"
  ON public.order_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Owners can manage order_items" ON public.order_items;
CREATE POLICY "Owners can manage order_items"
  ON public.order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.stores s ON s.id = o.store_id
      WHERE o.id = order_items.order_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.stores s ON s.id = o.store_id
      WHERE o.id = order_items.order_id AND s.owner_id = auth.uid()
    )
  );

-- Enable Realtime for orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

-- Atomic Stock Deduction & Restoration RPCs (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.deduct_order_stock(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_menu RECORD;
  v_recipe RECORD;
  v_new_qty numeric;
BEGIN
  FOR v_item IN
    SELECT menu_id, qty FROM public.order_items WHERE order_id = p_order_id AND menu_id IS NOT NULL
  LOOP
    SELECT id, stock_mode, stock_qty INTO v_menu FROM public.menus WHERE id = v_item.menu_id;
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    IF v_menu.stock_mode = 'direct' THEN
      v_new_qty := GREATEST(0, COALESCE(v_menu.stock_qty, 0) - v_item.qty);
      UPDATE public.menus
      SET stock_qty = v_new_qty,
          is_available = CASE WHEN v_new_qty <= 0 THEN false ELSE is_available END
      WHERE id = v_menu.id;
    ELSIF v_menu.stock_mode = 'recipe' THEN
      FOR v_recipe IN
        SELECT ingredient_id, qty_needed FROM public.menu_recipes WHERE menu_id = v_menu.id
      LOOP
        UPDATE public.ingredients
        SET stock_qty = GREATEST(0, COALESCE(stock_qty, 0) - (v_recipe.qty_needed * v_item.qty)),
            updated_at = now()
        WHERE id = v_recipe.ingredient_id;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_order_stock(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_menu RECORD;
  v_recipe RECORD;
  v_new_qty numeric;
BEGIN
  FOR v_item IN
    SELECT menu_id, qty FROM public.order_items WHERE order_id = p_order_id AND menu_id IS NOT NULL
  LOOP
    SELECT id, stock_mode, stock_qty INTO v_menu FROM public.menus WHERE id = v_item.menu_id;
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    IF v_menu.stock_mode = 'direct' THEN
      v_new_qty := COALESCE(v_menu.stock_qty, 0) + v_item.qty;
      UPDATE public.menus
      SET stock_qty = v_new_qty,
          is_available = CASE WHEN v_new_qty > 0 THEN true ELSE is_available END
      WHERE id = v_menu.id;
    ELSIF v_menu.stock_mode = 'recipe' THEN
      FOR v_recipe IN
        SELECT ingredient_id, qty_needed FROM public.menu_recipes WHERE menu_id = v_menu.id
      LOOP
        UPDATE public.ingredients
        SET stock_qty = COALESCE(stock_qty, 0) + (v_recipe.qty_needed * v_item.qty),
            updated_at = now()
        WHERE id = v_recipe.ingredient_id;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- 4. STORAGE BUCKETS & POLICIES ('stores', 'menus', 'store-assets')
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('stores', 'stores', true),
  ('menus', 'menus', true),
  ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read access for stores and menus buckets" ON storage.objects;
CREATE POLICY "Public read access for stores and menus buckets"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('stores', 'menus', 'store-assets'));

DROP POLICY IF EXISTS "Authenticated users can upload to stores and menus buckets" ON storage.objects;
CREATE POLICY "Authenticated users can upload to stores and menus buckets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('stores', 'menus', 'store-assets'));

DROP POLICY IF EXISTS "Authenticated users can update stores and menus buckets" ON storage.objects;
CREATE POLICY "Authenticated users can update stores and menus buckets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('stores', 'menus', 'store-assets'));

DROP POLICY IF EXISTS "Authenticated users can delete stores and menus buckets" ON storage.objects;
CREATE POLICY "Authenticated users can delete stores and menus buckets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id IN ('stores', 'menus', 'store-assets'));

-- ============================================================================
-- 5. SEED DATA DEMO ('kopi-senja')
-- ============================================================================

DO $$
DECLARE
  v_store_id uuid;
  v_cat_coffee uuid;
  v_cat_non_coffee uuid;
  v_cat_pastry uuid;
  v_cat_meals uuid;
BEGIN
  -- Insert demo store if not exists
  INSERT INTO public.stores (
    name,
    slug,
    tagline,
    logo_url,
    accent_color,
    banner_url,
    banner_title,
    banner_subtitle,
    show_banner,
    order_mode,
    wa_number,
    show_wa,
    tax_percent,
    service_percent,
    is_open,
    subscription_status,
    expired_at
  )
  VALUES (
    'Kopi Senja',
    'kopi-senja',
    'Seduh hangat setiap hari',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=200&q=80',
    '#C8102E',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
    'Promo Senja Hemat 20%',
    'Nikmati Es Kopi Susu Gula Aren + Butter Croissant hanya Rp 39.000 setiap hari pukul 15.00 - 18.00.',
    true,
    'table',
    '6281234567890',
    true,
    10,
    5,
    true,
    'active',
    now() + interval '365 days'
  )
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_store_id FROM public.stores WHERE slug = 'kopi-senja';

  -- Seed categories only if store has none yet
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE store_id = v_store_id) THEN
    INSERT INTO public.categories (store_id, name, image_url, sort_order)
    VALUES (v_store_id, 'Coffee', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80', 1)
    RETURNING id INTO v_cat_coffee;

    INSERT INTO public.categories (store_id, name, image_url, sort_order)
    VALUES (v_store_id, 'Non-Coffee', 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=300&q=80', 2)
    RETURNING id INTO v_cat_non_coffee;

    INSERT INTO public.categories (store_id, name, image_url, sort_order)
    VALUES (v_store_id, 'Pastry', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=300&q=80', 3)
    RETURNING id INTO v_cat_pastry;

    INSERT INTO public.categories (store_id, name, image_url, sort_order)
    VALUES (v_store_id, 'Meals', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80', 4)
    RETURNING id INTO v_cat_meals;

    -- Seed 6 demo menus
    INSERT INTO public.menus (store_id, category_id, name, description, price, ojol_price, image_url, badge, is_available, stock_mode, stock_qty, min_stock, variants)
    VALUES
    (
      v_store_id,
      v_cat_coffee,
      'Es Kopi Susu Senja',
      'Espresso house blend arabika dengan susu segar creamy dan gula aren organik pilihan.',
      24000,
      29000,
      'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80',
      'BESTSELLER',
      true,
      'none',
      0,
      5,
      '[
        {"group": "Suhu", "required": true, "options": [{"name": "Ice", "price": 0}, {"name": "Hot", "price": 0}]},
        {"group": "Level Gula", "required": true, "options": [{"name": "Normal", "price": 0}, {"name": "Less Sugar", "price": 0}]},
        {"group": "Add-on", "required": false, "options": [{"name": "Extra Shot Espresso", "price": 6000}, {"name": "Oat Milk", "price": 8000}]}
      ]'::jsonb
    ),
    (
      v_store_id,
      v_cat_coffee,
      'Caramel Macchiato',
      'Perpaduan espresso lembut, steamed milk, dan saus karamel rumahan yang wangi.',
      28000,
      34000,
      'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=600&q=80',
      'PROMO',
      true,
      'none',
      0,
      5,
      '[
        {"group": "Suhu", "required": true, "options": [{"name": "Ice", "price": 0}, {"name": "Hot", "price": 0}]},
        {"group": "Add-on", "required": false, "options": [{"name": "Extra Caramel Drizzle", "price": 4000}]}
      ]'::jsonb
    ),
    (
      v_store_id,
      v_cat_non_coffee,
      'Uji Matcha Latte',
      'Pure matcha grade A dari Uji, Jepang, dikocok dengan susu segar rendah lemak.',
      29000,
      35000,
      'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80',
      'BARU',
      true,
      'none',
      0,
      5,
      '[
        {"group": "Suhu", "required": true, "options": [{"name": "Ice", "price": 0}, {"name": "Hot", "price": 0}]},
        {"group": "Add-on", "required": false, "options": [{"name": "Cheese Foam", "price": 6000}, {"name": "Oat Milk", "price": 8000}]}
      ]'::jsonb
    ),
    (
      v_store_id,
      v_cat_pastry,
      'French Butter Croissant',
      'Pastry renyah berlapis-lapis dipanggang segar setiap pagi dengan mentega Prancis.',
      22000,
      26000,
      'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
      'BESTSELLER',
      true,
      'direct',
      18,
      5,
      '[
        {"group": "Penyajian", "required": true, "options": [{"name": "Hangatkan", "price": 0}, {"name": "Suhu Ruang", "price": 0}]},
        {"group": "Saus Pendamping", "required": false, "options": [{"name": "Selai Stroberi", "price": 4000}, {"name": "Cokelat Hazelnut", "price": 5000}]}
      ]'::jsonb
    ),
    (
      v_store_id,
      v_cat_pastry,
      'Pain au Chocolat',
      'Croissant lembut berisi dua batang cokelat hitam Belgia yang lumer di dalam.',
      25000,
      29000,
      'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?auto=format&fit=crop&w=600&q=80',
      NULL,
      true,
      'direct',
      12,
      5,
      '[
        {"group": "Penyajian", "required": true, "options": [{"name": "Hangatkan", "price": 0}, {"name": "Suhu Ruang", "price": 0}]}
      ]'::jsonb
    ),
    (
      v_store_id,
      v_cat_meals,
      'Chicken Katsu Donburi',
      'Nasi hangat pulen dengan ayam katsu renyah, telur setengah matang, dan saus tare spesial.',
      38000,
      45000,
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      'BESTSELLER',
      true,
      'direct',
      15,
      5,
      '[
        {"group": "Level Pedas", "required": true, "options": [{"name": "Tidak Pedas", "price": 0}, {"name": "Sedang", "price": 0}, {"name": "Pedas", "price": 0}]},
        {"group": "Add-on", "required": false, "options": [{"name": "Extra Telur", "price": 5000}, {"name": "Extra Nasi", "price": 6000}]}
      ]'::jsonb
    );
  END IF;
END $$;
