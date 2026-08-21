import { GIFT_BY_ID, type GiftEvent, type Side } from "@/lib/battle";
import { GIFT_NAMES } from "@/lib/giftCatalog";
import { SIDE_NAME, type Lang } from "@/lib/i18n";
import { chatText } from "@/lib/chatI18n";

type Props = {
  lang: Lang;
  events: GiftEvent[];
  nickname?: string;
};

/**
 * Live spectator feed rendered in the commentator's language. Each line is
 * localized (with an English fallback) and streams in as gifts arrive.
 * Free-form viewer text stays as the user typed it — only the template is
 * translated, so nothing is ever lost in translation.
 */
export function SpectatorChat({ lang, events, nickname }: Props) {
  const names = SIDE_NAME[lang];
  const teamName = (side: Side) => (side === "ru" ? names.ruTeam : names.usTeam);
  const recent = events.slice(-60).reverse();

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="mb-1.5 flex items-center gap-2 px-0.5">
        <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
        <h2 className="display text-xs uppercase tracking-widest text-muted-foreground">
          {chatText(lang, "title")}
        </h2>
      </header>

      {recent.length === 0 ? (
        <p className="text-xs text-muted-foreground">{chatText(lang, "empty")}</p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {recent.map((e) => {
            const gift = GIFT_BY_ID[e.gift];
            const isRu = e.side === "ru";
            const name = gift ? GIFT_NAMES[e.gift]?.[lang] ?? GIFT_NAMES[e.gift]?.en ?? e.gift : e.gift;
            const who = e.sender === nickname ? chatText(lang, "you") : e.sender;
            return (
              <li
                key={e.id}
                className="flex items-center gap-2 rounded-xl bg-background/40 px-2.5 py-1.5 text-xs backdrop-blur-md"
                style={{ borderLeft: `3px solid ${isRu ? "var(--ru)" : "var(--us)"}` }}
              >
                <span aria-hidden>{gift?.emoji ?? "🎁"}</span>
                <span className="min-w-0 truncate">
                  <span className="font-semibold text-foreground">{who}</span>{" "}
                  <span className="text-muted-foreground">
                    {chatText(lang, "sentTo", { gift: name, team: teamName(e.side) })}
                  </span>
                </span>
                <span className="display ml-auto shrink-0 text-gold">+{e.value}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
