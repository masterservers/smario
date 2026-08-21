/**
 * The arena cycles two master reels that share the same ring, the same camera
 * distance and fighters of realistic proportions. The old "heights" master was
 * dropped: it rendered Putin as a dwarf next to Trump, which broke the show.
 */
import heights2 from "@/assets/arena-heights2.webm.asset.json";
import moves from "@/assets/arena-moves.webm.asset.json";

export const REELS: string[] = [heights2.url, moves.url];


/** Reel used by the very first frame and by anything without an explicit source. */
export const PRIMARY_REEL = REELS[0]!;

export function reelIndexOf(src: string | undefined): number {
  if (!src) return 0;
  const index = REELS.indexOf(src);
  return index < 0 ? 0 : index;
}

/** Deterministic reel for a scene index, so the catalog is spread evenly. */
export function reelFor(index: number): string {
  return REELS[index % REELS.length]!;
}
