import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Arena } from "@/components/game/Arena";
import { ChatPanel } from "@/components/game/ChatPanel";
import { GiftDock } from "@/components/game/GiftDock";
import { EventLog, type LogEntry, type LogKind } from "@/components/game/EventLog";
import { GameErrorBoundary, GameErrorScreen } from "@/components/GameErrorBoundary";
import { FightControls } from "@/components/game/FightControls";
import { DifficultyPicker } from "@/components/game/DifficultyPicker";
import { RefereePanel } from "@/components/game/RefereePanel";
import { Subtitles } from "@/components/game/Subtitles";
import { useHudHeight } from "@/hooks/useHudHeight";
import { loadDifficulty, saveDifficulty, type Difficulty } from "@/lib/difficulty";
import { loadVariety, saveVariety, VARIETY_DEFAULT, type VarietyConfig } from "@/lib/variety";
import { loadSubtitlesOn, saveSubtitlesOn } from "@/lib/subtitles";
import { getGiftConfig } from "@/lib/giftConfig";
import { MatchSummary } from "@/components/game/MatchSummary";
import { RefereeCount } from "@/components/game/RefereeCount";
import { Leaderboard } from "@/components/game/Leaderboard";
import { Scoreboard } from "@/components/game/Scoreboard";
import { Button } from "@/components/ui/button";
import { announceHit, useCommentary } from "@/hooks/useCommentary";
import { useLiveMatch } from "@/hooks/useLiveMatch";
import { useReferee } from "@/hooks/useReferee";
import { useTopBanner } from "@/hooks/useTopBanner";
import type { GiftId, Side } from "@/lib/battle";
import { isLang, SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";

type Search = { lang: Lang };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    lang: isLang(search["lang"]) ? search["lang"] : "en",
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
  const hud = useHudHeight();
  const [muted, setMuted] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");

  const [variety, setVariety] = useState<VarietyConfig>(VARIETY_DEFAULT);
  const [captions, setCaptions] = useState(true);

  useEffect(() => {
    setDifficulty(loadDifficulty());
    setVariety(loadVariety());
    setCaptions(loadSubtitlesOn());
  }, []);

  const changeVariety = useCallback((value: VarietyConfig) => {
    setVariety(value);
    saveVariety(value);
  }, []);

  const changeDifficulty = useCallback((value: Difficulty) => {
    setDifficulty(value);
    saveDifficulty(value);
  }, []);

  const [showBoard, setShowBoard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  const pushLog = useCallback((kind: LogKind, text: string) => {
    setLog((prev) => [
      ...prev.slice(-59),
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, text, at: Date.now() },
    ]);
  }, []);

  const { matchId, round, events, state, leaders, viewers, nickname, ready, sendGift } = useLiveMatch(
    lang,
    pushLog,
  );
  const referee = useReferee(state.hpRu, state.hpUs, state.ko);
  useCommentary(lang, events, state, muted, referee);
  const banner = useTopBanner({
    lang,
    matchId,
    round,
    ko: state.ko,
    koConfirmed: referee.koConfirmed,
    events,
    muted,
  });

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
      pushLog(
        "ref",
        `count ${referee.count}${referee.final ? "/10" : "/8"} · ${referee.side.toUpperCase()} down`,
      );
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
    // The admin panel can pin a gift to one team regardless of the dock used.
    const target = getGiftConfig()[gift]?.target ?? "auto";
    void sendGift(target === "auto" ? side : target, gift, message);
  };

  const leader: Side | null =
    state.scoreRu === state.scoreUs ? null : state.scoreRu > state.scoreUs ? "ru" : "us";

  return (
    <main
      className="fixed inset-0 h-[100dvh] w-screen touch-pan-x overflow-hidden overscroll-none bg-background"
      style={{ ["--hud" as string]: `${hud.height}px` }}
    >
      <h1 className="sr-only">
        {names.ru} vs {names.us} — {t.live}
      </h1>

      {/* The ring always uses the whole screen; HUD rows float over it so the
          fight never shrinks in landscape or gets pushed down in portrait. */}
      <div className="absolute inset-0 bg-background">
        <Arena
          difficulty={difficulty}
          variety={variety}
          lang={lang}
          events={events}
          ko={state.ko}
          combo={state.combo}
          comboSide={state.comboSide}
          paused={referee.count > 0 && !referee.koConfirmed}
          koConfirmed={referee.koConfirmed}
          onLog={pushLog}
          onHit={announceHit}
        />
        <RefereeCount lang={lang} referee={referee} />
      </div>

      {/* Slim HUD strip on top — scoreboard only */}
      <div className="absolute inset-x-0 top-0 z-10 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]">
        <Scoreboard
          lang={lang}
          round={round}
          viewers={viewers}
          scoreRu={state.scoreRu}
          scoreUs={state.scoreUs}
          hpRu={state.hpRu}
          hpUs={state.hpUs}
          leader={leader}
          matchId={matchId}
          ko={state.ko}
          koConfirmed={referee.koConfirmed}
          banner={banner}
        />
      </div>

      {/* Slim HUD strip at the bottom — gifts only */}
      <div
        ref={hud.ref}
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] sm:p-2"
      >
        {showChat && (
          <div className="mx-auto flex max-h-[30dvh] w-full max-w-3xl min-h-0 flex-col justify-end overflow-hidden">
            <ChatPanel
              lang={lang}
              events={events}
              nickname={nickname}
              overlay
              disabled={!ready}
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
        {/* Phones: every control lives in this bottom row, clear of the ring. */}
        <FightControls
          lang={lang}
          onLang={setLang}
          muted={muted}
          onMute={() => setMuted((m) => !m)}
          onChat={() => setShowChat((s) => !s)}
          className="mx-auto flex w-full max-w-2xl items-center justify-center gap-1.5 [@media(min-width:768px)_and_(min-height:520px)]:hidden"
        >
          <DifficultyPicker lang={lang} value={difficulty} onChange={changeDifficulty} />
        <RefereePanel lang={lang} value={variety} onChange={changeVariety} />
        <Button
          type="button"
          onClick={() =>
            setCaptions((on) => {
              saveSubtitlesOn(!on);
              return !on;
            })
          }
          aria-label={t.commentator}
          aria-pressed={captions}
          variant="outline"
          size="icon"
          className={`size-8 shrink-0 rounded-full bg-background/80 text-sm backdrop-blur-md sm:size-9 md:size-10 md:text-base ${captions ? "" : "opacity-50"}`}
        >
          💬🗒️
        </Button>
        <Link
          to="/admin"
          search={{ lang }}
          aria-label="Gift admin"
          className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-background/80 text-sm backdrop-blur-md sm:size-9 md:size-10"
        >
          ⚙️
        </Link>
          <Button
            type="button"
            onClick={() => setShowBoard((s) => !s)}
            aria-label={t.leaderboard}
            variant="outline"
            size="icon"
            className="size-8 shrink-0 rounded-full bg-background/80 text-sm backdrop-blur-md sm:size-9"
          >
            🔥
          </Button>
          <Link
            to="/live"
            search={{ lang }}
            aria-label={t.watchLive}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-background/80 text-sm backdrop-blur-md sm:size-9"
          >
            📡
          </Link>
        </FightControls>
        <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-1.5 opacity-90">
          <GiftDock
            lang={lang}
            side="ru"
            overlay
            disabled={!ready}
            onSend={handleSend}
          />
          <GiftDock
            lang={lang}
            side="us"
            overlay
            disabled={!ready}
            onSend={handleSend}
          />
        </div>
      </div>

      {/* Desktop only: slim rail at the top-right, never over the fighters. */}
      <FightControls
        lang={lang}
        onLang={setLang}
        muted={muted}
        onMute={() => setMuted((m) => !m)}
        onChat={() => setShowChat((s) => !s)}
        className="fight-controls absolute right-2 top-14 z-20 hidden flex-col items-center gap-2 [@media(min-width:768px)_and_(min-height:520px)]:flex"
      >
        <DifficultyPicker lang={lang} value={difficulty} onChange={changeDifficulty} />
        <RefereePanel lang={lang} value={variety} onChange={changeVariety} />
        <Button
          type="button"
          onClick={() =>
            setCaptions((on) => {
              saveSubtitlesOn(!on);
              return !on;
            })
          }
          aria-label={t.commentator}
          aria-pressed={captions}
          variant="outline"
          size="icon"
          className={`size-8 shrink-0 rounded-full bg-background/80 text-sm backdrop-blur-md sm:size-9 md:size-10 md:text-base ${captions ? "" : "opacity-50"}`}
        >
          💬🗒️
        </Button>
        <Link
          to="/admin"
          search={{ lang }}
          aria-label="Gift admin"
          className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-background/80 text-sm backdrop-blur-md sm:size-9 md:size-10"
        >
          ⚙️
        </Link>
        <Button
          type="button"
          onClick={() => setShowBoard((s) => !s)}
          aria-label={t.leaderboard}
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-full bg-background/80 text-base backdrop-blur-md"
        >
          🔥
        </Button>
        <Button
          type="button"
          onClick={() => setShowLog((s) => !s)}
          aria-label={t.eventLog}
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-full bg-background/80 text-base backdrop-blur-md"
        >
          🧾
        </Button>
        <Link
          to="/replays"
          search={{ lang }}
          aria-label={t.replays}
          className="grid size-10 place-items-center rounded-full border border-border bg-background/80 text-base backdrop-blur-md transition-colors hover:bg-accent"
        >
          ⏪
        </Link>
        <Link
          to="/live"
          search={{ lang }}
          aria-label={t.watchLive}
          className="grid size-10 place-items-center rounded-full border border-border bg-background/80 text-base backdrop-blur-md transition-colors hover:bg-accent"
        >
          📡
        </Link>
      </FightControls>

      <Subtitles enabled={captions} />
    </main>
  );
}
