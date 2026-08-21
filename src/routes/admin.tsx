import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
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

export const Route = createFileRoute("/admin")({
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
  const [admin, setAdmin] = useState<AdminConfig>(() => getAdminConfig());
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const names = sideNames(lang);

  const update = (id: GiftId, patch: Partial<GiftConfig[GiftId]>) => {
    setConfig((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
    setSaved(false);
  };

  const updatePhrase = (id: GiftId, phraseLang: Lang, value: string) => {
    setConfig((current) => ({
      ...current,
      [id]: { ...current[id], phrases: { ...current[id].phrases, [phraseLang]: value } },
    }));
    setSaved(false);
  };

  const patchAdmin = (patch: Partial<AdminConfig>) => {
    setAdmin((current) => {
      const next = { ...current, ...patch };
      saveAdminConfig(next);
      return next;
    });
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

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="display text-2xl text-gold">Battle admin</h1>
        <Link
          to="/"
          search={{ lang }}
          className="rounded-md border border-border px-3 py-1 text-sm text-muted-foreground"
        >
          ← Arena
        </Link>
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
                    })
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
                    })
                  }
                  className="mt-1 h-9"
                  aria-label={`${side} fighter nickname`}
                />
              </label>
            </div>
          ))}
        </div>
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
              onChange={(e) => patchAdmin({ tiktok: { ...admin.tiktok, username: e.target.value } })}
              className="mt-1 h-9"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Live room URL
            <Input
              value={admin.tiktok.liveUrl}
              placeholder="https://www.tiktok.com/@account/live"
              onChange={(e) => patchAdmin({ tiktok: { ...admin.tiktok, liveUrl: e.target.value } })}
              className="mt-1 h-9"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Gift relay endpoint
            <Input
              value={admin.tiktok.webhookUrl}
              placeholder="https://…/api/public/tiktok"
              onChange={(e) =>
                patchAdmin({ tiktok: { ...admin.tiktok, webhookUrl: e.target.value } })
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
            onClick={() => patchAdmin({ tiktok: { ...admin.tiktok, enabled: !admin.tiktok.enabled } })}
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
            onClick={() => patchAdmin({ liveSession: newSessionId() })}
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
          }}
        >
          Reset gifts
        </Button>
        {saved && <span className="text-sm text-gold">Saved ✓</span>}
      </div>
    </main>
  );
}
