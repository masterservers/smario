import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clearFailures,
  formatWait,
  getLockState,
  MAX_ATTEMPTS,
  registerFailure,
  type LockState,
} from "@/lib/loginThrottle";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff sign in — Fight Putin vs Trump" },
      {
        name: "description",
        content:
          "Sign in to reach the battle arena admin console: fighters, gifts, TikTok sources, live link and the audit log.",
      },
      { property: "og:title", content: "Staff sign in — Fight Putin vs Trump" },
      { property: "og:description", content: "Admin and moderator access to the battle console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lock, setLock] = useState<LockState>({
    locked: false,
    secondsLeft: 0,
    attemptsLeft: MAX_ATTEMPTS,
  });

  // Keep the lock state in step with the typed address and count the wait down.
  useEffect(() => {
    setLock(getLockState(email));
    const timer = window.setInterval(() => setLock(getLockState(email)), 1000);
    return () => window.clearInterval(timer);
  }, [email]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    if (mode === "reset") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) setError(resetError.message);
      else setNotice("Reset link sent. Check the inbox and open the link to set a new password.");
    } else if (mode === "in") {
      const current = getLockState(email);
      if (current.locked) {
        setLock(current);
        setError(`Too many failed attempts. Try again in ${formatWait(current.secondsLeft)}.`);
        setBusy(false);
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        const next = registerFailure(email);
        setLock(next);
        setError(
          next.locked
            ? `Too many failed attempts. Sign in is blocked for ${formatWait(next.secondsLeft)}.`
            : `${signInError.message} — ${next.attemptsLeft} ${
                next.attemptsLeft === 1 ? "attempt" : "attempts"
              } left before a temporary block.`,
        );
      } else {
        clearFailures(email);
        setPassword("");
        void navigate({ to: "/admin", search: { lang: "en" as const } });
      }
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (signUpError) setError(signUpError.message);
      else setNotice("Account created. Confirm the email, then sign in.");
    }
    setBusy(false);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4">
      <h1 className="display text-2xl text-gold">Staff sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The admin console is limited to accounts with the admin or moderator role.
      </p>
      <form onSubmit={submit} className="panel mt-6 space-y-3 rounded-2xl p-4">
        <label className="block text-xs text-muted-foreground">
          Email
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-9"
          />
        </label>
        {mode !== "reset" && (
        <label className="block text-xs text-muted-foreground">
          Password
          <Input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 h-9"
          />
        </label>
        )}
        {mode === "in" && lock.locked ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
            Sign in temporarily blocked. Unlocks in {formatWait(lock.secondsLeft)}. You can still use
            “Forgot password?”.
          </p>
        ) : null}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && <p className="text-sm text-gold">{notice}</p>}
        <Button
          type="submit"
          disabled={busy || (mode === "in" && lock.locked)}
          className="w-full"
        >
          {mode === "in" && lock.locked
            ? `Locked — ${formatWait(lock.secondsLeft)}`
            : mode === "in"
              ? "Sign in"
              : mode === "up"
                ? "Create account"
                : "Send reset link"}
        </Button>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="w-full text-xs text-muted-foreground underline"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
          >
            {mode === "in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
          <button
            type="button"
            className="w-full text-xs text-muted-foreground underline"
            onClick={() => setMode(mode === "reset" ? "in" : "reset")}
          >
            {mode === "reset" ? "Back to sign in" : "Forgot password?"}
          </button>
        </div>
      </form>
    </main>
  );
}
