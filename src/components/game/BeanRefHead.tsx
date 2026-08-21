import { useEffect, useLayoutEffect, useRef, useState } from "react";
import headImg from "@/assets/mr-bean-head.png";
import { useDebugView } from "@/lib/debugView";
import { useBeanConfig } from "@/lib/beanConfig";
import { createRefTracker, type RefSpot } from "@/lib/refTracker";

/**
 * Mr. Bean's head, pinned on top of the referee who is already inside the
 * ring footage. Nothing walks in and nothing interrupts the fight — this is a
 * face swap on the existing official, anchored to the painted video rectangle
 * so it stays on his shoulders in every orientation.
 */
export function BeanRefHead() {
  const config = useBeanConfig();
  const debug = useDebugView();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState({ w: 0, h: 0, x: 0, y: 0 });

  // The reel is object-contain, so the picture is letterboxed inside its
  // element: measure the painted rectangle, not the element box.
  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const host = el.getBoundingClientRect();
      if (!host.width || !host.height) return;
      const video = document.querySelector<HTMLVideoElement>("video.arena-video");
      const box = video?.getBoundingClientRect();
      const ar =
        video && video.videoWidth && video.videoHeight
          ? video.videoWidth / video.videoHeight
          : 16 / 9;
      if (box && box.width && box.height) {
        const w = Math.min(box.width, box.height * ar);
        const h = w / ar;
        setFit({
          w,
          h,
          x: box.left + (box.width - w) / 2 - host.left,
          y: box.top + (box.height - h) / 2 - host.top,
        });
        return;
      }
      const w = Math.min(host.width, host.height * ar);
      const h = w / ar;
      setFit({ w, h, x: (host.width - w) / 2, y: (host.height - h) / 2 });
    };
    const queue = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };
    measure();
    const ro = new ResizeObserver(queue);
    ro.observe(el);
    window.addEventListener("resize", queue);
    window.addEventListener("orientationchange", queue);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", queue);
      window.removeEventListener("orientationchange", queue);
    };
  }, []);

  // Follow the striped official across the frame: a light stripe detector runs
  // a few times per second on a downscaled copy of the reel, and the result is
  // smoothed so the face glides instead of jumping.
  const [spot, setSpot] = useState<RefSpot | null>(null);
  useEffect(() => {
    if (!config.headEnabled) return;
    const track = createRefTracker();
    let raf = 0;
    let last = 0;
    let smooth: RefSpot | null = null;
    const loop = (now: number) => {
      raf = window.requestAnimationFrame(loop);
      if (document.hidden || now - last < 180) return;
      last = now;
      const video = document.querySelector<HTMLVideoElement>("video.arena-video");
      if (!video) return;
      const found = track(video);
      if (!found) return;
      smooth = smooth
        ? {
            x: smooth.x + (found.x - smooth.x) * 0.35,
            y: smooth.y + (found.y - smooth.y) * 0.35,
            width: smooth.width + (found.width - smooth.width) * 0.35,
            score: found.score,
          }
        : found;
      setSpot({ ...smooth });
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [config.headEnabled]);

  // Re-measure once the reel reports its real size (metadata can land late).
  useEffect(() => {
    const video = document.querySelector<HTMLVideoElement>("video.arena-video");
    if (!video) return;
    const fire = () => window.dispatchEvent(new Event("resize"));
    video.addEventListener("loadedmetadata", fire);
    return () => video.removeEventListener("loadedmetadata", fire);
  }, []);

  if (!config.headEnabled) return null;
  // Tracked shirt wins; the admin sliders are the fallback anchor.
  const anchorX = spot ? spot.x : config.headX;
  // The detector locks onto the torso; the head sits a bit above it.
  const anchorY = spot ? spot.y - 8.5 : config.headY;
  const sizePct = spot
    ? Math.min(8, Math.max(3.5, spot.width * 2))
    : config.headSize;
  const size = (sizePct / 100) * fit.w;

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden [contain:layout_paint_style]"
    >
      <div
        style={{ width: fit.w, height: fit.h, left: fit.x, top: fit.y }}
        className={`absolute ${debug ? "outline outline-1 outline-sky-400/80" : ""}`}
      >
        <img
          src={headImg}
          alt=""
          decoding="async"
          fetchPriority="low"
          className={`bean-head absolute -translate-x-1/2 -translate-y-1/2 object-contain ${
            debug ? "outline outline-1 outline-rose-400/90" : ""
          }`}
          style={{
            left: `${anchorX}%`,
            top: `${anchorY}%`,
            width: size || undefined,
          }}
        />
      </div>
    </div>
  );
}
