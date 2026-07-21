
-- Notify artist when a song crosses play milestones (100k, 500k, 1M, 10M)
CREATE OR REPLACE FUNCTION notify_high_streams()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  milestones INT[] := ARRAY[100000, 500000, 1000000, 10000000];
  m INT;
BEGIN
  FOREACH m IN ARRAY milestones LOOP
    IF NEW.plays >= m AND OLD.plays < m THEN
      INSERT INTO notifications (user_id, title, body, type, metadata)
      VALUES (
        NEW.artist_id,
        '🔥 Milestone reached!',
        '"' || NEW.title || '" just hit ' || (m / 1000) || 'K streams!',
        'success',
        jsonb_build_object('song_id', NEW.id, 'plays', NEW.plays)
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_high_streams ON songs;
CREATE TRIGGER trg_high_streams
  AFTER UPDATE OF plays ON songs
  FOR EACH ROW EXECUTE FUNCTION notify_high_streams();

-- Notify artist when a song crosses download milestones (1k, 10k, 50k)
CREATE OR REPLACE FUNCTION notify_high_downloads()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  milestones INT[] := ARRAY[1000, 10000, 50000];
  m INT;
BEGIN
  FOREACH m IN ARRAY milestones LOOP
    IF NEW.downloads >= m AND OLD.downloads < m THEN
      INSERT INTO notifications (user_id, title, body, type, metadata)
      VALUES (
        NEW.artist_id,
        '⬇️ Download milestone!',
        '"' || NEW.title || '" has been downloaded ' || (m / 1000) || 'K times!',
        'info',
        jsonb_build_object('song_id', NEW.id, 'downloads', NEW.downloads)
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_high_downloads ON songs;
CREATE TRIGGER trg_high_downloads
  AFTER UPDATE OF downloads ON songs
  FOR EACH ROW EXECUTE FUNCTION notify_high_downloads();
