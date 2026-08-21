import { GIFTS, type GiftId, type Side } from "@/lib/battle";
import { SIDE_NAME, UI_TEXT, type Lang } from "@/lib/i18n";
import { useGiftConfig } from "@/lib/giftConfig";

type Props = {
  lang: Lang;
  side: Side;
  disabled?: boolean;
  overlay?: boolean;
  onSend: (side: Side, gift: GiftId) => void;
};

export function GiftDock({ lang, side, disabled, overlay, onSend }: Props) {
  const t = UI_TEXT[lang];
  const giftConfig = useGiftConfig();
  const names = SIDE_NAME[lang];
  const teamName = side === "ru" ? names.ruTeam : names.usTeam;
  const accent = side === "ru" ? "var(--ru)" : "var(--us)";

  return (
    <div
      className={
        overlay ? "rounded-2xl bg-black/45 p-2 backdrop-blur-md" : "panel rounded-2xl p-3"
      }
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        <span className="size-2 rounded-full" style={{ background: accent }} />
        {t.sendGiftsFor} <span className="display text-sm text-foreground">{teamName}</span>
      </div>
      <div className={overlay ? "mt-1.5 flex gap-1.5" : "mt-2 grid grid-cols-5 gap-1.5"}>
        {GIFTS.map((g) => (
          <button
            key={g.id}
            type="button"
            disabled={disabled}
            onClick={() => onSend(side, g.id)}
            aria-label={`${giftConfig[g.id].phrases[lang]} · ${g.value}`}
            className="group flex flex-1 flex-col items-center gap-0.5 rounded-xl border border-border bg-secondary/60 px-2 py-1.5 transition-transform hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ boxShadow: `inset 0 -2px 0 0 ${accent}` }}
          >
            <span className="text-xl">{giftConfig[g.id].emoji}</span>
            <span className="display text-xs text-gold">+{g.value}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
