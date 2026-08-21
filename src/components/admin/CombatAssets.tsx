import { useMemo, useState } from "react";
import { ALL_SCENES } from "@/lib/scenes";
import { clipInspectorRows, clipInventory } from "@/lib/combatClipRegistry";
import { trueVarietyReport } from "@/lib/visualClusters";
import { CombatAssetProduction } from "@/components/admin/CombatAssetProduction";
import {
  plannedAssetRows,
  plannedCoverageReport,
  unknownMappedMoveIds,
} from "@/lib/combatAssetManifest";

/**
 * Admin-only inventory of the *real* combat footage the project owns.
 * Never rendered on the spectator screen.
 */
export function CombatAssets() {
  const [open, setOpen] = useState(false);
  const moveIds = useMemo(() => ALL_SCENES.map((scene) => scene.id), []);
  const inventory = useMemo(() => clipInventory(moveIds), [moveIds]);
  const variety = useMemo(() => trueVarietyReport(5), []);
  const rows = useMemo(() => (open ? clipInspectorRows() : []), [open]);

  const forecast = useMemo(() => plannedCoverageReport(moveIds), [moveIds]);
  const plannedRows = useMemo(() => plannedAssetRows(), []);
  const unknownMoves = useMemo(() => unknownMappedMoveIds(moveIds), [moveIds]);
  const [plannedOpen, setPlannedOpen] = useState(false);

  return (
    <section className="rounded-xl border border-border/70 bg-card/60 p-3 text-sm">
      <header className="flex items-center justify-between">
        <h2 className="font-semibold">Combat assets</h2>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {open ? "Hide clips" : "Inspect clips"}
        </button>
      </header>

      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground sm:grid-cols-3">
        <div>legacy clips: <span className="text-foreground">{inventory.legacy}</span></div>
        <div>expanded-reel: <span className="text-foreground">{inventory.expanded}</span></div>
        <div>dedicated: <span className="text-foreground">{inventory.dedicated}</span></div>
        <div>attack: <span className="text-foreground">{inventory.byRole.attack}</span></div>
        <div>transition: <span className="text-foreground">{inventory.byRole.transition}</span></div>
        <div>reaction: <span className="text-foreground">{inventory.byRole.reaction}</span></div>
        <div>recovery: <span className="text-foreground">{inventory.byRole.recovery}</span></div>
        <div>idle/taunt: <span className="text-foreground">{inventory.byRole.idle + inventory.byRole.taunt}</span></div>
        <div>ko: <span className="text-foreground">{inventory.byRole.ko}</span></div>
        <div>move definitions: <span className="text-foreground">{inventory.moveDefinitions}</span></div>
        <div>with dedicated footage: <span className="text-foreground">{inventory.movesWithDedicatedFootage}</span></div>
        <div>on legacy fallback: <span className="text-foreground">{inventory.movesUsingFallback}</span></div>
        <div>without footage: <span className="text-foreground">{inventory.movesWithoutFootage}</span></div>
        <div>unique clusters: <span className="text-foreground">{inventory.uniqueClusters}</span></div>
        <div>
          dedicated coverage:{" "}
          <span className="text-foreground">{inventory.dedicatedCoverageRatio}%</span>
        </div>
      </dl>

      <p className="mt-2 font-mono text-xs text-muted-foreground">
        perceived variety: {variety.totalSceneNames} names · {variety.uniqueVisualSequences} windows
        · {variety.uniqueVisualClusters} clusters ({variety.clusterPerNameRatio}%)
      </p>

      {open ? (
        <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-border/60">
          <table className="w-full font-mono text-[10px]">
            <thead className="sticky top-0 bg-background/95 text-muted-foreground">
              <tr>
                <th className="p-1 text-left">id</th>
                <th className="p-1 text-left">source</th>
                <th className="p-1 text-left">window</th>
                <th className="p-1 text-left">role/kind</th>
                <th className="p-1 text-left">states</th>
                <th className="p-1 text-left">names</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/40 align-top">
                  <td className="p-1">{row.id}</td>
                  <td className="p-1">
                    {row.sourceType}
                    <div className="text-muted-foreground">{row.src}</div>
                  </td>
                  <td className="p-1">{row.window}</td>
                  <td className="p-1">
                    {row.role} · {row.kind}
                    <div className="text-muted-foreground">
                      {row.family} · t{row.tier} · {row.enabled ? "on" : "off"}
                    </div>
                  </td>
                  <td className="p-1 text-muted-foreground">
                    <div>A: {row.attacker}</div>
                    <div>D: {row.defender}</div>
                    <div>{row.location}</div>
                  </td>
                  <td className="p-1">
                    {row.names}
                    <div className="text-muted-foreground">{row.examples.join(", ")}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-dashed border-border/70 p-2">
        <header className="flex items-center justify-between">
          <h3 className="font-semibold">Planned assets (not playable)</h3>
          <button
            type="button"
            onClick={() => setPlannedOpen((value) => !value)}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {plannedOpen ? "Hide manifest" : "Show manifest"}
          </button>
        </header>

        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground sm:grid-cols-3">
          <div>planned: <span className="text-foreground">{forecast.plannedAssets}</span></div>
          <div>attack: <span className="text-foreground">{forecast.plannedAttackClips}</span></div>
          <div>transition: <span className="text-foreground">{forecast.plannedTransitionClips}</span></div>
          <div>reaction/recovery: <span className="text-foreground">{forecast.plannedReactionRecoveryClips}</span></div>
          <div>P0/P1/P2: <span className="text-foreground">{forecast.byPriority.P0}/{forecast.byPriority.P1}/{forecast.byPriority.P2}</span></div>
          <div>avg diversity: <span className="text-foreground">{forecast.averageDiversityScore}</span></div>
          <div>moves covered (planned): <span className="text-foreground">{forecast.movesCoveredByPlanned}</span></div>
          <div>still legacy-only: <span className="text-foreground">{forecast.movesStillLegacyOnly}</span></div>
          <div>current dedicated: <span className="text-foreground">{forecast.currentDedicatedCoverageRatio}%</span></div>
          <div>projected dedicated: <span className="text-foreground">{forecast.projectedDedicatedCoverageRatio}%</span></div>
          <div>registered: <span className="text-foreground">{forecast.byStatus.registered}</span></div>
          <div>unknown move ids: <span className="text-foreground">{unknownMoves.length}</span></div>
        </dl>

        {plannedOpen ? (
          <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-border/60">
            <table className="w-full font-mono text-[10px]">
              <thead className="sticky top-0 bg-background/95 text-muted-foreground">
                <tr>
                  <th className="p-1 text-left">id</th>
                  <th className="p-1 text-left">role/family</th>
                  <th className="p-1 text-left">tier/prio</th>
                  <th className="p-1 text-left">batch/mode</th>
                  <th className="p-1 text-left">states</th>
                  <th className="p-1 text-left">moves/div</th>
                  <th className="p-1 text-left">status</th>
                </tr>
              </thead>
              <tbody>
                {plannedRows.map((row) => (
                  <tr key={row.id} className="border-t border-border/40 align-top">
                    <td className="p-1">
                      {row.id}
                      <div className="text-muted-foreground">{row.filename}</div>
                    </td>
                    <td className="p-1">
                      {row.role} · {row.kind}
                      <div className="text-muted-foreground">{row.family}</div>
                    </td>
                    <td className="p-1">t{row.tier} · {row.priority}<div className="text-muted-foreground">{row.duration}</div></td>
                    <td className="p-1">
                      {row.batch.replace("batch-", "B")}
                      <div className="text-muted-foreground">{row.mode}</div>
                    </td>
                    <td className="p-1 text-muted-foreground">
                      <div>{row.states}</div>
                      <div>{row.location}</div>
                    </td>
                    <td className="p-1">{row.mappedMoves} moves<div className="text-muted-foreground">div {row.diversityScore}/10</div></td>
                    <td className="p-1">
                      {row.status}
                      <div className="text-muted-foreground">
                        {row.checklist.done}/{row.checklist.total}
                        {row.checklist.next ? ` · next: ${row.checklist.next}` : ""}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <CombatAssetProduction />
    </section>
  );
}
