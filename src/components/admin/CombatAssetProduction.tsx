import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ALL_SCENES } from "@/lib/scenes";
import {
  PLANNED_COMBAT_ASSETS,
  assetsByBatch,
  plannedAsset,
  type ProductionBatch,
} from "@/lib/combatAssetManifest";
import {
  REJECTION_REASONS,
  REVIEW_CHECKLIST,
  assetHealth,
  buildCombatClipFromProduction,
  canApprove,
  canRegister,
  checklistComplete,
  coverageDelta,
  detectDuplicates,
  emptyProductionRecord,
  productionClipId,
  productionStats,
  registeredCoverage,
  requiresImpact,
  validateTechnical,
  type CombatAssetProductionRecord,
  type TechnicalProbe,
  type TechnicalValidation,
} from "@/lib/combatAssetProduction";
import {
  listCombatAssetProduction,
  saveCombatAssetProduction,
} from "@/lib/combatAssetProduction.functions";
import { allCombatClips, combatClip, registerCombatClip } from "@/lib/combatClipRegistry";
import { buildCombatSequence } from "@/lib/combatSequence";
import { logAdminChange } from "@/lib/admin.functions";

const LOCAL_KEY = "combat-asset-production-fallback";

const BATCHES: Array<{ id: ProductionBatch; label: string }> = [
  { id: "batch-1-core-standup", label: "Batch 1 · core stand-up" },
  { id: "batch-2-power", label: "Batch 2 · power" },
  { id: "batch-3-aerial-ground", label: "Batch 3 · aerial & ground" },
  { id: "batch-4-continuity", label: "Batch 4 · continuity" },
];

function loadLocal(): CombatAssetProductionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as CombatAssetProductionRecord[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(records: CombatAssetProductionRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(records));
  } catch {
    /* storage full or blocked — the board simply stays in memory */
  }
}

/**
 * Admin-only ingestion pipeline for REAL combat footage:
 * planned → uploaded → technical review → visual review → approved →
 * registered. Nothing here changes the live arena scheduler.
 */
