import React from "react";
import { Composition } from "remotion";
import { Reel } from "./Reel";
import { FPS, SLOT_FRAMES, TECHNIQUES } from "./moves";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="main"
    component={Reel}
    durationInFrames={SLOT_FRAMES * TECHNIQUES.length}
    fps={FPS}
    width={1280}
    height={720}
  />
);
