import {
  DIFFICULTIES,
  DIFFICULTY_ICON,
  DIFFICULTY_LABEL,
  DIFFICULTY_TERMS,
  difficultyStats,
  type Difficulty,
} from "@/lib/difficulty";
import type { Lang } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type Props = {
  lang: Lang;
  value: Difficulty;
  onChange: (value: Difficulty) => void;
};

/** Picks the fight pace: speed, move frequency and anti-repetition strictness. */
export function DifficultyPicker({ lang, value, onChange }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`${DIFFICULTY_LABEL.title[lang]}: ${DIFFICULTY_LABEL[lang][value]}`}
          className="size-8 shrink-0 rounded-full bg-background/80 text-sm backdrop-blur-md sm:size-9 md:size-10 md:text-base"
        >
          {DIFFICULTY_ICON[value]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-xs uppercase tracking-widest text-muted-foreground">
          {DIFFICULTY_LABEL.title[lang]}
        </div>
        {DIFFICULTIES.map((item) => {
          const stats = difficultyStats(item);
          const terms = DIFFICULTY_TERMS[lang];
          return (
            <DropdownMenuItem
              key={item}
              onSelect={() => onChange(item)}
              className="flex-col items-start gap-1 py-2"
            >
              <span
                className={
                  item === value ? "font-semibold text-primary" : "font-medium text-foreground"
                }
              >
                {DIFFICULTY_ICON[item]} {DIFFICULTY_LABEL[lang][item]}
                {item === value ? " ✓" : ""}
              </span>
              <span className="grid w-full grid-cols-3 gap-1 text-[10px] leading-tight text-muted-foreground">
                <span>
                  {terms.speed}
                  <br />
                  <span className="text-foreground">{stats.speed}</span>
                </span>
                <span>
                  {terms.rate}
                  <br />
                  <span className="text-foreground">{stats.rate}</span>
                </span>
                <span>
                  {terms.variety}
                  <br />
                  <span className="text-foreground">{stats.variety}</span>
                </span>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
