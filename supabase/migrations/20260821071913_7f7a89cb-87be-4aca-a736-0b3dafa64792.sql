CREATE OR REPLACE FUNCTION public.enforce_gift_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.sender := btrim(NEW.sender);
  IF NEW.sender IS NULL OR char_length(NEW.sender) = 0 THEN
    NEW.sender := 'guest';
  END IF;
  NEW.flagged := false;
  RETURN NEW;
END;
$$;