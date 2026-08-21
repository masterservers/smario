import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Arena } from "@/components/game/Arena";
import { type LogEntry, type LogKind } from "@/components/game/EventLog";
import { GameErrorBoundary, GameErrorScreen } from "@/components/GameErrorBoundary";
import { Subtitles } from "@/components/game/Subtitles";
import { loadDifficulty, type Difficulty } from "@/lib/difficulty";
import { loadVariety, VARIETY_DEFAULT, type VarietyConfig } from "@/lib/variety";
import { loadSubtitlesOn } from "@/lib/subtitles";
import { SceneDebugPanel } from "@/components/game/SceneDebugPanel";
import { useRemoteConfig } from "@/lib/useRemoteConfig";
import { RefereeCount } from "@/components/game/RefereeCount";
import { Scoreboard } from "@/components/game/Scoreboard";
import { Button } from "@/components/ui/button";
import { announceHit, announceScene, useCommentary } from "@/hooks/useCommentary";
import { useLiveMatch } from "@/hooks/useLiveMatch";
import { useReferee } from "@/hooks/useReferee";
import { useTopBanner } from "@/hooks/useTopBanner";
import type { Side } from "@/lib/battle";
import { isLang, SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";
import { useBroadcastLang, useControlBus, type ControlMessage } from "@/lib/control";
import { setActiveRound } from "@/lib/hitConfig";
import { publishSubtitle } from "@/lib/subtitles";


const VOICE_LOCALE: Record<Lang, string> = {'en': 'en-US', 'de': 'de-DE', 'sr': 'sr-RS', 'ro': 'ro-RO', 'ru': 'ru-RU'};

type Search = { lang: Lang };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    lang: isLang(search["lang"]) ? search["lang"] : "en",
  }),
  head: () => ({
    meta: [
      { title: "Fight Putin vs Trump — Live Gift Arena" },
      {
        name: "description",
        content:
          "Watch Putin and Trump fight live. Send gifts for Russia or USA, land hits, and follow the multilingual commentator in English, German, Serbian, Romanian and Russian.",
      },
      { property: "og:title", content: "Fight Putin vs Trump — Live Gift Arena" },
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
  useRemoteConfig();
  return (
    <GameErrorBoundary lang={lang}>
      <BattlePage />
    </GameErrorBoundary>
  );
}

function BattlePage() {
  const { lang: linkLang } = Route.useSearch();
  const lang = useBroadcastLang(linkLang);
  const [muted, setMuted] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");

  const [variety, setVariety] = useState<VarietyConfig>(VARIETY_DEFAULT);
  const [captions, setCaptions] = useState(true);

  useEffect(() => {
    setDifficulty(loadDifficulty());
    setVariety(loadVariety());
    setCaptions(loadSubtitlesOn());
  }, []);

  const [log, setLog] = useState<LogEntry[]>([]);


  const pushLog = useCallback((kind: LogKind, text: string) => {
    setLog((prev) => [
      ...prev.slice(-59),
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, text, at: Date.now() },
    ]);
  }, []);

  const { matchId, round, events, state, viewers } = useLiveMatch(lang, pushLog);
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



  const leader: Side | null =
    state.scoreRu === state.scoreUs ? null : state.scoreRu > state.scoreUs ? "ru" : "us";

  return (
    <main
      className="fixed inset-0 h-[100dvh] w-screen touch-pan-x overflow-hidden overscroll-none bg-background"
      style={{ ["--hud" as string]: "0px" }}
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
          onScene={announceScene}
        />
        <RefereeCount lang={lang} referee={referee} />
        <SceneDebugPanel />
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

      {/* The whole area under the ring stays empty — guests walk in there.
          Gifts, chat, language and tuning now live only in /admin. */}

      {/* Minimal rail at the top-right: sound + admin, never over the mat. */}
      <div className="absolute right-2 top-14 z-20 flex flex-col items-center gap-2">
        <Button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={t.commentator}
          aria-pressed={!muted}
          variant="outline"
          size="icon"
          className="size-9 shrink-0 rounded-full bg-background/80 text-sm backdrop-blur-md md:size-10"
        >
          {muted ? "🔇" : "🔊"}
        </Button>
        <Link
          to="/admin"
          search={{ lang }}
          aria-label="Admin"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-background/80 text-sm backdrop-blur-md md:size-10"
        >
          ⚙️
        </Link>
      </div>


      <Subtitles enabled={captions} />
    </main>
  );
}
