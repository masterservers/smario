import { useEffect, useState } from "react";
import beanImg from "@/assets/mr-bean-ref-cutout.png";
import type { Lang } from "@/lib/i18n";

/** The gags the referee runs between exchanges. */
type Gag = "break" | "hit" | "count" | "comic";

const LINES: Record<Lang, Record<Gag, string>> = {
  en: { break: "BREAK IT UP!", hit: "OOPS… WRONG GUY!", count: "ONE… TWO… ERM…", comic: "REFEREE DANCE 🕺" },
  de: { break: "AUSEINANDER!", hit: "UPS… FALSCHER MANN!", count: "EINS… ZWEI… ÄH…", comic: "SCHIRI-TANZ 🕺" },
  sr: { break: "RAZDVOJ SE!", hit: "UPS… POGREŠAN!", count: "JEDAN… DVA… HM…", comic: "SUDIJSKI PLES 🕺" },
  ro: { break: "DESPĂRȚIȚI-VĂ!", hit: "OPA… GREȘIT OM!", count: "UNU… DOI… ÎÎÎ…", comic: "DANSUL ARBITRULUI 🕺" },
  ru: { break: "РАЗОЙДИСЬ!", hit: "ОЙ… НЕ ТОТ!", count: "РАЗ… ДВА… Э…", comic: "ТАНЕЦ СУДЬИ 🕺" },
};

const GAGS: Gag[] = ["break", "hit", "comic", "hit", "break", "count", "comic"];

type Props = {
  lang: Lang;
  /** Number of gift hits so far — a fresh blow can drag the referee in. */
  beat: number;
  /** True while the referee is counting a fighter out. */
  counting: boolean;
};

/**
 * Mr. Bean works the ring. He walks in between exchanges, tries to separate the
 * fighters, catches the odd stray blow and pulls one of his own comic routines.
 */
export function MrBeanReferee({ lang, beat, counting }: Props) {
  const [run, setRun] = useState<{ id: number; gag: Gag; from: "left" | "right" } | null>(null);
  const [step, setStep] = useState(0);

  // Regular walk-ins; a new hit makes one more likely soon after.
  useEffect(() => {
    let timer = 0;
    const schedule = (delay: number) => {
      timer = window.setTimeout(() => {
        setStep((n) => n + 1);
        setRun({
          id: Date.now(),
          gag: GAGS[step % GAGS.length]!,
          from: step % 2 === 0 ? "left" : "right",
        });
        schedule(11000 + Math.random() * 9000);
      }, delay);
    };
    schedule(4500 + Math.random() * 5000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  // Each appearance lasts a few seconds, then he clears the mat.
  useEffect(() => {
    if (!run) return;
    const id = window.setTimeout(() => setRun(null), 4200);
    return () => window.clearTimeout(id);
  }, [run]);

  if (!run || counting) return null;
  const line = LINES[lang][run.gag];

  return (
    <div
      key={run.id}
      className={`bean-ref pointer-events-none absolute bottom-[16%] z-20 flex flex-col items-center ${
        run.from === "left" ? "bean-ref-left left-[8%]" : "bean-ref-right right-[8%]"
      }`}
    >
      <span className="display mb-1 rounded-full bg-background/70 px-2 py-0.5 text-[9px] tracking-widest text-gold text-outline backdrop-blur sm:text-xs">
        🧑‍⚖️ {line}
      </span>
      <img
        src={beanImg}
        alt="Referee Mr. Bean stepping between the fighters"
        loading="lazy"
        className={`h-[22vh] max-h-[200px] w-auto object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.65)] ${
          run.gag === "hit" ? "bean-ref-hit" : run.gag === "comic" ? "bean-ref-comic" : ""
        }`}
      />
    </div>
  );
}
