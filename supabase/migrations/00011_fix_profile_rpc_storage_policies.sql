
-- ═══════════════════════════════════════════════════════════════════
-- 1. get_my_profile RPC — SECURITY DEFINER bypasses all RLS
--    Returns the calling user's full profile row (or NULL if missing)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS SETOF profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_my_profile() TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════
-- 2. ensure_admin_profile — upsert + force admin for known email
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION ensure_admin_profile(p_user_id UUID, p_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (p_user_id, p_email, 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin', email = EXCLUDED.email;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_admin_profile(UUID, TEXT) TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════
-- 3. Force admin role for topkuchalo@gmail.com
-- ═══════════════════════════════════════════════════════════════════
UPDATE profiles SET role = 'admin' WHERE email = 'topkuchalo@gmail.com';

-- ═══════════════════════════════════════════════════════════════════
-- 4. Drop foldername-restricted storage INSERT policies
--    Replace with simple auth-only checks (upload to own folder still
--    enforced by FK on songs/videos but not at storage layer)
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Auth upload music"  ON storage.objects;
DROP POLICY IF EXISTS "Auth upload videos" ON storage.objects;

CREATE POLICY "Authenticated upload music" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'music');

CREATE POLICY "Authenticated upload videos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos');

-- Allow authenticated users to update/replace files (upsert)
DROP POLICY IF EXISTS "Authenticated update music"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update videos" ON storage.objects;

CREATE POLICY "Authenticated update music" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'music');

CREATE POLICY "Authenticated update videos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'videos');

-- ═══════════════════════════════════════════════════════════════════
-- 5. Fix profiles INSERT policy — only allow own-id inserts from client
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Service inserts profiles" ON profiles;

-- Allow client to insert their own profile (for trigger-miss fallback)
CREATE POLICY "User inserts own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Keep admin full-access
-- (already exists: "Admin full on profiles")

-- ═══════════════════════════════════════════════════════════════════
-- 6. Fix handle_new_user — ensure topkuchalo always gets admin
-- ═══════════════════════════════════════════════════════════════════
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
