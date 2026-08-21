CREATE TABLE public.match_outfits (
  match_id uuid PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
  ru text NOT NULL DEFAULT 'suit' CHECK (ru IN ('suit','gear')),
  us text NOT NULL DEFAULT 'suit' CHECK (us IN ('suit','gear')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.match_outfits TO anon;
GRANT SELECT ON public.match_outfits TO authenticated;
GRANT ALL ON public.match_outfits TO service_role;
ALTER TABLE public.match_outfits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read the fighters outfit" ON public.match_outfits FOR SELECT TO anon, authenticated USING (true);