export const LANGS = ["en", "de", "sr", "ro", "ru"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_META: Record<Lang, { label: string; flag: string; speech: string }> = {
  en: { label: "English", flag: "🇬🇧", speech: "en-US" },
  de: { label: "Deutsch", flag: "🇩🇪", speech: "de-DE" },
  sr: { label: "Srpski", flag: "🇷🇸", speech: "sr-RS" },
  ro: { label: "Română", flag: "🇷🇴", speech: "ro-RO" },
  ru: { label: "Русский", flag: "🇷🇺", speech: "ru-RU" },
};

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

type UI = {
  live: string;
  viewers: string;
  round: string;
  sendGiftsFor: string;
  chatPlaceholder: string;
  send: string;
  hint: string;
  commentator: string;
  referee: string;
  leaderboard: string;
  topSupporters: string;
  noSupporters: string;
  knockout: string;
  knockedDown: string;
  count: string;
  backUp: string;
  watchLive: string;
  eventLog: string;
  summary: string;
  keyMoments: string;
  giftsSent: string;
  replays: string;
  watchReplay: string;
  winner: string;
  duration: string;
  knockdown: string;
  noReplays: string;
  wins: string;
  nextMatch: string;
  you: string;
  muted: string;
  unmuted: string;
  tooFast: string;
  capReached: string;
  fraudFlagged: string;
  gifts: Record<string, string>;
};

export const UI_TEXT: Record<Lang, UI> = {
  en: {
    live: "LIVE",
    viewers: "watching",
    round: "Round",
    sendGiftsFor: "Send gifts for",
    chatPlaceholder: "Type RUSSIA or USA + gift…",
    send: "Send",
    hint: "Type RUSSIA / PUTIN to hit for Russia, USA / TRUMP to hit for America.",
    commentator: "Commentator",
    referee: "Referee",
    count: "COUNT",
    backUp: "beats the count and is back up!",
    watchLive: "Watch live",
    eventLog: "Live events",
    summary: "Match summary",
    keyMoments: "Key moments",
    giftsSent: "Gifts sent",
    replays: "Replays",
    watchReplay: "Watch replay",
    winner: "Winner",
    duration: "Duration",
    knockdown: "Knockdown",
    noReplays: "No finished matches yet.",
    leaderboard: "Daily ranking",
    topSupporters: "Top supporters",
    noSupporters: "No gifts yet — be the first!",
    knockout: "KNOCKOUT!",
    knockedDown: "is down on the mat",
    wins: "wins the match",
    nextMatch: "Next match starting…",
    you: "You",
    muted: "Sound off",
    unmuted: "Sound on",
    tooFast: "Slow down — too many gifts at once.",
    capReached: "Your gift limit for this match is reached.",
    fraudFlagged: "Gift ignored: supporting both sides is not allowed.",
    gifts: { rose: "Rose", donut: "Donut", tiktok: "TikTok", gift: "Gift box", rocket: "Rocket" },
  },
  de: {
    live: "LIVE",
    viewers: "schauen zu",
    round: "Runde",
    sendGiftsFor: "Geschenke senden für",
    chatPlaceholder: "Schreibe RUSSLAND oder USA + Geschenk…",
    send: "Senden",
    hint: "Schreibe RUSSIA / PUTIN für Russland, USA / TRUMP für Amerika.",
    commentator: "Kommentator",
    referee: "Schiedsrichter",
    count: "ANZÄHLEN",
    backUp: "steht wieder auf!",
    watchLive: "Live zuschauen",
    eventLog: "Live-Ereignisse",
    summary: "Kampf-Zusammenfassung",
    keyMoments: "Schlüsselmomente",
    giftsSent: "Gesendete Geschenke",
    replays: "Wiederholungen",
    watchReplay: "Wiederholung ansehen",
    winner: "Sieger",
    duration: "Dauer",
    knockdown: "Niederschlag",
    noReplays: "Noch keine beendeten Kämpfe.",
    leaderboard: "Tagesrangliste",
    topSupporters: "Top-Unterstützer",
    noSupporters: "Noch keine Geschenke — sei der Erste!",
    knockout: "KNOCKOUT!",
    knockedDown: "liegt am Boden",
    wins: "gewinnt den Kampf",
    nextMatch: "Nächster Kampf startet…",
    you: "Du",
    muted: "Ton aus",
    unmuted: "Ton an",
    tooFast: "Langsamer — zu viele Geschenke auf einmal.",
    capReached: "Dein Geschenklimit für dieses Match ist erreicht.",
    fraudFlagged: "Geschenk ignoriert: beide Seiten zu unterstützen ist nicht erlaubt.",
    gifts: { rose: "Rose", donut: "Donut", tiktok: "TikTok", gift: "Geschenk", rocket: "Rakete" },
  },
  sr: {
    live: "UŽIVO",
    viewers: "gleda",
    round: "Runda",
    sendGiftsFor: "Pošalji poklone za",
    chatPlaceholder: "Ukucaj RUSIJA ili USA + poklon…",
    send: "Pošalji",
    hint: "Ukucaj RUSIJA / PUTIN za Rusiju, USA / TRAMP za Ameriku.",
    commentator: "Komentator",
    referee: "Sudija",
    count: "BROJANJE",
    backUp: "ustaje pre kraja brojanja!",
    watchLive: "Gledaj uživo",
    eventLog: "Događaji uživo",
    summary: "Rezime meča",
    keyMoments: "Ključni momenti",
    giftsSent: "Poslati pokloni",
    replays: "Snimci",
    watchReplay: "Pogledaj snimak",
    winner: "Pobednik",
    duration: "Trajanje",
    knockdown: "Obaranje",
    noReplays: "Još nema završenih mečeva.",
    leaderboard: "Dnevna lista",
    topSupporters: "Najbolji navijači",
    noSupporters: "Još nema poklona — budi prvi!",
    knockout: "NOKAUT!",
    knockedDown: "leži na podu",
    wins: "pobeđuje u meču",
    nextMatch: "Sledeći meč počinje…",
    you: "Ti",
    muted: "Zvuk isključen",
    unmuted: "Zvuk uključen",
    tooFast: "Uspori — previše poklona odjednom.",
    capReached: "Dostigao si limit poklona za ovaj meč.",
    fraudFlagged: "Poklon je poništen: ne možeš podržavati obe strane.",
    gifts: { rose: "Ruža", donut: "Krofna", tiktok: "TikTok", gift: "Poklon", rocket: "Raketa" },
  },
  ro: {
    live: "LIVE",
    viewers: "privesc",
    round: "Runda",
    sendGiftsFor: "Trimite cadouri pentru",
    chatPlaceholder: "Scrie RUSIA sau USA + cadou…",
    send: "Trimite",
    hint: "Scrie RUSIA / PUTIN pentru Rusia, USA / TRUMP pentru America.",
    commentator: "Crainic",
    referee: "Arbitru",
    count: "NUMĂRĂTOARE",
    backUp: "se ridică înainte de final!",
    watchLive: "Vezi live",
    eventLog: "Evenimente live",
    summary: "Rezumatul meciului",
    keyMoments: "Momente cheie",
    giftsSent: "Cadouri trimise",
    replays: "Reluări",
    watchReplay: "Vezi reluarea",
    winner: "Câștigător",
    duration: "Durata",
    knockdown: "Knockdown",
    noReplays: "Încă nu există meciuri încheiate.",
    leaderboard: "Clasament zilnic",
    topSupporters: "Cei mai buni suporteri",
    noSupporters: "Încă niciun cadou — fii primul!",
    knockout: "KNOCKOUT!",
    knockedDown: "este întins la podea",
    wins: "câștigă meciul",
    nextMatch: "Următorul meci începe…",
    you: "Tu",
    muted: "Sunet oprit",
    unmuted: "Sunet pornit",
    tooFast: "Mai încet — prea multe cadouri deodată.",
    capReached: "Ai atins limita de cadouri pentru acest meci.",
    fraudFlagged: "Cadou anulat: nu poți susține ambele tabere.",
    gifts: { rose: "Trandafir", donut: "Gogoașă", tiktok: "TikTok", gift: "Cadou", rocket: "Rachetă" },
  },
  ru: {
    live: "ПРЯМОЙ ЭФИР",
    viewers: "смотрят",
    round: "Раунд",
    sendGiftsFor: "Отправить подарки за",
    chatPlaceholder: "Напиши РОССИЯ или США + подарок…",
    send: "Отправить",
    hint: "Напиши RUSSIA / ПУТИН за Россию, USA / ТРАМП за Америку.",
    commentator: "Комментатор",
    referee: "Судья",
    count: "ОТСЧЁТ",
    backUp: "поднимается до конца счёта!",
    watchLive: "Смотреть live",
    eventLog: "События в эфире",
    summary: "Итоги матча",
    keyMoments: "Ключевые моменты",
    giftsSent: "Отправленные подарки",
    replays: "Повторы",
    watchReplay: "Смотреть повтор",
    winner: "Победитель",
    duration: "Длительность",
    knockdown: "Нокдаун",
    noReplays: "Завершённых матчей пока нет.",
    leaderboard: "Дневной рейтинг",
    topSupporters: "Лучшие болельщики",
    noSupporters: "Подарков пока нет — будь первым!",
    knockout: "НОКАУТ!",
    knockedDown: "лежит на настиле",
    wins: "побеждает в матче",
    nextMatch: "Следующий матч начинается…",
    you: "Ты",
    muted: "Звук выкл.",
    unmuted: "Звук вкл.",
    tooFast: "Помедленнее — слишком много подарков.",
    capReached: "Достигнут лимит подарков в этом матче.",
    fraudFlagged: "Подарок отклонён: нельзя поддерживать обе стороны.",
    gifts: { rose: "Роза", donut: "Пончик", tiktok: "TikTok", gift: "Подарок", rocket: "Ракета" },
  },
};

type Line = (attacker: string, defender: string, extra?: string) => string;

type Commentary = {
  hit: Line[];
  bigHit: Line[];
  combo: Line[];
  ko: Line[];
  idle: Line[];
  lead: Line[];
  roundStart: Line[];
};

export const COMMENTARY: Record<Lang, Commentary> = {
  en: {
    hit: [
      (a, d) => `${a} lands a clean punch on ${d}!`,
      (a, d) => `Right hook from ${a}, ${d} stumbles back!`,
      (a, d) => `${a} keeps the pressure on ${d}!`,
      (a, d) => `Body shot! ${d} feels that one from ${a}.`,
    ],
    bigHit: [
      (a, d) => `HUGE slam! ${a} throws ${d} across the canvas!`,
      (a, d) => `Devastating kick by ${a}, ${d} is down on the mat!`,
      (a, d) => `${a} unloads everything on ${d}! The arena erupts!`,
    ],
    combo: [
      (a, _d, x) => `${a} is on a ${x} hit combo — unstoppable!`,
      (a, _d, x) => `${x} strikes in a row from ${a}!`,
    ],
    ko: [(a, d) => `KNOCKOUT! ${d} cannot answer the count — ${a} takes it!`],
    idle: [
      (a, d) => `${a} and ${d} circle each other, waiting for an opening…`,
      (a, d) => `The crowd is chanting. ${d} watches ${a} closely.`,
      () => `Send a gift and your fighter strikes!`,
    ],
    lead: [(a, d) => `${a} takes the lead over ${d} on the scoreboard!`],
    roundStart: [(a, d) => `The referee signals — ${a} versus ${d}, fight!`],
  },
  de: {
    hit: [
      (a, d) => `${a} landet einen sauberen Treffer bei ${d}!`,
      (a, d) => `Rechter Haken von ${a}, ${d} taumelt zurück!`,
      (a, d) => `${a} erhöht den Druck auf ${d}!`,
    ],
    bigHit: [
      (a, d) => `Gewaltiger Slam! ${a} schleudert ${d} über die Matte!`,
      (a, d) => `Vernichtender Tritt von ${a}, ${d} liegt am Boden!`,
    ],
    combo: [(a, _d, x) => `${a} landet eine ${x}er-Kombination — unaufhaltsam!`],
    ko: [(a, d) => `KNOCKOUT! ${d} steht nicht mehr auf — ${a} gewinnt!`],
    idle: [
      (a, d) => `${a} und ${d} umkreisen sich und warten auf eine Lücke…`,
      () => `Schicke ein Geschenk und dein Kämpfer schlägt zu!`,
    ],
    lead: [(a, d) => `${a} geht auf der Anzeigetafel an ${d} vorbei!`],
    roundStart: [(a, d) => `Der Schiedsrichter gibt frei — ${a} gegen ${d}, Kampf!`],
  },
  sr: {
    hit: [
      (a, d) => `${a} pogađa čist udarac na ${d}!`,
      (a, d) => `Desni kroše od ${a}, ${d} posrće unazad!`,
      (a, d) => `${a} pojačava pritisak na ${d}!`,
    ],
    bigHit: [
      (a, d) => `Ogroman slem! ${a} baca ${d} preko ringa!`,
      (a, d) => `Razoran šut od ${a}, ${d} je na podu!`,
    ],
    combo: [(a, _d, x) => `${a} niže kombinaciju od ${x} udaraca — nezaustavljivo!`],
    ko: [(a, d) => `NOKAUT! ${d} ne ustaje — ${a} pobeđuje!`],
    idle: [
      (a, d) => `${a} i ${d} kruže jedan oko drugog…`,
      () => `Pošalji poklon i tvoj borac udara!`,
    ],
    lead: [(a, d) => `${a} preuzima vođstvo nad ${d}!`],
    roundStart: [(a, d) => `Sudija daje znak — ${a} protiv ${d}, borba!`],
  },
  ro: {
    hit: [
      (a, d) => `${a} plasează un pumn curat în ${d}!`,
      (a, d) => `Croșeu de dreapta de la ${a}, ${d} se clatină!`,
      (a, d) => `${a} continuă presiunea asupra lui ${d}!`,
      (a, d) => `Lovitură la corp! ${d} a simțit-o din plin de la ${a}.`,
    ],
    bigHit: [
      (a, d) => `Slam uriaș! ${a} îl aruncă pe ${d} prin tot ringul!`,
      (a, d) => `Lovitură devastatoare de la ${a}, ${d} este la podea!`,
      (a, d) => `${a} descarcă totul pe ${d}! Arena explodează!`,
    ],
    combo: [
      (a, _d, x) => `${a} este pe o combinație de ${x} lovituri — de neoprit!`,
      (a, _d, x) => `${x} lovituri la rând de la ${a}!`,
    ],
    ko: [(a, d) => `KNOCKOUT! ${d} nu se mai ridică — ${a} câștigă!`],
    idle: [
      (a, d) => `${a} și ${d} se rotesc în ring, își caută deschiderea…`,
      (a, d) => `Publicul scandează. ${d} îl urmărește atent pe ${a}.`,
      () => `Trimite un cadou și luptătorul tău lovește!`,
    ],
    lead: [(a, d) => `${a} trece în fața lui ${d} pe tabela de scor!`],
    roundStart: [(a, d) => `Arbitrul dă semnalul — ${a} contra ${d}, luptă!`],
  },
  ru: {
    hit: [
      (a, d) => `${a} наносит чистый удар по ${d}!`,
      (a, d) => `Правый хук от ${a}, ${d} отшатывается!`,
      (a, d) => `${a} усиливает давление на ${d}!`,
    ],
    bigHit: [
      (a, d) => `Мощный слэм! ${a} бросает ${d} через весь ринг!`,
      (a, d) => `Разрушительный удар ногой от ${a}, ${d} на настиле!`,
    ],
    combo: [(a, _d, x) => `${a} проводит серию из ${x} ударов — не остановить!`],
    ko: [(a, d) => `НОКАУТ! ${d} не поднимается — побеждает ${a}!`],
    idle: [
      (a, d) => `${a} и ${d} кружат по рингу…`,
      () => `Отправь подарок — и твой боец ударит!`,
    ],
    lead: [(a, d) => `${a} выходит вперёд по очкам против ${d}!`],
    roundStart: [(a, d) => `Судья даёт сигнал — ${a} против ${d}, бой!`],
  },
};

export const SIDE_NAME: Record<Lang, { ru: string; us: string; ruTeam: string; usTeam: string }> = {
  en: { ru: "Putin", us: "Trump", ruTeam: "RUSSIA", usTeam: "USA" },
  de: { ru: "Putin", us: "Trump", ruTeam: "RUSSLAND", usTeam: "USA" },
  sr: { ru: "Putin", us: "Tramp", ruTeam: "RUSIJA", usTeam: "SAD" },
  ro: { ru: "Putin", us: "Trump", ruTeam: "RUSIA", usTeam: "USA" },
  ru: { ru: "Путин", us: "Трамп", ruTeam: "РОССИЯ", usTeam: "США" },
};

type RefLines = {
  count: (n: number, fighter: string) => string;
  up: (fighter: string) => string;
  ko: (fighter: string) => string;
};

/** What the referee/commentator says during a count, in every language. */
export const REFEREE_LINES: Record<Lang, RefLines> = {
  en: {
    count: (n, f) => `${f} is down! The referee counts ${n}!`,
    up: (f) => `${f} beats the count and is back on his feet!`,
    ko: (f) => `Ten! It is over — ${f} stays down. Knockout!`,
  },
  de: {
    count: (n, f) => `${f} liegt am Boden! Der Schiedsrichter zählt ${n}!`,
    up: (f) => `${f} steht vor dem Ende wieder auf!`,
    ko: (f) => `Zehn! Vorbei — ${f} bleibt liegen. Knockout!`,
  },
  sr: {
    count: (n, f) => `${f} je na podu! Sudija broji ${n}!`,
    up: (f) => `${f} ustaje pre kraja brojanja!`,
    ko: (f) => `Deset! Gotovo je — ${f} ostaje dole. Nokaut!`,
  },
  ro: {
    count: (n, f) => `${f} este la podea! Arbitrul numără ${n}!`,
    up: (f) => `${f} se ridică înainte de finalul numărătorii!`,
    ko: (f) => `Zece! S-a terminat — ${f} rămâne jos. Knockout!`,
  },
  ru: {
    count: (n, f) => `${f} на настиле! Судья считает ${n}!`,
    up: (f) => `${f} поднимается до конца счёта!`,
    ko: (f) => `Десять! Всё — ${f} остаётся лежать. Нокаут!`,
  },
};
