CREATE OR REPLACE FUNCTION public.set_gift_value()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.value := CASE NEW.gift
    WHEN 'rose' THEN 1
    WHEN 'donut' THEN 2
    WHEN 'tiktok' THEN 5
    WHEN 'gift' THEN 10
    WHEN 'rocket' THEN 25
    WHEN 'burger' THEN 3
    WHEN 'vodka' THEN 4
    WHEN 'lightning' THEN 5
    WHEN 'glove' THEN 6
    WHEN 'eagle' THEN 8
    WHEN 'bear' THEN 8
    WHEN 'matryoshka' THEN 10
    WHEN 'statue' THEN 12
    WHEN 'kremlin' THEN 12
    WHEN 'tank' THEN 15
    WHEN 'bomb' THEN 18
    WHEN 'crown' THEN 20
    WHEN 'trophy' THEN 30
    ELSE 1 END;
  RETURN NEW;
END;
$function$;