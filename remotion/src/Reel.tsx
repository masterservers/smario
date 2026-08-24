import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Fighter } from "./Fighter";
import { sample, type Pose } from "./poses";
import {
  ATTACKER_BASE,
  DEFENDER_BASE,
  DEFENDER_GROUND_BASE,
  SLOT_FRAMES,
  TECHNIQUES,
  type Technique,
} from "./moves";

const PUTIN = { color: "#b21b28", trunk: "#7d1119", head: "putin" as const, scale: 0.9 };
const TRUMP = { color: "#1d3f80", trunk: "#122a56", head: "trump" as const, scale: 1 };

const Mat: React.FC = () => (
  <AbsoluteFill>
    <Img
      src={staticFile("images/ring.jpg")}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
    <AbsoluteFill style={{ background: "rgba(4,6,14,0.45)" }} />
  </AbsoluteFill>
);

const Shadow: React.FC<{ pose: Pose; w: number }> = ({ pose, w }) => (
  <div
    style={{
      position: "absolute",
      left: pose.x - w / 2,
      top: 592,
      width: w,
      height: 16,
      borderRadius: "50%",
      background: "rgba(0,0,0,0.35)",
      filter: "blur(3px)",
    }}
  />
);

const Scene: React.FC<{ technique: Technique }> = ({ technique }) => {
  const frame = useCurrentFrame();
  const p = Math.min(1, frame / (SLOT_FRAMES - 1));
  const attacker = sample(ATTACKER_BASE, technique.attacker, p);
  const defender = sample(
    technique.defenderStartsGrounded ? DEFENDER_GROUND_BASE : DEFENDER_BASE,
    technique.defender,
    p,
  );
  return (
    <AbsoluteFill>
      <Shadow pose={attacker} w={110} />
      <Shadow pose={defender} w={110} />
      <Fighter pose={defender} {...PUTIN} />
      <Fighter pose={attacker} {...TRUMP} />
    </AbsoluteFill>
  );
};

export const Reel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#05070f" }}>
    <Mat />
    {TECHNIQUES.map((technique, i) => (
      <Sequence key={technique.id} from={i * SLOT_FRAMES} durationInFrames={SLOT_FRAMES}>
        <Scene technique={technique} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
