import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/lib/i18n";

const TEXT: Record<Lang, { title: string; body: string; reload: string }> = {
  en: {
    title: "The ring went dark for a moment",
    body: "Something broke while rendering the fight. Reload to jump straight back into the live match.",
    reload: "Reload the arena",
  },
  de: {
    title: "Der Ring ist kurz ausgefallen",
    body: "Beim Anzeigen des Kampfes ist ein Fehler aufgetreten. Lade neu, um sofort zum Live-Match zurückzukehren.",
    reload: "Arena neu laden",
  },
  sr: {
    title: "Ring se nakratko ugasio",
    body: "Došlo je do greške pri prikazu borbe. Osveži da se odmah vratiš na meč uživo.",
    reload: "Osveži arenu",
  },
  ro: {
    title: "Ringul s-a stins pentru o clipă",
    body: "A apărut o eroare la afișarea luptei. Reîncarcă pentru a reveni imediat la meciul live.",
    reload: "Reîncarcă arena",
  },
  ru: {
    title: "Ринг ненадолго погас",
    body: "При отрисовке боя произошла ошибка. Обновите страницу, чтобы вернуться к живому матчу.",
    reload: "Обновить арену",
  },
};

export function GameErrorScreen({ lang = "en", error }: { lang?: Lang; error?: unknown }) {
  const t = TEXT[lang] ?? TEXT.en;
  const detail = error instanceof Error ? error.message : null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background p-6 text-center">
      <div className="max-w-md space-y-4">
        <p className="text-4xl">🥊</p>
        <h2 className="text-xl font-semibold text-foreground">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.body}</p>
        {detail && (
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-[11px] break-words text-muted-foreground">
            {detail}
          </p>
        )}
        <Button type="button" onClick={() => window.location.reload()}>
          {t.reload}
        </Button>
      </div>
    </div>
  );
}

type Props = { lang?: Lang; children: ReactNode };
type State = { error: unknown | null };

/** Catches runtime errors in the battle/live pages and offers a clean reload. */
export class GameErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[arena] runtime error", error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return <GameErrorScreen lang={this.props.lang} error={this.state.error} />;
    }
    return this.props.children;
  }
}
