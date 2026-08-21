CREATE TABLE public.config_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT 'snapshot',
  bundle jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX config_versions_created_at_idx ON public.config_versions (created_at DESC);
CREATE UNIQUE INDEX config_versions_single_active_idx ON public.config_versions (is_active) WHERE is_active;

GRANT SELECT ON public.config_versions TO anon;
GRANT SELECT ON public.config_versions TO authenticated;
GRANT ALL ON public.config_versions TO service_role;

ALTER TABLE public.config_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read the fight configuration"
ON public.config_versions FOR SELECT
USING (true);