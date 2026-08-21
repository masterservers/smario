CREATE TABLE public.combat_asset_production (
  asset_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'planned',
  actual_src TEXT,
  duration NUMERIC,
  width INTEGER,
  height INTEGER,
  fps NUMERIC,
  impact_seconds NUMERIC,
  mime_type TEXT,
  file_size BIGINT,
  technical_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  visual_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  rejection_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT combat_asset_production_status_check CHECK (status IN ('planned','uploaded','technical-review','visual-review','approved','registered','rejected'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.combat_asset_production TO authenticated;
GRANT ALL ON public.combat_asset_production TO service_role;

ALTER TABLE public.combat_asset_production ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read combat asset production"
  ON public.combat_asset_production FOR SELECT TO authenticated
  USING (public.current_user_has_role('admin'::app_role) OR public.current_user_has_role('moderator'::app_role));

CREATE POLICY "Admins insert combat asset production"
  ON public.combat_asset_production FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_role('admin'::app_role));

CREATE POLICY "Admins update combat asset production"
  ON public.combat_asset_production FOR UPDATE TO authenticated
  USING (public.current_user_has_role('admin'::app_role))
  WITH CHECK (public.current_user_has_role('admin'::app_role));

CREATE POLICY "Admins delete combat asset production"
  ON public.combat_asset_production FOR DELETE TO authenticated
  USING (public.current_user_has_role('admin'::app_role));