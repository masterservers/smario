import type { Lang } from "@/lib/i18n";

/**
 * Spectator-chat vocabulary. Every line is looked up in the commentator's
 * language and silently falls back to English when a translation is missing,
 * so the feed never renders a raw key.
 */
export type ChatKey =
  | "title"
  | "sentTo"
  | "empty"
  | "watchOnly"
  | "you"
  | "knockdown"
  | "knockout"
  | "bigHit"
  | "combo"
  | "roundStart";

type Dict = Partial<Record<ChatKey, string>>;

const CHAT_TEXT: Record<Lang, Dict> = {
  en: {
    title: "Spectator chat",
    sentTo: "sent {gift} for {team}",
    empty: "No messages yet — be the first to cheer.",
    watchOnly: "Watch-only link: chat is read-only.",
    you: "You",
    knockdown: "Knockdown on {team}!",
    knockout: "Knockout — {team} is down!",
    bigHit: "Huge hit for {team}!",
    combo: "{team} strings a combo!",
    roundStart: "Round {round} is live.",
  },
  de: {
    title: "Zuschauer-Chat",
    sentTo: "schickt {gift} für {team}",
    empty: "Noch keine Nachrichten — sei der Erste.",
    watchOnly: "Nur-Zuschauen-Link: Chat ist schreibgeschützt.",
    you: "Du",
    knockdown: "Niederschlag gegen {team}!",
    knockout: "Knockout — {team} liegt am Boden!",
    bigHit: "Riesiger Treffer für {team}!",
    combo: "{team} setzt eine Kombination!",
    roundStart: "Runde {round} läuft.",
  },
  sr: {
    title: "Čet gledalaca",
    sentTo: "šalje {gift} za {team}",
    empty: "Još nema poruka — budi prvi.",
    watchOnly: "Link samo za gledanje: čet je zaključan.",
    you: "Ti",
    knockdown: "Nokdaun za {team}!",
    knockout: "Nokaut — {team} je na podu!",
    bigHit: "Ogroman udarac za {team}!",
    combo: "{team} niže kombinaciju!",
    roundStart: "Runda {round} je u toku.",
  },
  ro: {
    title: "Chat spectatori",
    sentTo: "a trimis {gift} pentru {team}",
    empty: "Încă niciun mesaj — fii primul.",
    watchOnly: "Link doar pentru vizionare: chatul e blocat.",
    you: "Tu",
    knockdown: "Knockdown pentru {team}!",
    knockout: "Knockout — {team} e la podea!",
    bigHit: "Lovitură uriașă pentru {team}!",
    combo: "{team} leagă o combinație!",
    roundStart: "Runda {round} a început.",
  },
  ru: {
    title: "Чат зрителей",
    sentTo: "отправил {gift} за {team}",
    empty: "Пока нет сообщений — будь первым.",
    watchOnly: "Ссылка только для просмотра: чат закрыт.",
    you: "Ты",
    knockdown: "Нокдаун — {team}!",
    knockout: "Нокаут — {team} на полу!",
    bigHit: "Мощный удар за {team}!",
    combo: "{team} собирает комбинацию!",
    roundStart: "Раунд {round} идёт.",
  },
};

/** Localized chat line with an English fallback and `{token}` interpolation. */
export function chatText(lang: Lang, key: ChatKey, vars: Record<string, string | number> = {}) {
  const template = CHAT_TEXT[lang]?.[key] ?? CHAT_TEXT.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] === undefined ? "" : String(vars[name]),
  );
}
