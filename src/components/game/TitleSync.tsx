import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useMatchTitle } from "@/lib/adminConfig";
import { pageTitle } from "@/lib/matchTitle";

const SECTIONS: Record<string, string | null> = {
  "/": null,
  "/live": "Live Ring Cam",
  "/replays": "Match Replays",
  "/auth": "Staff sign in",
  "/reset-password": "Set a new password",
  "/admin": "Battle admin",
};

/**
 * Keeps every browser tab on the approved match title: the head() defaults are
 * static, this replaces them the moment the admin picks another approved name.
 */
export function TitleSync() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const title = useMatchTitle();

  useEffect(() => {
    const section = SECTIONS[path.replace(/\/+$/, "") || "/"] ?? null;
    document.title = pageTitle(section, title);
  }, [path, title]);

  return null;
}
