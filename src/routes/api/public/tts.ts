import { createFileRoute } from "@tanstack/react-router";

/**
 * Neural voice for the ring announcer. The browser's speech synthesis sounds
 * robotic, so every spoken line is generated here with a real broadcast voice
 * and cached on the client by text + language.
 */
export const Route = createFileRoute("/api/public/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { text?: unknown; lang?: unknown; tone?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        const text = typeof body.text === "string" ? body.text.trim().slice(0, 300) : "";
        const tone = body.tone === "ko" || body.tone === "big" ? body.tone : "normal";
        if (!text) return new Response("Bad request", { status: 400 });

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Voice unavailable", { status: 503 });

        const instructions =
          tone === "ko"
            ? "You are a live wrestling ring announcer at the peak of a knockout. Shout with maximum excitement, fast, hoarse, roaring over a packed arena."
            : tone === "big"
              ? "You are a live wrestling commentator calling a huge blow. Loud, punchy, urgent, thrilled."
              : "You are a live wrestling commentator. Energetic, warm, natural broadcast delivery, slightly fast, never robotic.";

        let response: Response;
        try {
          response = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openai/gpt-4o-mini-tts",
              input: text,
              voice: "onyx",
              instructions,
              speed: tone === "ko" ? 1.15 : 1.05,
              response_format: "mp3",
              stream_format: "audio",
            }),
          });
        } catch {
          return new Response("Voice unavailable", { status: 502 });
        }

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          return new Response(detail || "Voice failed", { status: response.status });
        }

        return new Response(response.body, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
