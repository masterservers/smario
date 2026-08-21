import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resetMatch } from "@/lib/match.functions";

type Props = {
  onAudit?: (action: string, details: Record<string, unknown>) => void;
};

/** Admin control that puts the score, the HP bars and the round counter back to zero. */
export function MatchReset({ onAudit }: Props) {
  const [busy, setBusy] = useState<null | "round" | "all">(null);
  const [confirm, setConfirm] = useState<null | "round" | "all">(null);

  const run = async (mode: "round" | "all") => {
    setBusy(mode);
    try {
      const fresh = await resetMatch({ data: { clearHistory: mode === "all" } });
      onAudit?.(mode === "all" ? "reset all" : "reset score", { matchId: fresh.id });
      toast.success(`Reset done · new fight, round ${fresh.round}`);
    } catch {
      toast.error("Reset failed — admin rights required");
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={confirm === "round" ? "destructive" : "secondary"}
        size="sm"
        disabled={busy !== null}
        onClick={() => (confirm === "round" ? void run("round") : setConfirm("round"))}
      >
        {busy === "round"
          ? "Resetting…"
          : confirm === "round"
            ? "Confirm reset score & round"
            : "Reset score & round"}
      </Button>
      <Button
        variant={confirm === "all" ? "destructive" : "outline"}
        size="sm"
        disabled={busy !== null}
        onClick={() => (confirm === "all" ? void run("all") : setConfirm("all"))}
      >
        {busy === "all"
          ? "Wiping…"
          : confirm === "all"
            ? "Confirm full wipe (all history)"
            : "Reset everything (history too)"}
      </Button>
      {confirm && (
        <button
          type="button"
          className="text-xs text-muted-foreground underline"
          onClick={() => setConfirm(null)}
        >
          Cancel
        </button>
      )}
    </div>
  );
}