export function CombatAssetProduction() {
  const load = useServerFn(listCombatAssetProduction);
  const save = useServerFn(saveCombatAssetProduction);
  const audit = useServerFn(logAdminChange);

  const moveIds = useMemo(() => ALL_SCENES.map((scene) => scene.id), []);
  const grouped = useMemo(() => assetsByBatch(), []);

  const [records, setRecords] = useState<CombatAssetProductionRecord[]>([]);
  const [offline, setOffline] = useState(false);
  const [batch, setBatch] = useState<ProductionBatch>("batch-1-core-standup");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [srcDraft, setSrcDraft] = useState("");
  const [probe, setProbe] = useState<TechnicalProbe | null>(null);
  const [note, setNote] = useState("");
  const [testing, setTesting] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let alive = true;
    load({})
      .then((rows) => {
        if (alive) setRecords(rows);
      })
      .catch(() => {
        if (!alive) return;
        setOffline(true);
        setRecords(loadLocal());
      });
    return () => {
      alive = false;
    };
  }, [load]);

  const recordFor = useCallback(
    (assetId: string) =>
      records.find((record) => record.assetId === assetId) ?? emptyProductionRecord(assetId),
    [records],
  );

  const asset = selectedId ? plannedAsset(selectedId) : undefined;
  const record = selectedId ? recordFor(selectedId) : null;

  const persist = useCallback(
    async (next: CombatAssetProductionRecord, action: string) => {
      setRecords((current) => {
        const merged = current.some((row) => row.assetId === next.assetId)
          ? current.map((row) => (row.assetId === next.assetId ? next : row))
          : [...current, next];
        if (offline) saveLocal(merged);
        return merged;
      });
      if (offline) return;
      try {
        await save({ data: next });
        await audit({
          data: {
            section: "combat-assets",
            action,
            details: `${next.assetId} → ${next.status}${next.actualSrc ? ` (${next.actualSrc})` : ""}`,
          },
        }).catch(() => undefined);
      } catch {
        setOffline(true);
        setNote("Saved locally only — the production table refused the write.");
      }
    },
    [audit, offline, save],
  );

  /* ---------------- technical probe of the selected asset ---------------- */

  useEffect(() => {
    setProbe(null);
    setNote("");
    setTesting(false);
    setSrcDraft(record?.actualSrc ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const runProbe = useCallback(async (src: string): Promise<TechnicalProbe> => {
    const result: TechnicalProbe = { loaded: false };
    try {
      const head = await fetch(src, { method: "HEAD" });
      if (!head.ok) return { loaded: false, error: `HTTP ${head.status}` };
      const length = head.headers.get("content-length");
      if (length) result.fileSizeBytes = Number(length);
      result.mimeType = head.headers.get("content-type") ?? undefined;
    } catch (error) {
      return { loaded: false, error: (error as Error).message };
    }
    return new Promise<TechnicalProbe>((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      const done = (patch: Partial<TechnicalProbe>) => {
        video.removeAttribute("src");
        resolve({ ...result, ...patch });
      };
      video.onloadedmetadata = () =>
        done({
          loaded: true,
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        });
      video.onerror = () => done({ loaded: false, error: "decode error" });
      window.setTimeout(() => done({ loaded: false, error: "timeout" }), 12000);
      video.src = src;
    });
  }, []);

  const validation: TechnicalValidation | null = useMemo(
    () => (asset && probe ? validateTechnical(asset, probe) : null),
    [asset, probe],
  );

  const attach = async () => {
    if (!asset || !record) return;
    const src = srcDraft.trim();
    if (!src) return;
    setNote("Probing file…");
    const result = await runProbe(src);
    setProbe(result);
    const check = validateTechnical(asset, result);
    const next: CombatAssetProductionRecord = {
      ...record,
      actualSrc: src,
      duration: result.duration,
      width: result.width,
      height: result.height,
      fileSizeBytes: result.fileSizeBytes,
      mimeType: result.mimeType,
      technicalWarnings: [...check.errors, ...check.warnings],
      status: result.loaded ? (check.ok ? "visual-review" : "technical-review") : "uploaded",
      reviewedAt: new Date().toISOString(),
    };
    setNote(
      result.loaded
        ? check.ok
          ? "Media loads. Continue with the visual review."
          : "Media loads but technical validation failed."
        : `File is not accessible: ${result.error ?? "unknown error"}`,
    );
    await persist(next, "attach footage");
  };

  const toggleCheck = async (itemId: string) => {
    if (!record) return;
    const next = {
      ...record,
      reviewChecklist: { ...record.reviewChecklist, [itemId]: !record.reviewChecklist[itemId] },
      status: record.status === "registered" ? record.status : "visual-review",
    } as CombatAssetProductionRecord;
    await persist(next, "review checklist");
  };

  const setImpactHere = async () => {
    if (!record || !videoRef.current) return;
    const seconds = Math.round(videoRef.current.currentTime * 100) / 100;
    await persist({ ...record, measuredImpactSeconds: seconds }, "calibrate impact");
    setNote(`Impact set at ${seconds.toFixed(2)}s`);
  };

  const approveGate = useMemo(
    () => (asset && record ? canApprove(asset, record, validation) : null),
    [asset, record, validation],
  );

  const duplicates = useMemo(
    () =>
      record
        ? detectDuplicates(
            record,
            records,
            allCombatClips().map((clip) => clip.id),
          )
        : { duplicateAssetId: false, duplicateSrc: null },
    [record, records],
  );

  const registerGate = useMemo(
    () => (asset && record ? canRegister(asset, record, duplicates) : null),
    [asset, record, duplicates],
  );

  const approve = async () => {
    if (!record || !approveGate?.allowed) return;
    await persist(
      { ...record, status: "approved", approvedAt: new Date().toISOString() },
      "approve asset",
    );
    setNote("Approved. Registration is still a separate action.");
  };

  const reject = async (reason: string) => {
    if (!record) return;
    const reasons = record.rejectionReasons.includes(reason)
      ? record.rejectionReasons
      : [...record.rejectionReasons, reason];
    await persist({ ...record, status: "rejected", rejectionReasons: reasons }, "reject asset");
  };

  const reopen = async () => {
    if (!record) return;
    await persist({ ...record, status: "visual-review", rejectionReasons: [] }, "reopen asset");
  };

  const register = async () => {
    if (!asset || !record || !registerGate?.allowed) return;
    const delta = coverageDelta(records, moveIds, asset.id);
    registerCombatClip(buildCombatClipFromProduction(asset, record));
    await persist(
      { ...record, status: "registered", registeredAt: new Date().toISOString() },
      "register combat clip",
    );
    setNote(
      `Registered. Dedicated coverage ${delta.beforeRatio}% → ${delta.afterRatio}% (+${delta.gainedMoves} semantic moves). Legacy fallback footage untouched.`,
    );
  };

  // Re-register already-approved production clips into the runtime registry so
  // the admin test buttons work after a reload. The live scheduler still runs
  // exclusively on the legacy reels.
  useEffect(() => {
    for (const row of records) {
      if (row.status !== "registered" || !row.actualSrc) continue;
      const spec = plannedAsset(row.assetId);
      if (spec && !combatClip(productionClipId(row.assetId)))
        registerCombatClip(buildCombatClipFromProduction(spec, row));
    }
  }, [records]);

  const testSequence = () => {
    if (!asset) return;
    const sequence = buildCombatSequence({
      requestedMove: { id: asset.mappedMoveIds[0] ?? asset.id, label: asset.id, tier: asset.tier },
      state: {
        attackerState: asset.attackerStartState,
        defenderState: asset.defenderStartState,
        location: asset.locationStart,
      } as never,
    });
    setNote(
      sequence
        ? `TEST SEQUENCE (admin only): ${sequence.clips.map((clip) => clip.id).join(" → ")}`
        : "TEST SEQUENCE: no compatible footage yet.",
    );
  };

  /* ------------------------------- stats -------------------------------- */

  const stats = useMemo(() => productionStats(records), [records]);
  const actual = useMemo(() => registeredCoverage(records, moveIds), [records, moveIds]);
  const projected = useMemo(() => {
    const known = new Set(moveIds);
    const covered = new Set<string>();
    for (const planned of PLANNED_COMBAT_ASSETS)
      for (const id of planned.mappedMoveIds) if (known.has(id)) covered.add(id);
    return Math.round((covered.size / (moveIds.length || 1)) * 1000) / 10;
  }, [moveIds]);
  const nextDelta = useMemo(
    () => (asset ? coverageDelta(records, moveIds, asset.id) : null),
    [asset, records, moveIds],
  );

  return (
    <section className="mt-4 rounded-xl border border-border/70 bg-card/60 p-3 text-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Asset production</h2>
        <span className="font-mono text-[11px] text-muted-foreground">
          {offline ? "local fallback storage" : "cloud production table"}
        </span>
      </header>

      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground sm:grid-cols-4">
        <div>planned: <span className="text-foreground">{stats.planned}</span></div>
        <div>uploaded: <span className="text-foreground">{stats.uploaded}</span></div>
        <div>in review: <span className="text-foreground">{stats.inReview}</span></div>
        <div>approved: <span className="text-foreground">{stats.approved}</span></div>
        <div>registered: <span className="text-foreground">{stats.registered}</span></div>
        <div>rejected: <span className="text-foreground">{stats.rejected}</span></div>
        <div>P0: <span className="text-foreground">{stats.byPriority.P0.registered}/{stats.byPriority.P0.total}</span></div>
        <div>P1: <span className="text-foreground">{stats.byPriority.P1.registered}/{stats.byPriority.P1.total}</span></div>
        <div>P2: <span className="text-foreground">{stats.byPriority.P2.registered}/{stats.byPriority.P2.total}</span></div>
        <div>actual coverage: <span className="text-foreground">{actual.ratio}%</span></div>
        <div>projected (forecast): <span className="text-foreground">{projected}%</span></div>
        <div>dedicated registered: <span className="text-foreground">{actual.moves} moves</span></div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-1">
        {BATCHES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setBatch(entry.id)}
            className={`rounded-md border px-2 py-1 text-xs ${
              batch === entry.id
                ? "border-primary text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="mt-2 max-h-60 overflow-auto rounded-lg border border-border/60">
        <table className="w-full font-mono text-[10px]">
          <thead className="sticky top-0 bg-background/95 text-muted-foreground">
            <tr>
              <th className="p-1 text-left">asset</th>
              <th className="p-1 text-left">role</th>
              <th className="p-1 text-left">prio</th>
              <th className="p-1 text-left">status</th>
              <th className="p-1 text-left">health</th>
            </tr>
          </thead>
          <tbody>
            {grouped[batch].map((entry) => {
              const row = recordFor(entry.id);
              const health = assetHealth(
                records.find((item) => item.assetId === entry.id),
                selectedId === entry.id && probe ? probe.loaded : null,
              );
              return (
                <tr
                  key={entry.id}
                  onClick={() => setSelectedId(entry.id)}
                  className={`cursor-pointer border-t border-border/40 ${
                    selectedId === entry.id ? "bg-primary/10" : "hover:bg-muted/40"
                  }`}
                >
                  <td className="p-1">{entry.id}</td>
                  <td className="p-1 text-muted-foreground">{entry.role}</td>
                  <td className="p-1 text-muted-foreground">{entry.priority}</td>
                  <td className="p-1">{row.status}</td>
                  <td className="p-1 text-muted-foreground">
                    {health === "broken" ? "BROKEN ASSET" : health}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {asset && record ? (
        <div className="mt-3 rounded-lg border border-dashed border-border/70 p-2">
          <h3 className="font-semibold">{asset.id}</h3>
          <p className="font-mono text-[11px] text-muted-foreground">
            expected file: {asset.filename} · target {asset.targetDurationSeconds[0]}–
            {asset.targetDurationSeconds[1]}s · {asset.role} · tier {asset.tier}
          </p>
          <div className="mt-1 grid gap-1 font-mono text-[11px] text-muted-foreground sm:grid-cols-2">
            <div>
              Expected start — attacker: {asset.attackerStartState} · defender:{" "}
              {asset.defenderStartState} · {asset.locationStart}
            </div>
            <div>
              Expected end — attacker: {asset.attackerEndState} · defender: {asset.defenderEndState}{" "}
              · {asset.locationEnd}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={srcDraft}
              onChange={(event) => setSrcDraft(event.target.value)}
              placeholder={asset.filename}
              className="min-w-[240px] flex-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
            />
            <button
              type="button"
              onClick={attach}
              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
            >
              Attach & validate
            </button>
          </div>

          {validation ? (
            <ul className="mt-2 space-y-0.5 font-mono text-[11px]">
              {validation.errors.map((message) => (
                <li key={message} className="text-destructive">ERROR: {message}</li>
              ))}
              {validation.warnings.map((message) => (
                <li key={message} className="text-amber-500">{message}</li>
              ))}
              {validation.ok && validation.warnings.length === 0 ? (
                <li className="text-muted-foreground">technical validation passed</li>
              ) : null}
            </ul>
          ) : null}

          {record.actualSrc ? (
            <div className="mt-2">
              <video
                key={record.actualSrc}
                ref={videoRef}
                src={record.actualSrc}
                controls
                muted
                playsInline
                preload="metadata"
                className="max-h-64 w-full rounded-md bg-black"
              />
              <div className="mt-1 flex flex-wrap gap-1 text-xs">
                {[
                  ["Play", () => videoRef.current?.play()],
                  ["Pause", () => videoRef.current?.pause()],
                  ["Restart", () => videoRef.current && (videoRef.current.currentTime = 0)],
                  ["0.5x", () => videoRef.current && (videoRef.current.playbackRate = 0.5)],
                  ["1x", () => videoRef.current && (videoRef.current.playbackRate = 1)],
                  [
                    "−1 frame",
                    () =>
                      videoRef.current &&
                      (videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 0.04)),
                  ],
                  [
                    "+1 frame",
                    () =>
                      videoRef.current && (videoRef.current.currentTime += 0.04),
                  ],
                ].map(([label, action]) => (
                  <button
                    key={label as string}
                    type="button"
                    onClick={action as () => void}
                    className="rounded-md border border-border px-2 py-1 hover:bg-muted"
                  >
                    {label as string}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={setImpactHere}
                  className="rounded-md border border-primary px-2 py-1 hover:bg-muted"
                >
                  Set current frame as impact
                </button>
                <span className="self-center font-mono text-[11px] text-muted-foreground">
                  impact:{" "}
                  {typeof record.measuredImpactSeconds === "number"
                    ? `${record.measuredImpactSeconds.toFixed(2)}s (measured)`
                    : requiresImpact(asset)
                      ? "not calibrated"
                      : "not required"}
                </span>
              </div>
            </div>
          ) : null}

          <div className="mt-2 grid gap-0.5 sm:grid-cols-2">
            {REVIEW_CHECKLIST.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={record.reviewChecklist[item.id] === true}
                  onChange={() => toggleCheck(item.id)}
                />
                {item.label}
              </label>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
            <button
              type="button"
              onClick={approve}
              disabled={!approveGate?.allowed}
              className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={register}
              disabled={!registerGate?.allowed}
              className="rounded-md border border-primary px-2 py-1 disabled:opacity-40"
            >
              REGISTER COMBAT CLIP
            </button>
            <button
              type="button"
              onClick={() => setTesting((value) => !value)}
              disabled={record.status !== "registered"}
              className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
            >
              {testing ? "Hide test clip" : "TEST CLIP"}
            </button>
            <button
              type="button"
              onClick={testSequence}
              className="rounded-md border border-border px-2 py-1"
            >
              TEST SEQUENCE
            </button>
            {record.status === "rejected" ? (
              <button
                type="button"
                onClick={reopen}
                className="rounded-md border border-border px-2 py-1"
              >
                Reopen review
              </button>
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap gap-1">
            {REJECTION_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => reject(reason)}
                className="rounded-md border border-destructive/50 px-2 py-0.5 text-[10px] text-destructive hover:bg-destructive/10"
              >
                reject: {reason}
              </button>
            ))}
          </div>

          {approveGate && !approveGate.allowed ? (
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              approval blocked: {approveGate.blockers.join(" · ")}
            </p>
          ) : null}
          {registerGate && !registerGate.allowed ? (
            <p className="font-mono text-[11px] text-muted-foreground">
              registration blocked: {registerGate.blockers.join(" · ")}
            </p>
          ) : null}
          {nextDelta ? (
            <p className="font-mono text-[11px] text-muted-foreground">
              coverage if registered: {nextDelta.beforeRatio}% → {nextDelta.afterRatio}% (+
              {nextDelta.gainedMoves} moves)
            </p>
          ) : null}
          {record.rejectionReasons.length ? (
            <p className="font-mono text-[11px] text-destructive">
              rejected: {record.rejectionReasons.join(", ")}
            </p>
          ) : null}
          {checklistComplete(record) ? null : (
            <p className="font-mono text-[11px] text-muted-foreground">visual review pending</p>
          )}
          {note ? <p className="mt-1 text-[11px] text-muted-foreground">{note}</p> : null}

          {testing && record.status === "registered" && record.actualSrc ? (
            <video
              src={record.actualSrc}
              autoPlay
              loop
              muted
              playsInline
              className="mt-2 max-h-56 w-full rounded-md bg-black"
            />
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Select an asset to attach footage, review it and register it.
        </p>
      )}
    </section>
  );
}
