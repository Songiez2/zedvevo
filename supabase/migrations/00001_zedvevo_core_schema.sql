
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.user_role AS ENUM ('user', 'artist', 'admin');
CREATE TYPE public.artist_plan_type AS ENUM ('k5', 'k100', 'k500');
CREATE TYPE public.content_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.payment_method AS ENUM ('visa', 'mastercard', 'mobile_money');
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE public.purchase_type AS ENUM ('song', 'album', 'video', 'ticket', 'merchandise', 'artist_plan');

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  role public.user_role NOT NULL DEFAULT 'user',
  artist_plan public.artist_plan_type,
  plan_purchased_at timestamptz,
  songs_uploaded int NOT NULL DEFAULT 0,
  tickets_created int NOT NULL DEFAULT 0,
  merch_listed int NOT NULL DEFAULT 0,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;

CREATE POLICY "Admins full access profiles" ON profiles
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Users view own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));

CREATE POLICY "Anon can view profiles" ON profiles
  FOR SELECT TO anon USING (true);

CREATE VIEW public.public_profiles AS
  SELECT id, username, display_name, avatar_url, role, artist_plan, bio FROM profiles;

-- Trigger: sync new users to profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 1),
    split_part(NEW.email, '@', 1),
    CASE WHEN NEW.email = 'topkuchalo@gmail.com' THEN 'admin'::public.user_role ELSE 'user'::public.user_role END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text NOT NULL, -- 'music', 'video', 'merchandise', 'ticket'
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON categories FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Seed categories
INSERT INTO public.categories (name, type, sort_order) VALUES
  ('Afrobeats', 'music', 1), ('Hip Hop', 'music', 2), ('Gospel', 'music', 3),
  ('Reggae', 'music', 4), ('R&B', 'music', 5), ('Traditional', 'music', 6),
  ('Music Videos', 'video', 1), ('Live Performances', 'video', 2), ('Short Films', 'video', 3),
  ('Clothes', 'merchandise', 1), ('Shoes', 'merchandise', 2), ('Caps', 'merchandise', 3),
  ('Accessories', 'merchandise', 4), ('Merchandise', 'merchandise', 5),
  ('Concert', 'ticket', 1), ('Festival', 'ticket', 2), ('Club Night', 'ticket', 3);

