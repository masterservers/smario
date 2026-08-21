-- 1. Role check: replace the broad, privileged helper with a self-scoped invoker function.
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = auth.uid() AND role = _role
  )
$$;
GRANT EXECUTE ON FUNCTION public.current_user_has_role(app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

-- 2. live_sessions: no direct client reads at all (tokens stay secret).
DROP POLICY IF EXISTS "Anyone can check a live session link" ON public.live_sessions;
REVOKE SELECT ON public.live_sessions FROM anon, authenticated;
GRANT ALL ON public.live_sessions TO service_role;

-- 3. config_versions: only the active bundle is public, without identity columns.
DROP POLICY IF EXISTS "Anyone can read the fight configuration" ON public.config_versions;
CREATE POLICY "Anyone can read the active fight configuration"
  ON public.config_versions FOR SELECT TO anon, authenticated
  USING (is_active = true);
REVOKE SELECT ON public.config_versions FROM anon, authenticated;
GRANT SELECT (id, label, bundle, is_active, created_at) ON public.config_versions TO anon, authenticated;
GRANT ALL ON public.config_versions TO service_role;

-- 4. gift_events: moderation flag hidden, flagged gifts filtered out of the public feed.
DROP POLICY IF EXISTS "Anyone can read the gift feed" ON public.gift_events;
CREATE POLICY "Anyone can read the clean gift feed"
  ON public.gift_events FOR SELECT TO anon, authenticated
  USING (flagged = false);
REVOKE SELECT ON public.gift_events FROM anon, authenticated;
GRANT SELECT (id, match_id, side, gift, value, sender, message, created_at)
  ON public.gift_events TO anon, authenticated;
GRANT ALL ON public.gift_events TO service_role;