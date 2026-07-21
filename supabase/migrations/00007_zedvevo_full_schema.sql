
-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('visitor', 'user', 'artist', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE artist_plan_type AS ENUM ('daily', 'weekly', 'annual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE artist_plan_type ADD VALUE IF NOT EXISTS 'single';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE content_type AS ENUM ('song', 'video', 'ticket', 'product', 'artist_plan');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS user_role LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;

CREATE OR REPLACE FUNCTION is_first_user()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*) = 0 FROM profiles;
$$;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text UNIQUE,
  username     text UNIQUE,
  full_name    text,
  avatar_url   text,
  bio          text,
  phone        text,
  role         user_role NOT NULL DEFAULT 'user',
  language     text DEFAULT 'en',
  notifications_enabled boolean DEFAULT true,
  profile_public boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role user_role;
BEGIN
  IF is_first_user() THEN v_role := 'admin'; ELSE v_role := 'user'; END IF;
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, v_role)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles AS
  SELECT id, username, full_name, avatar_url, bio, role, created_at FROM profiles;

-- Policies
DROP POLICY IF EXISTS "Admin full on profiles" ON profiles;
CREATE POLICY "Admin full on profiles" ON profiles FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

DROP POLICY IF EXISTS "User view own profile" ON profiles;
CREATE POLICY "User view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid()=id);

DROP POLICY IF EXISTS "User update own profile" ON profiles;
CREATE POLICY "User update own profile" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid()=id) WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));

DROP POLICY IF EXISTS "Anon view profiles" ON profiles;
CREATE POLICY "Anon view profiles" ON profiles FOR SELECT TO anon USING (profile_public=true);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL UNIQUE,
  slug  text NOT NULL UNIQUE,
  icon  text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads categories" ON categories;
CREATE POLICY "Anyone reads categories" ON categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages categories" ON categories;
CREATE POLICY "Admin manages categories" ON categories FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('Zambian Music','zambian-music','🇿🇲',1),
  ('Afrobeats','afrobeats','🎵',2),
  ('Hip Hop','hip-hop','🎤',3),
  ('Gospel','gospel','✝️',4),
  ('R&B','rnb','🎶',5),
  ('Pop','pop','⭐',6),
  ('Reggae','reggae','🌿',7),
  ('Electronic','electronic','🎧',8)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- EXTERNAL MUSIC
