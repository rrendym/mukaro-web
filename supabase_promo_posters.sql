-- Tambah kolom daftar poster promo per toko/outlet (aman dijalankan berulang)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS promo_posters jsonb NOT NULL DEFAULT '[]'::jsonb;
