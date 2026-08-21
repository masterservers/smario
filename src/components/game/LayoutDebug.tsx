import { useEffect, useState } from "react";

/**
 * Debug overlay: bounding boxes and safe-area guides.
 *
 * It shows where the 16:9 reel actually lands inside the viewport, where the
 * safe-area insets cut in, and the live viewport size — which is what makes it
 * obvious why a character can get clipped on a given device.
 */

type Insets = { top: number; right: number; bottom: number; left: number };

function readInsets(): Insets {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;visibility:hidden;" +
    "padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);" +
    "padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left);";
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

export function LayoutDebug() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [insets, setInsets] = useState<Insets>({ top: 0, right: 0, bottom: 0, left: 0 });

  useEffect(() => {
    const measure = () => {
      setSize({ w: window.innerWidth, h: window.innerHeight });
      setInsets(readInsets());
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  const ratio = size.h > 0 ? size.w / size.h : 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] font-mono text-[10px] leading-tight">
      {/* Safe area — everything outside these lines can be cut by the device. */}
      <div
        className="absolute border border-dashed border-emerald-400/80"
        style={{
          top: insets.top,
          right: insets.right,
          bottom: insets.bottom,
          left: insets.left,
        }}
      >
        <span className="absolute left-0 top-0 bg-emerald-500/80 px-1 text-black">safe-area</span>
      </div>

      {/* The 16:9 box the reel is letterboxed into. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative aspect-video max-h-full w-full max-w-full border border-sky-400/80">
          <span className="absolute left-0 top-0 bg-sky-500/80 px-1 text-black">16:9 reel box</span>
          {/* Mat line: the height Bean and the fighters stand on. */}
          <div className="absolute inset-x-0 top-[46%] border-t border-dashed border-fuchsia-400/70">
            <span className="absolute left-1 top-0 bg-fuchsia-500/80 px-1 text-black">
              character top 46%
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-[4%] border-t border-dashed border-amber-400/70">
            <span className="absolute left-1 -top-3 bg-amber-500/80 px-1 text-black">
              mat / feet 4%
            </span>
          </div>
          {/* Centre cross. */}
          <div className="absolute inset-y-0 left-1/2 border-l border-white/30" />
          <div className="absolute inset-x-0 top-1/2 border-t border-white/30" />
        </div>
      </div>

      <div className="absolute bottom-1 right-1 rounded bg-black/80 px-2 py-1 text-white">
        {size.w}×{size.h} · ratio {ratio.toFixed(2)} · insets {insets.top}/{insets.right}/
        {insets.bottom}/{insets.left} · press D to hide
      </div>
    </div>
  );
}
