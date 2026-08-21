import { useEffect, useRef } from "react";
import { UI_TEXT, type Lang } from "@/lib/i18n";

export type LogKind = "gift" | "chat" | "move" | "impact" | "ref" | "ko" | "replay";

export type LogEntry = {
  id: string;
  kind: LogKind;
  text: string;
  at: number;
};

const ICON: Record<LogKind, string> = {
  gift: "🎁",
  chat: "💬",
  move: "🎬",
  impact: "💥",
  ref: "🧑‍⚖️",
  ko: "🏁",
  replay: "⏪",
};

/** Real-time trace of commands, gifts, triggered moves, KO and replay. */
export function EventLog({ lang, entries }: { lang: Lang; entries: LogEntry[] }) {
  const t = UI_TEXT[lang];
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [entries]);

  return (
    <section className="flex max-h-[26dvh] flex-col overflow-hidden rounded-md border border-border bg-background/80 backdrop-blur-md">
      <header className="border-b border-border px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        {t.eventLog}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1 font-mono text-[11px] leading-snug">
        {entries.length === 0 && <p className="text-muted-foreground">—</p>}
        {entries.map((entry) => (
          <p key={entry.id} className="flex gap-1.5">
            <span className="shrink-0 text-muted-foreground">
              {new Date(entry.at).toLocaleTimeString([], { hour12: false })}
            </span>
            <span className="shrink-0">{ICON[entry.kind]}</span>
            <span className="min-w-0 break-words">{entry.text}</span>
          </p>
        ))}
        <div ref={endRef} />
      </div>
    </section>
  );
}
