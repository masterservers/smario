import { useSubtitle } from "@/lib/subtitles";

type Props = {
  /** Captions can be switched off from the HUD. */
  enabled?: boolean;
  className?: string;
};

/**
 * Caption line for every spoken announcement — referee calls, gift ticker and
 * commentary — shown at the exact moment the message hits the top bar.
 */
export function Subtitles({ enabled = true, className }: Props) {
  const subtitle = useSubtitle();
  if (!enabled || !subtitle) return null;

  const tone =
    subtitle.tone === "ref"
      ? "text-gold"
      : subtitle.tone === "commentary"
        ? "text-foreground"
        : "text-foreground";

  return (
    <div
      className={
        className ??
        "pointer-events-none absolute inset-x-0 bottom-[calc(var(--hud,0px)+0.5rem)] z-30 flex justify-center px-3"
      }
      aria-live="polite"
    >
      <p
        key={subtitle.id}
        className={`max-w-[46rem] rounded-lg bg-black/65 px-3 py-1.5 text-center text-xs leading-snug backdrop-blur-md sm:text-sm ${tone}`}
      >
        {subtitle.text}
      </p>
    </div>
  );
}
