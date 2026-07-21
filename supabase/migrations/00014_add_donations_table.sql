
CREATE TABLE IF NOT EXISTS public.donations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  donor_name    text,
  donor_phone   text NOT NULL,
  amount        numeric(10,2) NOT NULL CHECK (amount > 0),
  message       text,
  payment_id    text,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert donations"
  ON public.donations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read all donations"
  ON public.donations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR donor_id = auth.uid()
  );

CREATE POLICY "Admins can update donations"
  ON public.donations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
