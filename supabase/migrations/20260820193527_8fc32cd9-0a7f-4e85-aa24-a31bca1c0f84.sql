CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round integer NOT NULL DEFAULT 1,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  winner text CHECK (winner IN ('ru','us'))
);

CREATE TABLE public.gift_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('ru','us')),
  gift text NOT NULL CHECK (gift IN ('rose','donut','tiktok','gift','rocket')),
  value integer NOT NULL DEFAULT 1,
  sender text NOT NULL DEFAULT 'guest',
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gift_events_match_idx ON public.gift_events (match_id, created_at);
CREATE INDEX gift_events_created_idx ON public.gift_events (created_at DESC);

GRANT SELECT ON public.matches TO anon, authenticated;
GRANT ALL ON public.matches TO service_role;
GRANT SELECT, INSERT ON public.gift_events TO anon, authenticated;
GRANT ALL ON public.gift_events TO service_role;

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can watch matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Anyone can read the gift feed" ON public.gift_events FOR SELECT USING (true);
CREATE POLICY "Anyone can send gifts to the live match" ON public.gift_events FOR INSERT
  WITH CHECK (
    char_length(sender) BETWEEN 1 AND 32
    AND (message IS NULL OR char_length(message) <= 200)
    AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.ended_at IS NULL)
  );

-- Server-controlled gift value so senders cannot inflate the score.
CREATE OR REPLACE FUNCTION public.set_gift_value()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.value := CASE NEW.gift
    WHEN 'rose' THEN 1
    WHEN 'donut' THEN 2
    WHEN 'tiktok' THEN 5
    WHEN 'gift' THEN 10
    WHEN 'rocket' THEN 25
    ELSE 1 END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER gift_events_set_value
BEFORE INSERT ON public.gift_events
FOR EACH ROW EXECUTE FUNCTION public.set_gift_value();

-- Returns the running match, creating one if needed.
CREATE OR REPLACE FUNCTION public.current_match()
RETURNS public.matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.matches;
BEGIN
  SELECT * INTO m FROM public.matches WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.matches (round) VALUES (1) RETURNING * INTO m;
  END IF;
  RETURN m;
END;
$$;

-- Ends the given match (idempotent) and immediately opens the next one.
CREATE OR REPLACE FUNCTION public.finish_match(p_match uuid, p_winner text)
RETURNS public.matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev public.matches;
  nxt public.matches;
BEGIN
  IF p_winner NOT IN ('ru','us') THEN
    RAISE EXCEPTION 'invalid winner';
  END IF;

  UPDATE public.matches
     SET ended_at = now(), winner = p_winner
   WHERE id = p_match AND ended_at IS NULL
   RETURNING * INTO prev;

  IF NOT FOUND THEN
    RETURN public.current_match();
  END IF;

  INSERT INTO public.matches (round) VALUES (prev.round + 1) RETURNING * INTO nxt;
  RETURN nxt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_match() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_match(uuid, text) TO anon, authenticated;

-- Daily supporter ranking.
CREATE OR REPLACE FUNCTION public.daily_leaderboard()
RETURNS TABLE (sender text, total integer, side text)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT e.sender,
         SUM(e.value)::int AS total,
         (ARRAY_AGG(e.side ORDER BY e.created_at DESC))[1] AS side
    FROM public.gift_events e
   WHERE e.created_at >= date_trunc('day', now())
   GROUP BY e.sender
   ORDER BY total DESC
   LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.daily_leaderboard() TO anon, authenticated;

ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.gift_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_events;

INSERT INTO public.matches (round) VALUES (1);