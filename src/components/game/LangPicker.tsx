import { LANGS, LANG_META, type Lang } from "@/lib/i18n";

export function LangPicker({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (next: Lang) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-card/80 p-1">
      {LANGS.map((code) => {
        const active = code === lang;
        return (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            aria-pressed={active}
            title={LANG_META[code].label}
            className={`rounded-full px-2 py-1 text-sm transition-colors ${
              active ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
          >
            <span aria-hidden>{LANG_META[code].flag}</span>
            <span className="sr-only">{LANG_META[code].label}</span>
          </button>
        );
      })}
    </div>
  );
}
