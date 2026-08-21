import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LANGS, LANG_META, type Lang } from "@/lib/i18n";
import {
  createLiveSession,
  deleteLiveSession,
  listLiveSessions,
  updateLiveSession,
  type LiveSession,
} from "@/lib/sessions.functions";

/**
 * Generates shareable "watch live" links. A link opens the arena in spectator
 * mode only — no console, no settings, and gifting only when explicitly
 * allowed for that link.
 */
export function SessionLinks({ lang, onAudit }: { lang: Lang; onAudit: (action: string, details: string) => void }) {
  const list = useServerFn(listLiveSessions);
  const create = useServerFn(createLiveSession);
  const update = useServerFn(updateLiveSession);
  const remove = useServerFn(deleteLiveSession);

  const [rows, setRows] = useState<LiveSession[]>([]);
  const [label, setLabel] = useState("Live session");
  const [sessionLang, setSessionLang] = useState<Lang>(lang);
  const [allowGifts, setAllowGifts] = useState(false);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRows(await list({ data: undefined }));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the links");
    }
  }, [list]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const linkFor = (session: LiveSession) =>
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/live?lang=${session.lang}&s=${session.token}`;

  const copy = async (session: LiveSession) => {
    try {
      await navigator.clipboard.writeText(linkFor(session));
      setCopied(session.id);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Copy the link manually from the field.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await create({ data: { label, lang: sessionLang, allowGifts, days } });
      setRows((prev) => [created, ...prev]);
      onAudit("session link created", `${created.label} · ${created.lang} · gifts ${allowGifts ? "on" : "off"}`);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the link");
    } finally {
      setBusy(false);
    }
  };

  const patch = async (session: LiveSession, change: { isActive?: boolean; allowGifts?: boolean }) => {
    try {
      const next = await update({ data: { id: session.id, ...change } });
      setRows((prev) => prev.map((row) => (row.id === next.id ? next : row)));
      onAudit("session link updated", `${next.label} · ${JSON.stringify(change)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update the link");
    }
  };

  const revoke = async (session: LiveSession) => {
    try {
      await remove({ data: { id: session.id } });
      setRows((prev) => prev.filter((row) => row.id !== session.id));
      onAudit("session link revoked", session.label);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not revoke the link");
    }
  };

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-2" onSubmit={submit}>
        <label className="text-xs text-muted-foreground">
          Label
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 h-9 w-48"
            aria-label="Session label"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Language
          <select
            value={sessionLang}
            onChange={(e) => setSessionLang(e.target.value as Lang)}
            className="mt-1 block h-9 rounded-md border border-border bg-background px-2 text-sm"
            aria-label="Session language"
          >
            {LANGS.map((code) => (
              <option key={code} value={code}>
                {LANG_META[code].flag} {LANG_META[code].label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Valid for (days, 0 = forever)
          <Input
            type="number"
            min={0}
            max={365}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="mt-1 h-9 w-28"
            aria-label="Days valid"
          />
        </label>
        <label className="flex h-9 items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={allowGifts}
            onChange={(e) => setAllowGifts(e.target.checked)}
            className="accent-primary"
          />
          Viewers may send gifts
        </label>
        <Button type="submit" size="sm" disabled={busy}>
          Generate link
        </Button>
      </form>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="space-y-2">
        {rows.map((session) => (
          <div key={session.id} className="rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="display text-xs uppercase tracking-widest">{session.label}</span>
              <span className="text-xs text-muted-foreground">
                {LANG_META[(session.lang as Lang) ?? "en"]?.flag} {session.lang}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  session.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {session.is_active ? "active" : "paused"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {session.allow_gifts ? "gifts allowed" : "watch only"}
                {session.expires_at
                  ? ` · until ${new Date(session.expires_at).toLocaleDateString()}`
                  : " · no expiry"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Input
                readOnly
                value={linkFor(session)}
                onFocus={(e) => e.currentTarget.select()}
                className="h-8 min-w-[16rem] flex-1 text-xs"
                aria-label={`${session.label} link`}
              />
              <Button type="button" size="sm" variant="outline" onClick={() => void copy(session)}>
                {copied === session.id ? "Copied ✓" : "Copy"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void patch(session, { isActive: !session.is_active })}
              >
                {session.is_active ? "Pause" : "Resume"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void patch(session, { allowGifts: !session.allow_gifts })}
              >
                {session.allow_gifts ? "Watch only" : "Allow gifts"}
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => void revoke(session)}>
                Revoke
              </Button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground">No live links yet.</p>
        )}
      </div>
    </div>
  );
}
