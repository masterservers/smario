import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Arena } from "@/components/game/Arena";
import { ChatPanel } from "@/components/game/ChatPanel";
import { GiftDock } from "@/components/game/GiftDock";
import { EventLog, type LogEntry, type LogKind } from "@/components/game/EventLog";
import { LangPicker } from "@/components/game/LangPicker";
import { MatchSummary } from "@/components/game/MatchSummary";
import { RefereeCount } from "@/components/game/RefereeCount";
import { Leaderboard } from "@/components/game/Leaderboard";
import { Scoreboard } from "@/components/game/Scoreboard";
import { Button } from "@/components/ui/button";
import { useCommentary } from "@/hooks/useCommentary";
import { useLiveMatch } from "@/hooks/useLiveMatch";
import { useReferee } from "@/hooks/useReferee";
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
  component: BattleRoute,
  errorComponent: ({ error }) => <GameErrorScreen error={error} />,
});

function BattleRoute() {
  const { lang } = Route.useSearch();
  return (
    <GameErrorBoundary lang={lang}>
      <BattlePage />
    </GameErrorBoundary>
  );
}

function BattlePage() {
  const { lang } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [muted, setMuted] = useState(true);
  const [showBoard, setShowBoard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  const { round, events, state, leaders, viewers, nickname, ready, sendGift } = useLiveMatch(lang);
  const referee = useReferee(state.hpRu, state.hpUs, state.ko);
  useCommentary(lang, events, state, muted, referee);

  const pushLog = useCallback((kind: LogKind, text: string) => {
    setLog((prev) => [
      ...prev.slice(-59),
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, text, at: Date.now() },
    ]);
  }, []);

  // Gift/chat commands land in the trace as soon as they arrive over the wire.
  const loggedGifts = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const event of events) {
      if (loggedGifts.current.has(event.id)) continue;
      loggedGifts.current.add(event.id);
      pushLog("gift", `${event.sender} → ${event.side.toUpperCase()} · ${event.gift}`);
    }
  }, [events, pushLog]);

  useEffect(() => {
    if (referee.count > 0 && referee.side) {
      pushLog("ref", `count ${referee.count}${referee.final ? "/10" : "/8"} · ${referee.side.toUpperCase()} down`);
    }
  }, [referee.count, referee.side, referee.final, pushLog]);

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
    <main className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-background">
      <h1 className="sr-only">
        {names.ru} vs {names.us} — {t.live}
      </h1>

      {/* Fixed wide ring stage. On phones it is centred in the clear space
          between the compact HUD rows, never pushed down by controls. */}
      <div className="absolute inset-x-0 bottom-[7.25rem] top-11 bg-background sm:inset-0">
        <Arena
          lang={lang}
          events={events}
          ko={state.ko}
          combo={state.combo}
          comboSide={state.comboSide}
          paused={referee.count > 0 && !referee.koConfirmed}
          koConfirmed={referee.koConfirmed}
          onLog={pushLog}
        />
        <RefereeCount lang={lang} referee={referee} />
      </div>

      {/* Slim HUD strip on top — scoreboard only */}
      <div className="absolute inset-x-0 top-0 z-10">
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

      {/* Slim HUD strip at the bottom — gifts only */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 p-1.5 sm:p-2">
        {showChat && (
          <div className="mx-auto flex max-h-[30dvh] w-full max-w-3xl min-h-0 flex-col justify-end overflow-hidden">
            <ChatPanel
              lang={lang}
              events={events}
              nickname={nickname}
              overlay
              disabled={!ready || !!state.ko || referee.count > 0}
              onSend={(side, gift, message) => handleSend(side, gift, message)}
            />
          </div>
        )}
        {referee.koConfirmed && (
          <div className="mx-auto w-full max-w-md">
            <MatchSummary
              lang={lang}
              events={events}
              action={
                <Link
                  to="/replays"
                  search={{ lang }}
                  className="display inline-block rounded-md border border-gold px-3 py-1 text-sm text-gold"
                >
                  ⏪ {t.watchReplay}
                </Link>
              }
            />
          </div>
        )}
        {showLog && (
          <div className="mx-auto w-full max-w-md">
            <EventLog lang={lang} entries={log} />
          </div>
        )}
        {showBoard && (
          <div className="mx-auto w-full max-w-sm">
            <Leaderboard lang={lang} rows={leaders} />
          </div>
        )}
        <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-1.5 opacity-90">
          <GiftDock lang={lang} side="ru" overlay disabled={!ready || !!state.ko || referee.count > 0} onSend={handleSend} />
          <GiftDock lang={lang} side="us" overlay disabled={!ready || !!state.ko || referee.count > 0} onSend={handleSend} />
        </div>
      </div>

      {/* Controls stay directly below the score on phones, never over the
          centre of the ring. Desktop keeps the compact side rail. */}
      <div className="fight-controls absolute right-1.5 top-12 z-20 flex items-center gap-1 md:bottom-1/2 md:right-2 md:top-auto md:translate-y-1/2 md:flex-col md:gap-2">
        <LangPicker lang={lang} onChange={setLang} />
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
          onClick={() => setShowChat((s) => !s)}
          aria-label={t.chatPlaceholder}
          variant="outline"
          size="icon"
          className="size-9 shrink-0 rounded-full bg-background/80 text-base backdrop-blur-md sm:size-10"
        >
          💬
        </Button>
        <Button
          type="button"
          onClick={() => setShowBoard((s) => !s)}
          aria-label={t.leaderboard}
          variant="outline"
          size="icon"
          className="fight-secondary-control hidden size-9 shrink-0 rounded-full bg-background/80 text-base backdrop-blur-md md:inline-flex md:size-10"
        >
          🔥
        </Button>
        <Button
          type="button"
          onClick={() => setShowLog((s) => !s)}
          aria-label={t.eventLog}
          variant="outline"
          size="icon"
          className="fight-secondary-control hidden size-9 shrink-0 rounded-full bg-background/80 text-base backdrop-blur-md md:inline-flex md:size-10"
        >
          🧾
        </Button>
        <Link
          to="/replays"
          search={{ lang }}
          aria-label={t.replays}
          className="fight-secondary-control hidden size-10 place-items-center rounded-full border border-border bg-background/80 text-base backdrop-blur-md transition-colors hover:bg-accent md:grid"
        >
          ⏪
        </Link>
        <Link
          to="/live"
          search={{ lang }}
          aria-label={t.watchLive}
          className="fight-secondary-control hidden size-10 place-items-center rounded-full border border-border bg-background/80 text-base backdrop-blur-md transition-colors hover:bg-accent md:grid"
        >
          📡
        </Link>
      </div>
    </main>
  );
}



