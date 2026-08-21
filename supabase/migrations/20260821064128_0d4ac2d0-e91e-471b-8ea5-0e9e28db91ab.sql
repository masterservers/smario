DROP TRIGGER IF EXISTS gift_events_enforce_limits ON public.gift_events;
CREATE TRIGGER zz_gift_events_enforce_limits
  BEFORE INSERT ON public.gift_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_gift_limits();