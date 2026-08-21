/**
 * Match title: approved presets plus validation.
 *
 * TikTok does not allow political framing, so anything that reads as political
 * (or as an insult / call to violence) is rejected and automatically replaced
 * by the approved variant everywhere: scoreboard, page titles, notifications.
 */

export const DEFAULT_TITLE = "Fight Putin vs Trump";

export type TitlePreset = { id: string; title: string; note: string };

/** Titles cleared for broadcast — the admin picks one with a single click. */
export const TITLE_PRESETS: TitlePreset[] = [
  { id: "classic", title: DEFAULT_TITLE, note: "Approved default" },
  { id: "arena", title: "Fight Putin vs Trump — Live Gift Arena", note: "Long form, for pages" },
  { id: "ring", title: "Ring Battle · Putin vs Trump", note: "Neutral, ring themed" },
  { id: "world", title: "World Ring Cup — Putin vs Trump", note: "Tournament styling" },
  { id: "gift", title: "Gift Battle · Putin vs Trump", note: "Highlights the gift mechanic" },
];

/** Words that must never reach a public title. */
const BANNED = [
  "political",
  "politic",
  "politik",
  "политик",
  "election",
  "war",
  "război",
  "razboi",
  "krieg",
  "война",
  "rat ",
  "kill",
  "death",
  "nazi",
  "terror",
];

export type TitleCheck = {
  /** Title that will actually be used (always safe to render). */
  value: string;
  ok: boolean;
  issues: string[];
};

/** Validates a candidate title and falls back to the approved variant. */
export function validateTitle(raw: string): TitleCheck {
  const issues: string[] = [];
  const trimmed = (raw ?? "").replace(/\s+/g, " ").trim();

  if (!trimmed) issues.push("Title cannot be empty.");
  if (trimmed.length > 60) issues.push("Keep the title under 60 characters.");
  if (trimmed.length && trimmed.length < 4) issues.push("Title is too short.");
  if (/[<>{}]/.test(trimmed)) issues.push("Remove the characters < > { }.");

  const lower = ` ${trimmed.toLowerCase()} `;
  const hits = BANNED.filter((word) => lower.includes(word));
  if (hits.length) issues.push(`Not allowed on TikTok: ${hits.join(", ")}.`);

  return {
    value: issues.length ? DEFAULT_TITLE : trimmed,
    ok: issues.length === 0,
    issues,
  };
}

/** Normalizes any stored value into an approved title. */
export function normalizeTitle(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_TITLE;
  return validateTitle(raw).value;
}

/** Page title for a given section, always built on the approved match title. */
export function pageTitle(section: string | null, title: string): string {
  const safe = normalizeTitle(title);
  return section ? `${section} — ${safe}` : safe;
}