-- ============================================================
-- SONGS
-- ============================================================
CREATE TABLE public.songs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist_name text NOT NULL,
  genre text,
  description text,
  cover_url text,
  audio_url text NOT NULL,
  duration int, -- seconds
  price numeric(10,2) NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT true,
  status public.content_status NOT NULL DEFAULT 'pending',
  play_count int NOT NULL DEFAULT 0,
  download_count int NOT NULL DEFAULT 0,
  like_count int NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_trending boolean NOT NULL DEFAULT false,
  category_id uuid REFERENCES public.categories(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads approved songs" ON songs FOR SELECT USING (status = 'approved' OR artist_id = auth.uid() OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Artists insert songs" ON songs FOR INSERT TO authenticated WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Artists update own songs" ON songs FOR UPDATE TO authenticated USING (auth.uid() = artist_id OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Artists delete own songs" ON songs FOR DELETE TO authenticated USING (auth.uid() = artist_id OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Anon reads approved songs" ON songs FOR SELECT TO anon USING (status = 'approved');

-- ============================================================
-- ALBUMS
-- ============================================================
CREATE TABLE public.albums (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist_name text NOT NULL,
  album_type text NOT NULL DEFAULT 'Album', -- Single, EP, Album
  genre text,
  description text,
  cover_url text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT true,
  status public.content_status NOT NULL DEFAULT 'pending',
  category_id uuid REFERENCES public.categories(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads approved albums" ON albums FOR SELECT USING (status = 'approved' OR artist_id = auth.uid() OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Artists insert albums" ON albums FOR INSERT TO authenticated WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Artists update own albums" ON albums FOR UPDATE TO authenticated USING (auth.uid() = artist_id OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Artists delete own albums" ON albums FOR DELETE TO authenticated USING (auth.uid() = artist_id OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Anon reads approved albums" ON albums FOR SELECT TO anon USING (status = 'approved');

CREATE TABLE public.album_songs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  song_id uuid NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  track_number int NOT NULL DEFAULT 1,
  UNIQUE (album_id, song_id)
);
ALTER TABLE public.album_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads album songs" ON album_songs FOR SELECT USING (true);
CREATE POLICY "Authenticated manage album songs" ON album_songs FOR ALL TO authenticated USING (true);

-- ============================================================
-- VIDEOS
-- ============================================================
CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist_name text NOT NULL,
  genre text,
  description text,
  thumbnail_url text,
  video_url text NOT NULL,
  duration int,
  price numeric(10,2) NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT true,
  status public.content_status NOT NULL DEFAULT 'pending',
  play_count int NOT NULL DEFAULT 0,
  download_count int NOT NULL DEFAULT 0,
  like_count int NOT NULL DEFAULT 0,
  comment_count int NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  category_id uuid REFERENCES public.categories(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads approved videos" ON videos FOR SELECT USING (status = 'approved' OR artist_id = auth.uid() OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Artists insert videos" ON videos FOR INSERT TO authenticated WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Artists update own videos" ON videos FOR UPDATE TO authenticated USING (auth.uid() = artist_id OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Artists delete own videos" ON videos FOR DELETE TO authenticated USING (auth.uid() = artist_id OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Anon reads approved videos" ON videos FOR SELECT TO anon USING (status = 'approved');

-- Video comments
CREATE TABLE public.video_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads comments" ON video_comments FOR SELECT USING (true);
CREATE POLICY "Auth users insert comments" ON video_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON video_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR get_user_role(auth.uid()) = 'admin'::user_role);

-- ============================================================
-- TICKETS (EVENTS)
-- ============================================================
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  venue text NOT NULL,
  banner_url text,
  ticket_type text NOT NULL DEFAULT 'General',
  price numeric(10,2) NOT NULL DEFAULT 0,
  quantity_total int NOT NULL DEFAULT 100,
  quantity_sold int NOT NULL DEFAULT 0,
  status public.content_status NOT NULL DEFAULT 'approved',
  category_id uuid REFERENCES public.categories(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads tickets" ON tickets FOR SELECT USING (status = 'approved' OR artist_id = auth.uid() OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Artists insert tickets" ON tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Artists update own tickets" ON tickets FOR UPDATE TO authenticated USING (auth.uid() = artist_id OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Artists delete own tickets" ON tickets FOR DELETE TO authenticated USING (auth.uid() = artist_id OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Anon reads tickets" ON tickets FOR SELECT TO anon USING (status = 'approved');

-- ============================================================
-- MERCHANDISE
-- ============================================================
CREATE TABLE public.merchandise (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  images jsonb NOT NULL DEFAULT '[]',
  thumbnail_url text,
  category_id uuid REFERENCES public.categories(id),
  status public.content_status NOT NULL DEFAULT 'approved',
  stock int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.merchandise ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads merch" ON merchandise FOR SELECT USING (status = 'approved' OR seller_id = auth.uid() OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Artists insert merch" ON merchandise FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Artists update own merch" ON merchandise FOR UPDATE TO authenticated USING (auth.uid() = seller_id OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Artists delete own merch" ON merchandise FOR DELETE TO authenticated USING (auth.uid() = seller_id OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Anon reads merch" ON merchandise FOR SELECT TO anon USING (status = 'approved');

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'ZMW',
  payment_method public.payment_method NOT NULL,
  payment_details jsonb NOT NULL DEFAULT '{}', -- card last4, phone masked, etc.
  status public.payment_status NOT NULL DEFAULT 'pending',
  purchase_type public.purchase_type NOT NULL,
  reference_id uuid, -- FK to the purchased item
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payments" ON payments FOR SELECT TO authenticated USING (auth.uid() = user_id OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Users insert payments" ON payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service updates payments" ON payments FOR UPDATE TO authenticated USING (auth.uid() = user_id OR get_user_role(auth.uid()) = 'admin'::user_role);

-- ============================================================
-- PURCHASES (what users own)
-- ============================================================
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  purchase_type public.purchase_type NOT NULL,
  reference_id uuid NOT NULL, -- song_id, video_id, ticket_id, merch_id, album_id
  payment_id uuid REFERENCES public.payments(id),
  qr_code text, -- for tickets
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own purchases" ON purchases FOR SELECT TO authenticated USING (auth.uid() = user_id OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Users insert purchases" ON purchases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ARTIST PLAN PURCHASES
-- ============================================================
CREATE TABLE public.artist_plan_purchases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  plan_type public.artist_plan_type NOT NULL,
  payment_id uuid REFERENCES public.payments(id),
  amount numeric(10,2) NOT NULL,
  songs_limit int, -- null = unlimited
  tickets_limit int,
  merch_limit int,
  songs_used int NOT NULL DEFAULT 0,
  tickets_used int NOT NULL DEFAULT 0,
  merch_used int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.artist_plan_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own plans" ON artist_plan_purchases FOR SELECT TO authenticated USING (auth.uid() = user_id OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Users insert plans" ON artist_plan_purchases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own plans" ON artist_plan_purchases FOR UPDATE TO authenticated USING (auth.uid() = user_id OR get_user_role(auth.uid()) = 'admin'::user_role);

-- ============================================================
-- PLAYLISTS
-- ============================================================
CREATE TABLE public.playlists (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name text NOT NULL,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own playlists" ON playlists FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Anon reads playlists" ON playlists FOR SELECT TO anon USING (false);

CREATE TABLE public.playlist_songs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  song_id uuid NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (playlist_id, song_id)
);
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own playlist songs" ON playlist_songs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND user_id = auth.uid()));

-- ============================================================
-- LIKES
-- ============================================================
CREATE TABLE public.user_likes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  content_type text NOT NULL, -- 'song', 'video'
  content_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_type, content_id)
);
ALTER TABLE public.user_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own likes" ON user_likes FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Anon reads likes" ON user_likes FOR SELECT TO anon USING (false);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL, -- 'payment', 'purchase', 'plan', 'content_approved', 'content_rejected', 'ticket_sold', 'merch_sold'
  is_read boolean NOT NULL DEFAULT false,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service inserts notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- HERO SLIDES
-- ============================================================
CREATE TABLE public.hero_slides (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  button_text text,
  button_link text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active slides" ON hero_slides FOR SELECT USING (is_active = true OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Anon reads active slides" ON hero_slides FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Admins manage slides" ON hero_slides FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- ============================================================
-- ADVERTISEMENTS
-- ============================================================
CREATE TABLE public.advertisements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  image_url text NOT NULL,
  link text,
  placement text NOT NULL DEFAULT 'home', -- 'home', 'music', 'store'
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active ads" ON advertisements FOR SELECT USING (is_active = true OR get_user_role(auth.uid()) = 'admin'::user_role);
CREATE POLICY "Anon reads active ads" ON advertisements FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Admins manage ads" ON advertisements FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- ============================================================
-- PLATFORM SETTINGS
-- ============================================================
CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads settings" ON platform_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON platform_settings FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

INSERT INTO public.platform_settings (key, value) VALUES
  ('app_name', 'ZedVevo'),
  ('app_tagline', 'Zambia''s #1 Music Platform'),
  ('contact_email', 'support@zedvevo.com'),
  ('contact_phone', '+260 XXX XXX XXX'),
  ('facebook_url', 'https://facebook.com/zedvevo'),
  ('twitter_url', 'https://twitter.com/zedvevo'),
  ('instagram_url', 'https://instagram.com/zedvevo');

-- ============================================================
-- STORAGE BUCKETS (via SQL)
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('zedvevo-music', 'zedvevo-music', true),
  ('zedvevo-videos', 'zedvevo-videos', true),
  ('zedvevo-images', 'zedvevo-images', true),
  ('zedvevo-profiles', 'zedvevo-profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Public read zedvevo-music" ON storage.objects FOR SELECT USING (bucket_id = 'zedvevo-music');
CREATE POLICY "Auth upload zedvevo-music" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'zedvevo-music');
CREATE POLICY "Auth update zedvevo-music" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'zedvevo-music');
CREATE POLICY "Auth delete zedvevo-music" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'zedvevo-music');

CREATE POLICY "Public read zedvevo-videos" ON storage.objects FOR SELECT USING (bucket_id = 'zedvevo-videos');
CREATE POLICY "Auth upload zedvevo-videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'zedvevo-videos');
CREATE POLICY "Auth update zedvevo-videos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'zedvevo-videos');
CREATE POLICY "Auth delete zedvevo-videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'zedvevo-videos');

CREATE POLICY "Public read zedvevo-images" ON storage.objects FOR SELECT USING (bucket_id = 'zedvevo-images');
CREATE POLICY "Auth upload zedvevo-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'zedvevo-images');
CREATE POLICY "Auth update zedvevo-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'zedvevo-images');
CREATE POLICY "Auth delete zedvevo-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'zedvevo-images');

CREATE POLICY "Public read zedvevo-profiles" ON storage.objects FOR SELECT USING (bucket_id = 'zedvevo-profiles');
CREATE POLICY "Auth upload zedvevo-profiles" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'zedvevo-profiles');
CREATE POLICY "Auth update zedvevo-profiles" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'zedvevo-profiles');
CREATE POLICY "Auth delete zedvevo-profiles" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'zedvevo-profiles');
