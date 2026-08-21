import { useEffect, useRef, useState } from "react";
import beanRef from "@/assets/referee-bean-full.png.asset.json";

/**
 * Mr. Bean as the ring referee. He is a pure presentation layer on top of the
 * running footage: from time to time he strolls into the ring, tries to split
 * the fighters, catches a stray punch and drops on the mat, or wanders off
 * like a man who found the promoter's bar. Nothing here touches the score,
 * the hit pipeline or the video element, so timing and audio stay untouched.
 */
type Gag = "split" | "hit" | "drunk" | "whistle";

const GAGS: { id: Gag; ms: number }[] = [
  { id: "split", ms: 7200 },
  { id: "hit", ms: 8600 },
  { id: "drunk", ms: 9400 },
  { id: "whistle", ms: 6400 },
];

export function RefereeBean({ ko, paused }: { ko?: unknown; paused?: boolean }) {
  const [gag, setGag] = useState<{ id: Gag; key: number } | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let stopped = false;

    const schedule = (delay: number) => {
      timer.current = window.setTimeout(() => {
        if (stopped) return;
        // He never clowns while a fighter is down being counted out.
        if (ko || paused) {
          schedule(4000);
          return;
        }
        const pick = GAGS[Math.floor(Math.random() * GAGS.length)]!;
        setGag({ id: pick.id, key: Date.now() });
        window.setTimeout(() => {
          if (!stopped) setGag(null);
        }, pick.ms);
        schedule(pick.ms + 14000 + Math.random() * 16000);
      }, delay);
    };

    schedule(9000 + Math.random() * 8000);
    return () => {
      stopped = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [ko, paused]);

  if (!gag) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[15] overflow-hidden">
      <img
        key={gag.key}
        src={beanRef.url}
        alt=""
        aria-hidden="true"
        className={`bean-ref bean-${gag.id}`}
        draggable={false}
      />
    </div>
  );
}
