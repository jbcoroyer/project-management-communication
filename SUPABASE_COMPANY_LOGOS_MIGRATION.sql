-- Migration : ajout du logo pour chaque societe
-- Un logo est stocke dans Supabase Storage (bucket "company-logos") et
-- on stocke l'URL publique dans la colonne logo_url.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS logo_url text;

-- Creer le bucket Supabase Storage (a executer via le dashboard Supabase
-- ou l'API Admin, pas directement en SQL) :
--
-- Via Supabase Dashboard > Storage > New bucket :
--   Nom   : company-logos
--   Public: true  (pour URL publiques directes)
--
-- Ou via SQL avec l'extension storage :
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('company-logos', 'company-logos', true)
-- ON CONFLICT (id) DO NOTHING;
--
-- Policy pour permettre aux utilisateurs authentifies d'uploader :
-- CREATE POLICY "Allow authenticated uploads"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'company-logos');
--
-- Policy pour lecture publique :
-- CREATE POLICY "Public read"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'company-logos');
