-- ============================================================================
-- MUKARO: IDEMPOTENT LARGE-SCALE DEMO SEED DATA ('kopi-senja')
-- Aman dijalankan berulang kali di Supabase SQL Editor tanpa duplikasi data.
-- Mempertahankan owner_id yang sudah ada pada outlet 'kopi-senja'.
-- Mengisi:
-- - Pengaturan lengkap (PT/NPWP, Modal Awal Rp 500.000, PIN Stok 123456,
--   PIN Supervisor 998877, Daftar Staf & Kasir On-Duty)
-- - 5 Kategori, 12 Menu (lengkap varian & stok menipis), 6 Bahan Baku
-- - 16 Riwayat Stock Opname lintas tanggal & jam
-- - 4 Voucher (termasuk voucher aktif di Running Bar berjadwal)
-- - 360+ Transaksi 30 Hari Terakhir (jam sibuk 12-14 & 18:30-21, akhir pekan,
--   multi-channel, sampel void/refund, dan pesanan aktif di Pesanan Live)
-- ============================================================================

DO $$
DECLARE
  v_store_id uuid;
  v_cat_coffee uuid;
  v_cat_non_coffee uuid;
  v_cat_pastry uuid;
  v_cat_meals uuid;
  v_cat_bundling uuid;

  v_m_kopi_susu uuid;
  v_m_caramel uuid;
  v_m_americano uuid;
  v_m_cappuccino uuid;
  v_m_matcha uuid;
  v_m_choco uuid;
  v_m_lychee uuid;
  v_m_croissant uuid;
  v_m_pain uuid;
  v_m_muffin uuid;
  v_m_katsu uuid;
  v_m_paket uuid;

  v_day int;
  v_idx int;
  v_orders_per_day int;
  v_dow int;
  v_seq int := 0;
  v_order_id uuid;
  v_order_num text;
  v_hour int;
  v_minute int;
  v_created_at timestamptz;
  v_payment_method text;
  v_payment_status text;
  v_order_status text;
  v_order_source text;
  v_order_type text;
  v_table_no text;
  v_customer text;
  v_cashier text;
  v_subtotal numeric;
  v_tax numeric;
  v_service numeric;
  v_discount numeric;
  v_total numeric;
  v_notes text;
  v_void_reason text;
  v_primary_menu_id uuid;
  v_primary_menu_name text;
  v_primary_price numeric;
  v_primary_qty int;
  v_secondary_menu_id uuid;
  v_secondary_menu_name text;
  v_secondary_price numeric;
  v_secondary_qty int;
