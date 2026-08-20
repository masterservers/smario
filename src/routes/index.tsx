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
  const [showBoard, setShowBoard] = useState(false);

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
    <main className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <h1 className="sr-only">
        {names.ru} vs {names.us} — {t.live}
      </h1>

      {/* Full-screen ring */}
      <Arena
        lang={lang}
        events={events}
        ko={state.ko}
        combo={state.combo}
        comboSide={state.comboSide}
      />

      {/* Top HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-2 sm:p-3">
        <div className="pointer-events-auto mx-auto flex w-full max-w-4xl flex-col gap-2">
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
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <CommentaryBar
                lang={lang}
                lines={lines}
                muted={muted}
                onToggleMute={() => setMuted((m) => !m)}
              />
            </div>
            <div className="flex flex-col items-end gap-2">
              <LangPicker lang={lang} onChange={setLang} />
              <button
                type="button"
                onClick={() => setShowBoard((s) => !s)}
                aria-label={t.leaderboard}
                className="rounded-full border border-border bg-black/50 px-3 py-1.5 text-sm backdrop-blur-md transition-colors hover:bg-accent"
              >
                🔥
              </button>
            </div>
          </div>
          {showBoard && (
            <div className="ml-auto w-full max-w-xs">
              <Leaderboard lang={lang} rows={leaders} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom HUD: live chat left, gifts right */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-2 p-2 sm:p-3">
        <div className="flex h-[38dvh] w-full max-w-sm flex-col justify-end sm:h-[42dvh]">
          <ChatPanel
            lang={lang}
            events={events}
            nickname={nickname}
            overlay
            disabled={!ready || !!state.ko}
            onSend={(side, gift, message) => handleSend(side, gift, message)}
          />
        </div>

        <div className="hidden w-full max-w-[19rem] flex-col gap-2 sm:flex">
          <GiftDock lang={lang} side="ru" overlay disabled={!ready || !!state.ko} onSend={handleSend} />
          <GiftDock lang={lang} side="us" overlay disabled={!ready || !!state.ko} onSend={handleSend} />
        </div>
      </div>

      {/* Compact gift row for phones */}
      <div className="absolute inset-x-0 bottom-[calc(38dvh+0.75rem)] z-20 flex flex-col gap-1.5 px-2 sm:hidden">
        <GiftDock lang={lang} side="ru" overlay disabled={!ready || !!state.ko} onSend={handleSend} />
        <GiftDock lang={lang} side="us" overlay disabled={!ready || !!state.ko} onSend={handleSend} />
      </div>
    </main>
  );
}
