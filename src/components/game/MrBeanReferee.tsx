import { useEffect, useLayoutEffect, useRef, useState } from "react";
import beanImg from "@/assets/mr-bean-ref-cutout.png";
import type { Lang } from "@/lib/i18n";
import { useDebugView } from "@/lib/debugView";

/** The gags the referee runs between exchanges. */
type Gag = "break" | "hit" | "count" | "comic" | "separate" | "stray";

const LINES: Record<Lang, Record<Gag, string>> = {
  en: {
    break: "BREAK IT UP!",
    hit: "OOPS… WRONG GUY!",
    count: "ONE… TWO… ERM…",
    comic: "REFEREE DANCE 🕺",
    separate: "SEPARATE! NOW!",
    stray: "OW! NOT ME AGAIN!",
  },
  de: {
    break: "AUSEINANDER!",
    hit: "UPS… FALSCHER MANN!",
    count: "EINS… ZWEI… ÄH…",
    comic: "SCHIRI-TANZ 🕺",
    separate: "TRENNEN! SOFORT!",
    stray: "AUA! SCHON WIEDER ICH!",
  },
  sr: {
    break: "RAZDVOJ SE!",
    hit: "UPS… POGREŠAN!",
    count: "JEDAN… DVA… HM…",
    comic: "SUDIJSKI PLES 🕺",
    separate: "RAZDVOJITE SE! ODMAH!",
    stray: "AJOJ! OPET JA!",
  },
  ro: {
    break: "DESPĂRȚIȚI-VĂ!",
    hit: "OPA… GREȘIT OM!",
    count: "UNU… DOI… ÎÎÎ…",
    comic: "DANSUL ARBITRULUI 🕺",
    separate: "SEPARAȚI-VĂ! ACUM!",
    stray: "AU! IAR EU!",
  },
  ru: {
    break: "РАЗОЙДИСЬ!",
    hit: "ОЙ… НЕ ТОТ!",
    count: "РАЗ… ДВА… Э…",
    comic: "ТАНЕЦ СУДЬИ 🕺",
    separate: "РАЗОЙТИСЬ! БЫСТРО!",
    stray: "АЙ! ОПЯТЬ Я!",
  },
};

/** Fixed rotation: separation work, a stray blow, then one of his routines. */
const GAGS: Gag[] = ["separate", "hit", "break", "stray", "comic", "separate", "count", "stray"];

/** He steps in on a steady beat so the fight itself never has to pause. */
const INTERVAL_MS = 14000;
const VISIBLE_MS = 4200;

type Props = {
  lang: Lang;
  /** Number of gift hits so far — a fresh blow can drag the referee in. */
  beat: number;
  /** True while the referee is counting a fighter out. */
  counting: boolean;
};

/**
 * Mr. Bean works the ring. He walks in on a fixed beat between exchanges, tries
 * to pull the fighters apart, catches the odd stray blow and pulls one of his
 * own comic routines — always as an overlay, never blocking the action.
 */
export function MrBeanReferee({ lang, beat, counting }: Props) {
  const [run, setRun] = useState<{ id: number; gag: Gag; from: "left" | "right" } | null>(null);
  const debug = useDebugView();

  // Fixed cadence — one intervention every INTERVAL_MS, in a stable rotation.
  useEffect(() => {
    let step = 0;
    const tick = () => {
      const gag = GAGS[step % GAGS.length]!;
      setRun({ id: Date.now(), gag, from: step % 2 === 0 ? "left" : "right" });
      step += 1;
    };
    const first = window.setTimeout(tick, 4000);
    const timer = window.setInterval(tick, INTERVAL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  // Each appearance lasts a few seconds, then he clears the mat.
  useEffect(() => {
    if (!run) return;
    const id = window.setTimeout(() => setRun(null), VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, [run]);

  // A fresh blow while he is on the mat catches him by mistake.
  const [struck, setStruck] = useState(0);
  useEffect(() => {
    if (!run) return;
    setStruck((n) => n + 1);
  }, [beat]); // eslint-disable-line react-hooks/exhaustive-deps

  const hostRef = useRef<HTMLDivElement | null>(null);
  // The reel is `object-contain`, so the picture is letterboxed inside its
  // element. Bean has to live in the *painted* rectangle of that video — not
  // the element box — otherwise his feet land in the black bars when the
  // device is rotated.
  const [fit, setFit] = useState<{ w: number; h: number; x: number; y: number }>({
    w: 0,
    h: 0,
    x: 0,
    y: 0,
  });
  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const measure = () => {
      const host = el.getBoundingClientRect();
      if (!host.width || !host.height) return;
      const video = document.querySelector<HTMLVideoElement>("video.arena-video");
      const box = video?.getBoundingClientRect();
      const ar =
        video && video.videoWidth && video.videoHeight
          ? video.videoWidth / video.videoHeight
          : 16 / 9;
      if (box && box.width && box.height) {
        // Replicate object-fit: contain inside the video element box.
        const w = Math.min(box.width, box.height * ar);
        const h = w / ar;
        setFit({ w, h, x: box.left + (box.width - w) / 2 - host.left, y: box.top + (box.height - h) / 2 - host.top });
        return;
      }
      const w = Math.min(host.width, host.height * ar);
      const h = w / ar;
      setFit({ w, h, x: (host.width - w) / 2, y: (host.height - h) / 2 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [run?.id]);

  if (!run || counting) return null;
  const line = LINES[lang][run.gag];
  const separating = run.gag === "separate" || run.gag === "break";
  const takesHit = run.gag === "hit" || run.gag === "stray";

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      <div
        style={{ width: fit.w, height: fit.h, left: fit.x, top: fit.y }}
        className={`absolute ${debug ? "outline outline-1 outline-sky-400/80" : ""}`}
      >
        <div
          key={`${run.id}-${struck}`}
          className={`bean-ref absolute bottom-[4%] top-[46%] flex flex-col items-center justify-end ${
            debug ? "outline outline-1 outline-lime-400/90" : ""
          } ${
            run.from === "left"
              ? `bean-ref-left ${separating ? "left-[26%]" : "left-[6%]"}`
              : `bean-ref-right ${separating ? "right-[26%]" : "right-[6%]"}`
          }`}
        >
          <span className="display mb-1 shrink-0 rounded-full bg-background/70 px-2 py-0.5 text-[9px] tracking-widest text-gold text-outline backdrop-blur sm:text-xs">
            🧑‍⚖️ {line}
          </span>
          <img
            src={beanImg}
            alt="Referee Mr. Bean stepping between the fighters"
            loading="lazy"
            className={`h-full min-h-0 w-auto object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.65)] ${
              debug ? "outline outline-1 outline-rose-400/90" : ""
            } ${
              takesHit
                ? "bean-ref-hit"
                : separating
                  ? "bean-ref-separate"
                  : run.gag === "comic"
                    ? "bean-ref-comic"
                    : ""
            }`}
          />
        </div>
      </div>
    </div>
  );
}
