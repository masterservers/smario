/**
 * Layout debug mode.
 *
 * Turned on with `?debug=1` in the URL, with the "d" key, or by setting
 * `fight.debug` in localStorage. It only draws helper lines — it never changes
 * how the fight itself behaves.
 */

import { useEffect, useState } from "react";

const KEY = "fight.debug";

function initial(): boolean {
  if (typeof window === "undefined") return false;
  const param = new URLSearchParams(window.location.search).get("debug");
  if (param === "1" || param === "true") return true;
  if (param === "0" || param === "false") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function useDebugView(): boolean {
  // Starts false so server render and hydration agree; the real value is read
  // after mount.
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(initial());
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "d" && event.key !== "D") return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      setOn((previous) => {
        const next = !previous;
        window.localStorage.setItem(KEY, next ? "1" : "0");
        return next;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return on;
}
