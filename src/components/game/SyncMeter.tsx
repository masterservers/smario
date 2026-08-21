import { useSceneConfig } from "@/lib/sceneConfig";
import { downloadSyncLog, useSyncMeter } from "@/lib/syncMeter";

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
 * Shows the delay of every single line, a per-cue breakdown (punch / count /
 * KO) and exports the full log of the running round.
 */
export function SyncMeter() {
  const { transitions } = useSceneConfig();
  const { last, averageMs, worstMs, samples, byKind, dropped, round, roundLog } = useSyncMeter();

  if (!transitions.debug) return null;

  return (
    <div className="pointer-events-none absolute bottom-2 right-2 z-30 w-56 rounded-xl border border-border/70 bg-background/85 p-2 font-mono text-[10px] leading-tight text-foreground backdrop-blur">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="uppercase tracking-widest">a/v sync · r{round}</span>
        <span>
          {roundLog.length}
          {dropped > 0 ? ` · ${dropped}✕` : ""}
        </span>
      </div>
      {last ? (
        <>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-muted-foreground">{KIND_LABEL[last.kind] ?? last.kind}</span>
            <span className={`text-sm font-semibold tabular-nums ${tone(last.deltaMs)}`}>
              +{last.deltaMs} ms
            </span>
          </div>
          {last.text ? (
            <div className="truncate text-muted-foreground" title={last.text}>
              “{last.text}”
            </div>
          ) : null}
          <div className="text-muted-foreground">
            voice: {last.source}
            {last.lang ? ` · ${last.lang}` : ""}
          </div>
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
          {byKind.length > 0 ? (
            <div className="mt-1 space-y-[1px] border-t border-border/50 pt-1">
              {byKind.map((stat) => (
                <div key={stat.kind} className="flex justify-between text-muted-foreground">
                  <span>
                    {KIND_LABEL[stat.kind] ?? stat.kind} ×{stat.count}
                  </span>
                  <span className="tabular-nums">
                    <span className={tone(stat.averageMs)}>{stat.averageMs}</span>
                    <span className="opacity-60"> / {stat.worstMs} ms</span>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-1 text-muted-foreground">waiting for the first call…</div>
      )}
      <div className="pointer-events-auto mt-1.5 flex gap-1">
        <button
          type="button"
          onClick={() => downloadSyncLog("csv")}
          disabled={roundLog.length === 0}
          className="flex-1 rounded-md border border-border/70 px-1 py-[3px] uppercase tracking-widest text-muted-foreground transition hover:text-foreground disabled:opacity-40"
        >
          csv
        </button>
        <button
          type="button"
          onClick={() => downloadSyncLog("json")}
          disabled={roundLog.length === 0}
          className="flex-1 rounded-md border border-border/70 px-1 py-[3px] uppercase tracking-widest text-muted-foreground transition hover:text-foreground disabled:opacity-40"
        >
          json
        </button>
      </div>
    </div>
  );
}
