import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Arena } from "@/components/game/Arena";
import { LangPicker } from "@/components/game/LangPicker";
import { RefereeCount } from "@/components/game/RefereeCount";
import { Scoreboard } from "@/components/game/Scoreboard";
import { useCommentary } from "@/hooks/useCommentary";
import { useLiveMatch } from "@/hooks/useLiveMatch";
import { useReferee } from "@/hooks/useReferee";
import type { Side } from "@/lib/battle";
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
  component: LivePage,
});

/** Watch-only view: same real-time feed, no controls over the ring. */
function LivePage() {
  const { lang } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [muted, setMuted] = useState(true);

  const { round, events, state, viewers } = useLiveMatch();
  const referee = useReferee(state.hpRu, state.hpUs, state.ko);
  useCommentary(lang, events, state, muted, referee);

  const t = UI_TEXT[lang];
  const names = SIDE_NAME[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const leader: Side | null =
    state.scoreRu === state.scoreUs ? null : state.scoreRu > state.scoreUs ? "ru" : "us";

  return (
    <main className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-background">
      <h1 className="sr-only">
        {names.ru} vs {names.us} — {t.live}
      </h1>

      <div className="absolute inset-0">
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

      <div className="absolute bottom-1/2 right-2 z-20 flex translate-y-1/2 flex-col gap-2">
        <LangPicker lang={lang} onChange={(next) => void navigate({ search: { lang: next }, replace: true })} />
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={t.commentator}
          className="size-10 rounded-full border border-border bg-black/60 text-base backdrop-blur-md transition-colors hover:bg-accent"
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <Link
          to="/"
          search={{ lang }}
          aria-label={t.sendGiftsFor}
          className="grid size-10 place-items-center rounded-full border border-border bg-black/60 text-base backdrop-blur-md transition-colors hover:bg-accent"
        >
          🎁
        </Link>
      </div>
    </main>
  );
}
