import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import fightVideo from "@/assets/arena-heights2.webm.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FOLLOW_UPS, MOVES, familyOf, type Move } from "@/lib/scenes";

const FIGHT_VIDEO = fightVideo.url;

export const Route = createFileRoute("/moves")({
  head: () => ({
    meta: [
      { title: "Move Showcase — Fight Putin vs Trump" },
      {
        name: "description",
        content:
          "Every wrestling technique in the ring: strikes, kicks, aerials, slams, drivers, suplexes, finishers, submissions and pins, played one after another.",
      },
      { property: "og:title", content: "Move Showcase — Fight Putin vs Trump" },
      {
        property: "og:description",
        content: "Watch all wrestling moves of the arena played back to back in the ring.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MovesShowcase,
});

type Entry = Move & { group: "move" | "follow" };

const ALL: Entry[] = [
  ...MOVES.map((m) => ({ ...m, group: "move" as const })),
  ...FOLLOW_UPS.map((m) => ({ ...m, group: "follow" as const })),
];

function MovesShowcase() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL;
    const hit = ALL.filter(
      (m) => m.label.toLowerCase().includes(q) || familyOf(m).includes(q),
    );
    return hit.length > 0 ? hit : ALL;
  }, [query]);

  const current = list[Math.min(index, list.length - 1)]!;

  // Keep the index valid when the filter changes.
  useEffect(() => {
    setIndex(0);
  }, [query]);

  // Play the window of the current move, then move on to the next one.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = current.start;
    video.playbackRate = current.rate;
    if (playing) void video.play();
    else video.pause();
  }, [current, playing]);

  const onTime = () => {
    const video = videoRef.current;
    if (!video || !playing) return;
    if (video.currentTime >= current.end) {
      setIndex((i) => (i + 1) % list.length);
    }
  };

  const step = (delta: number) =>
    setIndex((i) => (i + delta + list.length) % list.length);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative h-[60vh] w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={FIGHT_VIDEO}
          className="h-full w-full object-cover"
          muted
          playsInline
          onTimeUpdate={onTime}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <div className="rounded-md bg-black/60 px-3 py-2 backdrop-blur">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {familyOf(current)} · {current.group === "move" ? "standing" : "ground"} · tier{" "}
              {current.tier}
            </p>
            <h1 className="text-2xl font-black uppercase leading-tight md:text-4xl">
              {current.label}
            </h1>
          </div>
          <span className="rounded-md bg-black/60 px-3 py-2 text-sm font-semibold backdrop-blur">
            {list.indexOf(current) + 1} / {list.length}
          </span>
        </div>
      </div>

      <section className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => step(-1)}>
            ‹ Prev
          </Button>
          <Button onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</Button>
          <Button variant="secondary" onClick={() => step(1)}>
            Next ›
          </Button>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a move (suplex, kick, pin…)"
            className="max-w-xs"
          />
          <Link to="/" search={{ lang: "en" }} className="ml-auto text-sm underline">
            Back to the arena
          </Link>
        </div>

        <p className="text-sm text-muted-foreground">
          {ALL.length} scenes in rotation — {MOVES.length} standing moves and {FOLLOW_UPS.length}{" "}
          ground spots. Click any name to jump to it.
        </p>

        <ul className="grid grid-cols-2 gap-1 pb-16 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((m, i) => (
            <li key={`${m.group}-${m.id}`}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                className={`w-full truncate rounded px-2 py-1 text-left text-xs ${
                  m.id === current.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 hover:bg-muted"
                }`}
              >
                {m.label}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
