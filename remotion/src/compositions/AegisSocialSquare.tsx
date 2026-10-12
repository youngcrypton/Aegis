import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AegisLogo } from "../components/AegisLogo";
import { AEGIS_TOKENS } from "../theme";

export const AegisSocialSquare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = AEGIS_TOKENS.dark;

  // Staggered springs for entrance
  const logoSpring = spring({ frame: frame - 5, fps, config: { damping: 14 } });
  const titleSpring = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const metricsSpring = spring({ frame: frame - 28, fps, config: { damping: 14 } });

  // Breathing effect on logo
  const logoScale = interpolate(
    Math.sin((frame / 30) * Math.PI),
    [-1, 1],
    [0.98, 1.02]
  );

  return (
    <AbsoluteFill
      style={{
        background: t.bgBase,
        fontFamily: t.textFont,
        color: t.ink,
        overflow: "hidden",
        padding: 56,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: "absolute",
          top: "25%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(95, 217, 190, 0.16) 0%, rgba(105, 40, 237, 0.10) 50%, transparent 75%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      {/* Top Header */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${t.rule}`,
          paddingBottom: 20,
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontFamily: t.displayFont,
            fontSize: 22,
            letterSpacing: "0.2em",
            fontWeight: 600,
            color: t.ink,
          }}
        >
          AEGIS
        </span>
        <span
          style={{
            fontSize: 12,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: t.accent,
            border: `1px solid rgba(95, 217, 190, 0.3)`,
            background: "rgba(95, 217, 190, 0.08)",
            padding: "4px 12px",
            borderRadius: 16,
            fontWeight: 600,
          }}
        >
          ELYSIUM L2 &bull; 99801
        </span>
      </div>

      {/* Center Hero */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          zIndex: 2,
        }}
      >
        <div
          style={{
            transform: `scale(${interpolate(logoSpring, [0, 1], [0.8, 1]) * logoScale})`,
            opacity: logoSpring,
          }}
        >
          <AegisLogo size={160} glow={true} />
        </div>

        <h1
          style={{
            fontFamily: t.displayFont,
            fontSize: 52,
            letterSpacing: "0.08em",
            marginTop: 28,
            marginBottom: 8,
            color: t.ink,
            opacity: titleSpring,
            transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)`,
          }}
        >
          AUTONOMOUS DEFENSE
        </h1>

        <p
          style={{
            fontSize: 20,
            color: t.accent,
            fontWeight: 500,
            marginBottom: 36,
            opacity: titleSpring,
          }}
        >
          Hedge Drawdowns. Never Get Liquidated.
        </p>

        {/* 2x2 Feature Matrix */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            width: "100%",
            maxWidth: 820,
            opacity: metricsSpring,
            transform: `translateY(${interpolate(metricsSpring, [0, 1], [30, 0])}px)`,
          }}
        >
          <div
            style={{
              background: t.raised,
              border: `1px solid ${t.rule}`,
              borderRadius: 14,
              padding: "20px 24px",
              textAlign: "left",
            }}
          >
            <div style={{ color: t.accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>
              0x0801 PRECOMPILE
            </div>
            <div style={{ fontFamily: t.displayFont, fontSize: 20, marginTop: 4, color: t.ink }}>
              &lt;78ms Oracle Speed
            </div>
          </div>

          <div
            style={{
              background: t.raised,
              border: `1px solid ${t.rule}`,
              borderRadius: 14,
              padding: "20px 24px",
              textAlign: "left",
            }}
          >
            <div style={{ color: t.hedge, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>
              0x0802 PREDEPLOY
            </div>
            <div style={{ fontFamily: t.displayFont, fontSize: 20, marginTop: 4, color: t.ink }}>
              Atomic CLOB Short
            </div>
          </div>

          <div
            style={{
              background: t.raised,
              border: `1px solid ${t.rule}`,
              borderRadius: 14,
              padding: "20px 24px",
              textAlign: "left",
            }}
          >
            <div style={{ color: t.violet, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>
              TRAILING UNWIND
            </div>
            <div style={{ fontFamily: t.displayFont, fontSize: 20, marginTop: 4, color: t.ink }}>
              Bottom-Wick Profit
            </div>
          </div>

          <div
            style={{
              background: t.raised,
              border: `1px solid ${t.rule}`,
              borderRadius: 14,
              padding: "20px 24px",
              textAlign: "left",
            }}
          >
            <div style={{ color: t.accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>
              INVARIANT INV-1
            </div>
            <div style={{ fontFamily: t.displayFont, fontSize: 20, marginTop: 4, color: t.ink }}>
              Zero Collateral Custody
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: `1px solid ${t.rule}`,
          paddingTop: 18,
          zIndex: 2,
        }}
      >
        <span style={{ fontSize: 14, color: t.ink2 }}>Official Portal</span>
        <span
          style={{
            fontFamily: t.displayFont,
            fontSize: 18,
            color: t.accent,
            fontWeight: 600,
            letterSpacing: "0.05em",
          }}
        >
          aegis.trade
        </span>
      </div>
    </AbsoluteFill>
  );
};
