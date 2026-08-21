import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GIFTS, GIFT_BY_ID, parseChatMessage, type GiftId, type Side } from "@/lib/battle";
import { giftName } from "@/lib/giftCatalog";
import { SIDE_NAME, type Lang } from "@/lib/i18n";
import { useLiveMatch } from "@/hooks/useLiveMatch";

/**
 * Guest chat and gift sending — the arena page keeps the area under the ring
 * empty, so every message and every gift is sent from here.
 */
export function GuestChat({ lang }: { lang: Lang }) {
  const { events, sendGift, ready } = useLiveMatch(lang);
  const [text, setText] = useState("");
  const [error, setError] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const names = SIDE_NAME[lang];

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    const { side, gift } = parseChatMessage(value);
    if (!side) {
      setError(true);
      window.setTimeout(() => setError(false), 2500);
      return;
    }
    void sendGift(side, gift, value.slice(0, 200));
    setText("");
  };

  return (
    <div className="space-y-3">
      <div
        ref={listRef}
        className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-border p-2"
      >
        {events.slice(-60).map((event) => {
          const gift = GIFT_BY_ID[event.gift];
          return (
            <div
              key={event.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm"
              style={{
                borderLeft: `3px solid ${event.side === "ru" ? "var(--ru)" : "var(--us)"}`,
              }}
            >
              <span>{gift?.emoji ?? "🌹"}</span>
              <span className="font-medium">{event.sender}</span>
              <span className="text-muted-foreground">
                → {event.side === "ru" ? names.ru : names.us} · {giftName(event.gift, lang)}
              </span>
            </div>
          );
        })}
        {events.length === 0 && (
          <p className="p-2 text-xs text-muted-foreground">No gifts in this match yet.</p>
        )}
      </div>

      <form className="flex flex-wrap gap-2" onSubmit={submit}>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="RUSSIA rocket / USA burger…"
          aria-label="Guest message"
          className="h-9 min-w-[14rem] flex-1"
        />
        <Button type="submit" size="sm" disabled={!ready}>
          Send
        </Button>
      </form>
      {error && (
        <p className="text-xs text-destructive">
          Name a side: RUSSIA / PUTIN or USA / TRUMP.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {GIFTS.map((gift) =>
          (["ru", "us"] as Side[]).map((side) => (
            <button
              key={`${gift.id}-${side}`}
              type="button"
              disabled={!ready}
              onClick={() => void sendGift(side, gift.id as GiftId)}
              title={`${giftName(gift.id, lang)} → ${side === "ru" ? names.ru : names.us}`}
              className="rounded-full border border-border px-2 py-1 text-xs transition hover:bg-foreground/10 disabled:opacity-50"
              style={{ borderColor: side === "ru" ? "var(--ru)" : "var(--us)" }}
            >
              {gift.emoji} {side.toUpperCase()}
            </button>
          )),
        )}
      </div>
    </div>
  );
}
