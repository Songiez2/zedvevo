
-- ── Make music + video buckets public for streaming ──────────────
UPDATE storage.buckets SET public = true WHERE id IN ('music', 'videos');

-- ── Add audio mime types for broader upload compatibility ─────────
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/aac','audio/flac','audio/ogg']
WHERE id = 'music';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['video/mp4','video/quicktime','video/webm','video/x-msvideo']
WHERE id = 'videos';

-- ── Allow anon/public to read music + video objects ───────────────
DO $$ BEGIN
  CREATE POLICY "Public read music"  ON storage.objects FOR SELECT USING (bucket_id = 'music');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read videos" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Allow admin to upload to any bucket ──────────────────────────
DO $$ BEGIN
  CREATE POLICY "Admin upload music" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'music' AND get_user_role(auth.uid()) = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin upload videos" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'videos' AND get_user_role(auth.uid()) = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── DB function: safely increment uploads_used ───────────────────
CREATE OR REPLACE FUNCTION increment_uploads_used(artist_uuid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE artists SET uploads_used = uploads_used + 1, updated_at = now()
  WHERE id = artist_uuid;
END;
$$;

-- ── Ensure admin user keeps admin role after re-registration ─────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role user_role;
BEGIN
  -- First ever user gets admin; existing known admin email also gets admin
  IF is_first_user() OR NEW.email = 'topkuchalo@gmail.com' THEN
    v_role := 'admin';
  ELSE
    v_role := 'user';
  END IF;
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, v_role)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- ── Ensure artist_plan_purchases INSERT is allowed from auth'd edge functions ──
-- (already has service_role policy; add for authenticated in case direct insert needed)
DO $$ BEGIN
  CREATE POLICY "Auth inserts own plan" ON artist_plan_purchases
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Allow artists/admin to read their own unpublished songs (for dashboard) ──
DROP POLICY IF EXISTS "Artist reads own songs" ON songs;
CREATE POLICY "Artist reads own songs" ON songs
  FOR SELECT TO authenticated USING (auth.uid() = artist_id);

DROP POLICY IF EXISTS "Artist reads own videos" ON videos;
CREATE POLICY "Artist reads own videos" ON videos
  FOR SELECT TO authenticated USING (auth.uid() = artist_id);

DROP POLICY IF EXISTS "Artist reads own albums" ON albums;
CREATE POLICY "Artist reads own albums" ON albums
  FOR SELECT TO authenticated USING (auth.uid() = artist_id);
