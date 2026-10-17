import React from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Scene1Hook } from "../scenes/Scene1Hook";
import { Scene2Problem } from "../scenes/Scene2Problem";
import { Scene3Terminal } from "../scenes/Scene3Terminal";
import { Scene4FlashCrash } from "../scenes/Scene4FlashCrash";
import { Scene5Unwind } from "../scenes/Scene5Unwind";
import { Scene6Outro } from "../scenes/Scene6Outro";

/**
 * AEGIS Protocol — 45-Second Cinematic Product Showcase Video
 * Resolution: 1920x1080 @ 60 FPS (2700 frames)
 *
 * Storyboard:
 * - Scene 1: The Genesis Hook (0.0s – 6.0s)
 * - Scene 2: The Problem: Forced Liquidation (6.0s – 13.0s)
 * - Scene 3: The Terminal & Concentric Gauge (13.0s – 24.0s)
 * - Scene 4: The -18% Flash Crash & Sub-78ms Defense (24.0s – 35.0s)
 * - Scene 5: Trailing Take-Profit Unwind & Solvency Restoration (35.0s – 41.0s)
 * - Scene 6: Outro & Testnet Call to Action (41.0s – 45.0s)
 */
export const AegisCinematicShowcase: React.FC = () => {
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: "#06090e",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <TransitionSeries>
        {/* Scene 1: The Genesis Hook (Frames 0 - 360 net) */}
        <TransitionSeries.Sequence durationInFrames={390}>
          <Scene1Hook />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 30 })}
        />

        {/* Scene 2: The Problem: Forced Liquidation (Frames 360 - 780 net) */}
        <TransitionSeries.Sequence durationInFrames={450}>
          <Scene2Problem />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: 30 })}
        />

        {/* Scene 3: The Terminal & Concentric Gauge (Frames 780 - 1440 net) */}
        <TransitionSeries.Sequence durationInFrames={690}>
          <Scene3Terminal />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 30 })}
        />

        {/* Scene 4: The -18% Flash Crash & Sub-78ms Defense (Frames 1440 - 2100 net) */}
        <TransitionSeries.Sequence durationInFrames={690}>
          <Scene4FlashCrash />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 30 })}
        />

        {/* Scene 5: Trailing Take-Profit Unwind & Solvency Restoration (Frames 2100 - 2460 net) */}
        <TransitionSeries.Sequence durationInFrames={390}>
          <Scene5Unwind />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: 30 })}
        />

        {/* Scene 6: Outro & Testnet Call to Action (Frames 2460 - 2700 net) */}
        <TransitionSeries.Sequence durationInFrames={240}>
          <Scene6Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </div>
  );
};
