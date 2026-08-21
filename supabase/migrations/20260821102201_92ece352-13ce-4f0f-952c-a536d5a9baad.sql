CREATE TABLE public.live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT 'Live session',
  lang text NOT NULL DEFAULT 'en',
  allow_gifts boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.live_sessions TO anon;
GRANT SELECT ON public.live_sessions TO authenticated;
GRANT ALL ON public.live_sessions TO service_role;

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check a live session link"
ON public.live_sessions FOR SELECT
TO anon, authenticated
USING (true);