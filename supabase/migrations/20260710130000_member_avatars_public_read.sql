-- Lecture publique des avatars (URLs /storage/v1/object/public/member-avatars/...).
-- Sans cette policy, les photos ne s'affichent pas pour les visiteurs ni via le CDN.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'member-avatars public read'
  ) THEN
    CREATE POLICY "member-avatars public read"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'member-avatars');
  END IF;
END $$;
