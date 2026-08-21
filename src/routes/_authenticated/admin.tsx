import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { GIFTS, GIFT_BY_ID, type GiftId, type Side } from "@/lib/battle";
import { LANG_META, LANGS, isLang, type Lang } from "@/lib/i18n";
import {
  getAdminConfig,
  newSessionId,
  saveAdminConfig,
  sideNames,
  type AdminConfig,
} from "@/lib/adminConfig";
import {
  defaultGiftConfig,
  getGiftConfig,
  saveGiftConfig,
  type GiftConfig,
  type GiftTarget,
} from "@/lib/giftConfig";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  claimFirstAdmin,
  probeTikTokSource,
  type SourceProbe,
  getMyStaffRole,
  listAuditLog,
  logAdminChange,
  type AuditEntry,
  type StaffRole,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: (search: Record<string, unknown>) => ({
    lang: isLang(search['lang']) ? (search['lang'] as Lang) : ("en" as Lang),
  }),
  head: () => ({
    meta: [
      { title: "Battle admin — Putin vs Trump Battle Arena" },
      {
        name: "description",
        content:
          "Admin console for the battle arena: fighter names and nicknames, gift settings, TikTok sources, shareable live link and the full gift history.",
      },
      { property: "og:title", content: "Battle admin — Putin vs Trump Battle Arena" },
      {
        property: "og:description",
        content: "Fighters, gifts, TikTok sources, live link and gift history in one console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const TARGETS: GiftTarget[] = ["auto", "ru", "us"];

type HistoryRow = {
  id: string;
  side: Side;
  gift: GiftId;
  value: number;
  sender: string;
  created_at: string;
};

function AdminPage() {
  const { lang } = Route.useSearch();
  const [config, setConfig] = useState<GiftConfig>(() => getGiftConfig());
  const [hits, setHits] = useState<HitConfig>(() => getHitConfig());
  const [admin, setAdmin] = useState<AdminConfig>(() => getAdminConfig());

  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [role, setRole] = useState<StaffRole | "loading">("loading");
  const [actor, setActor] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [probes, setProbes] = useState<Record<"liveUrl" | "webhookUrl", SourceProbe | null>>({
    liveUrl: null,
    webhookUrl: null,
  });
  const [probing, setProbing] = useState<"liveUrl" | "webhookUrl" | null>(null);
  const names = sideNames(lang);
  const pending = useRef<Map<string, number>>(new Map());

  const loadAudit = useCallback(async () => {
    try {
      setAudit((await listAuditLog()) as AuditEntry[]);
    } catch {
      setAudit([]);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMyStaffRole();
        setRole(me.role);
        setActor(me.email);
        if (me.role) void loadAudit();
      } catch {
        setRole(null);
      }
    })();
  }, [loadAudit]);

  /**
   * Writes an audit entry. Field edits fire on every keystroke, so identical
   * actions are coalesced into one entry per one and a half seconds.
   */
  const record = useCallback(
    (section: string, action: string, details: Record<string, unknown>) => {
      const text = JSON.stringify(details);
      const key = `${section}:${action}`;
      const previous = pending.current.get(key);
      if (previous) window.clearTimeout(previous);
      const timer = window.setTimeout(() => {
        pending.current.delete(key);
        void logAdminChange({ data: { section, action, details: text } })
          .then(() => loadAudit())
          .catch(() => undefined);
      }, 1500);
      pending.current.set(key, timer);
    },
    [loadAudit],
  );

  const update = (id: GiftId, patch: Partial<GiftConfig[GiftId]>) => {
    setConfig((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
    setSaved(false);
    record("gifts", `edit ${id}`, patch as Record<string, unknown>);
  };

  const updatePhrase = (id: GiftId, phraseLang: Lang, value: string) => {
    setConfig((current) => ({
      ...current,
      [id]: { ...current[id], phrases: { ...current[id].phrases, [phraseLang]: value } },
    }));
    setSaved(false);
    record("gifts", `phrase ${id} · ${phraseLang}`, { value });
  };

  const patchAdmin = (patch: Partial<AdminConfig>, section = "settings", action = "update") => {
    setAdmin((current) => {
      const next = { ...current, ...patch };
      saveAdminConfig(next);
      return next;
    });
    record(section, action, patch as Record<string, unknown>);
  };

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from("gift_events")
      .select("id, side, gift, value, sender, created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    setHistory((data ?? []) as HistoryRow[]);
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const targetLabel = (target: GiftTarget) =>
    target === "auto" ? "Auto" : target === "ru" ? names.ruTeam : names.usTeam;

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const liveLink = `${origin}/live?lang=${lang}&s=${admin.liveSession}`;

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  if (role === "loading") {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-16 text-sm text-muted-foreground">
        Checking your access…
  
      {/* Audit log ------------------------------------------------------ */}
      <section className="panel mt-8 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="display text-sm uppercase tracking-widest text-muted-foreground">
            Audit log
          </h2>
          <Button type="button" size="sm" variant="outline" onClick={() => void loadAudit()}>
            Refresh
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Every change made in this console: who did it, when, and exactly what changed.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 pr-3">When</th>
                <th className="py-1 pr-3">Who</th>
                <th className="py-1 pr-3">Section</th>
                <th className="py-1 pr-3">Change</th>
                <th className="py-1">Details</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((entry) => (
                <tr key={entry.id} className="border-t border-border/60 align-top">
                  <td className="py-1.5 pr-3 text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="py-1.5 pr-3">{entry.actor_email ?? "—"}</td>
                  <td className="py-1.5 pr-3">{entry.section}</td>
                  <td className="py-1.5 pr-3">{entry.action}</td>
                  <td className="py-1.5 break-all text-muted-foreground">
                    {entry.details}
                  </td>
                </tr>
              ))}
              {audit.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-muted-foreground">
                    No changes recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
    );
  }

  if (!role) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16">
        <h1 className="display text-2xl text-gold">No access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {actor ? `${actor} has no ` : "This account has no "}admin or moderator role, so the
          battle console stays locked. Ask an administrator to grant you a role.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => {
              void claimFirstAdmin()
                .then(async (result) => {
                  if (result.granted) {
                    const me = await getMyStaffRole();
                    setRole(me.role);
                    void loadAudit();
                  } else {
                    window.alert("An administrator already exists — ask them for access.");
                  }
                })
                .catch(() => window.alert("Could not claim the admin role."));
            }}
          >
            Claim admin (first account only)
          </Button>
          <Button type="button" variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
          <Link
            to="/"
            search={{ lang }}
            className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground"
          >
            ← Arena
          </Link>
        </div>
      </main>
    );
  }

  const readOnly = role === "moderator";

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-2xl text-gold">Battle admin</h1>
          <p className="text-xs text-muted-foreground">
            {actor} · role: {role}
            {readOnly ? " (moderator — changes are logged and reviewed)" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
          <Link
            to="/"
            search={{ lang }}
            className="rounded-md border border-border px-3 py-1 text-sm text-muted-foreground"
          >
            ← Arena
          </Link>
        </div>
      </div>

      {/* Fighters ------------------------------------------------------- */}
      <section className="panel mt-6 rounded-2xl p-4">
        <h2 className="display text-sm uppercase tracking-widest text-muted-foreground">
          Fighters
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The name shows in the scoreboard; the ring nickname is what the announcer says and what
          the subtitles print.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(["ru", "us"] as const).map((side) => (
            <div key={side} className="rounded-xl border border-border p-3">
              <div className="display text-xs uppercase tracking-widest text-muted-foreground">
                {side === "ru" ? `🇷🇺 ${names.ruTeam}` : `🇺🇸 ${names.usTeam}`}
              </div>
              <label className="mt-2 block text-xs text-muted-foreground">
                Name
                <Input
                  value={admin.fighters[side].name}
                  onChange={(e) =>
                    patchAdmin({
                      fighters: {
                        ...admin.fighters,
                        [side]: { ...admin.fighters[side], name: e.target.value },
                      },
                    }, "fighters", `${side} name`)
                  }
                  className="mt-1 h-9"
                  aria-label={`${side} fighter name`}
                />
              </label>
              <label className="mt-2 block text-xs text-muted-foreground">
                Ring nickname
                <Input
                  value={admin.fighters[side].nickname}
                  onChange={(e) =>
                    patchAdmin({
                      fighters: {
                        ...admin.fighters,
                        [side]: { ...admin.fighters[side], nickname: e.target.value },
                      },
                    }, "fighters", `${side} nickname`)
                  }
                  className="mt-1 h-9"
                  aria-label={`${side} fighter nickname`}
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* Hits & referee -------------------------------------------------- */}
      <section className="panel mt-4 rounded-2xl p-4">
        <h2 className="display text-sm uppercase tracking-widest text-muted-foreground">
          Hits &amp; referee
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Maps every gift to a kind of blow, its tier and how hard it lands. Changes apply to the
          next hit — no redeploy needed.
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {GIFTS.map((gift) => {
            const rule = hits.gifts[gift.id];
            return (
              <div key={gift.id} className="rounded-xl border border-border p-3">
                <div className="display text-xs uppercase tracking-widest">
                  {gift.emoji} {gift.id}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {HIT_KINDS.map((kind) => {
                    const on = rule.kinds.includes(kind);
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() =>
                          patchHit(gift.id, {
                            kinds: on
                              ? rule.kinds.filter((k) => k !== kind)
                              : [...rule.kinds, kind],
                          })
                        }
                        className={`rounded-md border px-2 py-1 text-xs ${
                          on
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {kind}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["tier", 1, 5, 1],
                      ["force", 0.4, 2, 0.05],
                      ["stun", 0.4, 2, 0.05],
                    ] as const
                  ).map(([field, min, max, step]) => (
                    <label key={field} className="text-xs text-muted-foreground">
                      {field} <span className="text-foreground">{rule[field]}</span>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={rule[field]}
                        onChange={(e) => patchHit(gift.id, { [field]: Number(e.target.value) })}
                        className="mt-1 w-full accent-primary"
                        aria-label={`${gift.id} ${field}`}
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {(
            [
              ["knockdownCount", 4, 10, 1],
              ["finalCount", 6, 12, 1],
              ["countMs", 500, 1500, 50],
              ["resumeDelayMs", 0, 3000, 100],
            ] as const
          ).map(([field, min, max, step]) => (
            <label key={field} className="text-xs text-muted-foreground">
              {field} <span className="text-foreground">{hits.referee[field]}</span>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={hits.referee[field]}
                onChange={(e) => patchReferee({ [field]: Number(e.target.value) })}
                className="mt-1 w-full accent-primary"
                aria-label={`referee ${field}`}
              />
            </label>
          ))}
        </div>
        <Button
          variant="outline"
          className="mt-3 h-9"
          onClick={() => {
            const fresh = defaultHitConfig();
            setHits(fresh);
            saveHitConfig(fresh);
            record("hits", "reset", {});
          }}
        >
          Reset to defaults
        </Button>
      </section>



      {/* TikTok --------------------------------------------------------- */}
      <section className="panel mt-4 rounded-2xl p-4">
        <h2 className="display text-sm uppercase tracking-widest text-muted-foreground">
          TikTok source
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted-foreground">
            Account
            <Input
              value={admin.tiktok.username}
              placeholder="@account"
              onChange={(e) => patchAdmin({ tiktok: { ...admin.tiktok, username: e.target.value } }, "tiktok", "username")}
              className="mt-1 h-9"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Live room URL
            <Input
              value={admin.tiktok.liveUrl}
              placeholder="https://www.tiktok.com/@account/live"
              onChange={(e) => patchAdmin({ tiktok: { ...admin.tiktok, liveUrl: e.target.value } }, "tiktok", "live url")}
              className="mt-1 h-9"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Gift relay endpoint
            <Input
              value={admin.tiktok.webhookUrl}
              placeholder="https://…/api/public/tiktok"
              onChange={(e) =>
                patchAdmin({ tiktok: { ...admin.tiktok, webhookUrl: e.target.value } }, "tiktok", "relay endpoint")
              }
              className="mt-1 h-9"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant={admin.tiktok.enabled ? "default" : "outline"}
            onClick={() => patchAdmin({ tiktok: { ...admin.tiktok, enabled: !admin.tiktok.enabled } }, "tiktok", "source toggle")}
          >
            {admin.tiktok.enabled ? "Source active" : "Source paused"}
          </Button>
          {admin.tiktok.liveUrl && (
            <a
              href={admin.tiktok.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-gold underline"
            >
              Open live room ↗
            </a>
          )}
          <span className="text-xs text-muted-foreground">
            {admin.tiktok.webhookUrl
              ? "Relay configured — gifts posted to this endpoint land in the arena."
              : "No relay endpoint yet — gifts only come from the in-app dock."}
          </span>
        </div>

        {/* Connection test — read-only, never interrupts the running match */}
        <div className="mt-4 rounded-xl border border-border/60 bg-background/40 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Connection test
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Checks the live room and the relay endpoint without touching the current session.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(["liveUrl", "webhookUrl"] as const).map((field) => {
              const url = admin.tiktok[field];
              const probe = probes[field];
              return (
                <div key={field} className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {field === "liveUrl" ? "Live room" : "Gift relay"}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!url || probing === field}
                      onClick={() => {
                        setProbing(field);
                        void probeTikTokSource({ data: { url } })
                          .then((result) => {
                            setProbes((current) => ({ ...current, [field]: result }));
                            record("tiktok", `test ${field}`, {
                              ok: result.ok,
                              status: result.status,
                            });
                          })
                          .catch((error: unknown) =>
                            setProbes((current) => ({
                              ...current,
                              [field]: {
                                ok: false,
                                status: null,
                                latencyMs: 0,
                                message:
                                  error instanceof Error ? error.message : "Test failed",
                              },
                            })),
                          )
                          .finally(() => setProbing(null));
                      }}
                    >
                      {probing === field ? "Testing…" : "Test"}
                    </Button>
                  </div>
                  <p className="mt-2 break-all text-xs text-muted-foreground">
                    {url || "Not configured"}
                  </p>
                  {probe && (
                    <p
                      className={`mt-2 text-xs ${probe.ok ? "text-emerald-400" : "text-destructive"}`}
                    >
                      {probe.ok ? "● Online" : "● Problem"} — {probe.message}
                      {probe.status ? ` (HTTP ${probe.status})` : ""} · {probe.latencyMs} ms
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {history[0] ? (
              <>
                Last live event: {GIFT_BY_ID[history[0].gift as GiftId]?.emoji ?? "🎁"}{" "}
                {history[0].gift} → {history[0].side === "ru" ? names.ruTeam : names.usTeam} from{" "}
                {history[0].sender} · {new Date(history[0].created_at).toLocaleTimeString()}
              </>
            ) : (
              "No events received yet."
            )}
          </div>
        </div>
      </section>

      {/* Live link ------------------------------------------------------ */}
      <section className="panel mt-4 rounded-2xl p-4">
        <h2 className="display text-sm uppercase tracking-widest text-muted-foreground">
          Live session link
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md border border-border px-3 py-2 text-xs">
            {liveLink}
          </code>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              void navigator.clipboard?.writeText(liveLink);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => patchAdmin({ liveSession: newSessionId() }, "live", "new session")}
          >
            New session
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Share this link so viewers open the live ring cam and follow the match in real time.
        </p>
      </section>

      {/* Gift history --------------------------------------------------- */}
      <section className="panel mt-4 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="display text-sm uppercase tracking-widest text-muted-foreground">
            Gift history
          </h2>
          <Button type="button" size="sm" variant="outline" onClick={() => void loadHistory()}>
            Refresh
          </Button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 pr-3">Time</th>
                <th className="py-1 pr-3">Sender</th>
                <th className="py-1 pr-3">Gift</th>
                <th className="py-1 pr-3">Language</th>
                <th className="py-1 pr-3">Recipient</th>
                <th className="py-1">Hit result</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => {
                const entry = config[row.gift];
                const damage = GIFT_BY_ID[row.gift]?.damage ?? 0;
                const defender = row.side === "ru" ? names.us : names.ru;
                return (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="py-1.5 pr-3 text-muted-foreground">
                      {new Date(row.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-1.5 pr-3">{row.sender}</td>
                    <td className="py-1.5 pr-3">
                      {entry?.emoji ?? "🎁"} {entry?.phrases[lang] ?? row.gift} · +{row.value}
                    </td>
                    <td className="py-1.5 pr-3">
                      {LANG_META[lang].flag} {LANG_META[lang].label}
                    </td>
                    <td className="py-1.5 pr-3">
                      {row.side === "ru" ? names.ruTeam : names.usTeam}
                    </td>
                    <td className="py-1.5">
                      −{damage} HP → {defender}
                    </td>
                  </tr>
                );
              })}
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-muted-foreground">
                    No gifts recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Gifts ---------------------------------------------------------- */}
      <h2 className="display mt-8 text-sm uppercase tracking-widest text-muted-foreground">
        Gifts
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Recipient team, symbol and the spoken phrase used by the announcer and the top bar in every
        language.
      </p>

      <div className="mt-4 space-y-4">
        {GIFTS.map((gift) => {
          const entry = config[gift.id];
          return (
            <section key={gift.id} className="panel rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl">{entry.emoji}</span>
                <span className="display text-sm uppercase tracking-widest text-muted-foreground">
                  {gift.id} · +{gift.value}
                </span>
                <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  Emoji
                  <Input
                    value={entry.emoji}
                    onChange={(e) => update(gift.id, { emoji: e.target.value })}
                    className="h-8 w-20 text-center text-base"
                    aria-label={`${gift.id} emoji`}
                  />
                </label>
                <div className="flex items-center gap-1">
                  {TARGETS.map((target) => (
                    <Button
                      key={target}
                      type="button"
                      size="sm"
                      variant={entry.target === target ? "default" : "outline"}
                      onClick={() => update(gift.id, { target })}
                      className="h-8 text-xs"
                    >
                      {targetLabel(target)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {LANGS.map((item) => (
                  <label key={item} className="text-xs text-muted-foreground">
                    <span className="mb-1 block">
                      {LANG_META[item].flag} {LANG_META[item].label}
                    </span>
                    <Input
                      value={entry.phrases[item]}
                      onChange={(e) => updatePhrase(gift.id, item, e.target.value)}
                      className="h-9"
                      aria-label={`${gift.id} phrase ${item}`}
                    />
                  </label>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button
          type="button"
          onClick={() => {
            saveGiftConfig(config);
            setSaved(true);
            record("gifts", "save", { gifts: Object.keys(config).length });
          }}
        >
          Save gifts
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const fresh = defaultGiftConfig();
            setConfig(fresh);
            saveGiftConfig(fresh);
            setSaved(true);
            record("gifts", "reset", {});
          }}
        >
          Reset gifts
        </Button>
        {saved && <span className="text-sm text-gold">Saved ✓</span>}
      </div>
    </main>
  );
}
