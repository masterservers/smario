import { useEffect, useRef, useState } from "react";
import { GIFT_BY_ID, parseChatMessage, type GiftEvent, type GiftId, type Side } from "@/lib/battle";
import { SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";

type Props = {
  lang: Lang;
  events: GiftEvent[];
  nickname: string;
  disabled?: boolean;
  overlay?: boolean;
  onSend: (side: Side, gift: GiftId, message: string) => void;
};

export function ChatPanel({ lang, events, nickname, disabled, overlay, onSend }: Props) {
  const t = UI_TEXT[lang];
  const names = SIDE_NAME[lang];
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    const { side, gift } = parseChatMessage(text);
    if (!side) {
      setError(true);
      window.setTimeout(() => setError(false), 2500);
      return;
    }
    onSend(side, gift, text.slice(0, 200));
    setValue("");
  };

  const recent = events.slice(-40);

  return (
    <div
      className={
        overlay
          ? "flex h-full min-h-0 flex-col justify-end gap-1"
          : "panel flex h-full min-h-0 flex-col rounded-2xl p-3"
      }
    >
      <div ref={listRef} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {recent.map((e) => {
          const gift = GIFT_BY_ID[e.gift];
          const isRu = e.side === "ru";
          return (
            <div
              key={e.id}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm"
              style={{
                background: isRu ? "oklch(0.32 0.14 25 / 0.7)" : "oklch(0.3 0.12 258 / 0.7)",
                backdropFilter: "blur(4px)",
                borderLeft: `3px solid ${isRu ? "var(--ru)" : "var(--us)"}`,
                animation: "ticker-in 0.25s ease-out",
              }}
            >
              <span className="text-base">{gift?.emoji}</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">
                  {e.sender === nickname ? t.you : e.sender}
                </span>{" "}
                <span className="text-muted-foreground">→</span>{" "}
                <span className="display" style={{ color: isRu ? "var(--ru-glow)" : "var(--us-glow)" }}>
                  {isRu ? names.ruTeam : names.usTeam}
                </span>
              </span>
              <span className="display text-xs text-gold">+{e.value}</span>
            </div>
          );
        })}
      </div>

      {!overlay && (
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{t.hint}</p>
      )}

      <form onSubmit={submit} className="mt-1.5 flex gap-1.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t.chatPlaceholder}
          maxLength={200}
          disabled={disabled}
          aria-label={t.chatPlaceholder}
          className={`min-w-0 flex-1 rounded-xl border bg-secondary/50 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary ${
            error ? "border-destructive" : "border-border"
          }`}
        />
        <button
          type="submit"
          disabled={disabled}
          className="display rounded-xl bg-primary px-4 py-2 text-base text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
        >
          {t.send}
        </button>
      </form>
    </div>
  );
}
