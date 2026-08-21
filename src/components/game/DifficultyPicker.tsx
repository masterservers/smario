import {
  DIFFICULTIES,
  DIFFICULTY_ICON,
  DIFFICULTY_LABEL,
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
      <DropdownMenuContent align="end" className="min-w-40">
        {DIFFICULTIES.map((item) => (
          <DropdownMenuItem
            key={item}
            onSelect={() => onChange(item)}
            className={item === value ? "font-semibold text-primary" : undefined}
          >
            <span className="mr-2">{DIFFICULTY_ICON[item]}</span>
            {DIFFICULTY_LABEL[lang][item]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
