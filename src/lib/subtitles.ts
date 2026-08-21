import { useEffect, useState } from "react";

export type SubtitleTone = "ref" | "gift" | "hit" | "commentary";
export type Subtitle = { id: string; text: string; tone: SubtitleTone } | null;

type Listener = (value: Subtitle) => void;

let current: Subtitle = null;
let clearTimer = 0;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener(current);
}

/**
 * Publish the caption for a spoken announcement. Called at the exact moment the
 * message appears in the top bar (or in the commentary lane), so the subtitle
 * and the voice line are always in sync — and captions still show when muted.
 */
export function publishSubtitle(text: string, tone: SubtitleTone, lifeMs = 3000) {
  if (typeof window === "undefined") return;
  current = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, tone };
  emit();
  window.clearTimeout(clearTimer);
  const id = current.id;
  clearTimer = window.setTimeout(() => {
    if (current?.id !== id) return;
    current = null;
    emit();
  }, lifeMs);
}

/** Live caption for the current announcement, or null when nothing is on air. */
export function useSubtitle(): Subtitle {
  const [value, setValue] = useState<Subtitle>(current);
  useEffect(() => {
    listeners.add(setValue);
    setValue(current);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}

const KEY = "pvt.subtitles";

export function loadSubtitlesOn(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(KEY) !== "off";
}

export function saveSubtitlesOn(on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, on ? "on" : "off");
}
