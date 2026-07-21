
-- ════════════════════════════════════════════════════════════════════
-- NUCLEAR FIX: Re-apply all critical policies, functions, triggers
-- ════════════════════════════════════════════════════════════════════

-- 1. Force admin role — never let it be overwritten
UPDATE profiles SET role = 'admin' WHERE email = 'topkuchalo@gmail.com';

-- 2. Create artist record for topkuchalo so they can upload immediately
INSERT INTO artists (id, artist_name, active, uploads_used, social_links)
SELECT id, COALESCE(full_name, username, email, 'ZedVevo Admin'), true, 0, '{}'::jsonb
FROM profiles WHERE email = 'topkuchalo@gmail.com'
ON CONFLICT (id) DO UPDATE SET active = true, updated_at = now();

-- 3. Protect admin role from being overwritten via profile UPDATE
-- Drop and recreate the update policy
DROP POLICY IF EXISTS "User update own profile" ON profiles;
CREATE POLICY "User update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      -- Never allow downgrading admin role
      CASE WHEN get_user_role(auth.uid()) = 'admin' THEN role = 'admin'
           ELSE true
      END
    )
  );

-- 4. Clean up conflicting storage policies and re-apply simple ones
DROP POLICY IF EXISTS "Auth upload music"              ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload music"     ON storage.objects;
DROP POLICY IF EXISTS "Auth upload videos"             ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload videos"    ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update music"     ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update videos"    ON storage.objects;
DROP POLICY IF EXISTS "Auth delete music"              ON storage.objects;
DROP POLICY IF EXISTS "Auth delete videos"             ON storage.objects;

-- Simple: any authenticated user can upload/update/delete in music or videos
CREATE POLICY "music_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'music');

CREATE POLICY "music_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'music');

CREATE POLICY "music_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'music');

CREATE POLICY "videos_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'videos');

CREATE POLICY "videos_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'videos');

CREATE POLICY "videos_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'videos');

-- 5. Ensure songs + videos INSERT works for any authenticated user
-- (already covered by "Artist manages own songs" but add fallback)
DROP POLICY IF EXISTS "Any auth insert song" ON songs;
CREATE POLICY "Any auth insert song" ON songs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = artist_id);

DROP POLICY IF EXISTS "Any auth insert video" ON videos;
CREATE POLICY "Any auth insert video" ON videos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = artist_id);

-- 6. Refresh get_my_profile to be absolutely bulletproof
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS SETOF profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION get_my_profile() TO authenticated, anon, service_role;

-- 7. Refresh get_user_role
CREATE OR REPLACE FUNCTION get_user_role(uid UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = uid LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated, anon, service_role;

-- 8. ensure_admin_profile — called from AuthContext as last resort
CREATE OR REPLACE FUNCTION ensure_admin_profile(p_user_id UUID, p_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (p_user_id, p_email, 'admin')
  ON CONFLICT (id) DO UPDATE
    SET role = 'admin', email = EXCLUDED.email;
END;
$$;
GRANT EXECUTE ON FUNCTION ensure_admin_profile(UUID, TEXT) TO authenticated, anon, service_role;

-- 9. Tighten handle_new_user — admin email ALWAYS stays admin
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role user_role;
BEGIN
  IF NEW.email = 'topkuchalo@gmail.com' THEN
    v_role := 'admin';
  ELSIF NOT EXISTS (SELECT 1 FROM profiles LIMIT 1) THEN
    v_role := 'admin';
  ELSE
    v_role := 'user';
  END IF;
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, v_role)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        role  = CASE
                  WHEN profiles.email = 'topkuchalo@gmail.com' THEN 'admin'::user_role
                  WHEN EXCLUDED.email = 'topkuchalo@gmail.com' THEN 'admin'::user_role
                  ELSE profiles.role
                END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
