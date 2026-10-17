import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AEGIS_LIGHT_THEME, SPRINGS } from "../theme";

export const Act1ProblemLight: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = AEGIS_LIGHT_THEME;

  const titleSpring = spring({ frame: frame - 45, fps, config: SPRINGS.cinematic });
  const card1Spring = spring({ frame: frame - 120, fps, config: SPRINGS.snappy });
  const card2Spring = spring({ frame: frame - 220, fps, config: SPRINGS.snappy });
  const solutionSpring = spring({ frame: frame - 380, fps, config: SPRINGS.smooth });

  // Floating ambient movement
  const floatY = Math.sin(frame / 25) * 8;

  return (
    <AbsoluteFill
      style={{
        background: t.bgBase,
        fontFamily: t.textFont,
        color: t.ink,
        overflow: "hidden",
        padding: 80,
        boxSizing: "border-box",
      }}
    >
      {/* Loud, Authoritative Voiceover */}
      <Audio src={staticFile("audio_120s/act1_problem.mp3")} volume={1.3} />

      {/* Subtle Light Theme Ambient Light Circles */}
      <div
        style={{
          position: "absolute",
          top: -120,
          right: "10%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(214, 245, 236, 0.7) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -150,
          left: "5%",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(220, 203, 255, 0.6) 0%, transparent 70%)",
          filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />

      {/* Top Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          borderBottom: `1px solid ${t.rule}`,
          paddingBottom: 24,
          opacity: interpolate(frame, [0, 20], [0, 1]),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* 3-Blade SVG Logo */}
          <svg width="42" height="42" viewBox="0 0 40 40" fill="none">
            <defs>
              <linearGradient id="act1-blade-grad" x1="10.17" y1="-0.15" x2="29.83" y2="40.15" gradientUnits="userSpaceOnUse">
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
            <polygon points="13.42,3.36 21.27,3.36 9.89,36.38 2.97,36.38" fill="url(#act1-blade-grad)" />
            <polygon points="21.95,12.72 29.26,12.72 20.83,36.38 14.05,36.38" fill="url(#act1-blade-grad)" />
            <polygon points="30.06,20.78 36.77,20.78 31.18,36.38 24.78,36.38" fill="url(#act1-blade-grad)" />
          </svg>
          <span
            style={{
              fontFamily: t.displayFont,
              fontSize: 32,
              letterSpacing: "0.02em",
              color: t.ink,
            }}
          >
            Aegis
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.12em",
              color: t.inkMuted,
              textTransform: "uppercase",
              padding: "4px 8px",
              borderRadius: 6,
              background: "rgba(22, 18, 48, 0.05)",
            }}
          >
            Act 01 / The Crisis
          </span>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: `1px solid ${t.rule}`,
              background: t.raised,
              fontSize: 13,
              fontWeight: 500,
              color: t.inkMuted,
            }}
          >
            Elysium Orbit L2 • Chain 99801
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 60,
          alignItems: "center",
          marginTop: 40,
        }}
      >
        {/* Left Column: Problem Statement & Shock Stat */}
        <div
          style={{
            transform: `translateY(${(1 - titleSpring) * 30}px)`,
            opacity: titleSpring,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.15em",
              color: t.danger,
              textTransform: "uppercase",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: t.danger,
              }}
            />
            The Systemic DeFi Failure
          </div>

          <h1
            style={{
              fontFamily: t.displayFont,
              fontSize: 64,
              lineHeight: 1.08,
              color: t.ink,
              margin: 0,
              marginBottom: 24,
              fontWeight: 400,
            }}
          >
            $4.2 Billion Wiped Out in Forced Cascade Liquidations.
          </h1>

          <p
            style={{
              fontSize: 22,
              lineHeight: 1.5,
              color: t.inkMuted,
              maxWidth: 680,
              marginBottom: 36,
            }}
          >
            Traditional lending markets punish borrowers with brutal 8% to 15% liquidation penalties during sudden market wicks.
          </p>

          {/* Solution Callout Badge */}
          {frame > 360 && (
            <div
              style={{
                transform: `scale(${solutionSpring})`,
                opacity: solutionSpring,
                padding: "16px 24px",
                borderRadius: 16,
                border: `1px solid ${t.accent}44`,
                background: "rgba(7, 112, 95, 0.08)",
                display: "inline-flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: t.accent,
                  color: t.onAccent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 18,
                }}
              >
                ✓
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  The Paradigm Shift
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: t.ink }}>
                  What if your collateral could autonomously defend itself?
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Comparative Problem Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, transform: `translateY(${floatY}px)` }}>
          {/* Card 1: Traditional Protocol Failure */}
          <div
            style={{
              background: t.raised,
              borderRadius: 16,
              border: `1px solid ${t.danger}33`,
              padding: 28,
              transform: `translateX(${(1 - card1Spring) * 50}px)`,
              opacity: card1Spring,
              boxShadow: "0 10px 30px rgba(184, 37, 79, 0.06)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.danger, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Traditional Money Markets (Aave / Compound)
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.danger, padding: "2px 8px", background: "rgba(184, 37, 79, 0.1)", borderRadius: 6 }}>
                LIQUIDATED
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
              <span style={{ fontFamily: t.displayFont, fontSize: 38, color: t.ink, fontFeatureSettings: "'tnum'" }}>
                -10.0%
              </span>
              <span style={{ fontSize: 15, color: t.danger, fontWeight: 600 }}>
                Forced Seizure Penalty
              </span>
            </div>
            <div style={{ fontSize: 14, color: t.inkMuted }}>
              Borrower is wiped out during volatility. Third-party bots seize your underlying collateral at a steep discount.
            </div>
          </div>

          {/* Card 2: AEGIS Autonomous Defense */}
          <div
            style={{
              background: t.raised,
              borderRadius: 16,
              border: `1px solid ${t.accent}44`,
              padding: 28,
              transform: `translateX(${(1 - card2Spring) * 50}px)`,
              opacity: card2Spring,
              boxShadow: "0 10px 30px rgba(7, 112, 95, 0.06)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                AEGIS Protocol Sentinel
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.accent, padding: "2px 8px", background: "rgba(7, 112, 95, 0.1)", borderRadius: 6 }}>
                HELD THE LINE
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
              <span style={{ fontFamily: t.displayFont, fontSize: 38, color: t.ink, fontFeatureSettings: "'tnum'" }}>
                0.0%
              </span>
              <span style={{ fontSize: 15, color: t.accent, fontWeight: 600 }}>
                Zero Penalty • Non-Custodial Short
              </span>
            </div>
            <div style={{ fontSize: 14, color: t.inkMuted }}>
              High-frequency sentinels open an automated synthetic delta hedge on HyperCore, keeping net health factor flat.
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
