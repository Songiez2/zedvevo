
-- ── HERO SLIDES ──────────────────────────────────────────────────
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

-- ── FEATURED CONTENT ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS featured_content (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section      text NOT NULL, -- 'songs','albums','videos','artists','products','events'
  content_id   uuid NOT NULL,
  sort_order   int DEFAULT 0,
  active       boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

-- ── ADVERTISEMENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advertisements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  image_url   text,
  link_url    text,
  placement   text NOT NULL DEFAULT 'banner', -- 'banner','sidebar','popup'
  active      boolean DEFAULT true,
  impressions bigint DEFAULT 0,
  clicks      bigint DEFAULT 0,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ── SPONSORS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sponsors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  logo_url    text,
  website_url text,
  tier        text DEFAULT 'silver', -- 'gold','silver','bronze'
  sort_order  int DEFAULT 0,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ── AUDIT LOGS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  actor_email text,
  action      text NOT NULL,  -- 'create','update','delete','login','logout','ban','unban', etc.
  resource    text NOT NULL,  -- 'user','song','video','product','event','payment', etc.
  resource_id text,
  details     jsonb DEFAULT '{}',
  ip_address  text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON audit_logs(resource, resource_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC);

-- ── ENABLE RLS ───────────────────────────────────────────────────
ALTER TABLE hero_slides      ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       ENABLE ROW LEVEL SECURITY;

-- ── RLS POLICIES ─────────────────────────────────────────────────
-- Hero slides
CREATE POLICY "Anyone reads hero_slides"    ON hero_slides FOR SELECT USING (true);
CREATE POLICY "Admin manages hero_slides"   ON hero_slides FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- Featured content
CREATE POLICY "Anyone reads featured_content"  ON featured_content FOR SELECT USING (true);
CREATE POLICY "Admin manages featured_content" ON featured_content FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- Advertisements
CREATE POLICY "Anyone reads active ads"    ON advertisements FOR SELECT USING (active=true);
CREATE POLICY "Admin manages ads"          ON advertisements FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- Sponsors
CREATE POLICY "Anyone reads active sponsors"   ON sponsors FOR SELECT USING (active=true);
CREATE POLICY "Admin manages sponsors"         ON sponsors FOR ALL TO authenticated
  USING (get_user_role(auth.uid())='admin') WITH CHECK (get_user_role(auth.uid())='admin');

-- Audit logs — admin-only read, service_role writes
CREATE POLICY "Admin reads audit_logs"   ON audit_logs FOR SELECT TO authenticated
  USING (get_user_role(auth.uid())='admin');
CREATE POLICY "Service writes audit_logs" ON audit_logs FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Authenticated writes audit_logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ── ADDITIONAL APP_SETTINGS DEFAULTS ─────────────────────────────
INSERT INTO app_settings (key, value) VALUES
  ('app_tagline',          '"Zambia''s Entertainment Platform"'),
  ('contact_email',        '"support@zedvevo.com"'),
  ('contact_phone',        '""'),
  ('contact_address',      '""'),
  ('social_facebook',      '""'),
  ('social_twitter',       '""'),
  ('social_instagram',     '""'),
  ('social_youtube',       '""'),
  ('social_tiktok',        '""'),
  ('primary_color',        '"#2563eb"'),
  ('logo_url',             'null'),
  ('favicon_url',          'null'),
  ('smtp_host',            '""'),
  ('smtp_port',            '"587"'),
  ('smtp_user',            '""'),
  ('smtp_from_email',      '""'),
  ('smtp_from_name',       '"ZedVevo"'),
  ('sms_provider',         '"none"'),
  ('sms_api_key',          '""'),
  ('sms_sender_id',        '"ZedVevo"'),
  ('lipila_api_url',       '"https://lipila.net/api"'),
  ('lipila_api_key',       '""'),
  ('lipila_business_name', '"ZedVevo Ltd"'),
  ('lipila_phone',         '""'),
  ('lipila_mode',          '"demo"'),
  ('jamendo_client_id',    '""'),
  ('storage_max_file_mb',  '"50"'),
  ('allowed_audio_types',  '"mp3,wav,flac,aac"'),
  ('allowed_video_types',  '"mp4"'),
  ('max_upload_size_mb',   '"500"'),
  ('maintenance_mode',     'false'),
  ('registration_open',    'true'),
  ('require_email_verify', 'false'),
  ('max_login_attempts',   '"10"'),
  ('session_timeout_days', '"30"')
ON CONFLICT (key) DO NOTHING;

-- ── FUNCTION: write audit log ─────────────────────────────────────
CREATE OR REPLACE FUNCTION write_audit_log(
  p_actor_id    uuid,
  p_actor_email text,
  p_action      text,
  p_resource    text,
  p_resource_id text DEFAULT NULL,
  p_details     jsonb DEFAULT '{}'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO audit_logs(actor_id, actor_email, action, resource, resource_id, details)
  VALUES (p_actor_id, p_actor_email, p_action, p_resource, p_resource_id, p_details);
END;
$$;
