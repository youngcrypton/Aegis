import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AEGIS_THEME, SPRINGS } from "../theme";
import { BackgroundGrid } from "../components/BackgroundGrid";

export const Scene2Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring
  const enterSpring = spring({
    frame,
    fps,
    config: SPRINGS.smooth,
  });
  const enterY = interpolate(enterSpring, [0, 1], [40, 0]);
  const enterOp = interpolate(enterSpring, [0, 1], [0, 1]);

  // Section title reveal
  const titleSpring = spring({
    frame: frame - 15,
    fps,
    config: SPRINGS.snappy,
  });
  const titleOp = interpolate(titleSpring, [0, 1], [0, 1]);

  // Flash crash animation on traditional card (frame 100 to 220)
  const crashProgress = interpolate(frame, [90, 160], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const traditionalH = interpolate(crashProgress, [0, 1], [1.12, 0.96]);
  const isLiquidated = frame >= 170;

  // Aegis solution reveal (frame 220 to 360)
  const solutionSpring = spring({
    frame: frame - 210,
    fps,
    config: SPRINGS.smooth,
  });
  const solutionX = interpolate(solutionSpring, [0, 1], [40, 0]);
  const solutionOp = interpolate(solutionSpring, [0, 1], [0, 1]);

  // Exit transition (frame 380 to 420)
  const exitOp = interpolate(frame, [380, 420], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
        opacity: exitOp,
      }}
    >
      <BackgroundGrid activeAlert={frame > 120 && frame < 220} />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: 1400,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: enterOp,
          transform: `translateY(${enterY}px)`,
        }}
      >
        {/* Category Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
            opacity: titleOp,
          }}
        >
          <span
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              background: "rgba(239, 68, 68, 0.15)",
              border: `1px solid ${AEGIS_THEME.danger}44`,
              color: AEGIS_THEME.danger,
              fontFamily: AEGIS_THEME.textFont,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            The Structural DeFi Flaw
          </span>
          <span
            style={{
              color: AEGIS_THEME.inkMuted,
              fontFamily: AEGIS_THEME.textFont,
              fontSize: 14,
            }}
          >
            Cascade Liquidation Vulnerability
          </span>
        </div>

        <h2
          style={{
            fontFamily: AEGIS_THEME.displayFont,
            fontSize: 48,
            color: AEGIS_THEME.ink,
            margin: "0 0 42px 0",
            textAlign: "center",
            letterSpacing: "0.02em",
          }}
        >
          Forced Collateral Auctions Destroy Borrower Equity
        </h2>

        {/* Side-by-side comparison */}
        <div
          style={{
            display: "flex",
            gap: 32,
            width: "100%",
            justifyContent: "center",
          }}
        >
          {/* Card 1: Traditional Protocol (Collapsing) */}
          <div
            style={{
              flex: 1,
              maxWidth: 580,
              background: isLiquidated
                ? "rgba(45, 14, 22, 0.85)"
                : "rgba(14, 23, 38, 0.85)",
              border: isLiquidated
                ? `1px solid ${AEGIS_THEME.danger}`
                : `1px solid ${AEGIS_THEME.rule}`,
              borderRadius: 16,
              padding: 32,
              backdropFilter: "blur(12px)",
              transition: "all 0.3s ease",
              boxShadow: isLiquidated
                ? "0 12px 40px rgba(239, 68, 68, 0.2)"
                : "0 12px 32px rgba(0,0,0,0.4)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
                borderBottom: `1px solid ${AEGIS_THEME.rule}`,
                paddingBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    color: AEGIS_THEME.ink,
                    fontFamily: AEGIS_THEME.textFont,
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  Standard Lending Protocol
                </div>
                <div
                  style={{
                    color: AEGIS_THEME.inkMuted,
                    fontSize: 13,
                    fontFamily: AEGIS_THEME.textFont,
                  }}
                >
                  Aave / Compound Mechanics
                </div>
              </div>

              <div
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: isLiquidated
                    ? "rgba(239, 68, 68, 0.2)"
                    : "rgba(245, 158, 11, 0.15)",
                  color: isLiquidated ? AEGIS_THEME.danger : AEGIS_THEME.hedge,
                  fontFamily: AEGIS_THEME.textFont,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {isLiquidated ? "FORCED LIQUIDATION" : "AT RISK"}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: AEGIS_THEME.inkMuted, fontSize: 14 }}>
                  Collateral Value:
                </span>
                <span
                  style={{
                    color: AEGIS_THEME.ink,
                    fontWeight: 600,
                    fontFeatureSettings: "'tnum'",
                  }}
                >
                  {isLiquidated ? "$0.00 (Seized & Sold)" : "$8,250 USD (-18%)"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: AEGIS_THEME.inkMuted, fontSize: 14 }}>
                  Health Factor (H):
                </span>
                <span
                  style={{
                    color: isLiquidated
                      ? AEGIS_THEME.danger
                      : AEGIS_THEME.hedge,
                    fontWeight: 700,
                    fontFeatureSettings: "'tnum'",
                  }}
                >
                  {traditionalH.toFixed(2)} {isLiquidated && "(BREACHED < 1.00)"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: AEGIS_THEME.inkMuted, fontSize: 14 }}>
                  Penalty Surcharge:
                </span>
                <span
                  style={{
                    color: AEGIS_THEME.danger,
                    fontWeight: 700,
                  }}
                >
                  -10.0% Lost to Liquidator Bot
                </span>
              </div>

              <div
                style={{
                  marginTop: 14,
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "rgba(0,0,0,0.3)",
                  border: `1px solid ${AEGIS_THEME.danger}44`,
                  color: isLiquidated ? "#fca5a5" : AEGIS_THEME.inkMuted,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {isLiquidated
                  ? "Collateral dumped onto DEX orderbooks at market trough. Borrower equity permanently destroyed."
                  : "Price drop triggers liquidation threshold. Searcher bots racing in mempool."}
              </div>
            </div>
          </div>

          {/* Card 2: AEGIS Autonomous Delta Shield */}
          <div
            style={{
              flex: 1,
              maxWidth: 580,
              background: "rgba(14, 23, 38, 0.85)",
              border: `1px solid ${AEGIS_THEME.accent}88`,
              borderRadius: 16,
              padding: 32,
              backdropFilter: "blur(12px)",
              boxShadow: "0 12px 40px rgba(16, 185, 129, 0.15)",
              transform: `translateX(${solutionX}px)`,
              opacity: solutionOp,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
                borderBottom: `1px solid ${AEGIS_THEME.rule}`,
                paddingBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    color: AEGIS_THEME.ink,
                    fontFamily: AEGIS_THEME.textFont,
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  AEGIS Synthetic Delta Shield
                </div>
                <div
                  style={{
                    color: AEGIS_THEME.accent,
                    fontSize: 13,
                    fontFamily: AEGIS_THEME.textFont,
                  }}
                >
                  Autonomous Sentinel Protection
                </div>
              </div>

              <div
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: "rgba(16, 185, 129, 0.15)",
                  color: AEGIS_THEME.accent,
                  fontFamily: AEGIS_THEME.textFont,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                HOLD THE LINE
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: AEGIS_THEME.inkMuted, fontSize: 14 }}>
                  Vault Collateral:
                </span>
                <span
                  style={{
                    color: AEGIS_THEME.accent,
                    fontWeight: 600,
                  }}
                >
                  100% Locked &amp; Intact (Zero Seizure)
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: AEGIS_THEME.inkMuted, fontSize: 14 }}>
                  Counterbalancing Hedge:
                </span>
                <span
                  style={{
                    color: AEGIS_THEME.ink,
                    fontWeight: 700,
                  }}
                >
                  Short HyperCore Perpetual
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: AEGIS_THEME.inkMuted, fontSize: 14 }}>
                  Net Portfolio Delta:
                </span>
                <span
                  style={{
                    color: AEGIS_THEME.accent,
                    fontWeight: 700,
                  }}
                >
                  Δ = 0.00 (Fully Neutralized)
                </span>
              </div>

              <div
                style={{
                  marginTop: 14,
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "rgba(16, 185, 129, 0.08)",
                  border: `1px solid ${AEGIS_THEME.accent}44`,
                  color: AEGIS_THEME.ink,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                Never dump collateral into crashes. Neutralize downside delta instantly on HyperCore and preserve borrower assets until recovery.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