-- ============================================================
CREATE TABLE IF NOT EXISTS external_music (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id  text NOT NULL,
  title        text NOT NULL,
  artist       text NOT NULL,
  album        text,
  cover        text,
  audio_url    text NOT NULL,
  genre        text,
  source       text NOT NULL DEFAULT 'jamendo',
  duration     int,
  plays        bigint DEFAULT 0,
  downloads    bigint DEFAULT 0,
  is_premium   boolean DEFAULT false,
  price        numeric(10,2),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(external_id, source)
);
ALTER TABLE external_music ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads external_music" ON external_music;
CREATE POLICY "Anyone reads external_music" ON external_music FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages external_music" ON external_music;
CREATE POLICY "Admin manages external_music" ON external_music FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');
DROP POLICY IF EXISTS "Service manages external_music" ON external_music;
CREATE POLICY "Service manages external_music" ON external_music FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- ARTISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS artists (
  id               uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  artist_name      text NOT NULL,
  cover_url        text,
  genre            text,
  location         text,
  social_links     jsonb DEFAULT '{}',
  verified         boolean DEFAULT false,
  followers        bigint DEFAULT 0,
  plan             artist_plan_type,
  plan_started_at  timestamptz,
  plan_expires_at  timestamptz,
  upload_limit     int,
  uploads_used     int DEFAULT 0,
  active           boolean DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads artists" ON artists;
CREATE POLICY "Anyone reads artists" ON artists FOR SELECT USING (true);
DROP POLICY IF EXISTS "Artist manages own" ON artists;
CREATE POLICY "Artist manages own" ON artists FOR ALL TO authenticated
  USING (auth.uid()=id) WITH CHECK (auth.uid()=id);
DROP POLICY IF EXISTS "Admin manages artists" ON artists;
CREATE POLICY "Admin manages artists" ON artists FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- ============================================================
-- ALBUMS
-- ============================================================
CREATE TABLE IF NOT EXISTS albums (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  cover_url    text,
  genre        text,
  is_premium   boolean DEFAULT false,
  price        numeric(10,2),
  published    boolean DEFAULT false,
  plays        bigint DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads published albums" ON albums;
CREATE POLICY "Anyone reads published albums" ON albums FOR SELECT USING (published=true);
DROP POLICY IF EXISTS "Artist manages own albums" ON albums;
CREATE POLICY "Artist manages own albums" ON albums FOR ALL TO authenticated
  USING (auth.uid()=artist_id) WITH CHECK (auth.uid()=artist_id);
DROP POLICY IF EXISTS "Admin manages albums" ON albums;
CREATE POLICY "Admin manages albums" ON albums FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- ============================================================
-- SONGS
-- ============================================================
CREATE TABLE IF NOT EXISTS songs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  album_id     uuid REFERENCES albums(id) ON DELETE SET NULL,
  title        text NOT NULL,
  description  text,
  cover_url    text,
  audio_url    text NOT NULL,
  genre        text,
  duration     int,
  is_premium   boolean DEFAULT false,
  price        numeric(10,2),
  published    boolean DEFAULT false,
  plays        bigint DEFAULT 0,
  downloads    bigint DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads published songs" ON songs;
CREATE POLICY "Anyone reads published songs" ON songs FOR SELECT USING (published=true);
DROP POLICY IF EXISTS "Artist manages own songs" ON songs;
CREATE POLICY "Artist manages own songs" ON songs FOR ALL TO authenticated
  USING (auth.uid()=artist_id) WITH CHECK (auth.uid()=artist_id);
DROP POLICY IF EXISTS "Admin manages songs" ON songs;
CREATE POLICY "Admin manages songs" ON songs FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- ============================================================
-- VIDEOS
-- ============================================================
CREATE TABLE IF NOT EXISTS videos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  thumbnail_url text,
  video_url     text NOT NULL,
  genre         text,
  duration      int,
  is_premium    boolean DEFAULT false,
  price         numeric(10,2),
  published     boolean DEFAULT false,
  plays         bigint DEFAULT 0,
  downloads     bigint DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads published videos" ON videos;
CREATE POLICY "Anyone reads published videos" ON videos FOR SELECT USING (published=true);
DROP POLICY IF EXISTS "Artist manages own videos" ON videos;
CREATE POLICY "Artist manages own videos" ON videos FOR ALL TO authenticated
  USING (auth.uid()=artist_id) WITH CHECK (auth.uid()=artist_id);
DROP POLICY IF EXISTS "Admin manages videos" ON videos;
CREATE POLICY "Admin manages videos" ON videos FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  price        numeric(10,2) NOT NULL,
  images       text[] DEFAULT '{}',
  category     text NOT NULL,
  stock        int DEFAULT 0,
  published    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads published products" ON products;
CREATE POLICY "Anyone reads published products" ON products FOR SELECT USING (published=true);
DROP POLICY IF EXISTS "Admin manages products" ON products;
CREATE POLICY "Admin manages products" ON products FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  banner_url   text,
  venue        text NOT NULL,
  event_date   timestamptz NOT NULL,
  ticket_price numeric(10,2) NOT NULL,
  total_qty    int NOT NULL,
  sold_qty     int DEFAULT 0,
  published    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads published events" ON events;
CREATE POLICY "Anyone reads published events" ON events FOR SELECT USING (published=true);
DROP POLICY IF EXISTS "Admin manages events" ON events;
CREATE POLICY "Admin manages events" ON events FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- ============================================================
-- TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payment_id    uuid,
  qr_code       text,
  ticket_number text UNIQUE NOT NULL DEFAULT 'TEMP',
  status        text DEFAULT 'active',
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.ticket_number := 'ZV-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text, 1, 8));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS set_ticket_number ON tickets;
CREATE TRIGGER set_ticket_number BEFORE INSERT ON tickets FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

DROP POLICY IF EXISTS "User views own tickets" ON tickets;
CREATE POLICY "User views own tickets" ON tickets FOR SELECT TO authenticated USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "Service creates tickets" ON tickets;
CREATE POLICY "Service creates tickets" ON tickets FOR INSERT TO service_role WITH CHECK (true);
DROP POLICY IF EXISTS "Admin manages tickets" ON tickets;
CREATE POLICY "Admin manages tickets" ON tickets FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount       numeric(10,2) NOT NULL,
  currency     text DEFAULT 'ZMW',
  content_type content_type NOT NULL,
  content_id   uuid,
  status       payment_status DEFAULT 'pending',
  lipila_ref   text,
  phone_number text,
  metadata     jsonb DEFAULT '{}',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User views own payments" ON payments;
CREATE POLICY "User views own payments" ON payments FOR SELECT TO authenticated USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "User creates payments" ON payments;
CREATE POLICY "User creates payments" ON payments FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Service manages payments" ON payments;
CREATE POLICY "Service manages payments" ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admin views payments" ON payments;
CREATE POLICY "Admin views payments" ON payments FOR SELECT TO authenticated USING (get_user_role(auth.uid())='admin');
DROP POLICY IF EXISTS "Admin updates payments" ON payments;
CREATE POLICY "Admin updates payments" ON payments FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- ============================================================
-- PURCHASES
-- ============================================================
CREATE TABLE IF NOT EXISTS purchases (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  content_id   uuid NOT NULL,
  payment_id   uuid REFERENCES payments(id),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, content_type, content_id)
);
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User views own purchases" ON purchases;
CREATE POLICY "User views own purchases" ON purchases FOR SELECT TO authenticated USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "Service creates purchases" ON purchases;
CREATE POLICY "Service creates purchases" ON purchases FOR INSERT TO service_role WITH CHECK (true);
DROP POLICY IF EXISTS "Admin views purchases" ON purchases;
CREATE POLICY "Admin views purchases" ON purchases FOR SELECT TO authenticated USING (get_user_role(auth.uid())='admin');

-- ============================================================
-- ARTIST PLAN PURCHASES
-- ============================================================
CREATE TABLE IF NOT EXISTS artist_plan_purchases (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan       artist_plan_type NOT NULL,
  payment_id uuid REFERENCES payments(id),
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  active     boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE artist_plan_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User views own plan" ON artist_plan_purchases;
CREATE POLICY "User views own plan" ON artist_plan_purchases FOR SELECT TO authenticated USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "Service manages plans" ON artist_plan_purchases;
CREATE POLICY "Service manages plans" ON artist_plan_purchases FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admin views plans" ON artist_plan_purchases;
CREATE POLICY "Admin views plans" ON artist_plan_purchases FOR SELECT TO authenticated USING (get_user_role(auth.uid())='admin');

-- ============================================================
-- PLAYLISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS playlists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  cover_url   text,
  public      boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User manages own playlists" ON playlists;
CREATE POLICY "User manages own playlists" ON playlists FOR ALL TO authenticated
  USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Anyone reads public playlists" ON playlists;
CREATE POLICY "Anyone reads public playlists" ON playlists FOR SELECT USING (public=true);

CREATE TABLE IF NOT EXISTS playlist_songs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_id     uuid NOT NULL REFERENCES external_music(id) ON DELETE CASCADE,
  position    int DEFAULT 0,
  added_at    timestamptz DEFAULT now(),
  UNIQUE(playlist_id, song_id)
);
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User manages playlist songs" ON playlist_songs;
CREATE POLICY "User manages playlist songs" ON playlist_songs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM playlists WHERE playlists.id=playlist_songs.playlist_id AND playlists.user_id=auth.uid()));

