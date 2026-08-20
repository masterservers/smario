REVOKE EXECUTE ON FUNCTION public.current_match() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finish_match(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_match() TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_match(uuid, text) TO service_role;