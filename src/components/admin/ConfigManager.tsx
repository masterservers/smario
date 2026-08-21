import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  applyBundle,
  diffBundle,
  diffSnapshots,
  exportBundle,
  resetBundle,
  validateBundle,
  type BundleDiff,
  type ConfigBundle,
  type FieldError,
} from "@/lib/configBundle";
import { clearPendingConfig, getPendingConfig, stagePendingConfig } from "@/lib/pendingConfig";
import {
  activateConfigVersion,
  getActiveConfigVersion,
  deleteConfigVersion,
  listConfigVersions,
  saveConfigVersion,
  type ConfigVersion,
} from "@/lib/configVersions.functions";

type Props = {
  /** Called after settings changed locally so the panel can refresh its inputs. */
  onApplied: () => void;
  /** Audit hook from the admin console. */
  record: (section: string, action: string, details: Record<string, unknown>) => void;
};

/**
 * Export / import of the whole fight configuration (scenes, transitions and
 * gift → hit mapping) with schema validation, a diff preview before applying
 * and versions stored in the backend so a previous setup can be restored.
 */
export function ConfigManager({ onApplied, record }: Props) {
  const [json, setJson] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [warnings, setWarnings] = useState<FieldError[]>([]);
  const [preview, setPreview] = useState<{ diff: BundleDiff; bundle: ConfigBundle } | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [versions, setVersions] = useState<ConfigVersion[]>([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  /** When an import goes live: immediately, at the next scene end or next round. */
  const [timing, setTiming] = useState<"now" | "scene" | "round">("scene");
  const [staged, setStaged] = useState(() => getPendingConfig());
  /** Version comparison screen. */
  const [compare, setCompare] = useState<{ a: string; b: string }>({ a: "", b: "" });
  const [live, setLive] = useState<ConfigVersion | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadVersions = useCallback(async () => {
    try {
      setVersions((await listConfigVersions()) as ConfigVersion[]);
    } catch {
      setVersions([]);
    }
  }, []);

  useEffect(() => {
    void loadVersions();
    void getActiveConfigVersion()
      .then((version) => setLive((version as ConfigVersion | null) ?? null))
      .catch(() => setLive(null));
  }, [loadVersions]);

  /** Poll the staged import so the badge disappears once the arena applied it. */
  useEffect(() => {
    const timer = window.setInterval(() => setStaged(getPendingConfig()), 1500);
    return () => window.clearInterval(timer);
  }, []);

  /** Step 1: validate the JSON field by field and build the diff preview. */
  const check = (text: string) => {
    setStatus(null);
    const result = validateBundle(text);
    if (!result.ok) {
      setErrors(result.errors);
      setWarnings([]);
      setPreview(null);
      return;
    }
    setErrors([]);
    setWarnings(result.warnings);
    const diff = diffBundle(result.bundle);
    setPreview({ diff, bundle: result.bundle });
    record("config", "validated & previewed", { changes: diff.total, warnings: result.warnings.length });
  };

  /** Step 2: apply the previewed bundle and publish it as a new version. */
  const apply = async () => {
    if (!preview) return;
    if (timing !== "now") {
      const pending = stagePendingConfig(preview.bundle, timing, label || "import");
      setStaged(pending);
      record("config", "import staged", { changes: preview.diff.total, when: timing });
      setStatus({
        ok: true,
        text:
          timing === "scene"
            ? "Staged — goes live as soon as the current scene ends."
            : "Staged — goes live at the start of the next round.",
      });
      setPreview(null);
      return;
    }
    applyBundle(preview.bundle);
    onApplied();
    record("config", "import applied", { changes: preview.diff.total, when: "now" });
    setStatus({ ok: true, text: `Applied — ${preview.diff.total} changes.` });
    setPreview(null);
    setJson(exportBundle());
    await publish(label || "import");
  };

  /** Saves the current settings as a version in the backend (shared + persistent). */
  const publish = async (name: string) => {
    setBusy(true);
    try {
      await saveConfigVersion({ data: { label: name, bundle: exportBundle(), activate: true } });
      await loadVersions();
      setStatus({ ok: true, text: `Saved in the backend as "${name}".` });
      record("config", "version saved", { label: name });
    } catch {
      setStatus({ ok: false, text: "Could not save to the backend (admin role required)." });
    } finally {
      setBusy(false);
    }
  };

  const restore = async (version: ConfigVersion) => {
    setBusy(true);
    try {
      await activateConfigVersion({ data: { id: version.id } });
      applyBundle(JSON.parse(version.bundle) as ConfigBundle);
      onApplied();
      setJson(exportBundle());
      await loadVersions();
      setStatus({ ok: true, text: `Restored "${version.label}".` });
      record("config", "version restored", { label: version.label, id: version.id });
      setLive(version);
    } catch {
      setStatus({ ok: false, text: "Could not restore this version." });
    } finally {
      setBusy(false);
    }
  };

  const rows = preview
    ? [
        ...preview.diff.scenes.map((row) => ({ ...row, area: "scene" })),
        ...preview.diff.transitions.map((row) => ({ ...row, area: "transition" })),
        ...preview.diff.hits.map((row) => ({ ...row, area: "hit" })),
      ]
    : [];

  return (
    <div className="mt-4 rounded-xl border border-border p-3">
      <div className="display text-xs uppercase tracking-widest text-muted-foreground">
        Full configuration — export, import &amp; versions
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1"
          onClick={() => {
            const text = exportBundle();
            setJson(text);
            const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = `fight-config-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            URL.revokeObjectURL(url);
            setStatus({ ok: true, text: "Exported (scenes + transitions + gift/hit)." });
            record("config", "export", {});
          }}
        >
          Export full JSON
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1"
          onClick={async () => {
            const text = exportBundle();
            setJson(text);
            try {
              await navigator.clipboard.writeText(text);
              setStatus({ ok: true, text: "Copied to clipboard." });
            } catch {
              setStatus({ ok: true, text: "Loaded in the editor below." });
            }
          }}
        >
          Copy JSON
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1"
          onClick={() => fileInput.current?.click()}
        >
          Import file…
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="import full config json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            const text = await file.text();
            setJson(text);
            check(text);
          }}
        />
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1"
          onClick={() => {
            resetBundle();
            onApplied();
            setJson(exportBundle());
            setPreview(null);
            setStatus({ ok: true, text: "Back to the default settings." });
            record("config", "reset", {});
          }}
        >
          Reset all
        </button>
      </div>

      <textarea
        value={json}
        onChange={(event) => setJson(event.target.value)}
        onFocus={() => {
          if (!json) setJson(exportBundle());
        }}
        spellCheck={false}
        rows={10}
        className="mt-2 w-full rounded-md border border-border bg-background p-2 font-mono text-[11px]"
        placeholder="Paste here a full configuration JSON…"
        aria-label="full config json"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button variant="outline" className="h-8" onClick={() => check(json)}>
          Validate &amp; preview
        </Button>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          Apply
          <select
            value={timing}
            onChange={(event) => setTiming(event.target.value as typeof timing)}
            className="h-8 rounded-md border border-border bg-background px-1 text-xs"
            aria-label="when to apply the configuration"
          >
            <option value="scene">at the end of the current scene</option>
            <option value="round">at the start of the next round</option>
            <option value="now">immediately</option>
          </select>
        </label>
        <Button className="h-8" disabled={!preview || busy} onClick={() => void apply()}>
          Apply {preview ? `(${preview.diff.total})` : ""}
        </Button>
        {status ? (
          <span className={`text-xs ${status.ok ? "text-emerald-500" : "text-destructive"}`}>
            {status.text}
          </span>
        ) : null}
      </div>

      {staged ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2 text-xs">
          <span>
            Waiting to go live: <strong>{staged.label}</strong> —{" "}
            {staged.when === "scene" ? "at the end of the current scene" : "at the next round"}.
          </span>
          <button
            type="button"
            className="rounded-md border border-border px-2 py-0.5"
            onClick={() => {
              clearPendingConfig();
              setStaged(null);
              record("config", "staged import cancelled", { label: staged.label });
            }}
          >
            Cancel
          </button>
        </div>
      ) : null}

      {errors.length > 0 ? (
        <ul className="mt-2 space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-xs">
          {errors.map((error) => (
            <li key={`${error.field}-${error.message}`} className="text-destructive">
              <span className="font-mono">{error.field}</span>: {error.message}
            </li>
          ))}
        </ul>
      ) : null}

      {warnings.length > 0 ? (
        <ul className="mt-2 space-y-1 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-500">
          {warnings.map((warning) => (
            <li key={`${warning.field}-${warning.message}`}>
              <span className="font-mono">{warning.field}</span>: {warning.message}
            </li>
          ))}
        </ul>
      ) : null}

      {preview ? (
        <div className="mt-2 rounded-lg border border-border p-2 text-xs">
          <div className="text-muted-foreground">
            Preview — {preview.diff.total === 0 ? "nothing would change" : `${preview.diff.total} changes`}
          </div>
          {rows.length > 0 ? (
            <div className="mt-1 max-h-56 overflow-auto">
              {rows.map((row) => (
                <div
                  key={`${row.area}-${row.field}`}
                  className="grid grid-cols-[70px_1fr_auto] items-center gap-2 border-b border-border/40 py-1 last:border-0"
                >
                  <span className="uppercase tracking-widest text-[10px] text-muted-foreground">
                    {row.area}
                  </span>
                  <span className="truncate">{row.field}</span>
                  <span className="font-mono">
                    <span className="text-destructive line-through">{row.from}</span>
                    {" → "}
                    <span className="text-emerald-500">{row.to}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 border-t border-border pt-3">
        <div className="display text-xs uppercase tracking-widest text-muted-foreground">
          Versions (stored in the backend)
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Live now:{" "}
          {live ? (
            <span className="text-foreground">
              {live.label} · {new Date(live.created_at).toLocaleString()}
              {live.created_by_email ? ` · ${live.created_by_email}` : ""}
            </span>
          ) : (
            "no published version (local settings)"
          )}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Version name (e.g. live show 21 Aug)"
            className="h-8 max-w-64 text-xs"
            aria-label="version name"
          />
          <Button
            variant="outline"
            className="h-8"
            disabled={busy}
            onClick={() => void publish(label || `snapshot ${new Date().toLocaleString()}`)}
          >
            Save current as version
          </Button>
        </div>
        <div className="mt-2 space-y-1 text-xs">
          {versions.length === 0 ? (
            <p className="text-muted-foreground">No version saved yet.</p>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                className={`flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1 ${
                  version.is_active ? "border-primary" : "border-border"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{version.label}</span>
                <span className="text-muted-foreground">
                  {new Date(version.created_at).toLocaleString()}
                  {version.created_by_email ? ` · ${version.created_by_email}` : ""}
                </span>
                {version.is_active ? (
                  <span className="rounded bg-primary/15 px-2 py-0.5 text-primary">active</span>
                ) : (
                  <>
                    <button
                      type="button"
                      className="rounded-md border border-border px-2 py-0.5"
                      disabled={busy}
                      onClick={() => void restore(version)}
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-border px-2 py-0.5 text-destructive"
                      disabled={busy}
                      onClick={() => {
                        void deleteConfigVersion({ data: { id: version.id } }).then(loadVersions);
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <div className="display text-xs uppercase tracking-widest text-muted-foreground">
            Compare two versions
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {(["a", "b"] as const).map((slot) => (
              <select
                key={slot}
                value={compare[slot]}
                onChange={(event) => setCompare({ ...compare, [slot]: event.target.value })}
                className="h-8 max-w-56 rounded-md border border-border bg-background px-1"
                aria-label={slot === "a" ? "first version" : "second version"}
              >
                <option value="">{slot === "a" ? "from version…" : "to version…"}</option>
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.label} — {new Date(version.created_at).toLocaleString()}
                  </option>
                ))}
              </select>
            ))}
          </div>
          {(() => {
            const a = versions.find((version) => version.id === compare.a);
            const b = versions.find((version) => version.id === compare.b);
            if (!a || !b || a.id === b.id) {
              return (
                <p className="mt-2 text-xs text-muted-foreground">
                  Pick two different versions to see what changed.
                </p>
              );
            }
            let diff: ReturnType<typeof diffSnapshots>;
            try {
              diff = diffSnapshots(
                JSON.parse(a.bundle) as ConfigBundle,
                JSON.parse(b.bundle) as ConfigBundle,
              );
            } catch {
              return <p className="mt-2 text-xs text-destructive">One version is unreadable.</p>;
            }
            const list = [
              ...diff.scenes.map((row) => ({ ...row, area: "scene" })),
              ...diff.transitions.map((row) => ({ ...row, area: "transition" })),
              ...diff.hits.map((row) => ({ ...row, area: "hit" })),
            ];
            return (
              <div className="mt-2 rounded-lg border border-border p-2 text-xs">
                <div className="text-muted-foreground">
                  {diff.total === 0 ? "Identical settings" : `${diff.total} differences`}
                </div>
                <div className="mt-1 max-h-56 overflow-auto">
                  {list.map((row) => (
                    <div
                      key={`${row.area}-${row.field}`}
                      className="grid grid-cols-[70px_1fr_auto] items-center gap-2 border-b border-border/40 py-1 last:border-0"
                    >
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {row.area}
                      </span>
                      <span className="truncate">{row.field}</span>
                      <span className="font-mono">
                        <span className="text-destructive line-through">{row.from}</span>
                        {" → "}
                        <span className="text-emerald-500">{row.to}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
