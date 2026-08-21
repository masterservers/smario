import { LANGS, LANG_META, type Lang } from "@/lib/i18n";

export function LangPicker({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (next: Lang) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-background/80 p-0.5 backdrop-blur-md sm:gap-1 sm:p-1">
      {LANGS.map((code) => {
        const active = code === lang;
        return (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            aria-pressed={active}
            title={LANG_META[code].label}
            className={`size-7 rounded-full p-0 text-xs transition-colors sm:h-auto sm:w-auto sm:px-2 sm:py-1 sm:text-sm ${
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
