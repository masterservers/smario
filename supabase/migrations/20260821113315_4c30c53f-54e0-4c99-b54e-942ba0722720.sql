CREATE POLICY "Staff read live session links"
  ON public.live_sessions FOR SELECT TO authenticated
  USING (public.current_user_has_role('admin') OR public.current_user_has_role('moderator'));
GRANT SELECT ON public.live_sessions TO authenticated;