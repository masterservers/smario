import type { CommentaryLine } from "@/hooks/useCommentary";
import { UI_TEXT, type Lang } from "@/lib/i18n";

type Props = {
  lang: Lang;
  lines: CommentaryLine[];
  muted: boolean;
  onToggleMute: () => void;
};

const toneColor: Record<CommentaryLine["tone"], string> = {
  hit: "var(--foreground)",
  big: "var(--gold)",
  ko: "var(--hp-bad)",
  idle: "var(--muted-foreground)",
};

export function CommentaryBar({ lang, lines, muted, onToggleMute }: Props) {
  const t = UI_TEXT[lang];
  const latest = lines[lines.length - 1];

  return (
    <div className="panel flex items-start gap-3 rounded-2xl px-3 py-2.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-lg">
        🎙️
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {t.commentator}
        </div>
        <p
          key={latest?.id}
          className="mt-0.5 text-sm font-semibold leading-snug sm:text-base"
          style={{ color: toneColor[latest?.tone ?? "idle"], animation: "ticker-in 0.3s ease-out" }}
        >
          {latest?.text ?? "…"}
        </p>
      </div>
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? t.muted : t.unmuted}
        className="shrink-0 rounded-full border border-border bg-secondary/60 px-2.5 py-1.5 text-sm transition-colors hover:bg-accent"
      >
        {muted ? "🔇" : "🔊"}
      </button>
    </div>
  );
}