-- ============================================================
-- LIKES
-- ============================================================
CREATE TABLE IF NOT EXISTS song_likes (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  song_id    uuid NOT NULL REFERENCES external_music(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, song_id)
);
ALTER TABLE song_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User manages song likes" ON song_likes;
CREATE POLICY "User manages song likes" ON song_likes FOR ALL TO authenticated
  USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Anyone reads song likes" ON song_likes;
CREATE POLICY "Anyone reads song likes" ON song_likes FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS video_likes (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id   uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
ALTER TABLE video_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User manages video likes" ON video_likes;
CREATE POLICY "User manages video likes" ON video_likes FOR ALL TO authenticated
  USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Anyone reads video likes" ON video_likes;
CREATE POLICY "Anyone reads video likes" ON video_likes FOR SELECT USING (true);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  content_id   uuid NOT NULL,
  body         text NOT NULL,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads comments" ON comments;
CREATE POLICY "Anyone reads comments" ON comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "User manages own comments" ON comments;
CREATE POLICY "User manages own comments" ON comments FOR ALL TO authenticated
  USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Admin manages comments" ON comments;
CREATE POLICY "Admin manages comments" ON comments FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        text NOT NULL,
  body         text NOT NULL,
  type         text DEFAULT 'info',
  read         boolean DEFAULT false,
  metadata     jsonb DEFAULT '{}',
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User views notifications" ON notifications;
CREATE POLICY "User views notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "User updates notifications" ON notifications;
CREATE POLICY "User updates notifications" ON notifications FOR UPDATE TO authenticated
  USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Service creates notifications" ON notifications;
CREATE POLICY "Service creates notifications" ON notifications FOR INSERT TO service_role WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated creates notifications" ON notifications;
CREATE POLICY "Authenticated creates notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admin manages notifications" ON notifications;
CREATE POLICY "Admin manages notifications" ON notifications FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- ============================================================
-- APP SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads app_settings" ON app_settings;
CREATE POLICY "Anyone reads app_settings" ON app_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages app_settings" ON app_settings;
CREATE POLICY "Admin manages app_settings" ON app_settings FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

INSERT INTO app_settings (key, value) VALUES
  ('app_name',            '"ZedVevo"'),
  ('app_tagline',         '"Zambia''s Entertainment Platform"'),
  ('lipila_api_url',      '"https://lipila.net/api"'),
  ('lipila_api_key',      '""'),
  ('lipila_mode',         '"demo"'),
  ('lipila_business_name','"ZedVevo Ltd"'),
  ('lipila_phone',        '""'),
  ('jamendo_client_id',   '""'),
  ('contact_email',       '"support@zedvevo.com"'),
  ('primary_color',       '"#2563eb"'),
  ('maintenance_mode',    'false'),
  ('registration_open',   'true'),
  ('require_email_verify','false'),
  ('homepage_sections',   '["featured_songs","trending","new_releases","featured_videos","artists","categories","products","events"]')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- FOLLOWERS
-- ============================================================
CREATE TABLE IF NOT EXISTS followers (
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  artist_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, artist_id)
);
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads followers" ON followers;
CREATE POLICY "Anyone reads followers" ON followers FOR SELECT USING (true);
DROP POLICY IF EXISTS "User manages own follows" ON followers;
CREATE POLICY "User manages own follows" ON followers FOR ALL TO authenticated
  USING (auth.uid()=follower_id) WITH CHECK (auth.uid()=follower_id);

