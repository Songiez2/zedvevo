
-- 1. Add featured_artists and producer to songs
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS featured_artists TEXT[],
  ADD COLUMN IF NOT EXISTS producer TEXT,
  ADD COLUMN IF NOT EXISTS artist_display_name TEXT;

-- 2. Add multiple images support to products (already has images jsonb[] but we ensure it)
-- Already exists as images TEXT[]

-- 3. Enable realtime for songs and videos (plays/downloads counters)
ALTER PUBLICATION supabase_realtime ADD TABLE songs;
ALTER PUBLICATION supabase_realtime ADD TABLE videos;
