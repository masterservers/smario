import { createFileRoute } from "@tanstack/react-router";

/**
 * Read-only endpoint that returns the fight configuration the live show is
 * running, plus its version metadata, so an operator can confirm from outside
 * the app that the right setup is on air.
 *
 * Secured with a shared token: send it as `x-api-key` or
 * `Authorization: Bearer <token>`. Without a valid token the route answers 401
 * and reveals nothing.
 */
export const Route = createFileRoute("/api/public/active-config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env['LOVABLE_CRON_SECRET'];
        if (!secret) return new Response("Not configured", { status: 503 });
        const header =
          request.headers.get("x-api-key") ??
          (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        const given = new TextEncoder().encode(header);
        const expected = new TextEncoder().encode(secret);
        const match =
          given.length === expected.length &&
          given.every((byte, index) => byte === expected[index]);
        if (!match) return new Response("Unauthorized", { status: 401 });

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
        const { data, error } = await client
          .from("config_versions")
          .select("id, label, is_active, created_by_email, created_at, bundle")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        if (error) return new Response("Unavailable", { status: 502 });
        if (!data) {
          return Response.json(
            { active: false, version: null, bundle: null },
            { headers: { "Cache-Control": "no-store" } },
          );
        }
        return Response.json(
          {
            active: true,
            version: {
              id: data.id,
              label: data.label,
              publishedBy: data.created_by_email,
              publishedAt: data.created_at,
            },
            bundle: data.bundle,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
