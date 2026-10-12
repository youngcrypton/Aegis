import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AegisLogo } from "../components/AegisLogo";
import { AEGIS_TOKENS } from "../theme";

interface ChapterDef {
  startFrame: number;
  endFrame: number;
  chapterNum: string;
  title: string;
  audioFile: string;
  callout: {
    startOffset: number;
    text: string;
    tag: string;
  };
}

const CHAPTERS: ChapterDef[] = [
  {
    startFrame: 0,
    endFrame: 930, // 31s
    chapterNum: "01",
    title: "OVERVIEW & 0x0801 ORACLE CONSENSUS",
    audioFile: "audio/ch1.wav",
    callout: {
      startOffset: 120,
      tag: "PRECOMPILE 0x0801",
      text: "Synchronous sub-78ms mark price reads directly from HyperCore consensus",
    },
  },
  {
    startFrame: 930,
    endFrame: 1770, // 28s -> 59s
    chapterNum: "02",
    title: "1-CLICK LITE AUTO-PILOT & INV-1 DELEGATION",
    audioFile: "audio/ch2.wav",
    callout: {
      startOffset: 120,
      tag: "INVARIANT INV-1",
      text: "Ephemeral trade-only session keys with 0% custody risk & zero withdrawal rights",
    },
  },
  {
    startFrame: 1770,
    endFrame: 2400, // 21s -> 80s
    chapterNum: "03",
    title: "PRO TERMINAL & HYPERCORE CLOB DEPTH",
    audioFile: "audio/ch3.wav",
    callout: {
      startOffset: 90,
      tag: "ORDERBOOK DEPTH",
      text: "Streaming 10-level Central Limit Orderbook directly from HyperCore",
    },
  },
  {
    startFrame: 2400,
    endFrame: 3240, // 28s -> 108s
    chapterNum: "04",
    title: "FLASH CRASH (-18%) & SUB-SECOND SHORT HEDGE",
    audioFile: "audio/ch4.wav",
    callout: {
      startOffset: 90,
      tag: "PREDEPLOY 0x0802",
      text: "Autonomous short perpetual hedge absorbs collateral drop dollar-for-dollar",
    },
  },
  {
    startFrame: 3240,
    endFrame: 4110, // 29s -> 137s
    chapterNum: "05",
    title: "V-BOUNCE, TRAILING PROFIT UNWIND & INV-4 FEE SPLIT",
    audioFile: "audio/ch5.wav",
    callout: {
      startOffset: 90,
      tag: "INVARIANT INV-4",
      text: "Trailing take-profit restores vault: 50% burned via Ascend Pools / 50% staker yield",
    },
  },
  {
    startFrame: 4110,
    endFrame: 4925, // ~27s -> 164.16s
    chapterNum: "06",
    title: "EMERGENCY KILLSWITCH (INV-3) & AUDIT INTEGRITY",
    audioFile: "audio/ch6.wav",
    callout: {
      startOffset: 60,
      tag: "INVARIANTS INV-3 & INV-5",
      text: "Atomic single-tx manual override killswitch & strictly monotonic EIP-712 nonces",
    },
  },
];

