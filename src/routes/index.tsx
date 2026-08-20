import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Arena } from "@/components/game/Arena";
import { ChatPanel } from "@/components/game/ChatPanel";
import { CommentaryBar } from "@/components/game/CommentaryBar";
import { GiftDock } from "@/components/game/GiftDock";
import { LangPicker } from "@/components/game/LangPicker";
import { Leaderboard } from "@/components/game/Leaderboard";
import { Scoreboard } from "@/components/game/Scoreboard";
import { useCommentary } from "@/hooks/useCommentary";
import { useLiveMatch } from "@/hooks/useLiveMatch";
import type { GiftId, Side } from "@/lib/battle";
import { isLang, SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";

type Search = { lang: Lang };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    lang: isLang(search['lang']) ? search['lang'] : "en",
  }),
  head: () => ({
    meta: [
      { title: "Putin vs Trump — Live Gift Battle Arena" },
      {
        name: "description",
        content:
          "Watch Putin and Trump fight live. Send gifts for Russia or USA, land hits, and follow the multilingual commentator in English, German, Serbian, Romanian and Russian.",
      },
      { property: "og:title", content: "Putin vs Trump — Live Gift Battle Arena" },
      {
        property: "og:description",
        content:
          "A live wrestling battle powered by viewer gifts. Type RUSSIA or USA and watch your fighter strike.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BattlePage,
});

function BattlePage() {
  const { lang } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [muted, setMuted] = useState(true);

  const { round, events, state, leaders, viewers, nickname, ready, sendGift } = useLiveMatch();
  const lines = useCommentary(lang, events, state, muted);

  const t = UI_TEXT[lang];
  const names = SIDE_NAME[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (next: Lang) => {
    void navigate({ search: { lang: next }, replace: true });
  };

  const handleSend = (side: Side, gift: GiftId, message?: string) => {
    void sendGift(side, gift, message);
  };

  const leader: Side | null =
    state.scoreRu === state.scoreUs ? null : state.scoreRu > state.scoreUs ? "ru" : "us";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 p-3 sm:p-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="display text-2xl leading-none sm:text-4xl">
          <span style={{ color: "var(--ru-glow)" }}>{names.ru}</span>{" "}
          <span className="text-gold">VS</span>{" "}
          <span style={{ color: "var(--us-glow)" }}>{names.us}</span>
        </h1>
        <LangPicker lang={lang} onChange={setLang} />
      </header>

      <Scoreboard
        lang={lang}
        round={round}
        viewers={viewers}
        scoreRu={state.scoreRu}
        scoreUs={state.scoreUs}
        hpRu={state.hpRu}
        hpUs={state.hpUs}
        leader={leader}
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <Arena
            lang={lang}
            lastEvent={events[events.length - 1]}
            ko={state.ko}
            combo={state.combo}
            comboSide={state.comboSide}
          />
          <CommentaryBar
            lang={lang}
            lines={lines}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <GiftDock lang={lang} side="ru" disabled={!ready || !!state.ko} onSend={handleSend} />
            <GiftDock lang={lang} side="us" disabled={!ready || !!state.ko} onSend={handleSend} />
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col gap-3 lg:min-h-0">
          <div className="min-h-[300px] flex-1">
            <ChatPanel
              lang={lang}
              events={events}
              nickname={nickname}
              disabled={!ready || !!state.ko}
              onSend={(side, gift, message) => handleSend(side, gift, message)}
            />
          </div>
          <Leaderboard lang={lang} rows={leaders} />
        </div>
      </div>

      <p className="pb-2 text-center text-xs text-muted-foreground">
        {t.you}: {nickname} · {t.hint}
      </p>
    </main>
  );
}
