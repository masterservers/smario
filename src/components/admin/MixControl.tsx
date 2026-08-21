import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { LANG_META, LANGS, type Lang } from "@/lib/i18n";
import { publishControl } from "@/lib/control";
import { DEFAULT_MIX, useMix } from "@/lib/mix";
import {
  MATCH_TYPES,
  deleteProfile,
  getMatchType,
  getProfile,
  saveProfile,
  setMatchType,
  useMixProfiles,
  profileKey,
  type MatchType,
} from "@/lib/mixProfiles";

/**
 * Broadcast mixer: announcer level, crowd reactions, ambience bed and the
 * commentator language for this session — plus saved profiles per language and
 * match type, applied automatically so nothing has to be re-balanced by hand.
 */
export function MixControl({ lang, onLang }: { lang: Lang; onLang: (next: Lang) => void }) {
  const mix = useMix();
  const profiles = useMixProfiles();
  const [type, setType] = useState<MatchType>("standard");
  const [status, setStatus] = useState<string | null>(null);
  const lastApplied = useRef<string>("");

  useEffect(() => {
    setType(getMatchType());
  }, []);

  // Auto-apply the saved profile whenever language or match type changes.
  useEffect(() => {
    const key = profileKey(lang, type);
    if (lastApplied.current === key) return;
    lastApplied.current = key;
    const saved = getProfile(lang, type);
    if (!saved) return;
    publishControl({
      type: "mix",
      mix: { voice: saved.voice, crowd: saved.crowd, ambience: saved.ambience },
    });
    setStatus(`Profile applied · ${LANG_META[lang].label} / ${type}`);
  }, [lang, type, profiles]);

  const set = (patch: Partial<typeof mix>) =>
    publishControl({ type: "mix", mix: { ...mix, ...patch } });

  const pct = (value: number) => `${Math.round(value * 100)}%`;
  const saved = profiles[profileKey(lang, type)] ?? null;

  const fader = (label: string, key: "voice" | "crowd" | "ambience") => (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{pct(mix[key])}</span>
      </div>
      <Slider
        value={[mix[key]]}
        min={0}
        max={1}
        step={0.05}
        aria-label={label}
        onValueChange={([value]) => set({ [key]: value ?? mix[key] })}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {fader("Announcer volume", "voice")}
      {fader("Crowd reactions", "crowd")}
      {fader("Arena ambience", "ambience")}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Session language</p>
        <div className="flex flex-wrap gap-2">
          {LANGS.map((code) => (
            <Button
              key={code}
              type="button"
              size="sm"
              variant={code === lang ? "default" : "outline"}
              onClick={() => onLang(code)}
            >
              {LANG_META[code].flag} {LANG_META[code].label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-border/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Mix profiles
        </p>
        <div className="flex flex-wrap gap-2">
          {MATCH_TYPES.map((option) => (
            <Button
              key={option.id}
              type="button"
              size="sm"
              variant={option.id === type ? "default" : "outline"}
              title={option.note}
              onClick={() => {
                setType(option.id);
                setMatchType(option.id);
              }}
            >
              {option.label}
              {profiles[profileKey(lang, option.id)] ? " ✓" : ""}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {saved
            ? `Saved profile for ${LANG_META[lang].label} · ${type} — applied automatically.`
            : `No profile yet for ${LANG_META[lang].label} · ${type}.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              saveProfile(lang, type, mix);
              setStatus(`Saved · ${LANG_META[lang].label} / ${type}`);
            }}
          >
            Save current mix
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!saved}
            onClick={() => {
              if (!saved) return;
              publishControl({
                type: "mix",
                mix: { voice: saved.voice, crowd: saved.crowd, ambience: saved.ambience },
              });
              setStatus("Profile applied to every viewer");
            }}
          >
            Apply
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!saved}
            onClick={() => {
              deleteProfile(lang, type);
              setStatus("Profile removed");
            }}
          >
            Delete
          </Button>
        </div>
        {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
      </div>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => publishControl({ type: "mix", mix: DEFAULT_MIX })}
      >
        Reset mix
      </Button>
    </div>
  );
}
