import { useEffect, useState } from "react";

/**
 * Match log: every move actually executed in the ring, with the round, the
 * timing, its physical type and power, the side it belonged to, and the
 * announcer line that went with it. Exportable as CSV or JSON for review.
 */

export type MoveLogEntry = {
  seq: number;
  /** Wall-clock ISO timestamp. */
  at: string;
  /** Milliseconds since the log was started (or last cleared). */
  ms: number;
  round: number;
  /** Who executed the move. */
  side: "ru" | "us";
  source: "gift" | "spar" | "follow";
  gift: string;
  moveId: string;
  label: string;
  /** punch / kick / aerial / throw / grapple. */
  kind: string;
  /** Power tier 1–5. */
  tier: number;
  /** Announcer language and line, attached when the commentary fires. */
  lang: string;
  line: string;
};

const MAX = 2000;

let seq = 0;
let started = performance.now();
let entries: MoveLogEntry[] = [];
const listeners = new Set<(value: MoveLogEntry[]) => void>();

function emit() {
  const snapshot = entries;
  for (const listener of listeners) listener(snapshot);
}

export function logMove(entry: Omit<MoveLogEntry, "seq" | "at" | "ms" | "lang" | "line">) {
  seq += 1;
  const row: MoveLogEntry = {
    ...entry,
    seq,
    at: new Date().toISOString(),
    ms: Math.round(performance.now() - started),
    lang: "",
    line: "",
  };
  entries = [...entries, row].slice(-MAX);
  emit();
}

/** Attaches the announcer line to the move that is currently on screen. */
export function logLine(text: string, lang: string) {
  const last = entries[entries.length - 1];
  if (!last || last.line) return;
  entries = [...entries.slice(0, -1), { ...last, line: text, lang }];
  emit();
}

export function getMoveLog(): MoveLogEntry[] {
  return entries;
}

export function clearMoveLog() {
  entries = [];
  seq = 0;
  started = performance.now();
  emit();
}

export function useMoveLog(): MoveLogEntry[] {
  const [value, setValue] = useState<MoveLogEntry[]>(entries);
  useEffect(() => {
    setValue(entries);
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}

const COLUMNS: Array<keyof MoveLogEntry> = [
  "seq",
  "at",
  "ms",
  "round",
  "side",
  "source",
  "gift",
  "moveId",
  "label",
  "kind",
  "tier",
  "lang",
  "line",
];

function cell(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV of the whole log, or of one round when `round` is given. */
export function moveLogCsv(round?: number): string {
  const rows = round === undefined ? entries : entries.filter((e) => e.round === round);
  const head = COLUMNS.join(",");
  const body = rows.map((row) => COLUMNS.map((key) => cell(row[key])).join(","));
  return [head, ...body].join("\n");
}

export function moveLogJson(round?: number): string {
  const rows = round === undefined ? entries : entries.filter((e) => e.round === round);
  const rounds = Array.from(new Set(rows.map((row) => row.round))).sort((a, b) => a - b);
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      rounds: rounds.map((no) => ({
        round: no,
        moves: rows.filter((row) => row.round === no),
      })),
    },
    null,
    2,
  );
}

/** Rounds present in the log, for the export picker. */
export function loggedRounds(): number[] {
  return Array.from(new Set(entries.map((row) => row.round))).sort((a, b) => a - b);
}
