import React from "react";
import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AegisLogo } from "../components/AegisLogo";
import { AEGIS_TOKENS } from "../theme";

export const AegisLaunchLight: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = AEGIS_TOKENS.light;

  // Scene transitions:
  // Scene 1: 0 - 50 frames (Logo & Protocol Name)
  // Scene 2: 45 - 105 frames (Core Features & Precompile Specs)
  // Scene 3: 100 - 150 frames (Launch Call to Action & Website)

  const s1Fade = interpolate(frame, [0, 14, 42, 50], [0, 1, 1, 0]);
  const s2Fade = interpolate(frame, [45, 54, 98, 105], [0, 1, 1, 0]);
  const s3Fade = interpolate(frame, [100, 110, 145, 150], [0, 1, 1, 1]);

  const card1Spring = spring({ frame: frame - 50, fps, config: { damping: 14 } });
  const card2Spring = spring({ frame: frame - 58, fps, config: { damping: 14 } });
  const card3Spring = spring({ frame: frame - 66, fps, config: { damping: 14 } });
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
      {/* Audio Sound Effect */}
      <Audio src={staticFile("aegis-launch-sound.wav")} />

      {/* Light Theme Ambient Auroras */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: "15%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(214, 245, 236, 0.7) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          right: "15%",
          width: 550,
          height: 550,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(220, 203, 255, 0.6) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Subtle Grid Lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${t.rule} 1px, transparent 1px), linear-gradient(90deg, ${t.rule} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          opacity: 0.5,
        }}
      />

      {/* Top Header Strip */}
      <div
        style={{
          position: "absolute",
          top: 32,
          left: 48,
          right: 48,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${t.rule}`,
          paddingBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <AegisLogo size={32} glow={false} />
          <span
            style={{
              fontFamily: t.displayFont,
              fontSize: 22,
              letterSpacing: "0.2em",
              color: t.ink,
              fontWeight: 600,
            }}
          >
            AEGIS
          </span>
        </div>
        <div>
          <span
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: t.accent,
              background: "rgba(7, 112, 95, 0.08)",
              padding: "5px 14px",
              borderRadius: 20,
              border: `1px solid rgba(7, 112, 95, 0.25)`,
              fontWeight: 600,
            }}
          >
            Elysium L2 &bull; HyperCore
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
          <AegisLogo size={140} glow={true} />
          <h1
            style={{
              fontFamily: t.displayFont,
              fontSize: 60,
              letterSpacing: "0.12em",
              color: t.ink,
              marginTop: 24,
              marginBottom: 10,
              fontWeight: 500,
            }}
          >
            AEGIS
          </h1>
          <p
            style={{
              fontSize: 22,
              color: t.accent,
              fontWeight: 600,
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            Hedge Drawdowns. Never Get Liquidated.
          </p>
          <p
            style={{
              fontSize: 16,
              color: t.ink2,
              maxWidth: 680,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Autonomous sub-second liquidation protection engineered on HyperCore and Elysium L2.
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
            padding: "0 60px",
          }}
        >
          <div
            style={{
              fontSize: 14,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: t.accent,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            Autonomous Protocol Defense
          </div>
          <h2
            style={{
              fontFamily: t.displayFont,
              fontSize: 38,
              color: t.ink,
              marginBottom: 36,
              textAlign: "center",
            }}
          >
            Zero Spot Seizure. Zero Penalty Haircuts.
          </h2>

          <div
            style={{
              display: "flex",
              gap: 20,
              width: "100%",
              maxWidth: 1000,
            }}
          >
            {/* Card 1 */}
            <div
              style={{
                flex: 1,
                background: t.raised,
                border: `1px solid ${t.rule}`,
                boxShadow: "0 8px 24px rgba(22, 18, 48, 0.06)",
                borderRadius: 14,
                padding: "26px 22px",
                transform: `translateY(${interpolate(card1Spring, [0, 1], [30, 0])}px)`,
                opacity: card1Spring,
              }}
            >
              <div style={{ color: t.accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>
                PRECOMPILE 0x0801
              </div>
              <div style={{ fontFamily: t.displayFont, fontSize: 20, marginTop: 8, marginBottom: 6, color: t.ink }}>
                &lt;78ms Oracle
              </div>
              <p style={{ color: t.ink2, fontSize: 13, lineHeight: 1.45 }}>
                Direct HyperCore consensus memory read. Zero mempool delay, zero frontrunning.
              </p>
            </div>

            {/* Card 2 */}
            <div
              style={{
                flex: 1,
                background: t.raised,
                border: `1px solid ${t.rule}`,
                boxShadow: "0 8px 24px rgba(22, 18, 48, 0.06)",
                borderRadius: 14,
                padding: "26px 22px",
                transform: `translateY(${interpolate(card2Spring, [0, 1], [30, 0])}px)`,
                opacity: card2Spring,
              }}
            >
              <div style={{ color: t.hedge, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>
                PREDEPLOY 0x0802
              </div>
              <div style={{ fontFamily: t.displayFont, fontSize: 20, marginTop: 8, marginBottom: 6, color: t.ink }}>
                CLOB Execution
              </div>
              <p style={{ color: t.ink2, fontSize: 13, lineHeight: 1.45 }}>
                Atomic short hedge dispatched directly to the L1 orderbook. Collateral stays untouched.
              </p>
            </div>

            {/* Card 3 */}
            <div
              style={{
                flex: 1,
                background: t.raised,
                border: `1px solid ${t.rule}`,
                boxShadow: "0 8px 24px rgba(22, 18, 48, 0.06)",
                borderRadius: 14,
                padding: "26px 22px",
                transform: `translateY(${interpolate(card3Spring, [0, 1], [30, 0])}px)`,
                opacity: card3Spring,
              }}
            >
              <div style={{ color: t.violet, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>
                DYNAMIC UNWIND
              </div>
              <div style={{ fontFamily: t.displayFont, fontSize: 20, marginTop: 8, marginBottom: 6, color: t.ink }}>
                Trailing Take-Profit
              </div>
              <p style={{ color: t.ink2, fontSize: 13, lineHeight: 1.45 }}>
                Tracks bottom-wick trough. Closes short on rebound; deposits USDC profit in vault.
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
          <AegisLogo size={120} glow={true} />
          <h2
            style={{
              fontFamily: t.displayFont,
              fontSize: 44,
              color: t.ink,
              marginTop: 22,
              marginBottom: 8,
            }}
          >
            The Shield Is Live
          </h2>
          <p
            style={{
              fontSize: 18,
              color: t.accent,
              marginBottom: 26,
              fontWeight: 600,
            }}
          >
            1-Click Lite Auto-Pilot &amp; Quantitative Pro Terminal
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: t.raised,
              border: `1px solid ${t.rule}`,
              boxShadow: "0 10px 30px rgba(22, 18, 48, 0.08)",
              borderRadius: 30,
              padding: "12px 28px",
            }}
          >
            <span style={{ fontSize: 16, color: t.ink2 }}>Official Portal:</span>
            <span
              style={{
                fontFamily: t.displayFont,
                fontSize: 20,
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
              marginTop: 26,
              fontSize: 13,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: t.ink2,
              fontWeight: 500,
            }}
          >
            More updates rolling out soon
          </div>
        </AbsoluteFill>
      )}

      {/* Bottom Legal Strip */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 48,
          right: 48,
          display: "flex",
          justifyContent: "space-between",
          color: t.ink2,
          fontSize: 12,
          borderTop: `1px solid ${t.rule}`,
          paddingTop: 12,
        }}
      >
        <span>Invariant INV-1 Verified &bull; Non-Custodial Session Keys</span>
        <span>HyperCore &bull; Elysium L2 Testnet</span>
      </div>
    </AbsoluteFill>
  );
};
