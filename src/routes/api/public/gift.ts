import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Live gift intake for chat/stream bridges (TikTok, OBS relays, bots).
 *
 * POST { text?, side?, gift?, sender? } with the shared token in `x-api-key`
 * or `Authorization: Bearer <token>`. When only `text` is sent, the side is
 * derived from the symbol the viewer used (RUSSIA/Putin/🇷🇺 vs USA/Trump/🇺🇸).
 */
const Body = z.object({
  text: z.string().max(200).optional(),
  side: z.enum(["ru", "us"]).optional(),
  gift: z.string().max(32).optional(),
  sender: z.string().max(32).optional(),
});

function tokenMatches(request: Request, secret: string) {
  const header =
    request.headers.get("x-api-key") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const given = new TextEncoder().encode(header);
  const expected = new TextEncoder().encode(secret);
  return given.length === expected.length && given.every((b, i) => b === expected[i]);
}

export const Route = createFileRoute("/api/public/gift")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["LOVABLE_CRON_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });
        if (!tokenMatches(request, secret)) return new Response("Unauthorized", { status: 401 });

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = Body.safeParse(payload);
        if (!parsed.success) return new Response("Invalid body", { status: 400 });

        const { ingestStreamGift } = await import("@/lib/referee.server");
        const d = parsed.data;
        const result = await ingestStreamGift({
          ...(d.text !== undefined ? { text: d.text } : {}),
          ...(d.side !== undefined ? { side: d.side } : {}),
          ...(d.gift !== undefined ? { gift: d.gift as never } : {}),
          ...(d.sender !== undefined ? { sender: d.sender } : {}),
        });
        if (!result.ok) return Response.json(result, { status: 422 });
        return Response.json(result, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
