
-- ── 1. PROFILES: add INSERT policy so trigger + any fallback can write ──────
DROP POLICY IF EXISTS "Service inserts profiles" ON profiles;
CREATE POLICY "Service inserts profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- ── 2. RE-ENFORCE admin role for topkuchalo@gmail.com ───────────────────────
UPDATE profiles SET role = 'admin' WHERE email = 'topkuchalo@gmail.com';

-- ── 3. STORAGE – music bucket: drop & recreate clean INSERT policies ─────────
DROP POLICY IF EXISTS "Artist upload music"   ON storage.objects;
DROP POLICY IF EXISTS "Admin upload music"    ON storage.objects;
DROP POLICY IF EXISTS "Artist manage music"   ON storage.objects;

-- Any authenticated user can upload to music/ as long as their uid is the top folder
CREATE POLICY "Auth upload music" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'music'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Artists & admins can delete their own files
CREATE POLICY "Auth delete music" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'music'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- ── 4. STORAGE – videos bucket: drop & recreate ──────────────────────────────
DROP POLICY IF EXISTS "Artist upload videos"  ON storage.objects;
DROP POLICY IF EXISTS "Admin upload videos"   ON storage.objects;
DROP POLICY IF EXISTS "Artist manage videos"  ON storage.objects;

CREATE POLICY "Auth upload videos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Auth delete videos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- ── 5. STORAGE – images/albums: ensure any authenticated user can upload ────
DROP POLICY IF EXISTS "Auth upload images" ON storage.objects;
CREATE POLICY "Auth upload images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'images');

DROP POLICY IF EXISTS "Auth upload albums" ON storage.objects;
CREATE POLICY "Auth upload albums" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'albums');

-- ── 6. STORAGE – artists bucket: own-folder upload ───────────────────────────
DROP POLICY IF EXISTS "Artist manages artist files" ON storage.objects;
CREATE POLICY "Auth upload artists" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'artists');

CREATE POLICY "Auth manage artist files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'artists' AND (storage.foldername(name))[1] = (auth.uid())::text)
  WITH CHECK (bucket_id = 'artists' AND (storage.foldername(name))[1] = (auth.uid())::text);

-- ── 7. Ensure get_user_role is SECURITY DEFINER and stable ──────────────────
CREATE OR REPLACE FUNCTION get_user_role(uid UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = uid LIMIT 1;
$$;

-- ── 8. Ensure handle_new_user trigger is SECURITY DEFINER + correct logic ───
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
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
                  WHEN EXCLUDED.email = 'topkuchalo@gmail.com' THEN 'admin'::user_role
                  ELSE profiles.role  -- never downgrade existing role
                END;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
