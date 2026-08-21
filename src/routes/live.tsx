import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Arena } from "@/components/game/Arena";
import { GameErrorBoundary, GameErrorScreen } from "@/components/GameErrorBoundary";
import { ChatPanel } from "@/components/game/ChatPanel";
import { GiftDock } from "@/components/game/GiftDock";
import { LangPicker } from "@/components/game/LangPicker";
import { RefereeCount } from "@/components/game/RefereeCount";
import { Scoreboard } from "@/components/game/Scoreboard";
import { Button } from "@/components/ui/button";
import { useCommentary } from "@/hooks/useCommentary";
import { useLiveMatch } from "@/hooks/useLiveMatch";
import { useReferee } from "@/hooks/useReferee";
import type { GiftId, Side } from "@/lib/battle";
import { isLang, SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";

type Search = { lang: Lang };

export const Route = createFileRoute("/live")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    lang: isLang(search['lang']) ? search['lang'] : "en",
  }),
  head: () => ({
    meta: [
      { title: "Live Ring Cam — Putin vs Trump Battle" },
      {
        name: "description",
        content:
          "Spectator mode for the Putin vs Trump gift battle: low-latency ring cam, live score, HP bars, referee count and multilingual commentary.",
      },
      { property: "og:title", content: "Live Ring Cam — Putin vs Trump Battle" },
      {
        property: "og:description",
        content: "Watch the live wrestling battle in real time with the multilingual commentator.",
      },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveRoute,
  errorComponent: ({ error }) => <GameErrorScreen error={error} />,
});

function LiveRoute() {
  const { lang } = Route.useSearch();
  return (
    <GameErrorBoundary lang={lang}>
      <LivePage />
    </GameErrorBoundary>
  );
}

/** Watch-only view: same real-time feed, no controls over the ring. */
function LivePage() {
  const { lang } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [muted, setMuted] = useState(true);
  const [showChat, setShowChat] = useState(false);

  const { round, events, state, viewers, nickname, ready, sendGift } = useLiveMatch(lang);
  const referee = useReferee(state.hpRu, state.hpUs, state.ko);
  useCommentary(lang, events, state, muted, referee);

  const t = UI_TEXT[lang];
  const names = SIDE_NAME[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const busy = !ready || !!state.ko || (referee.count > 0 && !referee.koConfirmed);
  const handleSend = (side: Side, gift: GiftId, message?: string) => {
    void sendGift(side, gift, message);
  };

  const leader: Side | null =
    state.scoreRu === state.scoreUs ? null : state.scoreRu > state.scoreUs ? "ru" : "us";

  return (
    <main className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-background">
      <h1 className="sr-only">
        {names.ru} vs {names.us} — {t.live}
      </h1>

      <div className="absolute inset-x-0 bottom-[7.25rem] top-11 sm:inset-0">
        <Arena
          lang={lang}
          events={events}
          ko={state.ko}
          combo={state.combo}
          comboSide={state.comboSide}
          paused={referee.count > 0 && !referee.koConfirmed}
          koConfirmed={referee.koConfirmed}
        />
        <RefereeCount lang={lang} referee={referee} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
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
      </div>

      {/* Spectators can back a fighter from here: every gift fires the matching
          strike for Russia or the USA in real time. */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 p-1.5 sm:p-2">
        {showChat && (
          <div className="mx-auto flex max-h-[30dvh] w-full max-w-3xl min-h-0 flex-col justify-end overflow-hidden">
            <ChatPanel
              lang={lang}
              events={events}
              nickname={nickname}
              overlay
              disabled={busy}
              onSend={handleSend}
            />
          </div>
        )}
        <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-1.5 opacity-90">
          <GiftDock lang={lang} side="ru" overlay disabled={busy} onSend={handleSend} />
          <GiftDock lang={lang} side="us" overlay disabled={busy} onSend={handleSend} />
        </div>
      </div>

      <div className="fight-controls absolute right-1.5 top-12 z-20 flex items-center gap-1 md:bottom-1/2 md:right-2 md:top-auto md:translate-y-1/2 md:flex-col md:gap-2">
        <LangPicker lang={lang} onChange={(next) => void navigate({ search: { lang: next }, replace: true })} />
        <Button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={t.commentator}
          variant="outline"
          size="icon"
          className="size-9 shrink-0 rounded-full bg-background/80 text-base backdrop-blur-md sm:size-10"
        >
          {muted ? "🔇" : "🔊"}
        </Button>
        <Button
          type="button"
          onClick={() => setShowChat((c) => !c)}
          aria-label={t.chatPlaceholder}
          variant="outline"
          size="icon"
          className="size-9 shrink-0 rounded-full bg-background/80 text-base backdrop-blur-md sm:size-10"
        >
          💬
        </Button>
        <Link
          to="/"
          search={{ lang }}
          aria-label={t.sendGiftsFor}
          className="fight-secondary-control hidden size-10 place-items-center rounded-full border border-border bg-background/80 text-base backdrop-blur-md transition-colors hover:bg-accent md:grid"
        >
          🎁
        </Link>
      </div>
    </main>
  );
}
