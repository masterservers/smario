import { createServerFn } from "@tanstack/react-start";

/** Safe, viewer-facing description of a share link — never the token itself. */
export type SessionLookup = {
  found: boolean;
  label: string | null;
  lang: string | null;
  allowGifts: boolean;
  isActive: boolean;
  expiresAt: string | null;
};

/**
 * Resolves a `?s=<token>` viewing link on the server.
 *
 * Share tokens are never readable from the browser: the client sends the token
 * it already has and gets back only what the arena needs to open in watch mode.
 */
export const resolveLiveSession = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => ({
    token: String(input?.token ?? "").trim().slice(0, 64),
  }))
  .handler(async ({ data }): Promise<SessionLookup> => {
    const empty: SessionLookup = {
      found: false,
      label: null,
      lang: null,
      allowGifts: false,
      isActive: false,
      expiresAt: null,
    };
    if (!data.token) return empty;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("live_sessions")
      .select("label, lang, allow_gifts, is_active, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) return empty;
    return {
      found: true,
      label: row.label as string,
      lang: row.lang as string,
      allowGifts: Boolean(row.allow_gifts),
      isActive: Boolean(row.is_active),
      expiresAt: (row.expires_at as string | null) ?? null,
    };
  });
