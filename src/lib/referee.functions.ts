import { createServerFn } from "@tanstack/react-start";
import { judgeRing, type RingVerdict } from "@/lib/referee.server";

/**
 * Server-side referee. The browser sends only the match id; the score, the
 * knockdown and every gift → blow decision are recomputed from the database.
 */
export const resolveRing = createServerFn({ method: "POST" })
  .inputValidator((input: { matchId: string }) => ({
    matchId:
      typeof input?.matchId === "string" && /^[0-9a-f-]{36}$/i.test(input.matchId)
        ? input.matchId
        : "",
  }))
  .handler(async ({ data }): Promise<RingVerdict> => judgeRing(data.matchId));
