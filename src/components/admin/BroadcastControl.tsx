import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LANG_META, LANGS, type Lang } from "@/lib/i18n";
import { publishControl, readControlLang } from "@/lib/control";

/**
 * Commentator control: switches the on-air language for every open arena tab
 * instantly and pushes spoken commands (referee calls, announcements) that the
 * commentator reads out in the selected language.
 */
export function BroadcastControl({ initial }: { initial: Lang }) {
  const [lang, setLang] = useState<Lang>(() => readControlLang() ?? initial);
  const [text, setText] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  const switchLang = (next: Lang) => {
    setLang(next);
    publishControl({ type: "lang", lang: next });
    setSent(`Language on air: ${LANG_META[next].label}`);
  };

  const send = (value: string) => {
    const message = value.trim();
    if (!message) return;
    publishControl({ type: "say", lang, text: message });
    setSent(`Sent: ${message}`);
    setText("");
  };

  const QUICK: Record<Lang, string[]> = {
    en: ["Round start!", "Break it up!", "Knockdown confirmed!", "Final round!"],
    de: ["Runde beginnt!", "Auseinander!", "Niederschlag bestätigt!", "Letzte Runde!"],
    sr: ["Runda počinje!", "Razdvojte se!", "Nokdaun potvrđen!", "Poslednja runda!"],
    ro: ["Începe runda!", "Despărțiți-vă!", "Knockdown confirmat!", "Ultima rundă!"],
    ru: ["Раунд начался!", "Разойтись!", "Нокдаун подтверждён!", "Последний раунд!"],
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {LANGS.map((code) => (
          <Button
            key={code}
            type="button"
            size="sm"
            variant={code === lang ? "default" : "outline"}
            onClick={() => switchLang(code)}
          >
            {LANG_META[code].flag} {LANG_META[code].label}
          </Button>
        ))}
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Command for the commentator…"
          aria-label="Commentator command"
          className="h-9 min-w-[16rem] flex-1"
        />
        <Button type="submit" size="sm">
          Send on air
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {QUICK[lang].map((phrase) => (
          <button
            key={phrase}
            type="button"
            onClick={() => send(phrase)}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:bg-foreground/10"
          >
            {phrase}
          </button>
        ))}
      </div>

      {sent && <p className="text-xs text-muted-foreground">{sent}</p>}
    </div>
  );
}
