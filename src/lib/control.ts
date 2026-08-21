import { useEffect, useState } from "react";
import { isLang, type Lang } from "@/lib/i18n";
import { applyMix, getMix, normalizeMix, subscribeMix, type AudioMix } from "@/lib/mix";

/**
 * Live control bus between the admin console and every open arena tab.
 * The admin switches the commentator language, the audio mix or pushes a
 * spoken command and the arena reacts instantly, without a reload.
 */
export type ControlMessage =
  | { type: "lang"; lang: Lang }
  | { type: "say"; lang: Lang; text: string }
  | { type: "mix"; mix: AudioMix };

const CHANNEL = "pvt.control";
const LANG_KEY = "pvt.controlLang";


function channel(): BroadcastChannel | null {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return null;
  return new BroadcastChannel(CHANNEL);
}

export function publishControl(message: ControlMessage) {
  if (typeof window === "undefined") return;
  if (message.type === "lang") window.localStorage.setItem(LANG_KEY, message.lang);
  const bus = channel();
  bus?.postMessage(message);
  bus?.close();
  // Same-tab listeners (admin preview) get the event too.
  window.dispatchEvent(new CustomEvent<ControlMessage>("pvt-control", { detail: message }));
}

/** The language last pushed from the admin console, if any. */
export function readControlLang(): Lang | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LANG_KEY);
  return isLang(raw) ? raw : null;
}

export function useControlBus(handler: (message: ControlMessage) => void) {
  useEffect(() => {
    const bus = channel();
    const onMessage = (event: MessageEvent<ControlMessage>) => handler(event.data);
    const onLocal = (event: Event) => handler((event as CustomEvent<ControlMessage>).detail);
    bus?.addEventListener("message", onMessage);
    window.addEventListener("pvt-control", onLocal);
    return () => {
      bus?.removeEventListener("message", onMessage);
      bus?.close();
      window.removeEventListener("pvt-control", onLocal);
    };
  }, [handler]);
}

/**
 * Language actually used on air: the admin override wins over the `?lang=`
 * of the link, so one click switches every viewer instantly.
 */
export function useBroadcastLang(fallback: Lang): Lang {
  const [lang, setLang] = useState<Lang>(fallback);
  useEffect(() => {
    setLang(readControlLang() ?? fallback);
  }, [fallback]);
  useEffect(() => {
    const apply = (message: ControlMessage) => {
      if (message.type === "lang") setLang(message.lang);
    };
    const bus = channel();
    const onMessage = (event: MessageEvent<ControlMessage>) => apply(event.data);
    const onLocal = (event: Event) => apply((event as CustomEvent<ControlMessage>).detail);
    bus?.addEventListener("message", onMessage);
    window.addEventListener("pvt-control", onLocal);
    return () => {
      bus?.removeEventListener("message", onMessage);
      bus?.close();
      window.removeEventListener("pvt-control", onLocal);
    };
  }, []);
  return lang;
}
