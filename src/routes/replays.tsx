import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Arena } from "@/components/game/Arena";
import { MatchSummary } from "@/components/game/MatchSummary";
import { Scoreboard } from "@/components/game/Scoreboard";
import { supabase } from "@/integrations/supabase/client";
import { reduceEvents, type GiftEvent, type Side } from "@/lib/battle";
import { isLang, SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";
import { buildHighlights, formatDuration } from "@/lib/replay";

type Search = { lang: Lang };

type MatchRow = {
  id: string;
  round: number;
  started_at: string;
  ended_at: string | null;
  winner: string | null;
};

export const Route = createFileRoute("/replays")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    lang: isLang(search['lang']) ? search['lang'] : "en",
  }),
  head: () => ({
    meta: [
      { title: "Match Replays — Putin vs Trump Battle" },
      {
        name: "description",
        content:
          "Rewatch finished Putin vs Trump matches: knockout highlight reel, final score, HP, every gift sent and the key knockdown moments.",
      },
      { property: "og:title", content: "Match Replays — Putin vs Trump Battle" },
      {
        property: "og:description",
        content: "Highlight replays with the knockout finish, full score and gift breakdown.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReplaysPage,
});

const STEP_MS = 2400;

function ReplaysPage() {
  const { lang } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const t = UI_TEXT[lang];
  const names = SIDE_NAME[lang];

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [selected, setSelected] = useState<MatchRow | null>(null);
  const [events, setEvents] = useState<GiftEvent[]>([]);
  const [shown, setShown] = useState<GiftEvent[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, round, started_at, ended_at, winner")
        .not("ended_at", "is", null)
        .order("ended_at", { ascending: false })
        .limit(20);
      setMatches((data ?? []) as MatchRow[]);
    })();
  }, []);

  // Highlight playback: key spots are fed to the ring one by one and the reel
  // ends on the knockout, exactly as it happened live.
  const play = useCallback(async (match: MatchRow) => {
    if (timer.current) window.clearInterval(timer.current);
    setSelected(match);
    setShown([]);
    const { data } = await supabase
      .from("gift_events")
      .select("id, side, gift, value, sender, created_at")
      .eq("match_id", match.id)
      .eq("flagged", false)
      .order("created_at", { ascending: true })
      .limit(400);
    const all = (data ?? []) as GiftEvent[];
    setEvents(all);
    const reel = buildHighlights(all);
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      setShown(reel.slice(0, i));
      if (i >= reel.length && timer.current) window.clearInterval(timer.current);
    }, STEP_MS);
  }, []);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const state = useMemo(() => reduceEvents(shown), [shown]);
  const leader: Side | null =
    state.scoreRu === state.scoreUs ? null : state.scoreRu > state.scoreUs ? "ru" : "us";

  return (
    <main className="min-h-[100dvh] bg-background">
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h1 className="display text-lg">{t.replays}</h1>
        <nav className="flex gap-2 text-sm">
          <Link to="/live" search={{ lang }} className="story-link">
            📡 {t.watchLive}
          </Link>
          <Link to="/" search={{ lang }} className="story-link">
            🎁 {t.live}
          </Link>
        </nav>
      </header>

      <div className="grid gap-3 p-3 lg:grid-cols-[20rem_1fr]">
        <ul className="space-y-1.5">
          {matches.length === 0 && <li className="text-sm text-muted-foreground">{t.noReplays}</li>}
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => void play(m)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${selected?.id === m.id ? "border-gold" : "border-border"}`}
              >
                <span className="display">
                  {t.round} {m.round}
                </span>
                <span className="ml-2 text-muted-foreground">
                  {new Date(m.started_at).toLocaleString()}
                </span>
                {m.winner && (
                  <span className="ml-2 text-gold">
                    🏆 {m.winner === "ru" ? names.ruTeam : names.usTeam}
                  </span>
                )}
                {m.ended_at && (
                  <span className="ml-2 text-[11px] text-muted-foreground">
                    {formatDuration(new Date(m.ended_at).getTime() - new Date(m.started_at).getTime())}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="space-y-3">
          {selected ? (
            <>
              <div className="relative aspect-[1344/768] w-full overflow-hidden rounded-lg border border-border">
                <Arena
                  lang={lang}
                  events={shown}
                  ko={state.ko}
                  combo={state.combo}
                  comboSide={state.comboSide}
                />
                <div className="pointer-events-none absolute inset-x-0 top-0">
                  <Scoreboard
                    lang={lang}
                    round={selected.round}
                    viewers={0}
                    scoreRu={state.scoreRu}
                    scoreUs={state.scoreUs}
                    hpRu={state.hpRu}
                    hpUs={state.hpUs}
                    leader={leader}
                  />
                </div>
              </div>
              <MatchSummary lang={lang} events={events} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t.watchReplay}</p>
          )}
        </div>
      </div>

      <div className="px-3 pb-4">
        <label className="text-xs text-muted-foreground">
          🌐{" "}
          <select
            value={lang}
            onChange={(e) => void navigate({ search: { lang: e.target.value as Lang }, replace: true })}
            className="rounded border border-border bg-secondary px-2 py-1 text-foreground"
          >
            {(["en", "de", "sr", "ro", "ru"] as Lang[]).map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </div>
    </main>
  );
}
