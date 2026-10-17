import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AEGIS_THEME, SPRINGS } from "../theme";
import { BackgroundGrid } from "../components/BackgroundGrid";

export const Scene6Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring
  const enterSpring = spring({
    frame,
    fps,
    config: SPRINGS.smooth,
  });
  const enterScale = interpolate(enterSpring, [0, 1], [0.92, 1.0]);
  const enterOp = interpolate(enterSpring, [0, 1], [0, 1]);

  // CTA button glow pulse
  const ctaPulse = Math.sin(frame * 0.1) * 0.2 + 0.8;

  // Staggered pills entrance
  const pillSpring1 = spring({ frame: frame - 20, fps, config: SPRINGS.snappy });
  const pillSpring2 = spring({ frame: frame - 35, fps, config: SPRINGS.snappy });
  const pillSpring3 = spring({ frame: frame - 50, fps, config: SPRINGS.snappy });

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <BackgroundGrid />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          transform: `scale(${enterScale})`,
          opacity: enterOp,
        }}
      >
        {/* 3-Blade Logo Mark with Aurora Gradient */}
        <div
          style={{
            position: "relative",
            width: 140,
            height: 140,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 240,
              height: 240,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(139, 92, 246, 0.2) 50%, transparent 75%)",
              filter: "blur(40px)",
              pointerEvents: "none",
            }}
          />

          <svg
            viewBox="0 0 131 128"
            width={120}
            height={120}
            style={{ overflow: "visible" }}
          >
            <defs>
              <linearGradient
                id="aegis-blade-outro-grad"
                gradientUnits="userSpaceOnUse"
                x1="27.70"
                y1="-13.51"
                x2="103.30"
                y2="141.51"
              >
                <stop offset="0.00" stopColor="#1F0E4C" />
                <stop offset="0.10" stopColor="#241056" />
                <stop offset="0.20" stopColor="#40178D" />
                <stop offset="0.30" stopColor="#5A1FC9" />
                <stop offset="0.40" stopColor="#6928ED" />
                <stop offset="0.50" stopColor="#642FEB" />
                <stop offset="0.60" stopColor="#4C44CB" />
                <stop offset="0.70" stopColor="#305EA5" />
                <stop offset="0.80" stopColor="#157286" />
                <stop offset="0.90" stopColor="#087B75" />
                <stop offset="1.00" stopColor="#087E6D" />
              </linearGradient>
            </defs>
            <polygon points="40.20,0.00 70.40,0.00 26.60,127.00 0.00,127.00" fill="url(#aegis-blade-outro-grad)" />
            <polygon points="73.00,36.00 101.10,36.00 68.70,127.00 42.60,127.00" fill="url(#aegis-blade-outro-grad)" />
            <polygon points="104.20,67.00 130.00,67.00 108.50,127.00 83.90,127.00" fill="url(#aegis-blade-outro-grad)" />
          </svg>
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: AEGIS_THEME.displayFont,
            fontSize: 64,
            fontWeight: "400",
            color: AEGIS_THEME.ink,
            margin: "0 0 14px 0",
            letterSpacing: "4px",
            textTransform: "uppercase",
          }}
        >
          Liquidations Averted. Solvency Preserved.
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: AEGIS_THEME.textFont,
            fontSize: 20,
            fontWeight: "500",
            color: AEGIS_THEME.inkMuted,
            margin: "0 0 36px 0",
            maxWidth: 720,
          }}
        >
          Autonomous high-frequency risk protection for leverage traders and money market borrowers.
        </p>

        {/* CTA Button with glowing animated border */}
        <div
          style={{
            padding: "16px 38px",
            borderRadius: 14,
            background: AEGIS_THEME.accent,
            color: "#06090e",
            fontFamily: AEGIS_THEME.textFont,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "0.02em",
            boxShadow: `0 0 ${25 * ctaPulse}px rgba(16, 185, 129, ${0.5 * ctaPulse})`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 36,
          }}
        >
          <span>Launch Terminal at</span>
          <span style={{ textDecoration: "underline" }}>aegishedge.xyz</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>

        {/* Badges / Tech Proof Row */}
        <div
          style={{
            display: "flex",
            gap: 16,
          }}
        >
          <div
            style={{
              opacity: interpolate(pillSpring1, [0, 1], [0, 1]),
              padding: "8px 18px",
              borderRadius: 999,
              border: `1px solid ${AEGIS_THEME.rule}`,
              background: AEGIS_THEME.cardGlass,
              backdropFilter: "blur(12px)",
              color: AEGIS_THEME.accent,
              fontFamily: AEGIS_THEME.textFont,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Elysium Orbit L2 (Chain 99801)
          </div>

          <div
            style={{
              opacity: interpolate(pillSpring2, [0, 1], [0, 1]),
              padding: "8px 18px",
              borderRadius: 999,
              border: `1px solid ${AEGIS_THEME.rule}`,
              background: AEGIS_THEME.cardGlass,
              backdropFilter: "blur(12px)",
              color: AEGIS_THEME.ink,
              fontFamily: AEGIS_THEME.textFont,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            HyperCore Sub-78ms Matching Engine
          </div>

          <div
            style={{
              opacity: interpolate(pillSpring3, [0, 1], [0, 1]),
              padding: "8px 18px",
              borderRadius: 999,
              border: `1px solid ${AEGIS_THEME.rule}`,
              background: AEGIS_THEME.cardGlass,
              backdropFilter: "blur(12px)",
              color: AEGIS_THEME.inkMuted,
              fontFamily: AEGIS_THEME.textFont,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            159 / 159 Verified Automated Tests
          </div>
        </div>
      </div>
    </div>
  );
};
