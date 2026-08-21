ALTER TABLE public.gift_events ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS gift_events_sender_recent_idx
  ON public.gift_events (match_id, sender, created_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_gift_limits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  burst int;
  per_min int;
  dupes int;
  sender_total int;
  match_burst int;
  flip int;
BEGIN
  NEW.sender := btrim(NEW.sender);
  IF NEW.sender IS NULL OR char_length(NEW.sender) = 0 THEN
    RAISE EXCEPTION 'invalid_sender';
  END IF;

  -- identical gift repeated within 700ms = automated click spam
  SELECT count(*) INTO dupes FROM public.gift_events e
   WHERE e.match_id = NEW.match_id AND e.sender = NEW.sender
     AND e.gift = NEW.gift AND e.side = NEW.side
     AND e.created_at > now() - interval '700 milliseconds';
  IF dupes > 0 THEN
    RAISE EXCEPTION 'too_fast';
  END IF;

  -- max 8 gifts / 10s and 40 gifts / minute per sender
  SELECT count(*) INTO burst FROM public.gift_events e
   WHERE e.match_id = NEW.match_id AND e.sender = NEW.sender
     AND e.created_at > now() - interval '10 seconds';
  IF burst >= 8 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  SELECT count(*) INTO per_min FROM public.gift_events e
   WHERE e.match_id = NEW.match_id AND e.sender = NEW.sender
     AND e.created_at > now() - interval '1 minute';
  IF per_min >= 40 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  -- fairness: one sender cannot carry more than 1200 damage points per match
  SELECT coalesce(sum(e.value), 0) INTO sender_total FROM public.gift_events e
   WHERE e.match_id = NEW.match_id AND e.sender = NEW.sender AND e.flagged = false;
  IF sender_total + NEW.value > 1200 THEN
    RAISE EXCEPTION 'sender_cap';
  END IF;

  -- global flood guard for the whole match
  SELECT count(*) INTO match_burst FROM public.gift_events e
   WHERE e.match_id = NEW.match_id
     AND e.created_at > now() - interval '5 seconds';
  IF match_burst >= 120 THEN
    RAISE EXCEPTION 'match_flood';
  END IF;

  -- anti-fraud: same sender feeding both sides within 5s (score farming)
  SELECT count(*) INTO flip FROM public.gift_events e
   WHERE e.match_id = NEW.match_id AND e.sender = NEW.sender
     AND e.side <> NEW.side
     AND e.created_at > now() - interval '5 seconds';
  IF flip > 0 THEN
    NEW.flagged := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gift_events_enforce_limits ON public.gift_events;
CREATE TRIGGER gift_events_enforce_limits
  BEFORE INSERT ON public.gift_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_gift_limits();
