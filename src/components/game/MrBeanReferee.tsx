import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import beanImg from "@/assets/mr-bean-ref-cutout.png";
import { LANG_META, type Lang } from "@/lib/i18n";
import { useDebugView } from "@/lib/debugView";
import { publishSubtitle } from "@/lib/subtitles";
import { nextBeanDelay, useBeanConfig } from "@/lib/beanConfig";

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

/** The gag animations only start after the walk-in, so the voice waits too. */
const GAG_CUE_MS: Record<Gag, number> = {
  separate: 300,
  break: 300,
  hit: 700,
  stray: 700,
  comic: 500,
  count: 400,
};

type Run = { id: number; gag: Gag; from: "left" | "right" };

type Props = {
  lang: Lang;
  /** Number of gift hits so far — a fresh blow can drag the referee in. */
  beat: number;
  /** True while the referee is counting a fighter out. */
  counting: boolean;
  /** Current combo length; a long chain pulls him in to separate the fighters. */
  combo?: number;
  /** Silences his voice line (captions still show). */
  muted?: boolean;
};

/**
 * Mr. Bean works the ring. He walks in on a configurable beat between
 * exchanges, and can also be pulled in by match events (a run of landed hits,
 * or a long combo). Always an overlay — the fight itself never pauses.
 */
export function MrBeanReferee({ lang, beat, counting, combo = 0, muted = false }: Props) {
  const config = useBeanConfig();
  const [run, setRun] = useState<Run | null>(null);
  const debug = useDebugView();

  const stepRef = useRef(0);
  const lastAtRef = useRef(0);
  const countingRef = useRef(counting);
  countingRef.current = counting;

  /** Start a gag, unless one is running, he is counting, or we are cooling down. */
  const trigger = useCallback(
    (force = false) => {
      if (!config.enabled || countingRef.current) return;
      const now = Date.now();
      if (!force && now - lastAtRef.current < config.cooldownSec * 1000) return;
      if (now - lastAtRef.current < config.visibleMs) return; // never cut a gag short
      lastAtRef.current = now;
      const step = stepRef.current++;
      setRun({ id: now, gag: GAGS[step % GAGS.length]!, from: step % 2 === 0 ? "left" : "right" });
    },
    [config.enabled, config.cooldownSec, config.visibleMs],
  );

  // Configurable cadence: a fresh random gap inside [minSec, maxSec] each time.
  useEffect(() => {
    if (!config.enabled) {
      setRun(null);
      return;
    }
    let timer = 0;
    const schedule = (delay: number) => {
      timer = window.setTimeout(() => {
        // Skip silently while the tab is hidden — no wasted work, no backlog.
        if (!document.hidden) trigger();
        schedule(nextBeanDelay(config));
      }, delay);
    };
    schedule(Math.min(4000, nextBeanDelay(config)));
    return () => window.clearTimeout(timer);
  }, [config, trigger]);

  // Match events: every N landed hits, and on a long combo.
  const lastHitMark = useRef(0);
  useEffect(() => {
    if (!config.everyNHits) return;
    const mark = Math.floor(beat / config.everyNHits);
    if (mark === lastHitMark.current) return;
    lastHitMark.current = mark;
    if (mark > 0) trigger();
  }, [beat, config.everyNHits, trigger]);

  const lastCombo = useRef(0);
  useEffect(() => {
    if (!config.comboTrigger) return;
    if (combo >= config.comboTrigger && combo > lastCombo.current) trigger();
    lastCombo.current = combo;
  }, [combo, config.comboTrigger, trigger]);

  // Each appearance lasts a few seconds, then he clears the mat.
  useEffect(() => {
    if (!run) return;
    const id = window.setTimeout(() => setRun(null), config.visibleMs);
    return () => window.clearTimeout(id);
  }, [run, config.visibleMs]);

  // Caption and voice fire on the same cue as the comic beat of the animation,
  // so the subtitle, the speech and the gag are frame-aligned in every language.
  useEffect(() => {
    if (!run) return;
    const line = LINES[lang][run.gag];
    const cue = GAG_CUE_MS[run.gag];
    const id = window.setTimeout(() => {
      publishSubtitle(`🧑‍⚖️ ${line}`, "ref", Math.max(1500, config.visibleMs - cue));
      if (muted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const utterance = new SpeechSynthesisUtterance(line);
      utterance.lang = LANG_META[lang].speech;
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }, cue);
    return () => window.clearTimeout(id);
  }, [run, lang, muted, config.visibleMs]);

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
    let frame = 0;
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
    // Coalesce resize bursts into one measurement per frame — no layout thrash
    // on weaker devices while the overlay is animating.
    const queue = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    measure();
    const ro = new ResizeObserver(queue);
    ro.observe(el);
    window.addEventListener("resize", queue);
    window.addEventListener("orientationchange", queue);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", queue);
      window.removeEventListener("orientationchange", queue);
    };
  }, [run?.id]);

  if (!run || counting) return null;
  const line = LINES[lang][run.gag];
  const separating = run.gag === "separate" || run.gag === "break";
  const takesHit = run.gag === "hit" || run.gag === "stray";

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden [contain:layout_paint_style]"
    >
      <div
        style={{ width: fit.w, height: fit.h, left: fit.x, top: fit.y }}
        className={`absolute ${debug ? "outline outline-1 outline-sky-400/80" : ""}`}
      >
        <div
          key={`${run.id}-${struck}`}
          className={`bean-ref absolute bottom-[7%] top-[46%] flex flex-col items-center justify-end ${
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
            decoding="async"
            fetchPriority="low"
            className={`h-full min-h-0 w-auto object-contain [backface-visibility:hidden] drop-shadow-[0_6px_18px_rgba(0,0,0,0.55)] ${
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
