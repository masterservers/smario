import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Two-factor authentication (TOTP) for the battle console.
 *
 * Two states are handled here:
 *  - "challenge": the account already has a verified authenticator, but this
 *    session is still at assurance level 1 — a 6-digit code lifts it to aal2.
 *  - "enroll": the account has no authenticator yet — a QR code (and the
 *    manual secret) is shown, then the first code confirms the factor.
 *
 * The console stays locked until the session reaches aal2.
 */
export type MfaState = "loading" | "enroll" | "challenge" | "ready";

type Factor = { id: string; status: string };

export function useMfaState(): { state: MfaState; refresh: () => Promise<void> } {
  const [state, setState] = useState<MfaState>("loading");

  const refresh = useCallback(async () => {
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = (factors?.totp ?? []).filter((f) => f.status === "verified");
      if (aal?.currentLevel === "aal2") return setState("ready");
      if (verified.length > 0) return setState("challenge");
      setState("enroll");
    } catch {
      setState("enroll");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { state, refresh };
}

export function TwoFactorGate({
  state,
  onPassed,
}: {
  state: Exclude<MfaState, "ready" | "loading">;
  onPassed: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);

  // Enrolment: create (or reuse) an unverified TOTP factor and show its QR.
  useEffect(() => {
    if (state !== "enroll") return;
    void (async () => {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const stale = ((factors?.all ?? []) as Factor[]).filter((f) => f.status === "unverified");
      for (const f of stale) await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Battle console ${new Date().toISOString().slice(0, 10)}`,
      });
      if (enrollError || !data) return setError(enrollError?.message ?? "Could not start enrolment.");
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
    })();
  }, [state]);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      let id = factorId;
      if (!id) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        id = (factors?.totp ?? []).find((f) => f.status === "verified")?.id ?? null;
      }
      if (!id) throw new Error("No authenticator found on this account.");
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: id,
      });
      if (challengeError || !challenge) throw challengeError ?? new Error("Challenge failed.");
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: id,
        challengeId: challenge.id,
        code: code.replace(/\D/g, ""),
      });
      if (verifyError) throw verifyError;
      setCode("");
      onPassed();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid code.");
    } finally {
      setBusy(false);
    }
  }, [code, factorId, onPassed]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-5 px-6 py-16">
      <h1 className="display text-2xl tracking-widest">
        {state === "enroll" ? "Set up two-factor authentication" : "Two-factor verification"}
      </h1>
      <p className="text-sm text-muted-foreground">
        {state === "enroll"
          ? "The battle console requires an authenticator app (Google Authenticator, 1Password, Authy). Scan the code below, then type the 6-digit code to confirm."
          : "Open your authenticator app and type the current 6-digit code for the battle console."}
      </p>

      {state === "enroll" && qr && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5">
          <img src={qr} alt="Two-factor QR code for the battle console" className="h-48 w-48" />
          {secret && (
            <code className="select-all break-all rounded bg-muted px-3 py-2 text-xs">{secret}</code>
          )}
        </div>
      )}

      <Input
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="123456"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && code.length >= 6) void submit();
        }}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button disabled={busy || code.replace(/\D/g, "").length < 6} onClick={() => void submit()}>
        {busy ? "Checking…" : state === "enroll" ? "Confirm authenticator" : "Verify"}
      </Button>
    </div>
  );
}

/** Small panel inside the console: shows factor status and allows removal. */
export function TwoFactorSettings() {
  const [factors, setFactors] = useState<{ id: string; friendly_name?: string | null }[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []).filter((f) => f.status === "verified"));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-2">
      {factors.length === 0 && (
        <p className="text-sm text-muted-foreground">No authenticator registered.</p>
      )}
      {factors.map((factor) => (
        <div key={factor.id} className="flex items-center justify-between gap-3 text-sm">
          <span>{factor.friendly_name || "Authenticator"} · active</span>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!window.confirm("Remove this authenticator? The console will ask you to set up a new one.")) return;
              await supabase.auth.mfa.unenroll({ factorId: factor.id });
              await load();
            }}
          >
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}
