import { useEffect, useRef, useState } from "react";

/**
 * Measures the bottom HUD strip so the ring stage can always end exactly where
 * the controls start. Keeps buttons and chat below the ring on any narrow
 * screen, after rotation, browser-chrome resize or when panels open/close.
 */
export function useHudHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(156);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const measure = () => setHeight(Math.round(node.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("orientationchange", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  return { ref, height };
}
