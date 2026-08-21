import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Arena } from "@/components/game/Arena";
import { GameErrorBoundary, GameErrorScreen } from "@/components/GameErrorBoundary";
import { ChatPanel } from "@/components/game/ChatPanel";
import { GiftDock } from "@/components/game/GiftDock";
import { FightControls } from "@/components/game/FightControls";
import { DifficultyPicker } from "@/components/game/DifficultyPicker";
import { useHudHeight } from "@/hooks/useHudHeight";
import { loadDifficulty, saveDifficulty, type Difficulty } from "@/lib/difficulty";
import { SceneDebugPanel } from "@/components/game/SceneDebugPanel";
import { useRemoteConfig } from "@/lib/useRemoteConfig";
import { RefereeCount } from "@/components/game/RefereeCount";
import { Scoreboard } from "@/components/game/Scoreboard";
import { Subtitles } from "@/components/game/Subtitles";
import { Button } from "@/components/ui/button";
import { announceHit, announceScene, useCommentary } from "@/hooks/useCommentary";
import { useLiveMatch } from "@/hooks/useLiveMatch";
import { useReferee } from "@/hooks/useReferee";
import { useTopBanner } from "@/hooks/useTopBanner";
import type { GiftId, Side } from "@/lib/battle";
import { isLang, SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";
import { useBroadcastLang, useControlBus, type ControlMessage } from "@/lib/control";
import { ACCESS_TEXT, useViewerAccess } from "@/lib/liveSession";
import { setActiveRound } from "@/lib/hitConfig";
import { publishSubtitle } from "@/lib/subtitles";

const VOICE_LOCALE: Record<Lang, string> = {'en': 'en-US', 'de': 'de-DE', 'sr': 'sr-RS', 'ro': 'ro-RO', 'ru': 'ru-RU'};

type Search = { lang: Lang; s?: string };

export const Route = createFileRoute("/live")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    lang: isLang(search["lang"]) ? search["lang"] : "en",
    ...(typeof search["s"] === "string" && search["s"] ? { s: search["s"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Live Ring Cam — Fight Putin vs Trump" },
      {
        name: "description",
        content:
          "Spectator mode for the Putin vs Trump gift battle: low-latency ring cam, live score, HP bars, referee count and multilingual commentary.",
      },
      { property: "og:title", content: "Live Ring Cam — Fight Putin vs Trump" },
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
  useRemoteConfig();
  return (
    <GameErrorBoundary lang={lang}>
      <LivePage />
    </GameErrorBoundary>
  );
}

/** Watch-only view: same real-time feed, no controls over the ring. */
function LivePage() {
  const { lang: linkLang, s: sessionToken } = Route.useSearch();
  const access = useViewerAccess(sessionToken);
  const lang = useBroadcastLang(access.lang ?? linkLang);
  const navigate = useNavigate({ from: Route.fullPath });
  const hud = useHudHeight();
  const [muted, setMuted] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");

  useEffect(() => {
    setDifficulty(loadDifficulty());
  }, []);

  const changeDifficulty = useCallback((value: Difficulty) => {
    setDifficulty(value);
    saveDifficulty(value);
  }, []);

  const [showChat, setShowChat] = useState(false);

  const { matchId, round, events, state, viewers, nickname, ready, sendGift } = useLiveMatch(lang);
  const referee = useReferee(state.hpRu, state.hpUs, state.ko);
  useCommentary(lang, events, state, muted, referee, round);
  const banner = useTopBanner({
    lang,
    matchId,
    round,
    ko: state.ko,
    koConfirmed: referee.koConfirmed,
    events,
    muted,
  });

  const t = UI_TEXT[lang];
  const names = SIDE_NAME[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // The gift → hit mapping may differ from round to round.
  useEffect(() => {
    setActiveRound(round);
  }, [round]);

  // Spoken commands pushed live from the admin console.
  useControlBus(
    useCallback(
      (message: ControlMessage) => {
        if (message.type !== "say") return;
        publishSubtitle(message.text, "ref", 4000);
        if (muted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
        const utterance = new SpeechSynthesisUtterance(message.text);
        utterance.lang = VOICE_LOCALE[message.lang];
        window.speechSynthesis.speak(utterance);
      },
      [muted],
    ),
  );

  const busy = !ready;
  const access_text = ACCESS_TEXT[lang];
  const handleSend = (side: Side, gift: GiftId, message?: string) => {
    void sendGift(side, gift, message);
  };

  // An invalid, paused or expired link never reveals the broadcast.
  if (sessionToken && (access.loading || !access.allowed)) {
    return (
      <main className="grid h-[100dvh] place-items-center bg-background p-6 text-center">
        <div>
          <h1 className="display text-lg uppercase tracking-widest">
            {names.ru} vs {names.us}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {access.loading ? access_text.checking : access_text[access.reason === "ok" ? "unknown" : access.reason]}
          </p>
        </div>
      </main>
    );
  }

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

      <div className="absolute inset-0 bg-background">
        <Arena
          difficulty={difficulty}
          lang={lang}
          events={events}
          ko={state.ko}
          combo={state.combo}
          comboSide={state.comboSide}
          paused={referee.count > 0 && !referee.koConfirmed}
          koConfirmed={referee.koConfirmed}
          onHit={announceHit}
          onScene={announceScene}
        />
        <RefereeCount lang={lang} referee={referee} />
        <SceneDebugPanel />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]">
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

      {/* A session link is watch-only unless it was created with gifting on:
          spectators then back a fighter and every gift fires a real strike. */}
      {access.canGift && (
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
                disabled={busy}
                onSend={handleSend}
              />
            </div>
          )}
          <FightControls
            lang={lang}
            onLang={(next) => void navigate({ search: { lang: next }, replace: true })}
            muted={muted}
            onMute={() => setMuted((m) => !m)}
            onChat={() => setShowChat((c) => !c)}
            className="mx-auto flex w-full max-w-2xl items-center justify-center gap-1.5 [@media(min-width:768px)_and_(min-height:520px)]:hidden"
          >
            <DifficultyPicker lang={lang} value={difficulty} onChange={changeDifficulty} />
            <Link
              to="/"
              search={{ lang }}
              aria-label={t.sendGiftsFor}
              className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-background/80 text-sm backdrop-blur-md sm:size-9"
            >
              🎁
            </Link>
          </FightControls>
          <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-1.5 opacity-90">
            <GiftDock lang={lang} side="ru" overlay disabled={busy} onSend={handleSend} />
            <GiftDock lang={lang} side="us" overlay disabled={busy} onSend={handleSend} />
          </div>
        </div>
      )}


      <FightControls
        lang={lang}
        onLang={(next) => void navigate({ search: { lang: next }, replace: true })}
        muted={muted}
        onMute={() => setMuted((m) => !m)}
        onChat={access.canGift ? () => setShowChat((c) => !c) : undefined}
        className="fight-controls absolute right-2 top-14 z-20 hidden flex-col items-center gap-2 [@media(min-width:768px)_and_(min-height:520px)]:flex"
      >
        <DifficultyPicker lang={lang} value={difficulty} onChange={changeDifficulty} />
        {access.canGift && (
        <Link
          to="/"
          search={{ lang }}
          aria-label={t.sendGiftsFor}
          className="grid size-10 place-items-center rounded-full border border-border bg-background/80 text-base backdrop-blur-md transition-colors hover:bg-accent"
        >
          🎁
        </Link>
        )}
      </FightControls>
      <Subtitles />
    </main>
  );
}