export const AegisLiveProductDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = AEGIS_TOKENS.light;

  // Find active chapter
  const currentChapter =
    CHAPTERS.find((c) => frame >= c.startFrame && frame < c.endFrame) ||
    CHAPTERS[CHAPTERS.length - 1];

  // Global progress ratio
  const progressRatio = Math.min(frame / durationInFrames, 1);

  // Chapter pill transition animation
  const chapterRelativeFrame = frame - currentChapter.startFrame;
  const pillSpring = spring({
    frame: chapterRelativeFrame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  const pillY = interpolate(pillSpring, [0, 1], [-10, 0]);
  const pillOpacity = interpolate(pillSpring, [0, 1], [0, 1]);

  // Callout animation
  const calloutRelativeFrame = chapterRelativeFrame - currentChapter.callout.startOffset;
  const showCallout = calloutRelativeFrame >= 0 && calloutRelativeFrame <= 240; // show for 8 seconds
  const calloutSpring = spring({
    frame: Math.max(0, calloutRelativeFrame),
    fps,
    config: { damping: 15, stiffness: 110 },
  });
  const calloutY = interpolate(calloutSpring, [0, 1], [25, 0]);
  const calloutOpacity = interpolate(calloutSpring, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0F121C",
        fontFamily: t.textFont,
        color: t.ink,
        overflow: "hidden",
      }}
    >
      {/* 1. Underlying Recorded Walkthrough Video */}
      <AbsoluteFill
        style={{
          top: 36,
          height: 684,
        }}
      >
        <OffthreadVideo
          src={staticFile("recordings/live-product-demo.webm")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </AbsoluteFill>

      {/* 2. Audio Chapter Narrations */}
      {CHAPTERS.map((c, i) => (
        <Sequence
          key={i}
          from={c.startFrame}
          durationInFrames={c.endFrame - c.startFrame}
        >
          <Audio src={staticFile(c.audioFile)} volume={1.0} />
        </Sequence>
      ))}

      {/* 3. Subtle Ambient Sound Ducked Under Voiceover */}
      <Audio src={staticFile("aegis-launch-sound.wav")} volume={0.06} loop />

      {/* 4. Top Micro Progress Bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${progressRatio * 100}%`,
          height: 3,
          background: "linear-gradient(90deg, #5FD9BE 0%, #6928ED 100%)",
          boxShadow: "0 0 10px rgba(95, 217, 190, 0.7)",
          zIndex: 100,
        }}
      />

      {/* 5. Top Studio HUD Header Bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          backgroundColor: "#161B2E",
          borderBottom: "1px solid rgba(220, 230, 255, 0.12)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
          zIndex: 90,
        }}
      >
        {/* Left: Brand Badge & Live Demo Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <AegisLogo size={18} glow={false} />
            <span
              style={{
                fontFamily: t.displayFont,
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.06em",
                color: "#FFFFFF",
              }}
            >
              AEGIS
            </span>
          </div>

          <div
            style={{
              width: 1,
              height: 14,
              backgroundColor: "rgba(255, 255, 255, 0.2)",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "#5FD9BE",
                boxShadow: "0 0 6px #5FD9BE",
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "#5FD9BE",
              }}
            >
              OFFICIAL PRODUCT DEMO
            </span>
          </div>
        </div>

        {/* Center: Dynamic Chapter Indicator Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "rgba(10, 12, 20, 0.6)",
            border: "1px solid rgba(95, 217, 190, 0.3)",
            padding: "3px 12px",
            borderRadius: 16,
            transform: `translateY(${pillY}px)`,
            opacity: pillOpacity,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              backgroundColor: "#07705F",
              color: "#FFFFFF",
              padding: "1px 5px",
              borderRadius: 3,
              letterSpacing: "0.04em",
            }}
          >
            CH {currentChapter.chapterNum}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: "#E8ECF8",
            }}
          >
            {currentChapter.title}
          </span>
        </div>

        {/* Right: Network & Telemetry Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 10,
            color: "#A7AFCB",
          }}
        >
          <span style={{ fontWeight: 600, color: "#E8ECF8" }}>
            Elysium L2 (99801)
          </span>
          <span
            style={{
              color: "#5FD9BE",
              fontWeight: 700,
              backgroundColor: "rgba(95, 217, 190, 0.12)",
              padding: "1px 6px",
              borderRadius: 3,
            }}
          >
            0x0801: 68ms
          </span>
        </div>
      </div>

      {/* 6. Lower-Third Dynamic Callout Badge */}
      {showCallout && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 24,
            maxWidth: 620,
            display: "flex",
            alignItems: "center",
            gap: 12,
            backgroundColor: "rgba(22, 27, 46, 0.95)",
            backdropFilter: "blur(14px)",
            padding: "10px 18px",
            borderRadius: 12,
            border: "1px solid rgba(95, 217, 190, 0.35)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            transform: `translateY(${calloutY}px)`,
            opacity: calloutOpacity,
            zIndex: 90,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(95, 217, 190, 0.15)",
              border: "1px solid #5FD9BE",
              padding: "4px 8px",
              borderRadius: 6,
              color: "#5FD9BE",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.06em",
              whiteSpace: "nowrap",
            }}
          >
            {currentChapter.callout.tag}
          </div>

          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              lineHeight: 1.4,
              color: "#E8ECF8",
            }}
          >
            {currentChapter.callout.text}
          </div>
        </div>
      )}

      {/* 7. Bottom Right Watermark & Timestamp */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 18,
          fontSize: 10,
          fontWeight: 600,
          color: "rgba(255, 255, 255, 0.8)",
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          padding: "3px 8px",
          borderRadius: 4,
          fontFamily: "monospace",
          zIndex: 80,
        }}
      >
        {Math.floor(frame / 30 / 60)}:
        {String(Math.floor((frame / 30) % 60)).padStart(2, "0")} / 2:44
      </div>
    </AbsoluteFill>
  );
};
