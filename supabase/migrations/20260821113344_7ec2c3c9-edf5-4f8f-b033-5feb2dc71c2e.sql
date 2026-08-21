-- user_roles: drop the admin-wide read policy (console reads roles server-side),
-- so the self-check helper can never recurse.
DROP POLICY IF EXISTS "Admins read every role" ON public.user_roles;

-- admin_audit_log: staff checks now use the self-scoped invoker helper.
DROP POLICY IF EXISTS "Staff read the audit log" ON public.admin_audit_log;
CREATE POLICY "Staff read the audit log"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.current_user_has_role('admin') OR public.current_user_has_role('moderator'));

DROP POLICY IF EXISTS "Staff write their own audit entries" ON public.admin_audit_log;
CREATE POLICY "Staff write their own audit entries"
  ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = actor_id
    AND (public.current_user_has_role('admin') OR public.current_user_has_role('moderator'))
  );