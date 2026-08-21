import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  clearMoveLog,
  moveLogCsv,
  moveLogJson,
  useMoveLog,
} from "@/lib/moveLog";

/**
 * Match log export: every executed move with its round, time, type, strength,
 * side and the announcer line that went with it — as CSV or JSON, for the whole
 * match or one single round.
 */
export function MoveLogExport({
  onAudit,
}: {
  onAudit?: (action: string, details: Record<string, unknown>) => void;
}) {
  const log = useMoveLog();
  const [round, setRound] = useState<"all" | number>("all");

  const rounds = useMemo(
    () => Array.from(new Set(log.map((row) => row.round))).sort((a, b) => a - b),
    [log],
  );
  const rows = round === "all" ? log : log.filter((row) => row.round === round);

  const download = (format: "csv" | "json") => {
    const scope = round === "all" ? undefined : round;
    const text = format === "csv" ? moveLogCsv(scope) : moveLogJson(scope);
    const blob = new Blob([text], {
      type: format === "csv" ? "text/csv;charset=utf-8" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `match-log-${round === "all" ? "full" : `round-${round}`}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
    onAudit?.("log.export", { format, round, rows: rows.length });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={round === "all" ? "default" : "secondary"}
          onClick={() => setRound("all")}
        >
          All rounds
        </Button>
        {rounds.map((no) => (
          <Button
            key={no}
            size="sm"
            variant={round === no ? "default" : "secondary"}
            onClick={() => setRound(no)}
          >
            Round {no}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground">{rows.length} moves</span>
      </div>

      <div className="max-h-64 overflow-auto rounded-xl border border-border/60">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-2 py-1">#</th>
              <th className="px-2 py-1">Time</th>
              <th className="px-2 py-1">Rd</th>
              <th className="px-2 py-1">Side</th>
              <th className="px-2 py-1">Move</th>
              <th className="px-2 py-1">Type</th>
              <th className="px-2 py-1">Str</th>
              <th className="px-2 py-1">Line</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(-120).reverse().map((row) => (
              <tr key={row.seq} className="border-t border-border/40">
                <td className="px-2 py-1 tabular-nums">{row.seq}</td>
                <td className="px-2 py-1 tabular-nums">{(row.ms / 1000).toFixed(1)}s</td>
                <td className="px-2 py-1 tabular-nums">{row.round}</td>
                <td className="px-2 py-1 uppercase">{row.side}</td>
                <td className="px-2 py-1">{row.label}</td>
                <td className="px-2 py-1">{row.kind}</td>
                <td className="px-2 py-1 tabular-nums">{row.tier}</td>
                <td className="px-2 py-1 text-muted-foreground">
                  {row.line ? `${row.lang.toUpperCase()} · ${row.line}` : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-2 py-3 text-muted-foreground" colSpan={8}>
                  No move recorded yet — open the arena and let the fight run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => download("csv")} disabled={rows.length === 0}>
          Export CSV
        </Button>
        <Button size="sm" variant="secondary" onClick={() => download("json")} disabled={rows.length === 0}>
          Export JSON
        </Button>
        <Button size="sm" variant="ghost" onClick={() => clearMoveLog()}>
          Clear log
        </Button>
      </div>
    </div>
  );
}
