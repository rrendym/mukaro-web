-- ============================================================================
-- MUKARO: WAVE 1 OPERATIONAL & ENTERPRISE UPDATES MIGRATION (Idempotent)
-- Jalankan di Supabase SQL Editor. Aman dijalankan berulang kali.
-- ============================================================================

-- 1. Tabel stores: Identitas PT/NPWP, Modal Awal Kasir, PIN Stok, PIN Supervisor, Staf On-Duty
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS npwp TEXT,
  ADD COLUMN IF NOT EXISTS cash_drawer_initial NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_pin TEXT DEFAULT '1234',
  ADD COLUMN IF NOT EXISTS supervisor_pin TEXT DEFAULT '1234',
  ADD COLUMN IF NOT EXISTS staff_list JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS active_staff_name TEXT;

-- 2. Tabel stock_opname_logs: Audit nama staf pengubah stok
ALTER TABLE public.stock_opname_logs
  ADD COLUMN IF NOT EXISTS updated_by_staff TEXT;

-- 3. Tabel vouchers: Running bar customer & jadwal waktu berlaku
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS show_in_customer_bar BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;

-- 4. Tabel orders: Nama kasir on-duty yang memproses order
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cashier_name TEXT;
