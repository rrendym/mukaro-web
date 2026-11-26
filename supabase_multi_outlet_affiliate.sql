-- ============================================================================
-- MUKARO: MULTI-OUTLET (ENTERPRISE) & AFFILIATE / PARTNER PROGRAM MIGRATION
-- Jalankan di Supabase SQL Editor
-- ============================================================================

-- 1. Pastikan tabel stores mendukung banyak outlet untuk 1 owner_id
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.stores'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%(owner_id)%'
  LOOP
    EXECUTE format('ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS max_outlets INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS referred_by_code TEXT,
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'pro';

CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON public.stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_referred_by_code ON public.stores(referred_by_code);

-- 2. Tabel affiliate_profiles
CREATE TABLE IF NOT EXISTS public.affiliate_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_code ON public.affiliate_profiles(referral_code);

-- 3. Tabel affiliate_commissions
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL CHECK (plan_name IN ('starter', 'pro', 'enterprise')),
  commission_amount INTEGER NOT NULL DEFAULT 45000,
  status TEXT NOT NULL DEFAULT 'pending_trial' CHECK (status IN ('pending_trial', 'available', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_referrer ON public.affiliate_commissions(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_store ON public.affiliate_commissions(referred_store_id);

-- 4. Row Level Security (RLS)
ALTER TABLE public.affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- Public lookup of referral_code (needed during signup validation)
DROP POLICY IF EXISTS "Public can lookup referral codes" ON public.affiliate_profiles;
CREATE POLICY "Public can lookup referral codes"
  ON public.affiliate_profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own affiliate profile" ON public.affiliate_profiles;
CREATE POLICY "Users can insert own affiliate profile"
  ON public.affiliate_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own affiliate profile" ON public.affiliate_profiles;
CREATE POLICY "Users can update own affiliate profile"
  ON public.affiliate_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Superadmin can manage affiliate_profiles" ON public.affiliate_profiles;
CREATE POLICY "Superadmin can manage affiliate_profiles"
  ON public.affiliate_profiles FOR ALL
  TO authenticated
  USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'rendyca03@gmail.com')
  WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'rendyca03@gmail.com');

-- Affiliate Commissions RLS
DROP POLICY IF EXISTS "Referrers can view own commissions" ON public.affiliate_commissions;
CREATE POLICY "Referrers can view own commissions"
  ON public.affiliate_commissions FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_user_id);

DROP POLICY IF EXISTS "Authenticated users can record referral commission" ON public.affiliate_commissions;
CREATE POLICY "Authenticated users can record referral commission"
  ON public.affiliate_commissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() <> referrer_user_id);

DROP POLICY IF EXISTS "Superadmin can manage affiliate_commissions" ON public.affiliate_commissions;
CREATE POLICY "Superadmin can manage affiliate_commissions"
  ON public.affiliate_commissions FOR ALL
  TO authenticated
  USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'rendyca03@gmail.com')
  WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'rendyca03@gmail.com');
