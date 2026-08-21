/**
 * Finds the striped referee inside the current video frame.
 *
 * The official filmed in the ring wears a black-and-white vertical striped
 * shirt — the only surface in the picture that is both colourless and rapidly
 * alternating between dark and bright along a row. Scoring that pattern on a
 * tiny downscaled copy of the frame is cheap enough to run a few times per
 * second and gives us the anchor for Mr. Bean's face, so the swap follows the
 * referee wherever the scene puts him.
 */
export type RefSpot = {
  /** Shirt centre, in % of the painted video rectangle. */
  x: number;
  y: number;
  /** Detected shirt width, in % of the video width. */
  width: number;
  /** 0..1 — how strongly the stripe pattern showed up. */
  score: number;
};

const W = 96;
const H = 54;

export function createRefTracker() {
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  return function track(video: HTMLVideoElement): RefSpot | null {
    if (!video.videoWidth || video.readyState < 2) return null;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      ctx = canvas.getContext("2d", { willReadFrequently: true });
    }
    if (!ctx) return null;
    try {
      ctx.drawImage(video, 0, 0, W, H);
    } catch {
      return null;
    }
    let data: Uint8ClampedArray;
    try {
      data = ctx.getImageData(0, 0, W, H).data;
    } catch {
      return null;
    }

    // Grey + bright/dark map. The crowd is warm brown, the mat is flat grey,
    // the ropes are thin — only the shirt alternates hard between the two.
    const dark = new Uint8Array(W * H);
    const light = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const r = data[i * 4] ?? 0;
      const g = data[i * 4 + 1] ?? 0;
      const b = data[i * 4 + 2] ?? 0;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const grey = max - min < 46;
      const lum = (r + g + b) / 3;
      if (grey && lum < 78) dark[i] = 1;
      else if (grey && lum > 150) light[i] = 1;
    }

    // Score every cell of a small window grid: a shirt is a column-ish blob
    // with both tones present and several dark/light flips per row.
    const win = 7; // ~7% of the frame width
    const winH = 9;
    let best = { x: 0, y: 0, score: 0 };
    // The referee's torso always sits in the band between the crowd and the
    // mat — searching only there keeps ropes, apron logos and the turnbuckle
    // pads out of the running.
    const yFrom = Math.round(H * 0.24);
    const yTo = Math.round(H * 0.58);
    for (let y = yFrom; y < yTo; y += 1) {
      for (let x = 2; x < W - win - 2; x += 1) {
        let flips = 0;
        let darks = 0;
        let lights = 0;
        for (let row = 0; row < winH; row++) {
          let prev = -1;
          for (let col = 0; col < win; col++) {
            const i = (y + row) * W + x + col;
            const tone = dark[i] ? 0 : light[i] ? 1 : -1;
            if (tone === 0) darks++;
            if (tone === 1) lights++;
            if (tone >= 0 && prev >= 0 && tone !== prev) flips++;
            if (tone >= 0) prev = tone;
          }
        }
        const cells = win * winH;
        const balance = Math.min(darks, lights) / cells;
        if (balance < 0.16) continue;
        const score = balance * 2 + flips / cells;
        if (score > best.score) best = { x: x + win / 2, y: y + winH / 2, score };
      }
    }

    if (best.score < 0.55) return null;
    return {
      x: (best.x / W) * 100,
      y: (best.y / H) * 100,
      width: (win / W) * 100,
      score: Math.min(1, best.score),
    };
  };
}
