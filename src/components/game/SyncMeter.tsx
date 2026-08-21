import { useSceneConfig } from "@/lib/sceneConfig";
import { useSyncMeter } from "@/lib/syncMeter";

const KIND_LABEL: Record<string, string> = {
  hit: "punch",
  big: "big blow",
  ko: "KO",
  count: "count",
  idle: "ambient",
};

function tone(ms: number) {
  if (ms <= 120) return "text-emerald-400";
  if (ms <= 300) return "text-gold";
  return "text-destructive";
}

/**
 * Live A/V sync read-out: how many milliseconds pass between the frame a blow,
 * a referee count or a knockout happens and the first word of the announcer.
 * Shown in the arena while the debug switch is on in the admin console.
 */
export function SyncMeter() {
  const { transitions } = useSceneConfig();
  const { last, averageMs, worstMs, samples } = useSyncMeter();

  if (!transitions.debug) return null;

  return (
    <div className="pointer-events-none absolute bottom-2 right-2 z-30 w-44 rounded-xl border border-border/70 bg-background/85 p-2 font-mono text-[10px] leading-tight text-foreground backdrop-blur">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="uppercase tracking-widest">a/v sync</span>
        <span>{samples.length}</span>
      </div>
      {last ? (
        <>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-muted-foreground">{KIND_LABEL[last.kind] ?? last.kind}</span>
            <span className={`text-sm font-semibold tabular-nums ${tone(last.deltaMs)}`}>
              +{last.deltaMs} ms
            </span>
          </div>
          <div className="text-muted-foreground">voice: {last.source}</div>
          <div className="mt-1 flex justify-between text-muted-foreground">
            <span>
              avg <span className={`tabular-nums ${tone(averageMs)}`}>{averageMs} ms</span>
            </span>
            <span>
              max <span className={`tabular-nums ${tone(worstMs)}`}>{worstMs} ms</span>
            </span>
          </div>
          <div className="mt-1 flex h-4 items-end gap-[2px]">
            {samples.slice(-16).map((sample) => (
              <span
                key={sample.id}
                title={`${KIND_LABEL[sample.kind] ?? sample.kind}: ${sample.deltaMs} ms`}
                className={`w-full rounded-sm ${
                  sample.deltaMs <= 120
                    ? "bg-emerald-400"
                    : sample.deltaMs <= 300
                      ? "bg-gold"
                      : "bg-destructive"
                }`}
                style={{ height: `${Math.max(10, Math.min(100, (sample.deltaMs / 600) * 100))}%` }}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="mt-1 text-muted-foreground">waiting for the first call…</div>
      )}
    </div>
  );
}
