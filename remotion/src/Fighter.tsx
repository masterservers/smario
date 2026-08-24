import React from "react";
import { staticFile, Img } from "remotion";
import type { Pose } from "./poses";

/**
 * Procedural fighter puppet.
 *
 * The body is drawn from code (torso + two-segment arms and legs), the head is
 * the real fighter cutout, so identity stays the same while the MOTION is
 * fully programmable. All angles are degrees, 0 = limb hanging straight down,
 * positive = clockwise on screen.
 */

const TORSO = 118;
const UPPER_ARM = 56;
const FOREARM = 52;
const THIGH = 64;
const SHIN = 60;

type Props = {
  pose: Pose;
  color: string;
  trunk: string;
  head: "putin" | "trump";
  scale: number;
};

const limbStyle = (len: number, w: number, color: string, angle: number): React.CSSProperties => ({
  position: "absolute",
  left: -w / 2,
  top: 0,
  width: w,
  height: len,
  borderRadius: w / 2,
  background: color,
  transformOrigin: "50% 0%",
  transform: `rotate(${angle}deg)`,
});

const Segment: React.FC<{
  len: number;
  w: number;
  color: string;
  angle: number;
  children?: React.ReactNode;
}> = ({ len, w, color, angle, children }) => (
  <div style={limbStyle(len, w, color, angle)}>
    <div style={{ position: "absolute", left: w / 2, top: len }}>{children}</div>
  </div>
);

export const Fighter: React.FC<Props> = ({ pose, color, trunk, head, scale }) => {
  const skin = "#e7b48f";
  return (
    <div
      style={{
        position: "absolute",
        left: pose.x,
        top: pose.y,
        transform: `scale(${scale * (pose.facing < 0 ? -1 : 1)}, ${scale})`,
        transformOrigin: "50% 100%",
      }}
    >
      {/* torso root: rotates the whole upper body */}
      <div
        style={{
          position: "absolute",
          transformOrigin: "50% 100%",
          transform: `rotate(${pose.rot}deg)`,
          left: 0,
          top: 0,
        }}
      >
        {/* torso goes UP from the hip */}
        <div
          style={{
            position: "absolute",
            left: -26,
            top: -TORSO,
            width: 52,
            height: TORSO,
            borderRadius: 22,
            background: color,
            boxShadow: "inset 0 -18px 26px rgba(0,0,0,0.35)",
          }}
        />
        {/* trunks */}
        <div
          style={{
            position: "absolute",
            left: -28,
            top: -30,
            width: 56,
            height: 40,
            borderRadius: 12,
            background: trunk,
          }}
        />
        {/* head cutout at the top of the torso */}
        <div
          style={{
            position: "absolute",
            left: -46,
            top: -TORSO - 66,
            width: 92,
            transformOrigin: "50% 100%",
            transform: `rotate(${pose.head}deg)`,
          }}
        >
          <Img src={staticFile(`images/${head}-head.png`)} style={{ width: 92 }} />
        </div>
        {/* arms hang from the shoulder line */}
        <div style={{ position: "absolute", left: -18, top: -TORSO + 14 }}>
          <Segment len={UPPER_ARM} w={17} color={skin} angle={pose.sL}>
            <Segment len={FOREARM} w={14} color={skin} angle={pose.eL} />
          </Segment>
        </div>
        <div style={{ position: "absolute", left: 18, top: -TORSO + 14 }}>
          <Segment len={UPPER_ARM} w={18} color={skin} angle={pose.sR}>
            <Segment len={FOREARM} w={15} color={skin} angle={pose.eR} />
          </Segment>
        </div>
      </div>
      {/* legs hang from the hip, independent of torso rotation */}
      <div style={{ position: "absolute", left: -13, top: -6 }}>
        <Segment len={THIGH} w={21} color={trunk} angle={pose.hL}>
          <Segment len={SHIN} w={17} color={skin} angle={pose.kL} />
        </Segment>
      </div>
      <div style={{ position: "absolute", left: 13, top: -6 }}>
        <Segment len={THIGH} w={22} color={trunk} angle={pose.hR}>
          <Segment len={SHIN} w={18} color={skin} angle={pose.kR} />
        </Segment>
      </div>
    </div>
  );
};
