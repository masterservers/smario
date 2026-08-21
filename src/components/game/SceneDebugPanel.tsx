import { useEffect, useState } from "react";
import { useSceneConfig } from "@/lib/sceneConfig";
import { useSceneDebug } from "@/lib/sceneDebug";
import { visualSequenceStats } from "@/lib/visualSequences";


/**
 * Live scheduler read-out: which scene is on screen, how long it has been
 * running, how long it is supposed to run, why the previous one ended and which
 * rule last refused a transition. Switched on from the admin panel.
 */
export function SceneDebugPanel() {
  const debug = useSceneDebug();
  const { transitions } = useSceneConfig();
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!transitions.debug) return;
    const timer = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(timer);
  }, [transitions.debug]);

  if (!transitions.debug) return null;

  const elapsed = debug.startedAt > 0 ? Math.max(0, Math.round(now - debug.startedAt)) : 0;
  const progress =
    debug.plannedMs > 0 ? Math.min(100, Math.round((elapsed / debug.plannedMs) * 100)) : 0;
  const blockedAgo = debug.blockedAt > 0 ? Math.round(now - debug.blockedAt) : null;

  return (
    <div className="pointer-events-none absolute bottom-2 left-2 z-30 w-[16.5rem] rounded-xl border border-border/70 bg-background/85 p-2 font-mono text-[10px] leading-tight text-foreground backdrop-blur">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="uppercase tracking-widest">scheduler</span>
        <span>{debug.group}</span>
      </div>
      <div className="mt-1 truncate text-xs font-semibold">{debug.label}</div>
      <div className="text-muted-foreground">id: {debug.id}</div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-1">
        running {elapsed} ms / {debug.plannedMs} ms ({progress}%)
      </div>
      <div className="mt-1 text-muted-foreground">
        started because: <span className="text-foreground">{debug.endedReason}</span>
      </div>
      <div className="text-muted-foreground">
        last block: <span className="text-foreground">{debug.blockedBy}</span>
        {blockedAgo !== null && blockedAgo < 60000 ? ` (${blockedAgo} ms ago)` : ""}
      </div>
      <div className="mt-1 text-muted-foreground">
        rules: min {transitions.minSceneMs}ms · tail {transitions.tailMs}ms ·{" "}
        {transitions.lockIdle ? "idle locked" : "idle free"} ·{" "}
        {transitions.allowGiftInterrupt ? "gift may cut" : "no cuts"}
      </div>
      <div className="mt-1 border-t border-border/60 pt-1 text-muted-foreground">
        <div className="uppercase tracking-widest">visual sequences</div>
        <div>
          names {stats.totalMoveNames} · unique footage {stats.uniqueVisualSequences} · dup{" "}
          {stats.duplicateMappings}
        </div>
        <div>
          avg {stats.averageMovesPerSequence} names/seq · most reused {stats.mostReused.id} (
          {stats.mostReused.count})
        </div>
        <div className="truncate">recent: {stats.recent.join(" › ") || "—"}</div>
      </div>

    </div>
  );
}
