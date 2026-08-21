import type { ReactNode } from "react";
import { LangPicker } from "@/components/game/LangPicker";
import { Button } from "@/components/ui/button";
import { UI_TEXT, type Lang } from "@/lib/i18n";

type Props = {
  lang: Lang;
  onLang: (lang: Lang) => void;
  muted: boolean;
  onMute: () => void;
  /** Omitted for watch-only session links: the chat button disappears. */
  onChat?: (() => void) | undefined;
  /** Desktop-only extras (leaderboard, event log, replays). */
  children?: ReactNode;
  className?: string;
};

/**
 * Control strip. On phones it is rendered inside the bottom HUD row, so no
 * button ever sits over the ring; on desktop it becomes a slim top-right rail.
 */
export function FightControls({ lang, onLang, muted, onMute, onChat, children, className }: Props) {
  const t = UI_TEXT[lang];
  const button =
    "size-8 shrink-0 rounded-full bg-background/80 text-sm backdrop-blur-md sm:size-9 md:size-10 md:text-base";

  return (
    <div className={className}>
      <LangPicker lang={lang} onChange={onLang} />
      <Button
        type="button"
        onClick={onMute}
        aria-label={t.commentator}
        variant="outline"
        size="icon"
        className={button}
      >
        {muted ? "🔇" : "🔊"}
      </Button>
      {onChat && (
        <Button
          type="button"
          onClick={onChat}
          aria-label={t.chatPlaceholder}
          variant="outline"
          size="icon"
          className={button}
        >
          💬
        </Button>
      )}
      {children}
    </div>
  );
}
