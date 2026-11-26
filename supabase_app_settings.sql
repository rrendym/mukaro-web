-- Tabel app_settings untuk pengaturan global (seperti Promo Popup Landing Page)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Siapa saja (termasuk pengunjung landing page) boleh membaca app_settings
DROP POLICY IF EXISTS "Public can read app_settings" ON public.app_settings;
CREATE POLICY "Public can read app_settings"
  ON public.app_settings
  FOR SELECT
  USING (true);

-- Authenticated user (Superadmin) boleh insert/update app_settings
DROP POLICY IF EXISTS "Authenticated can upsert app_settings" ON public.app_settings;
CREATE POLICY "Authenticated can upsert app_settings"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
