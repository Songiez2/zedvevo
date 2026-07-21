
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('music',    'music',    false, 52428800, ARRAY['audio/mpeg','audio/wav','audio/x-wav']),
  ('videos',   'videos',   false, 524288000, ARRAY['video/mp4']),
  ('albums',   'albums',   true,  5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('profiles', 'profiles', true,  5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('artists',  'artists',  true,  5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('products', 'products', true,  5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('tickets',  'tickets',  true,  5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('images',   'images',   true,  5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Public read albums" ON storage.objects FOR SELECT USING (bucket_id = 'albums');
CREATE POLICY "Auth upload albums" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'albums');
CREATE POLICY "Owner manage albums" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'albums' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read profiles" ON storage.objects FOR SELECT USING (bucket_id = 'profiles');
CREATE POLICY "Owner manage profiles" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]) WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read artists" ON storage.objects FOR SELECT USING (bucket_id = 'artists');
CREATE POLICY "Artist manages artist files" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'artists' AND auth.uid()::text = (storage.foldername(name))[1]) WITH CHECK (bucket_id = 'artists' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read products" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Admin manages product files" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'products') WITH CHECK (bucket_id = 'products');

CREATE POLICY "Public read tickets" ON storage.objects FOR SELECT USING (bucket_id = 'tickets');
CREATE POLICY "Admin manages ticket files" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'tickets') WITH CHECK (bucket_id = 'tickets');

CREATE POLICY "Public read images" ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "Auth upload images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images');

CREATE POLICY "Authenticated read music" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'music');
CREATE POLICY "Artist upload music" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'music' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Artist manage music" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'music' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated read videos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'videos');
CREATE POLICY "Artist upload videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Artist manage videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
