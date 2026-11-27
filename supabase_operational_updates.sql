-- ============================================================================
-- MUKARO: OPERATIONAL UPDATES MIGRATION (Idempotent)
-- Jalankan di Supabase SQL Editor untuk mendukung:
-- 1. Pengaturan Modal Awal Kasir, PIN Khusus Stok, Daftar Staf & Kasir On-Duty
-- 2. Audit Log Nama Staf pada Stock Opname
-- 3. Running Bar Customer & Jadwal Waktu Berlaku Voucher
-- 4. Nama Kasir On-Duty pada Order
-- ============================================================================

-- 1. Tabel stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS cash_drawer_initial NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_pin TEXT DEFAULT '1234',
  ADD COLUMN IF NOT EXISTS staff_list JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS active_staff_name TEXT;

-- 2. Tabel stock_opname_logs
ALTER TABLE public.stock_opname_logs
  ADD COLUMN IF NOT EXISTS updated_by_staff TEXT;

-- 3. Tabel vouchers
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS show_in_customer_bar BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;

-- 4. Tabel orders (menyimpan nama kasir yang bertugas)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cashier_name TEXT;
