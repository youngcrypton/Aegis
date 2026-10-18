import React from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Act1ProblemLight } from "../scenes_120s/Act1ProblemLight";
import { Act2ArchitectureLight } from "../scenes_120s/Act2ArchitectureLight";
import { Act3ProductTourLight } from "../scenes_120s/Act3ProductTourLight";
import { Act4FlashCrashLight } from "../scenes_120s/Act4FlashCrashLight";
import { Act5UnwindLight } from "../scenes_120s/Act5UnwindLight";
import { Act6OutroLight } from "../scenes_120s/Act6OutroLight";
import { AEGIS_LIGHT_THEME } from "../theme";

/**
 * AEGIS Protocol — 120-Second Hackathon Demo Video (Light Mode)
 * Target: Hackathon Judges (Elysium L2 / Hyperliquid / DeFi Track)
 * Resolution: 1920x1080 @ 30 FPS (Exactly 3,600 frames = 120.00 seconds)
 *
 * Sequence Breakdown (Accounting for 5x 20-frame transition overlaps = 100 frames):
 * - Act 1: The Liquidation Crisis & The Hook (550f -> 18s net)
 * - Act 2: Native Elysium L2 Architecture & Invariant INV-1 (680f -> 22s net)
 * - Act 3: Live Dual Terminal Tour: Lite Auto-Pilot & Pro (770f -> 25s net)
 * - Act 4: Live -18% Flash Crash & Sub-78ms Defense (920f -> 30s net)
 * - Act 5: Trailing Take-Profit Auto-Unwind & Fee Burn (470f -> 15s net)
 * - Act 6: Verified Testnet Status & Outro CTA (310f -> 10s net)
 *
 * Net Total Duration = 550 + 680 + 770 + 920 + 470 + 310 - (5 * 20) = 3,600 frames (120.00s)
 */
export const AegisHackathonDemo120s: React.FC = () => {
  const t = AEGIS_LIGHT_THEME;

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: t.ground,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <TransitionSeries>
        {/* Act 1: Problem & Hook */}
        <TransitionSeries.Sequence durationInFrames={550}>
          <Act1ProblemLight />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />

        {/* Act 2: Architecture & INV-1 */}
        <TransitionSeries.Sequence durationInFrames={680}>
          <Act2ArchitectureLight />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: 20 })}
        />

        {/* Act 3: Lite & Pro Product Tour */}
        <TransitionSeries.Sequence durationInFrames={770}>
          <Act3ProductTourLight />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />

        {/* Act 4: -18% Flash Crash & Defense */}
        <TransitionSeries.Sequence durationInFrames={818}>
          <Act4FlashCrashLight />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />

        {/* Act 5: Trailing Unwind & Fee Flywheel */}
        <TransitionSeries.Sequence durationInFrames={470}>
          <Act5UnwindLight />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: 20 })}
        />

        {/* Act 6: Outro & Call to Action */}
        <TransitionSeries.Sequence durationInFrames={310}>
          <Act6OutroLight />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </div>
  );
};
