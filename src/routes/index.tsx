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
    <main className="relative flex h-[100dvh] w-full justify-center overflow-hidden bg-black">
      <h1 className="sr-only">
        {names.ru} vs {names.us} — {t.live}
      </h1>

      {/* Stage: TikTok-style vertical column, ring always fully visible */}
      <div className="relative flex h-full w-full max-w-[560px] flex-col gap-2 overflow-hidden bg-background p-2 shadow-2xl sm:p-3">
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

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <CommentaryBar
              lang={lang}
              lines={lines}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
            />
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 sm:flex-col sm:items-end">

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

        {/* Ring: full frame, no cropping, fills remaining height */}
        <div className="flex min-h-[34dvh] w-full flex-1 justify-center">
          <div className="relative aspect-[1176/960] h-full max-w-full overflow-hidden rounded-xl border border-border bg-black">
            <Arena
              lang={lang}
              events={events}
              ko={state.ko}
              combo={state.combo}
              comboSide={state.comboSide}
            />
            {showBoard && (
              <div className="absolute right-2 top-2 z-20 w-full max-w-[15rem]">
                <Leaderboard lang={lang} rows={leaders} />
              </div>
            )}
          </div>
        </div>


        {/* Chat + gifts below the ring */}
        <div className="flex shrink-0 flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <GiftDock lang={lang} side="ru" overlay disabled={!ready || !!state.ko} onSend={handleSend} />
            <GiftDock lang={lang} side="us" overlay disabled={!ready || !!state.ko} onSend={handleSend} />
          </div>
          <div className="flex max-h-[22dvh] min-h-0 flex-col justify-end overflow-hidden">

            <ChatPanel
              lang={lang}
              events={events}
              nickname={nickname}
              overlay
              disabled={!ready || !!state.ko}
              onSend={(side, gift, message) => handleSend(side, gift, message)}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

