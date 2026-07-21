
-- Drop old tables
DROP TABLE IF EXISTS artist_plan_purchases, purchases, payments, playlist_songs, playlists,
  notifications, song_likes, video_likes, comments, tickets, events, merchandise, albums, songs,
  videos, categories, hero_slides, advertisements, external_music, artists, followers, app_settings, profiles CASCADE;

DROP TYPE IF EXISTS user_role, artist_plan_type, payment_method, payment_status, content_type CASCADE;

-- ENUMS
CREATE TYPE user_role AS ENUM ('visitor', 'user', 'artist', 'admin');
CREATE TYPE artist_plan_type AS ENUM ('daily', 'weekly', 'annual');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE content_type AS ENUM ('song', 'video', 'ticket', 'product', 'artist_plan');

-- PROFILES
CREATE TABLE profiles (
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

CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS user_role LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;

CREATE OR REPLACE FUNCTION is_first_user()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*) = 0 FROM profiles;
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role user_role;
BEGIN
  IF is_first_user() THEN v_role := 'admin'; ELSE v_role := 'user'; END IF;
  INSERT INTO public.profiles (id, email, role) VALUES (NEW.id, NEW.email, v_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE VIEW public_profiles AS
  SELECT id, username, full_name, avatar_url, bio, role, created_at FROM profiles;

-- CATEGORIES
CREATE TABLE categories (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL UNIQUE,
  slug  text NOT NULL UNIQUE,
  icon  text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('Zambian Music','zambian-music','🇿🇲',1),('Afrobeats','afrobeats','🎵',2),
  ('Hip Hop','hip-hop','🎤',3),('Gospel','gospel','✝️',4),
  ('R&B','rnb','🎶',5),('Pop','pop','⭐',6),
  ('Reggae','reggae','🌿',7),('Electronic','electronic','🎧',8);

-- EXTERNAL MUSIC
CREATE TABLE external_music (
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

-- ARTISTS
CREATE TABLE artists (
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

-- ALBUMS
CREATE TABLE albums (
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

-- SONGS
CREATE TABLE songs (
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

-- VIDEOS
CREATE TABLE videos (
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

-- PRODUCTS
CREATE TABLE products (
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

-- EVENTS
CREATE TABLE events (
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

-- TICKETS
CREATE TABLE tickets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payment_id    uuid,
  qr_code       text,
  ticket_number text UNIQUE NOT NULL DEFAULT 'TEMP',
  status        text DEFAULT 'active',
  created_at    timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.ticket_number := 'ZV-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text, 1, 8));
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_ticket_number BEFORE INSERT ON tickets FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- PAYMENTS
CREATE TABLE payments (
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

-- PURCHASES
CREATE TABLE purchases (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  content_id   uuid NOT NULL,
  payment_id   uuid REFERENCES payments(id),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, content_type, content_id)
);

-- ARTIST PLAN PURCHASES
CREATE TABLE artist_plan_purchases (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan       artist_plan_type NOT NULL,
  payment_id uuid REFERENCES payments(id),
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  active     boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- PLAYLISTS
CREATE TABLE playlists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  cover_url   text,
  public      boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE playlist_songs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_id     uuid NOT NULL REFERENCES external_music(id) ON DELETE CASCADE,
  position    int DEFAULT 0,
  added_at    timestamptz DEFAULT now(),
  UNIQUE(playlist_id, song_id)
);

-- LIKES
CREATE TABLE song_likes (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  song_id    uuid NOT NULL REFERENCES external_music(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, song_id)
);

CREATE TABLE video_likes (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id   uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

-- COMMENTS
CREATE TABLE comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  content_id   uuid NOT NULL,
  body         text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        text NOT NULL,
  body         text NOT NULL,
  type         text DEFAULT 'info',
  read         boolean DEFAULT false,
  metadata     jsonb DEFAULT '{}',
  created_at   timestamptz DEFAULT now()
);

-- APP SETTINGS
CREATE TABLE app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);
INSERT INTO app_settings (key, value) VALUES
  ('app_name', '"ZedVevo"'),
  ('app_logo', 'null'),
  ('lipila_api_url', '"https://lipila.net/api"'),
  ('lipila_api_key', '""'),
  ('jamendo_client_id', '""'),
  ('homepage_sections', '["featured_songs","trending","new_releases","featured_videos","artists","categories","products","events"]');

-- FOLLOWERS
CREATE TABLE followers (
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  artist_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, artist_id)
);

-- ENABLE RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_music ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_plan_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
CREATE POLICY "Admin full on profiles" ON profiles FOR ALL TO authenticated USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');
CREATE POLICY "User view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid()=id);
CREATE POLICY "User update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid()=id) WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));
CREATE POLICY "Anon view profiles" ON profiles FOR SELECT TO anon USING (profile_public=true);

CREATE POLICY "Anyone reads categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admin manages categories" ON categories FOR ALL TO authenticated USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

CREATE POLICY "Anyone reads external_music" ON external_music FOR SELECT USING (true);
CREATE POLICY "Admin manages external_music" ON external_music FOR ALL TO authenticated USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');
CREATE POLICY "Service manages external_music" ON external_music FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Anyone reads artists" ON artists FOR SELECT USING (true);
CREATE POLICY "Artist manages own" ON artists FOR ALL TO authenticated USING (auth.uid()=id) WITH CHECK (auth.uid()=id);
CREATE POLICY "Admin manages artists" ON artists FOR ALL TO authenticated USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

CREATE POLICY "Anyone reads published albums" ON albums FOR SELECT USING (published=true);
CREATE POLICY "Artist manages own albums" ON albums FOR ALL TO authenticated USING (auth.uid()=artist_id) WITH CHECK (auth.uid()=artist_id);
CREATE POLICY "Admin manages albums" ON albums FOR ALL TO authenticated USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

CREATE POLICY "Anyone reads published songs" ON songs FOR SELECT USING (published=true);
CREATE POLICY "Artist manages own songs" ON songs FOR ALL TO authenticated USING (auth.uid()=artist_id) WITH CHECK (auth.uid()=artist_id);
CREATE POLICY "Admin manages songs" ON songs FOR ALL TO authenticated USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

CREATE POLICY "Anyone reads published videos" ON videos FOR SELECT USING (published=true);
CREATE POLICY "Artist manages own videos" ON videos FOR ALL TO authenticated USING (auth.uid()=artist_id) WITH CHECK (auth.uid()=artist_id);
CREATE POLICY "Admin manages videos" ON videos FOR ALL TO authenticated USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

CREATE POLICY "Anyone reads published products" ON products FOR SELECT USING (published=true);
CREATE POLICY "Admin manages products" ON products FOR ALL TO authenticated USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

CREATE POLICY "Anyone reads published events" ON events FOR SELECT USING (published=true);
CREATE POLICY "Admin manages events" ON events FOR ALL TO authenticated USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

CREATE POLICY "User views own tickets" ON tickets FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Service creates tickets" ON tickets FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Admin manages tickets" ON tickets FOR ALL TO authenticated USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

CREATE POLICY "User views own payments" ON payments FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "User creates payments" ON payments FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Service manages payments" ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin views payments" ON payments FOR SELECT TO authenticated USING (get_user_role(auth.uid())='admin');
CREATE POLICY "Admin updates payments" ON payments FOR UPDATE TO authenticated USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

CREATE POLICY "User views own purchases" ON purchases FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Service creates purchases" ON purchases FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Admin views purchases" ON purchases FOR SELECT TO authenticated USING (get_user_role(auth.uid())='admin');

CREATE POLICY "User views own plan" ON artist_plan_purchases FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Service manages plans" ON artist_plan_purchases FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin views plans" ON artist_plan_purchases FOR SELECT TO authenticated USING (get_user_role(auth.uid())='admin');

CREATE POLICY "User manages own playlists" ON playlists FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Anyone reads public playlists" ON playlists FOR SELECT USING (public=true);

CREATE POLICY "User manages playlist songs" ON playlist_songs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM playlists WHERE playlists.id=playlist_songs.playlist_id AND playlists.user_id=auth.uid()));

CREATE POLICY "User manages song likes" ON song_likes FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Anyone reads song likes" ON song_likes FOR SELECT USING (true);

CREATE POLICY "User manages video likes" ON video_likes FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Anyone reads video likes" ON video_likes FOR SELECT USING (true);

CREATE POLICY "Anyone reads comments" ON comments FOR SELECT USING (true);
CREATE POLICY "User manages own comments" ON comments FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Admin manages comments" ON comments FOR ALL TO authenticated USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

CREATE POLICY "User views notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "User updates notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Service creates notifications" ON notifications FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Admin manages notifications" ON notifications FOR ALL TO authenticated USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

CREATE POLICY "Anyone reads app_settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Admin manages app_settings" ON app_settings FOR ALL TO authenticated USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

CREATE POLICY "Anyone reads followers" ON followers FOR SELECT USING (true);
CREATE POLICY "User manages own follows" ON followers FOR ALL TO authenticated USING (auth.uid()=follower_id) WITH CHECK (auth.uid()=follower_id);
