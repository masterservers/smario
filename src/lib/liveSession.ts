import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isLang, type Lang } from "@/lib/i18n";

/** What a viewer is allowed to do with the link they opened. */
export type ViewerAccess = {
  /** Still resolving the token. */
  loading: boolean;
  /** The link is usable (or no token was required). */
  allowed: boolean;
  /** Viewers may send gifts only when the link explicitly permits it. */
  canGift: boolean;
  /** Language forced by the session link, if any. */
  lang: Lang | null;
  label: string | null;
  reason: "ok" | "unknown" | "paused" | "expired";
};

const OPEN: ViewerAccess = {
  loading: false,
  allowed: true,
  canGift: false,
  lang: null,
  label: null,
  reason: "ok",
};

/**
 * Resolves a `?s=<token>` viewing link.
 *
 * A session link only opens the arena in watch mode: it never carries any
 * console rights, and gifting stays off unless the link was created with it.
 * Without a token the page stays public and watch-only.
 */
export function useViewerAccess(token: string | undefined): ViewerAccess {
  const [access, setAccess] = useState<ViewerAccess>(() =>
    token ? { ...OPEN, loading: true, allowed: false } : OPEN,
  );

  useEffect(() => {
    if (!token) {
      setAccess(OPEN);
      return;
    }
    let cancelled = false;
    setAccess({ ...OPEN, loading: true, allowed: false });

    void (async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("label, lang, allow_gifts, is_active, expires_at")
        .eq("token", token)
        .maybeSingle();
      if (cancelled) return;

      if (!data) {
        setAccess({ ...OPEN, allowed: false, reason: "unknown" });
        return;
      }
      if (!data.is_active) {
        setAccess({ ...OPEN, allowed: false, reason: "paused", label: data.label });
        return;
      }
      if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
        setAccess({ ...OPEN, allowed: false, reason: "expired", label: data.label });
        return;
      }
      setAccess({
        loading: false,
        allowed: true,
        canGift: data.allow_gifts,
        lang: isLang(data.lang) ? data.lang : null,
        label: data.label,
        reason: "ok",
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return access;
}

export const ACCESS_TEXT: Record<Lang, Record<"unknown" | "paused" | "expired" | "checking", string>> = {
  en: {
    checking: "Checking your live link…",
    unknown: "This live link is not valid.",
    paused: "This live session is paused.",
    expired: "This live link has expired.",
  },
  de: {
    checking: "Live-Link wird geprüft…",
    unknown: "Dieser Live-Link ist ungültig.",
    paused: "Diese Live-Session pausiert.",
    expired: "Dieser Live-Link ist abgelaufen.",
  },
  sr: {
    checking: "Provera linka za prenos…",
    unknown: "Ovaj link nije važeći.",
    paused: "Prenos je trenutno pauziran.",
    expired: "Ovaj link je istekao.",
  },
  ro: {
    checking: "Se verifică linkul de live…",
    unknown: "Acest link de live nu este valid.",
    paused: "Sesiunea live este în pauză.",
    expired: "Acest link de live a expirat.",
  },
  ru: {
    checking: "Проверяем ссылку трансляции…",
    unknown: "Эта ссылка недействительна.",
    paused: "Трансляция приостановлена.",
    expired: "Срок действия ссылки истёк.",
  },
};
