import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Arena } from "@/components/game/Arena";
import { ChatPanel } from "@/components/game/ChatPanel";
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
  const [showChat, setShowChat] = useState(false);

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
    <main className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-black">
      <h1 className="sr-only">
        {names.ru} vs {names.us} — {t.live}
      </h1>

      {/* Ring: fills the entire viewport, kept clean */}
      <div className="absolute inset-0">
        <Arena
          lang={lang}
          events={events}
          ko={state.ko}
          combo={state.combo}
          comboSide={state.comboSide}
        />
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
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-2 sm:p-3">
        {showChat && (
          <div className="mx-auto flex max-h-[30dvh] w-full max-w-3xl min-h-0 flex-col justify-end overflow-hidden">
            <ChatPanel
              lang={lang}
              events={events}
              nickname={nickname}
              overlay
              disabled={!ready || !!state.ko}
              onSend={(side, gift, message) => handleSend(side, gift, message)}
            />
          </div>
        )}
        {showBoard && (
          <div className="mx-auto w-full max-w-sm">
            <Leaderboard lang={lang} rows={leaders} />
          </div>
        )}
        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-2">
          <GiftDock lang={lang} side="ru" overlay disabled={!ready || !!state.ko} onSend={handleSend} />
          <GiftDock lang={lang} side="us" overlay disabled={!ready || !!state.ko} onSend={handleSend} />
        </div>
      </div>

      {/* Small round controls, no text over the ring */}
      <div className="absolute bottom-1/2 right-2 z-20 flex translate-y-1/2 flex-col gap-2">
        <LangPicker lang={lang} onChange={setLang} />
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={t.commentator}
          className="size-10 rounded-full border border-border bg-black/60 text-base backdrop-blur-md transition-colors hover:bg-accent"
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <button
          type="button"
          onClick={() => setShowChat((s) => !s)}
          aria-label={t.chatPlaceholder}
          className="size-10 rounded-full border border-border bg-black/60 text-base backdrop-blur-md transition-colors hover:bg-accent"
        >
          💬
        </button>
        <button
          type="button"
          onClick={() => setShowBoard((s) => !s)}
          aria-label={t.leaderboard}
          className="size-10 rounded-full border border-border bg-black/60 text-base backdrop-blur-md transition-colors hover:bg-accent"
        >
          🔥
        </button>
      </div>
    </main>
  );
}



