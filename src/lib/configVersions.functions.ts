import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ConfigVersion = {
  id: string;
  label: string;
  is_active: boolean;
  created_by_email: string | null;
  created_at: string;
  /** The full configuration, serialized as JSON text. */
  bundle: string;
};

/** The configuration everyone (players and spectators) should be running. */
export const getActiveConfigVersion = createServerFn({ method: "GET" }).handler(
  async (): Promise<ConfigVersion | null> => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
    const client = createClient(process.env['SUPABASE_URL']!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });
    // Public read: only the active bundle, and never the publisher's identity.
    const { data } = await client
      .from("config_versions")
      .select("id, label, is_active, created_at, bundle")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      ...(data as Omit<ConfigVersion, "bundle" | "created_by_email">),
      created_by_email: null,
      bundle: JSON.stringify((data as { bundle: unknown }).bundle ?? {}),
    };
  },
);

/** Saved versions, newest first (readable by anyone signed into the console). */
export const listConfigVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConfigVersion[]> => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("config_versions")
      .select("id, label, is_active, created_by_email, created_at, bundle")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) return [];
    return (data ?? []).map((row) => ({
      ...(row as unknown as Omit<ConfigVersion, "bundle">),
      bundle: JSON.stringify((row as { bundle: unknown }).bundle ?? {}),
    }));
  });

async function assertStaff(context: { supabase: { rpc: Function }; userId: string }) {
  const [{ data: isAdmin }, { data: isModerator }] = await Promise.all([
    context.supabase.rpc("current_user_has_role", { _role: "admin" }),
    context.supabase.rpc("current_user_has_role", { _role: "moderator" }),
  ]);
  if (!isAdmin && !isModerator) throw new Error("Forbidden");
}

/** Stores a new version and makes it the active one for everybody. */
export const saveConfigVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { label: string; bundle: string; activate?: boolean }) => {
    const label = typeof input?.label === "string" && input.label.trim() ? input.label.trim().slice(0, 80) : "snapshot";
    if (typeof input?.bundle !== "string" || input.bundle.length < 2) throw new Error("Invalid configuration");
    JSON.parse(input.bundle);
    return { label, bundle: input.bundle, activate: input.activate !== false };
  })
  .handler(async ({ data, context }): Promise<ConfigVersion> => {
    await assertStaff(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.activate) {
      await supabaseAdmin.from("config_versions").update({ is_active: false }).eq("is_active", true);
    }
    const email = (context.claims as { email?: string } | null)?.email ?? null;
    const { data: row, error } = await supabaseAdmin
      .from("config_versions")
      .insert({
        label: data.label,
        bundle: JSON.parse(data.bundle) as never,
        is_active: data.activate,
        created_by: context.userId,
        created_by_email: email,
      })
      .select("id, label, is_active, created_by_email, created_at, bundle")
      .single();
    if (error) throw new Error("Unable to save this version");
    return { ...(row as unknown as Omit<ConfigVersion, "bundle">), bundle: JSON.stringify((row as { bundle: unknown }).bundle ?? {}) };
  });

/** Rolls back: makes an older stored version the active one again. */
export const activateConfigVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (typeof input?.id !== "string" || input.id.length < 10) throw new Error("Invalid version");
    return { id: input.id };
  })
  .handler(async ({ data, context }): Promise<ConfigVersion> => {
    await assertStaff(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("config_versions").update({ is_active: false }).eq("is_active", true);
    const { data: row, error } = await supabaseAdmin
      .from("config_versions")
      .update({ is_active: true })
      .eq("id", data.id)
      .select("id, label, is_active, created_by_email, created_at, bundle")
      .single();
    if (error) throw new Error("Unable to restore this version");
    return { ...(row as unknown as Omit<ConfigVersion, "bundle">), bundle: JSON.stringify((row as { bundle: unknown }).bundle ?? {}) };
  });

/** Removes a stored version (the active one is kept). */
export const deleteConfigVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (typeof input?.id !== "string" || input.id.length < 10) throw new Error("Invalid version");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("config_versions").delete().eq("id", data.id).eq("is_active", false);
    return { ok: true };
  });
