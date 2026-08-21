import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Fight Putin vs Trump" },
      {
        name: "description",
        content:
          "Choose a new password for the battle arena admin console after opening the reset link sent by email.",
      },
      { property: "og:title", content: "Set a new password — Fight Putin vs Trump" },
      { property: "og:description", content: "Finish the password reset for the admin console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // The recovery link signs the browser in with a short-lived session.
    void supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setReady(Boolean(session)),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setError(updateError.message);
    else {
      setNotice("Password updated. Redirecting to the console…");
      window.setTimeout(
        () => void navigate({ to: "/admin", search: { lang: "en" as const } }),
        900,
      );
    }
    setBusy(false);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4">
      <h1 className="display text-2xl text-gold">Set a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {ready
          ? "Choose a new password for the admin console."
          : "Open this page from the reset link sent to your email."}
      </p>
      <form onSubmit={submit} className="panel mt-6 space-y-3 rounded-2xl p-4">
        <label className="block text-xs text-muted-foreground">
          New password
          <Input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 h-9"
          />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && <p className="text-sm text-gold">{notice}</p>}
        <Button type="submit" disabled={busy || !ready} className="w-full">
          Save password
        </Button>
      </form>
    </main>
  );
}