-- ============================================================
-- HERO SLIDES
-- ============================================================
CREATE TABLE IF NOT EXISTS hero_slides (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  subtitle    text,
  image_url   text,
  link_url    text,
  link_label  text,
  sort_order  int DEFAULT 0,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads hero_slides" ON hero_slides;
CREATE POLICY "Anyone reads hero_slides" ON hero_slides FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages hero_slides" ON hero_slides;
CREATE POLICY "Admin manages hero_slides" ON hero_slides FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- ============================================================
-- FEATURED CONTENT
-- ============================================================
CREATE TABLE IF NOT EXISTS featured_content (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section      text NOT NULL,
  content_id   uuid NOT NULL,
  sort_order   int DEFAULT 0,
  active       boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE featured_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads featured_content" ON featured_content;
CREATE POLICY "Anyone reads featured_content" ON featured_content FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages featured_content" ON featured_content;
CREATE POLICY "Admin manages featured_content" ON featured_content FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- ============================================================
-- ADVERTISEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS advertisements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  image_url   text,
  link_url    text,
  placement   text NOT NULL DEFAULT 'banner',
  active      boolean DEFAULT true,
  impressions bigint DEFAULT 0,
  clicks      bigint DEFAULT 0,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads active ads" ON advertisements;
CREATE POLICY "Anyone reads active ads" ON advertisements FOR SELECT USING (active=true);
DROP POLICY IF EXISTS "Admin manages ads" ON advertisements;
CREATE POLICY "Admin manages ads" ON advertisements FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- ============================================================
-- SPONSORS
-- ============================================================
CREATE TABLE IF NOT EXISTS sponsors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  logo_url    text,
  website_url text,
  tier        text DEFAULT 'silver',
  sort_order  int DEFAULT 0,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads active sponsors" ON sponsors;
CREATE POLICY "Anyone reads active sponsors" ON sponsors FOR SELECT USING (active=true);
DROP POLICY IF EXISTS "Admin manages sponsors" ON sponsors;
CREATE POLICY "Admin manages sponsors" ON sponsors FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  actor_email text,
  action      text NOT NULL,
  resource    text NOT NULL,
  resource_id text,
  details     jsonb DEFAULT '{}',
  ip_address  text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx   ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON audit_logs(resource, resource_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx  ON audit_logs(created_at DESC);

DROP POLICY IF EXISTS "Admin reads audit_logs" ON audit_logs;
CREATE POLICY "Admin reads audit_logs" ON audit_logs FOR SELECT TO authenticated
  USING (get_user_role(auth.uid())='admin');
DROP POLICY IF EXISTS "Service writes audit_logs" ON audit_logs;
CREATE POLICY "Service writes audit_logs" ON audit_logs FOR INSERT TO service_role WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated writes audit_logs" ON audit_logs;
CREATE POLICY "Authenticated writes audit_logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION write_audit_log(
  p_actor_id    uuid, p_actor_email text, p_action text,
  p_resource    text, p_resource_id text DEFAULT NULL, p_details jsonb DEFAULT '{}'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO audit_logs(actor_id,actor_email,action,resource,resource_id,details)
  VALUES (p_actor_id,p_actor_email,p_action,p_resource,p_resource_id,p_details);
END;
$$;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('music',    'music',    false, 52428800,  ARRAY['audio/mpeg','audio/wav','audio/x-wav','audio/mp3']),
  ('videos',   'videos',   false, 524288000, ARRAY['video/mp4','video/quicktime']),
  ('albums',   'albums',   true,  5242880,   ARRAY['image/jpeg','image/png','image/webp']),
  ('profiles', 'profiles', true,  5242880,   ARRAY['image/jpeg','image/png','image/webp']),
  ('artists',  'artists',  true,  5242880,   ARRAY['image/jpeg','image/png','image/webp']),
  ('products', 'products', true,  5242880,   ARRAY['image/jpeg','image/png','image/webp']),
  ('tickets',  'tickets',  true,  5242880,   ARRAY['image/jpeg','image/png','image/webp']),
  ('images',   'images',   true,  5242880,   ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
DO $$ BEGIN
  CREATE POLICY "Public read albums"    ON storage.objects FOR SELECT USING (bucket_id='albums');
  CREATE POLICY "Auth upload albums"    ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='albums');
  CREATE POLICY "Public read profiles"  ON storage.objects FOR SELECT USING (bucket_id='profiles');
  CREATE POLICY "Owner manage profiles" ON storage.objects FOR ALL TO authenticated
    USING (bucket_id='profiles' AND auth.uid()::text=(storage.foldername(name))[1])
    WITH CHECK (bucket_id='profiles' AND auth.uid()::text=(storage.foldername(name))[1]);
  CREATE POLICY "Public read artists"   ON storage.objects FOR SELECT USING (bucket_id='artists');
  CREATE POLICY "Artist manages artist files" ON storage.objects FOR ALL TO authenticated
    USING (bucket_id='artists' AND auth.uid()::text=(storage.foldername(name))[1])
    WITH CHECK (bucket_id='artists' AND auth.uid()::text=(storage.foldername(name))[1]);
  CREATE POLICY "Public read products"  ON storage.objects FOR SELECT USING (bucket_id='products');
  CREATE POLICY "Admin manages product files" ON storage.objects FOR ALL TO authenticated
    USING (bucket_id='products') WITH CHECK (bucket_id='products');
  CREATE POLICY "Public read tickets"   ON storage.objects FOR SELECT USING (bucket_id='tickets');
  CREATE POLICY "Public read images"    ON storage.objects FOR SELECT USING (bucket_id='images');
  CREATE POLICY "Auth upload images"    ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='images');
  CREATE POLICY "Auth read music"       ON storage.objects FOR SELECT TO authenticated USING (bucket_id='music');
  CREATE POLICY "Artist upload music"   ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id='music' AND auth.uid()::text=(storage.foldername(name))[1]);
  CREATE POLICY "Artist delete music"   ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id='music' AND auth.uid()::text=(storage.foldername(name))[1]);
  CREATE POLICY "Auth read videos"      ON storage.objects FOR SELECT TO authenticated USING (bucket_id='videos');
  CREATE POLICY "Artist upload videos"  ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id='videos' AND auth.uid()::text=(storage.foldername(name))[1]);
  CREATE POLICY "Artist delete videos"  ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id='videos' AND auth.uid()::text=(storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- NOTIFICATION TRIGGERS (stream & download milestones)
-- ============================================================
CREATE OR REPLACE FUNCTION notify_high_streams()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE milestones INT[] := ARRAY[100000,500000,1000000,10000000]; m INT;
BEGIN
  FOREACH m IN ARRAY milestones LOOP
    IF NEW.plays >= m AND OLD.plays < m THEN
      INSERT INTO notifications(user_id,title,body,type,metadata)
      VALUES(NEW.artist_id,'🔥 Milestone reached!',
        '"'||NEW.title||'" just hit '||(m/1000)||'K streams!','success',
        jsonb_build_object('song_id',NEW.id,'plays',NEW.plays));
    END IF;
  END LOOP;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_high_streams ON songs;
CREATE TRIGGER trg_high_streams AFTER UPDATE OF plays ON songs FOR EACH ROW EXECUTE FUNCTION notify_high_streams();

CREATE OR REPLACE FUNCTION notify_high_downloads()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE milestones INT[] := ARRAY[1000,10000,50000]; m INT;
BEGIN
  FOREACH m IN ARRAY milestones LOOP
    IF NEW.downloads >= m AND OLD.downloads < m THEN
      INSERT INTO notifications(user_id,title,body,type,metadata)
      VALUES(NEW.artist_id,'⬇️ Download milestone!',
        '"'||NEW.title||'" has been downloaded '||(m/1000)||'K times!','info',
        jsonb_build_object('song_id',NEW.id,'downloads',NEW.downloads));
    END IF;
  END LOOP;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_high_downloads ON songs;
CREATE TRIGGER trg_high_downloads AFTER UPDATE OF downloads ON songs FOR EACH ROW EXECUTE FUNCTION notify_high_downloads();
