import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GIFTS, type GiftId } from "@/lib/battle";
import { LANG_META, LANGS, SIDE_NAME, isLang, type Lang } from "@/lib/i18n";
import {
  defaultGiftConfig,
  getGiftConfig,
  saveGiftConfig,
  type GiftConfig,
  type GiftTarget,
} from "@/lib/giftConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>) => ({
    lang: isLang(search.lang) ? search.lang : ("en" as Lang),
  }),
  head: () => ({
    meta: [
      { title: "Gift admin — Putin vs Trump Battle Arena" },
      {
        name: "description",
        content:
          "Configure every battle gift: recipient team, emoji symbol and the spoken phrase in English, German, Serbian, Romanian and Russian.",
      },
      { property: "og:title", content: "Gift admin — Putin vs Trump Battle Arena" },
      {
        property: "og:description",
        content: "Set recipient, emoji and multilingual voice phrases for every gift.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const TARGETS: GiftTarget[] = ["auto", "ru", "us"];

function AdminPage() {
  const { lang } = Route.useSearch();
  const [config, setConfig] = useState<GiftConfig>(() => getGiftConfig());
  const [saved, setSaved] = useState(false);
  const names = SIDE_NAME[lang];

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

  const targetLabel = (target: GiftTarget) =>
    target === "auto" ? "Auto" : target === "ru" ? names.ruTeam : names.usTeam;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="display text-2xl text-gold">Gift admin</h1>
        <Link
          to="/"
          search={{ lang }}
          className="rounded-md border border-border px-3 py-1 text-sm text-muted-foreground"
        >
          ← Arena
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Recipient team, symbol and the spoken phrase used by the announcer and the top bar in every
        language.
      </p>

      <div className="mt-6 space-y-4">
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
          Save
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
          Reset
        </Button>
        {saved && <span className="text-sm text-gold">Saved ✓</span>}
      </div>
    </main>
  );
}
