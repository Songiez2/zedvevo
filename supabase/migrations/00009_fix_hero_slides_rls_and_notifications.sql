
-- ── HERO SLIDES: open public read, filter active ─────────────────────────────
DROP POLICY IF EXISTS "Public reads hero slides" ON hero_slides;
DROP POLICY IF EXISTS "Anyone can view hero slides" ON hero_slides;
CREATE POLICY "Public reads hero slides" ON hero_slides FOR SELECT USING (true);

-- ── NOTIFICATIONS: real-time counts ──────────────────────────────────────────
-- Make sure notifications table has proper RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own notifications" ON notifications;
DROP POLICY IF EXISTS "User reads own notifications" ON notifications;
DROP POLICY IF EXISTS "User updates own notifications" ON notifications;
DROP POLICY IF EXISTS "Service inserts notifications" ON notifications;

CREATE POLICY "User reads own notifications" ON notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "User updates own notifications" ON notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service inserts notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- ── ARTIST PLAN: add 'single' as valid type if missing ───────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'artist_plan_type'::regtype 
    AND enumlabel = 'single'
  ) THEN
    ALTER TYPE artist_plan_type ADD VALUE 'single';
  END IF;
END$$;

-- ── SONGS: trigger to notify artist on milestone streams ────────────────────
CREATE OR REPLACE FUNCTION notify_artist_milestone()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  milestones INT[] := ARRAY[1000, 10000, 100000, 1000000, 10000000];
  m INT;
  artist_user_id UUID;
BEGIN
  SELECT artist_id INTO artist_user_id FROM songs WHERE id = NEW.id;
  IF artist_user_id IS NULL THEN RETURN NEW; END IF;
  FOREACH m IN ARRAY milestones LOOP
    IF OLD.plays < m AND NEW.plays >= m THEN
      INSERT INTO notifications(user_id, title, body, type, metadata)
      VALUES(
        artist_user_id,
        '🔥 Milestone reached!',
        'Your song "' || NEW.title || '" just hit ' || m || ' streams!',
        'milestone',
        jsonb_build_object('song_id', NEW.id, 'plays', NEW.plays)
      );
    END IF;
  END LOOP;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_notify_artist_milestone ON songs;
CREATE TRIGGER trg_notify_artist_milestone
  AFTER UPDATE OF plays ON songs
  FOR EACH ROW EXECUTE FUNCTION notify_artist_milestone();

-- ── SONGS: trigger to notify artist on download ─────────────────────────────
CREATE OR REPLACE FUNCTION notify_artist_download()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  song_title TEXT;
  artist_user_id UUID;
BEGIN
  IF NEW.content_type != 'song' THEN RETURN NEW; END IF;
  SELECT s.title, s.artist_id INTO song_title, artist_user_id
    FROM songs s WHERE s.id = NEW.content_id::UUID;
  IF artist_user_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO notifications(user_id, title, body, type, metadata)
  VALUES(
    artist_user_id,
    '⬇️ Song downloaded',
    'Someone downloaded your song "' || COALESCE(song_title,'your song') || '"',
    'download',
    jsonb_build_object('purchase_id', NEW.id, 'content_id', NEW.content_id)
  );
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_notify_artist_download ON purchases;
CREATE TRIGGER trg_notify_artist_download
  AFTER INSERT ON purchases
  FOR EACH ROW EXECUTE FUNCTION notify_artist_download();
