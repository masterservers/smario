import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clampScale,
  getAdminConfig,
  saveAdminConfig,
  useMatchTitle,
  useTitleScale,
} from "@/lib/adminConfig";
import { TITLE_PRESETS, validateTitle } from "@/lib/matchTitle";

type Props = {
  onAudit?: (action: string, details: Record<string, unknown>) => void;
};

/** Presets + validation for the public match title. */
export function MatchTitleControl({ onAudit }: Props) {
  const active = useMatchTitle();
  const [draft, setDraft] = useState(active);
  const check = validateTitle(draft);

  const apply = (value: string) => {
    const result = validateTitle(value);
    if (!result.ok) {
      toast.error(result.issues[0] ?? "Title rejected");
      return;
    }
    saveAdminConfig({ ...getAdminConfig(), matchTitle: result.value });
    setDraft(result.value);
    onAudit?.("title", { title: result.value });
    toast.success(`Title applied · ${result.value}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TITLE_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            size="sm"
            variant={preset.title === active ? "default" : "secondary"}
            title={preset.note}
            onClick={() => apply(preset.title)}
          >
            {preset.title}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={draft}
          maxLength={80}
          onChange={(e) => setDraft(e.target.value)}
          className="h-9 max-w-sm"
          aria-label="Custom match title"
        />
        <Button size="sm" disabled={!check.ok || draft === active} onClick={() => apply(draft)}>
          Apply
        </Button>
        <span className="text-xs text-muted-foreground">In use: {active}</span>
      </div>

      {!check.ok && (
        <ul className="text-xs text-destructive">
          {check.issues.map((issue) => (
            <li key={issue}>• {issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