BEGIN
  -- 1. Upsert Demo Store ('kopi-senja') tanpa menimpa owner_id yang ada
  INSERT INTO public.stores (
    name, slug, tagline, logo_url, accent_color, banner_url,
    banner_title, banner_subtitle, show_banner, order_mode,
    wa_number, show_wa, tax_percent, service_percent, is_open,
    daily_sales_target, cash_drawer_initial, staff_pin,
    subscription_status, expired_at
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
    true, 'hybrid', '6281234567890', true, 10, 5, true,
    2500000, 500000, '1234', 'active', now() + interval '365 days'
  )
  ON CONFLICT (slug) DO UPDATE SET
    daily_sales_target = 2500000,
    cash_drawer_initial = 500000,
    subscription_status = 'active',
    expired_at = GREATEST(public.stores.expired_at, now() + interval '365 days');

  SELECT id INTO v_store_id FROM public.stores WHERE slug = 'kopi-senja';

  -- Update kolom operasional Wave 1 secara aman jika sudah dimigrasi
  BEGIN
    UPDATE public.stores
    SET
      company_name = COALESCE(company_name, 'PT Senja Kuliner Nusantara'),
      npwp = COALESCE(npwp, '01.234.567.8-901.000'),
      stock_pin = COALESCE(stock_pin, '123456'),
      supervisor_pin = COALESCE(supervisor_pin, '998877'),
      staff_list = '["Nadia (Kasir Pagi)", "Dimas (Kasir Malam)", "Rizky (Head Bar)"]'::jsonb,
      active_staff_name = COALESCE(active_staff_name, 'Nadia (Kasir Pagi)')
    WHERE id = v_store_id;
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  -- 2. Categories
  SELECT id INTO v_cat_coffee FROM public.categories WHERE store_id = v_store_id AND name = 'Coffee' LIMIT 1;
  IF v_cat_coffee IS NULL THEN
    INSERT INTO public.categories (store_id, name, image_url, sort_order)
    VALUES (v_store_id, 'Coffee', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80', 1)
    RETURNING id INTO v_cat_coffee;
  END IF;

  SELECT id INTO v_cat_non_coffee FROM public.categories WHERE store_id = v_store_id AND name = 'Non-Coffee' LIMIT 1;
  IF v_cat_non_coffee IS NULL THEN
    INSERT INTO public.categories (store_id, name, image_url, sort_order)
    VALUES (v_store_id, 'Non-Coffee', 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=300&q=80', 2)
    RETURNING id INTO v_cat_non_coffee;
  END IF;

  SELECT id INTO v_cat_pastry FROM public.categories WHERE store_id = v_store_id AND name = 'Pastry' LIMIT 1;
  IF v_cat_pastry IS NULL THEN
    INSERT INTO public.categories (store_id, name, image_url, sort_order)
    VALUES (v_store_id, 'Pastry', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=300&q=80', 3)
    RETURNING id INTO v_cat_pastry;
  END IF;

  SELECT id INTO v_cat_meals FROM public.categories WHERE store_id = v_store_id AND name = 'Meals' LIMIT 1;
  IF v_cat_meals IS NULL THEN
    INSERT INTO public.categories (store_id, name, image_url, sort_order)
    VALUES (v_store_id, 'Meals', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80', 4)
    RETURNING id INTO v_cat_meals;
  END IF;

  SELECT id INTO v_cat_bundling FROM public.categories WHERE store_id = v_store_id AND name = 'Bundling' LIMIT 1;
  IF v_cat_bundling IS NULL THEN
    INSERT INTO public.categories (store_id, name, image_url, sort_order)
    VALUES (v_store_id, 'Bundling', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=300&q=80', 5)
    RETURNING id INTO v_cat_bundling;
  END IF;

  -- 3. 12 Menus Lengkap
  SELECT id INTO v_m_kopi_susu FROM public.menus WHERE store_id = v_store_id AND name = 'Es Kopi Susu Senja' LIMIT 1;
  IF v_m_kopi_susu IS NULL THEN
    INSERT INTO public.menus (store_id, category_id, name, description, price, ojol_price, image_url, badge, is_available, stock_mode, stock_qty, min_stock, variants)
    VALUES (
      v_store_id, v_cat_coffee, 'Es Kopi Susu Senja',
      'Espresso house blend arabika dengan susu segar creamy dan gula aren organik pilihan.',
      24000, 29000, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80',
      'BESTSELLER', true, 'none', 0, 5,
      '[{"group":"Suhu","required":true,"options":[{"name":"Ice","price":0},{"name":"Hot","price":0}]},{"group":"Level Gula","required":true,"options":[{"name":"Normal","price":0},{"name":"Less Sugar","price":0}]},{"group":"Add-on","required":false,"options":[{"name":"Extra Shot Espresso","price":6000},{"name":"Oat Milk","price":8000}]}]'::jsonb
    ) RETURNING id INTO v_m_kopi_susu;
  END IF;

  SELECT id INTO v_m_caramel FROM public.menus WHERE store_id = v_store_id AND name = 'Caramel Macchiato' LIMIT 1;
  IF v_m_caramel IS NULL THEN
    INSERT INTO public.menus (store_id, category_id, name, description, price, ojol_price, image_url, badge, is_available, stock_mode, stock_qty, min_stock, variants)
    VALUES (
      v_store_id, v_cat_coffee, 'Caramel Macchiato',
      'Perpaduan espresso lembut, steamed milk, dan saus karamel rumahan yang wangi.',
      28000, 34000, 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=600&q=80',
      'PROMO', true, 'none', 0, 5,
      '[{"group":"Suhu","required":true,"options":[{"name":"Ice","price":0},{"name":"Hot","price":0}]}]'::jsonb
    ) RETURNING id INTO v_m_caramel;
  END IF;

  SELECT id INTO v_m_americano FROM public.menus WHERE store_id = v_store_id AND name = 'Americano Signature' LIMIT 1;
  IF v_m_americano IS NULL THEN
    INSERT INTO public.menus (store_id, category_id, name, description, price, ojol_price, image_url, badge, is_available, stock_mode, stock_qty, min_stock, variants)
    VALUES (
      v_store_id, v_cat_coffee, 'Americano Signature',
      'Double shot espresso 100% arabika Gayo dengan air mineral dingin yang menyegarkan.',
      20000, 24000, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
      NULL, true, 'none', 0, 5,
      '[{"group":"Suhu","required":true,"options":[{"name":"Ice","price":0},{"name":"Hot","price":0}]}]'::jsonb
    ) RETURNING id INTO v_m_americano;
  END IF;

  SELECT id INTO v_m_cappuccino FROM public.menus WHERE store_id = v_store_id AND name = 'Cappuccino Oat' LIMIT 1;
  IF v_m_cappuccino IS NULL THEN
    INSERT INTO public.menus (store_id, category_id, name, description, price, ojol_price, image_url, badge, is_available, stock_mode, stock_qty, min_stock, variants)
    VALUES (
      v_store_id, v_cat_coffee, 'Cappuccino Oat',
      'Cappuccino klasik dengan microfoam oat milk nabati yang lembut dan gurih.',
      32000, 38000, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80',
      'BARU', true, 'none', 0, 5,
      '[{"group":"Suhu","required":true,"options":[{"name":"Hot","price":0},{"name":"Ice","price":0}]}]'::jsonb
    ) RETURNING id INTO v_m_cappuccino;
  END IF;

  SELECT id INTO v_m_matcha FROM public.menus WHERE store_id = v_store_id AND name = 'Uji Matcha Latte' LIMIT 1;
  IF v_m_matcha IS NULL THEN
    INSERT INTO public.menus (store_id, category_id, name, description, price, ojol_price, image_url, badge, is_available, stock_mode, stock_qty, min_stock, variants)
    VALUES (
      v_store_id, v_cat_non_coffee, 'Uji Matcha Latte',
      'Pure matcha grade A dari Uji, Jepang, dikocok dengan susu segar rendah lemak.',
      29000, 35000, 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80',
      'BESTSELLER', true, 'none', 0, 5,
      '[{"group":"Suhu","required":true,"options":[{"name":"Ice","price":0},{"name":"Hot","price":0}]}]'::jsonb
    ) RETURNING id INTO v_m_matcha;
  END IF;

  SELECT id INTO v_m_choco FROM public.menus WHERE store_id = v_store_id AND name = 'Belgian Chocolate Ice' LIMIT 1;
  IF v_m_choco IS NULL THEN
    INSERT INTO public.menus (store_id, category_id, name, description, price, ojol_price, image_url, badge, is_available, stock_mode, stock_qty, min_stock, variants)
    VALUES (
      v_store_id, v_cat_non_coffee, 'Belgian Chocolate Ice',
      'Cokelat hitam Belgia pekat dipadukan dengan susu segar dingin dan whipped cream.',
      27000, 32000, 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=600&q=80',
      NULL, true, 'none', 0, 5,
      '[{"group":"Suhu","required":true,"options":[{"name":"Ice","price":0},{"name":"Hot","price":0}]}]'::jsonb
    ) RETURNING id INTO v_m_choco;
  END IF;

  SELECT id INTO v_m_lychee FROM public.menus WHERE store_id = v_store_id AND name = 'Lychee Tea Mint' LIMIT 1;
  IF v_m_lychee IS NULL THEN
    INSERT INTO public.menus (store_id, category_id, name, description, price, ojol_price, image_url, badge, is_available, stock_mode, stock_qty, min_stock, variants)
    VALUES (
      v_store_id, v_cat_non_coffee, 'Lychee Tea Mint',
      'Teh melati dingin dengan buah leci utuh dan daun mint segar.',
      21000, 25000, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
      NULL, true, 'none', 0, 5, '[]'::jsonb
    ) RETURNING id INTO v_m_lychee;
  END IF;

  SELECT id INTO v_m_croissant FROM public.menus WHERE store_id = v_store_id AND name = 'French Butter Croissant' LIMIT 1;
  IF v_m_croissant IS NULL THEN
    INSERT INTO public.menus (store_id, category_id, name, description, price, ojol_price, image_url, badge, is_available, stock_mode, stock_qty, min_stock, variants)
    VALUES (
      v_store_id, v_cat_pastry, 'French Butter Croissant',
      'Pastry renyah berlapis-lapis dipanggang segar setiap pagi dengan mentega Prancis.',
      22000, 26000, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
      'BESTSELLER', true, 'direct', 18, 5,
      '[{"group":"Penyajian","required":true,"options":[{"name":"Hangatkan","price":0},{"name":"Suhu Ruang","price":0}]}]'::jsonb
    ) RETURNING id INTO v_m_croissant;
  END IF;

  SELECT id INTO v_m_pain FROM public.menus WHERE store_id = v_store_id AND name = 'Pain au Chocolat' LIMIT 1;
  IF v_m_pain IS NULL THEN
    INSERT INTO public.menus (store_id, category_id, name, description, price, ojol_price, image_url, badge, is_available, stock_mode, stock_qty, min_stock, variants)
    VALUES (
      v_store_id, v_cat_pastry, 'Pain au Chocolat',
      'Croissant lembut berisi dua batang cokelat hitam Belgia yang lumer di dalam.',
      25000, 29000, 'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?auto=format&fit=crop&w=600&q=80',
      NULL, true, 'direct', 3, 5,
      '[{"group":"Penyajian","required":true,"options":[{"name":"Hangatkan","price":0},{"name":"Suhu Ruang","price":0}]}]'::jsonb
    ) RETURNING id INTO v_m_pain;
  END IF;

  SELECT id INTO v_m_muffin FROM public.menus WHERE store_id = v_store_id AND name = 'Banana Choco Muffin' LIMIT 1;
  IF v_m_muffin IS NULL THEN
    INSERT INTO public.menus (store_id, category_id, name, description, price, ojol_price, image_url, badge, is_available, stock_mode, stock_qty, min_stock, variants)
    VALUES (
      v_store_id, v_cat_pastry, 'Banana Choco Muffin',
      'Muffin pisang panggang lembut dengan taburan choco chips panggang.',
      19000, 23000, 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=600&q=80',
      NULL, true, 'direct', 2, 5, '[]'::jsonb
    ) RETURNING id INTO v_m_muffin;
  END IF;

  SELECT id INTO v_m_katsu FROM public.menus WHERE store_id = v_store_id AND name = 'Chicken Katsu Donburi' LIMIT 1;
  IF v_m_katsu IS NULL THEN
    INSERT INTO public.menus (store_id, category_id, name, description, price, ojol_price, image_url, badge, is_available, stock_mode, stock_qty, min_stock, variants)
    VALUES (
      v_store_id, v_cat_meals, 'Chicken Katsu Donburi',
      'Nasi hangat pulen dengan ayam katsu renyah, telur setengah matang, dan saus tare spesial.',
      38000, 45000, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      'BESTSELLER', true, 'direct', 15, 5,
      '[{"group":"Level Pedas","required":true,"options":[{"name":"Tidak Pedas","price":0},{"name":"Sedang","price":0},{"name":"Pedas","price":0}]}]'::jsonb
    ) RETURNING id INTO v_m_katsu;
  END IF;

  SELECT id INTO v_m_paket FROM public.menus WHERE store_id = v_store_id AND name = 'Paket Senja Hemat' LIMIT 1;
  IF v_m_paket IS NULL THEN
    INSERT INTO public.menus (store_id, category_id, name, description, price, ojol_price, image_url, badge, is_available, stock_mode, stock_qty, min_stock, variants)
    VALUES (
      v_store_id, v_cat_bundling, 'Paket Senja Hemat',
      'Bundling 1 Es Kopi Susu Senja + 1 French Butter Croissant lebih hemat Rp 7.000.',
      39000, 46000, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
      'PROMO', true, 'direct', 14, 4, '[]'::jsonb
    ) RETURNING id INTO v_m_paket;
  END IF;

  -- 4. Ingredients (6 Bahan Baku, 2 stok menipis)
  IF NOT EXISTS (SELECT 1 FROM public.ingredients WHERE store_id = v_store_id AND name = 'Biji Kopi Arabika House Blend') THEN
    INSERT INTO public.ingredients (store_id, name, unit, stock_qty, min_stock)
    VALUES (v_store_id, 'Biji Kopi Arabika House Blend', 'gram', 3200, 1000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ingredients WHERE store_id = v_store_id AND name = 'Susu Segar Full Cream') THEN
    INSERT INTO public.ingredients (store_id, name, unit, stock_qty, min_stock)
    VALUES (v_store_id, 'Susu Segar Full Cream', 'ml', 12000, 4000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ingredients WHERE store_id = v_store_id AND name = 'Gula Aren Cair Organik') THEN
    INSERT INTO public.ingredients (store_id, name, unit, stock_qty, min_stock)
    VALUES (v_store_id, 'Gula Aren Cair Organik', 'ml', 400, 500);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ingredients WHERE store_id = v_store_id AND name = 'Bubuk Matcha Uji Grade A') THEN
    INSERT INTO public.ingredients (store_id, name, unit, stock_qty, min_stock)
    VALUES (v_store_id, 'Bubuk Matcha Uji Grade A', 'gram', 180, 300);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ingredients WHERE store_id = v_store_id AND name = 'Sirup Karamel') THEN
    INSERT INTO public.ingredients (store_id, name, unit, stock_qty, min_stock)
    VALUES (v_store_id, 'Sirup Karamel', 'ml', 1400, 400);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ingredients WHERE store_id = v_store_id AND name = 'Cup Plastik 16oz + Lid') THEN
    INSERT INTO public.ingredients (store_id, name, unit, stock_qty, min_stock)
    VALUES (v_store_id, 'Cup Plastik 16oz + Lid', 'pcs', 240, 80);
  END IF;

  -- 5. 16 Log Stock Opname Lintas Tanggal & Jam
  FOR v_idx IN 1..16 LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.stock_opname_logs
      WHERE store_id = v_store_id AND notes LIKE '%[DEMO-OP-' || v_idx || ']%'
    ) THEN
      INSERT INTO public.stock_opname_logs (store_id, item_name, item_type, system_qty, actual_qty, difference, notes, created_at)
      VALUES (
        v_store_id,
        CASE (v_idx % 5)
          WHEN 0 THEN 'Biji Kopi Arabika House Blend (gram)'
          WHEN 1 THEN 'Pain au Chocolat'
          WHEN 2 THEN 'Gula Aren Cair Organik (ml)'
          WHEN 3 THEN 'French Butter Croissant'
          ELSE 'Bubuk Matcha Uji Grade A (gram)'
        END,
        CASE WHEN (v_idx % 5) IN (1, 3) THEN 'menu' ELSE 'ingredient' END,
        100 + (v_idx * 10),
        100 + (v_idx * 10) + CASE WHEN (v_idx % 3) = 0 THEN 20 WHEN (v_idx % 4) = 0 THEN -15 ELSE -5 END,
        CASE WHEN (v_idx % 3) = 0 THEN 20 WHEN (v_idx % 4) = 0 THEN -15 ELSE -5 END,
        '[DEMO-OP-' || v_idx || '] ' || CASE WHEN (v_idx % 3) = 0 THEN 'Restok harian supplier' ELSE 'Audit opname shift' END,
        date_trunc('day', now() - ((v_idx - 1) || ' days')::interval) + ((8 + (v_idx % 12)) || ' hours')::interval
      );
      BEGIN
        UPDATE public.stock_opname_logs
        SET updated_by_staff = CASE (v_idx % 3)
          WHEN 0 THEN 'Rizky (Head Bar)'
          WHEN 1 THEN 'Nadia (Kasir Pagi)'
          ELSE 'Dimas (Kasir Malam)'
        END
        WHERE store_id = v_store_id AND notes LIKE '%[DEMO-OP-' || v_idx || ']%';
      EXCEPTION WHEN undefined_column THEN
        NULL;
      END;
    END IF;
  END LOOP;

  -- 6. Vouchers (termasuk Running Bar berjadwal)
  IF NOT EXISTS (SELECT 1 FROM public.vouchers WHERE store_id = v_store_id AND code = 'SENJA15') THEN
    INSERT INTO public.vouchers (store_id, code, discount_type, discount_value, min_order, is_active)
    VALUES (v_store_id, 'SENJA15', 'percent', 15, 50000, true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.vouchers WHERE store_id = v_store_id AND code = 'HEMAT10K') THEN
    INSERT INTO public.vouchers (store_id, code, discount_type, discount_value, min_order, is_active)
    VALUES (v_store_id, 'HEMAT10K', 'fixed', 10000, 45000, true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.vouchers WHERE store_id = v_store_id AND code = 'WEEKEND20') THEN
    INSERT INTO public.vouchers (store_id, code, discount_type, discount_value, min_order, is_active)
    VALUES (v_store_id, 'WEEKEND20', 'percent', 20, 75000, true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.vouchers WHERE store_id = v_store_id AND code = 'GRANDOPENING') THEN
    INSERT INTO public.vouchers (store_id, code, discount_type, discount_value, min_order, is_active)
    VALUES (v_store_id, 'GRANDOPENING', 'percent', 25, 30000, false);
  END IF;

  BEGIN
    UPDATE public.vouchers
    SET
      show_in_customer_bar = true,
      valid_from = now() - interval '7 days',
      valid_until = now() + interval '30 days'
    WHERE store_id = v_store_id AND code IN ('SENJA15', 'HEMAT10K');
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  -- 7. 360+ Transaksi 30 Hari Terakhir (Pola Jam Sibuk, Akhir Pekan, Void/Refund & Pesanan Live)
  FOR v_day IN 0..29 LOOP
    v_dow := EXTRACT(DOW FROM (now() - (v_day || ' days')::interval))::int;
    v_orders_per_day := CASE WHEN v_dow IN (0, 5, 6) THEN 15 ELSE 11 END;

    FOR v_idx IN 1..v_orders_per_day LOOP
      v_seq := v_seq + 1;
      v_order_num := 'MKR-DEMO-' || lpad(v_seq::text, 3, '0');

      IF NOT EXISTS (
        SELECT 1 FROM public.orders
        WHERE store_id = v_store_id AND order_number = v_order_num
      ) THEN
        -- Pola jam sibuk 12:00-14:00 dan 18:30-21:00
        v_hour := CASE (v_seq % 7)
          WHEN 0 THEN 12
          WHEN 1 THEN 13
          WHEN 2 THEN 19
          WHEN 3 THEN 20
          WHEN 4 THEN 16
          WHEN 5 THEN 10
          ELSE 18
        END;
        v_minute := (v_seq * 17) % 55;

        v_created_at := date_trunc('day', now() - (v_day || ' days')::interval)
          + (v_hour || ' hours')::interval
          + (v_minute || ' minutes')::interval;

        IF v_created_at > now() THEN
          v_created_at := now() - (((v_idx * 12) + 5) || ' minutes')::interval;
        END IF;

        IF (v_seq % 4) = 0 THEN
          v_payment_method := 'cash'; v_order_source := 'walk_in'; v_order_type := 'takeaway'; v_table_no := NULL;
        ELSIF (v_seq % 5) = 0 THEN
          v_payment_method := 'ojol_platform';
          v_order_source := CASE (v_seq % 3) WHEN 0 THEN 'gofood' WHEN 1 THEN 'grabfood' ELSE 'shopeefood' END;
          v_order_type := 'delivery'; v_table_no := NULL;
        ELSE
          v_payment_method := 'qris'; v_order_source := 'qr_menu'; v_order_type := 'dine_in';
          v_table_no := 'Meja ' || ((v_seq % 10) + 1)::text;
        END IF;

        v_customer := CASE (v_seq % 6)
          WHEN 0 THEN 'Andi Pratama' WHEN 1 THEN 'Siti Rahma' WHEN 2 THEN 'Budi Santoso'
          WHEN 3 THEN 'Nadia Putri' WHEN 4 THEN 'Dimas Wijaya' ELSE 'Rina Kusuma'
        END;

        v_cashier := CASE WHEN v_hour < 15 THEN 'Nadia (Kasir Pagi)' ELSE 'Dimas (Kasir Malam)' END;

        CASE (v_seq % 6)
          WHEN 0 THEN
            v_primary_menu_id := v_m_kopi_susu; v_primary_menu_name := 'Es Kopi Susu Senja'; v_primary_price := 24000; v_primary_qty := 2;
            v_secondary_menu_id := v_m_croissant; v_secondary_menu_name := 'French Butter Croissant'; v_secondary_price := 22000; v_secondary_qty := 1;
          WHEN 1 THEN
            v_primary_menu_id := v_m_katsu; v_primary_menu_name := 'Chicken Katsu Donburi'; v_primary_price := 38000; v_primary_qty := 1;
            v_secondary_menu_id := v_m_matcha; v_secondary_menu_name := 'Uji Matcha Latte'; v_secondary_price := 29000; v_secondary_qty := 1;
          WHEN 2 THEN
            v_primary_menu_id := v_m_paket; v_primary_menu_name := 'Paket Senja Hemat'; v_primary_price := 39000; v_primary_qty := 2;
            v_secondary_menu_id := v_m_americano; v_secondary_menu_name := 'Americano Signature'; v_secondary_price := 20000; v_secondary_qty := 1;
          WHEN 3 THEN
            v_primary_menu_id := v_m_caramel; v_primary_menu_name := 'Caramel Macchiato'; v_primary_price := 28000; v_primary_qty := 2;
            v_secondary_menu_id := v_m_pain; v_secondary_menu_name := 'Pain au Chocolat'; v_secondary_price := 25000; v_secondary_qty := 1;
          WHEN 4 THEN
            v_primary_menu_id := v_m_kopi_susu; v_primary_menu_name := 'Es Kopi Susu Senja'; v_primary_price := 24000; v_primary_qty := 1;
            v_secondary_menu_id := v_m_choco; v_secondary_menu_name := 'Belgian Chocolate Ice'; v_secondary_price := 27000; v_secondary_qty := 1;
          ELSE
            v_primary_menu_id := v_m_cappuccino; v_primary_menu_name := 'Cappuccino Oat'; v_primary_price := 32000; v_primary_qty := 1;
            v_secondary_menu_id := v_m_lychee; v_secondary_menu_name := 'Lychee Tea Mint'; v_secondary_price := 21000; v_secondary_qty := 1;
        END CASE;

        v_subtotal := (v_primary_price * v_primary_qty) + (v_secondary_price * v_secondary_qty);

        IF (v_seq % 4) = 1 AND v_subtotal >= 50000 THEN
          v_discount := ROUND(v_subtotal * 0.15);
          v_notes := 'Voucher: SENJA15 (15%)';
        ELSIF (v_seq % 7) = 0 AND v_subtotal >= 45000 THEN
          v_discount := 10000;
          v_notes := 'Voucher: HEMAT10K';
        ELSE
          v_discount := 0;
          v_notes := NULL;
        END IF;

        v_tax := ROUND(GREATEST(0, v_subtotal - v_discount) * 0.10);
        v_service := ROUND(GREATEST(0, v_subtotal - v_discount) * 0.05);
        v_total := GREATEST(0, v_subtotal - v_discount) + v_tax + v_service;

        -- Sampel Void / Refund & Pesanan Aktif di Pesanan Live
        IF (v_seq % 45) = 0 THEN
          v_payment_status := 'refunded'; v_order_status := 'cancelled';
          v_void_reason := 'Pelanggan membatalkan pesanan (Void Supervisor)';
        ELSIF v_day = 0 AND v_idx = 1 THEN
          v_payment_status := 'paid'; v_order_status := 'queued'; v_void_reason := NULL;
        ELSIF v_day = 0 AND v_idx = 2 THEN
          v_payment_status := 'paid'; v_order_status := 'preparing'; v_void_reason := NULL;
        ELSE
          v_payment_status := 'paid'; v_order_status := 'completed'; v_void_reason := NULL;
        END IF;

        INSERT INTO public.orders (
          store_id, order_number, customer_name, table_number,
          order_type, order_source, payment_method, payment_status, order_status,
          subtotal, tax_amount, service_amount, discount_amount, total_amount, notes, void_reason, created_at
        )
        VALUES (
          v_store_id, v_order_num, v_customer, v_table_no,
          v_order_type, v_order_source, v_payment_method, v_payment_status, v_order_status,
          v_subtotal, v_tax, v_service, v_discount, v_total, v_notes, v_void_reason, v_created_at
        )
        RETURNING id INTO v_order_id;

        BEGIN
          UPDATE public.orders SET cashier_name = v_cashier WHERE id = v_order_id;
        EXCEPTION WHEN undefined_column THEN
          NULL;
        END;

        INSERT INTO public.order_items (
          order_id, menu_id, menu_name, qty, unit_price, selected_variants, subtotal
        )
        VALUES
          (v_order_id, v_primary_menu_id, v_primary_menu_name, v_primary_qty, v_primary_price, '[]'::jsonb, v_primary_price * v_primary_qty),
          (v_order_id, v_secondary_menu_id, v_secondary_menu_name, v_secondary_qty, v_secondary_price, '[]'::jsonb, v_secondary_price * v_secondary_qty);
      END IF;
    END LOOP;
  END LOOP;
END $$;
