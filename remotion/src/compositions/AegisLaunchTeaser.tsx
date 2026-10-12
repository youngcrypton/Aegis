import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AegisLogo } from "../components/AegisLogo";
import { AEGIS_TOKENS } from "../theme";

export const AegisLaunchTeaser: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = AEGIS_TOKENS.dark;

  // Scene transition phases:
  // Phase 1: 0 - 50 frames (Title & Logo introduction)
  // Phase 2: 45 - 105 frames (Core Features & Precompile Specs)
  // Phase 3: 100 - 150 frames (Launch Callout & Live Links)

  const s1Fade = interpolate(frame, [0, 15, 42, 50], [0, 1, 1, 0]);
  const s2Fade = interpolate(frame, [45, 55, 98, 105], [0, 1, 1, 0]);
  const s3Fade = interpolate(frame, [100, 112, 145, 150], [0, 1, 1, 1]);

  // Springs for elements
  const card1Spring = spring({ frame: frame - 50, fps, config: { damping: 14 } });
  const card2Spring = spring({ frame: frame - 60, fps, config: { damping: 14 } });
  const card3Spring = spring({ frame: frame - 70, fps, config: { damping: 14 } });

  const finalSpring = spring({ frame: frame - 105, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill
      style={{
        background: t.bgBase,
        fontFamily: t.textFont,
        color: t.ink,
        overflow: "hidden",
      }}
    >
      {/* Background Ambient Aura Orbs */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "20%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(95, 217, 190, 0.12) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "20%",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201, 166, 255, 0.10) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />

      {/* Grid Pattern Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${t.rule} 1px, transparent 1px), linear-gradient(90deg, ${t.rule} 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          opacity: 0.35,
        }}
      />

      {/* Top Protocol Strip */}
      <div
        style={{
          position: "absolute",
          top: 48,
          left: 64,
          right: 64,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${t.rule}`,
          paddingBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <AegisLogo size={36} glow={false} />
          <span
            style={{
              fontFamily: t.displayFont,
              fontSize: 24,
              letterSpacing: "0.2em",
              color: t.ink,
              fontWeight: 600,
            }}
          >
            AEGIS
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: t.accent,
              background: "rgba(95, 217, 190, 0.1)",
              padding: "6px 14px",
              borderRadius: 20,
              border: `1px solid rgba(95, 217, 190, 0.3)`,
              fontWeight: 600,
            }}
          >
            Elysium L2 × HyperCore
          </span>
        </div>
      </div>

      {/* SCENE 1: Introduction (Frames 0 - 50) */}
      {s1Fade > 0 && (
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: s1Fade,
            transform: `scale(${interpolate(frame, [0, 50], [0.96, 1.02])})`,
          }}
        >
          <AegisLogo size={180} glow={true} />
          <h1
            style={{
              fontFamily: t.displayFont,
              fontSize: 72,
              letterSpacing: "0.12em",
              color: t.ink,
              marginTop: 32,
              marginBottom: 12,
              fontWeight: 500,
            }}
          >
            AEGIS
          </h1>
          <p
            style={{
              fontSize: 26,
              color: t.accent,
              fontWeight: 500,
              letterSpacing: "0.06em",
              marginBottom: 18,
            }}
          >
            Hedge Drawdowns. Never Get Liquidated.
          </p>
          <p
            style={{
              fontSize: 18,
              color: t.ink2,
              maxWidth: 760,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            The first autonomous risk engine turning forced liquidations into programmatic,
            delta-hedged profit unwinds.
          </p>
        </AbsoluteFill>
      )}

      {/* SCENE 2: Architectural Advantage (Frames 45 - 105) */}
      {s2Fade > 0 && (
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: s2Fade,
            padding: "0 100px",
          }}
        >
          <div
            style={{
              fontSize: 16,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: t.accent,
              marginBottom: 12,
              fontWeight: 600,
            }}
          >
            Sub-Second Autonomous Defense
          </div>
          <h2
            style={{
              fontFamily: t.displayFont,
              fontSize: 48,
              color: t.ink,
              marginBottom: 48,
              textAlign: "center",
            }}
          >
            Zero Spot Seizure. Zero Penalty Haircuts.
          </h2>

          <div
            style={{
              display: "flex",
              gap: 28,
              width: "100%",
              maxWidth: 1200,
            }}
          >
            {/* Card 1 */}
            <div
              style={{
                flex: 1,
                background: t.raised,
                border: `1px solid ${t.rule}`,
                borderRadius: 16,
                padding: "36px 28px",
                transform: `translateY(${interpolate(card1Spring, [0, 1], [40, 0])}px)`,
                opacity: card1Spring,
              }}
            >
              <div style={{ color: t.accent, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>
                PRECOMPILE 0x0801
              </div>
              <div style={{ fontFamily: t.displayFont, fontSize: 24, marginTop: 10, marginBottom: 8, color: t.ink }}>
                &lt;78ms Oracle
              </div>
              <p style={{ color: t.ink2, fontSize: 15, lineHeight: 1.5 }}>
                Direct HyperCore consensus memory read. Zero mempool delay, zero oracle frontrunning.
              </p>
            </div>

            {/* Card 2 */}
            <div
              style={{
                flex: 1,
                background: t.raised,
                border: `1px solid ${t.rule}`,
                borderRadius: 16,
                padding: "36px 28px",
                transform: `translateY(${interpolate(card2Spring, [0, 1], [40, 0])}px)`,
                opacity: card2Spring,
              }}
            >
              <div style={{ color: t.hedge, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>
                PREDEPLOY 0x0802
              </div>
              <div style={{ fontFamily: t.displayFont, fontSize: 24, marginTop: 10, marginBottom: 8, color: t.ink }}>
                CLOB Execution
              </div>
              <p style={{ color: t.ink2, fontSize: 15, lineHeight: 1.5 }}>
                Atomic short hedge dispatched directly to the L1 orderbook. Collateral stays 100% untouched.
              </p>
            </div>

            {/* Card 3 */}
            <div
              style={{
                flex: 1,
                background: t.raised,
                border: `1px solid ${t.rule}`,
                borderRadius: 16,
                padding: "36px 28px",
                transform: `translateY(${interpolate(card3Spring, [0, 1], [40, 0])}px)`,
                opacity: card3Spring,
              }}
            >
              <div style={{ color: t.violet, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>
                DYNAMIC UNWIND
              </div>
              <div style={{ fontFamily: t.displayFont, fontSize: 24, marginTop: 10, marginBottom: 8, color: t.ink }}>
                Trailing Take-Profit
              </div>
              <p style={{ color: t.ink2, fontSize: 15, lineHeight: 1.5 }}>
                Tracks the lowest wick trough. Buys back short on rebound; deposits USDC profit in vault.
              </p>
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* SCENE 3: Call to Action (Frames 100 - 150) */}
      {s3Fade > 0 && (
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: s3Fade,
            transform: `scale(${interpolate(finalSpring, [0, 1], [0.95, 1])})`,
          }}
        >
          <AegisLogo size={140} glow={true} />
          <h2
            style={{
              fontFamily: t.displayFont,
              fontSize: 54,
              color: t.ink,
              marginTop: 28,
              marginBottom: 12,
            }}
          >
            The Shield Is Live
          </h2>
          <p
            style={{
              fontSize: 20,
              color: t.accent,
              marginBottom: 32,
              fontWeight: 500,
            }}
          >
            1-Click Lite Auto-Pilot &amp; Quantitative Pro Terminal
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              background: t.raised,
              border: `1px solid ${t.rule}`,
              borderRadius: 30,
              padding: "14px 32px",
            }}
          >
            <span style={{ fontSize: 18, color: t.ink2 }}>Official Portal:</span>
            <span
              style={{
                fontFamily: t.displayFont,
                fontSize: 22,
                color: t.accent,
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              aegis.trade
            </span>
          </div>

          <div
            style={{
              marginTop: 36,
              fontSize: 14,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: t.ink2,
            }}
          >
            More updates rolling out soon
          </div>
        </AbsoluteFill>
      )}

      {/* Bottom Legal / Version Watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: 64,
          right: 64,
          display: "flex",
          justifyContent: "space-between",
          color: t.ink2,
          fontSize: 13,
          borderTop: `1px solid ${t.rule}`,
          paddingTop: 16,
        }}
      >
        <span>Invariant INV-1 Verified &bull; Non-Custodial Session Keys</span>
        <span>HyperCore &bull; Elysium L2 Testnet</span>
      </div>
    </AbsoluteFill>
  );
};
