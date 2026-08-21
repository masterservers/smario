import { getMix } from "@/lib/mix";
import type { Lang } from "@/lib/i18n";

/**
 * Neural broadcast voice for the announcer.
 *
 * Lines are generated server-side (Lovable AI text-to-speech) and cached in
 * memory by text + language, so repeated calls play instantly and cost
 * nothing extra. If the network or the voice service is unavailable we fall
 * back to the browser's own speech synthesis so the ring is never silent.
 */

export type VoiceTone = "normal" | "big" | "ko";

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();
const MAX_CACHE = 120;

function key(text: string, lang: Lang, tone: VoiceTone) {
  return `${lang}|${tone}|${text}`;
}

async function fetchClip(text: string, lang: Lang, tone: VoiceTone): Promise<string | null> {
  try {
    const res = await fetch("/api/public/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang, tone }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size < 512) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function getVoiceClip(
  text: string,
  lang: Lang,
  tone: VoiceTone,
): Promise<string | null> {
  const k = key(text, lang, tone);
  const cached = cache.get(k);
  if (cached) return cached;
  const pending = inflight.get(k);
  if (pending) return pending;

  const task = fetchClip(text, lang, tone).then((url) => {
    inflight.delete(k);
    if (url) {
      cache.set(k, url);
      if (cache.size > MAX_CACHE) {
        const oldest = cache.keys().next().value;
        if (oldest) {
          const stale = cache.get(oldest);
          if (stale) URL.revokeObjectURL(stale);
          cache.delete(oldest);
        }
      }
    }
    return url;
  });
  inflight.set(k, task);
  return task;
}

/** Warm the cache for a line we expect to say soon (round intros, ref counts). */
export function prefetchVoice(text: string, lang: Lang, tone: VoiceTone = "normal") {
  void getVoiceClip(text, lang, tone);
}

let current: HTMLAudioElement | null = null;

/** Plays a generated line; resolves when it finished (or failed). */
export function playVoiceClip(url: string, onEnded: () => void): HTMLAudioElement {
  const audio = new Audio(url);
  audio.preload = "auto";
  audio.volume = getMix().voice;
  const finish = () => {
    if (current === audio) current = null;
    onEnded();
  };
  audio.addEventListener("ended", finish, { once: true });
  audio.addEventListener("error", finish, { once: true });
  current = audio;
  void audio.play().catch(finish);
  return audio;
}

export function stopVoiceClip() {
  if (!current) return;
  current.pause();
  current.currentTime = 0;
  current = null;
}
