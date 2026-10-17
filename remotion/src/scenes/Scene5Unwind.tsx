import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AEGIS_THEME, SPRINGS } from "../theme";
import { BackgroundGrid } from "../components/BackgroundGrid";
import { ConcentricGauge } from "../components/ConcentricGauge";

export const Scene5Unwind: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // V-Bounce recovery starts at frame 30
  const bounceProgress = interpolate(frame, [30, 140], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Price rebounds from $67.65 to $79.80
  const currentPrice = interpolate(bounceProgress, [0, 1], [67.65, 79.8]);

  // Health factor recovers from 1.12 to 1.45
  const currentH = interpolate(bounceProgress, [0, 1], [1.12, 1.45]);

  // Profit count up: 0 to 48,250
  const profitProgress = interpolate(frame, [80, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const savedAmount = Math.round(interpolate(profitProgress, [0, 1], [0, 48250]));

  // Unwind complete badge at frame 160
  const completeSpring = spring({
    frame: frame - 150,
    fps,
    config: SPRINGS.snappy,
  });
  const completeScale = interpolate(completeSpring, [0, 1], [0.85, 1.0]);
  const completeOp = interpolate(completeSpring, [0, 1], [0, 1]);

  // Exit transition (frame 320 to 360)
  const exitOpacity = interpolate(frame, [320, 360], [1, 0], {
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
        opacity: exitOpacity,
      }}
    >
      <BackgroundGrid />

      {/* Main Terminal Window */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: 1440,
          background: "rgba(10, 15, 24, 0.94)",
          border: `1px solid ${AEGIS_THEME.accent}`,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(16, 185, 129, 0.2)",
        }}
      >
        {/* Success Banner */}
        <div
          style={{
            height: 48,
            padding: "0 28px",
            background: "rgba(16, 185, 129, 0.18)",
            borderBottom: `1px solid ${AEGIS_THEME.accent}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: AEGIS_THEME.accent,
                boxShadow: `0 0 10px ${AEGIS_THEME.accent}`,
              }}
            />
            <span
              style={{
                fontFamily: AEGIS_THEME.textFont,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: AEGIS_THEME.accent,
                textTransform: "uppercase",
              }}
            >
              TRAILING TAKE-PROFIT UNWOUND • BORROWER EQUITY FULLY RESTORED
            </span>
          </div>

          <div
            style={{
              fontFamily: AEGIS_THEME.textFont,
              fontSize: 12,
              fontWeight: 600,
              color: AEGIS_THEME.ink,
            }}
          >
            Trailing Offset: <strong>τ = 1.5%</strong> • Invariant <strong>INV-2 Monotonic PASS</strong>
          </div>
        </div>

        {/* Dashboard Content */}
        <div style={{ padding: 32, display: "flex", gap: 28 }}>
          {/* Left Column: Settlement Summary */}
          <div
            style={{
              flex: 1.4,
              background: AEGIS_THEME.cardGlass,
              border: `1px solid ${AEGIS_THEME.rule}`,
              borderRadius: 16,
              padding: 28,
              backdropFilter: "blur(12px)",
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
                <h3
                  style={{
                    fontFamily: AEGIS_THEME.displayFont,
                    fontSize: 26,
                    color: AEGIS_THEME.ink,
                    margin: 0,
                  }}
                >
                  Position Recovery Complete
                </h3>
                <span style={{ color: AEGIS_THEME.accent, fontSize: 13, fontWeight: 600 }}>
                  AegisVault.sol Unwind Invariant Executed
                </span>
              </div>

              <div
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  background: "rgba(16, 185, 129, 0.2)",
                  color: AEGIS_THEME.accent,
                  fontFamily: AEGIS_THEME.textFont,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                100% SOLVENT
              </div>
            </div>

            {/* Metrics Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 18,
                marginBottom: 24,
              }}
            >
              {/* Metric: Capital Saved */}
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.12)",
                  border: `1px solid ${AEGIS_THEME.accent}55`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ color: AEGIS_THEME.accent, fontSize: 13, fontWeight: 600 }}>
                  Liquidation Losses Averted
                </div>
                <div
                  style={{
                    color: AEGIS_THEME.accent,
                    fontSize: 28,
                    fontWeight: 700,
                    marginTop: 4,
                    fontFeatureSettings: "'tnum'",
                  }}
                >
                  +${savedAmount.toLocaleString()} USD
                </div>
                <div style={{ color: AEGIS_THEME.ink, fontSize: 12, marginTop: 2 }}>
                  10% Auction Penalty Spared
                </div>
              </div>

              {/* Metric: Rebounded Mark */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${AEGIS_THEME.ruleSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ color: AEGIS_THEME.inkMuted, fontSize: 13 }}>
                  V-Rebound L1 Mark Price
                </div>
                <div
                  style={{
                    color: AEGIS_THEME.ink,
                    fontSize: 28,
                    fontWeight: 700,
                    marginTop: 4,
                    fontFeatureSettings: "'tnum'",
                  }}
                >
                  ${currentPrice.toFixed(2)} USD
                </div>
                <div style={{ color: AEGIS_THEME.accent, fontSize: 12, marginTop: 2 }}>
                  Market Stabilized
                </div>
              </div>

              {/* Metric: Collateral */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${AEGIS_THEME.ruleSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ color: AEGIS_THEME.inkMuted, fontSize: 13 }}>
                  Vault Collateral
                </div>
                <div
                  style={{
                    color: AEGIS_THEME.ink,
                    fontSize: 24,
                    fontWeight: 700,
                    marginTop: 4,
                  }}
                >
                  0.1000 WHYPE
                </div>
                <div style={{ color: AEGIS_THEME.accent, fontSize: 12, marginTop: 2 }}>
                  Zero Collateral Sold
                </div>
              </div>

              {/* Metric: Closed Hedge */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${AEGIS_THEME.ruleSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ color: AEGIS_THEME.inkMuted, fontSize: 13 }}>
                  Hedge Status
                </div>
                <div
                  style={{
                    color: AEGIS_THEME.accent,
                    fontSize: 24,
                    fontWeight: 700,
                    marginTop: 4,
                  }}
                >
                  CLOSED IN PROFIT
                </div>
                <div style={{ color: AEGIS_THEME.inkMuted, fontSize: 12, marginTop: 2 }}>
                  Cash Inflow Routed to Vault
                </div>
              </div>
            </div>

            {/* Invariant Restoration Banner */}
            <div
              style={{
                opacity: completeOp,
                transform: `scale(${completeScale})`,
                padding: "16px 20px",
                borderRadius: 12,
                background: "rgba(16, 185, 129, 0.15)",
                border: `1px solid ${AEGIS_THEME.accent}66`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: AEGIS_THEME.textFont,
                    fontWeight: 700,
                    color: AEGIS_THEME.accent,
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Invariant INV-2 Verified: Monotonic Health Factor Restoration
                </div>
                <div
                  style={{
                    color: AEGIS_THEME.ink,
                    fontSize: 12,
                    marginTop: 3,
                  }}
                >
                  H_post (1.45) &gt; H_pre (1.12). Hedge closed at profitable trough; debt paid down. User retains 100% upside.
                </div>
              </div>

              <div
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: "rgba(16, 185, 129, 0.25)",
                  color: AEGIS_THEME.accent,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                VERIFIED
              </div>
            </div>
          </div>

          {/* Right Column: Safe Gauge */}
          <div
            style={{
              flex: 1,
              background: AEGIS_THEME.cardGlass,
              border: `1px solid ${AEGIS_THEME.rule}`,
              borderRadius: 16,
              padding: 28,
              backdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                color: AEGIS_THEME.accent,
                fontFamily: AEGIS_THEME.textFont,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Solvency Restored to Safe Zone
            </div>

            <ConcentricGauge
              healthFactor={currentH}
              size={360}
              statusLabel={`H = ${currentH.toFixed(2)} (Deep Safe Buffer: +$42.40)`}
            />

            <div
              style={{
                marginTop: 20,
                padding: "10px 16px",
                borderRadius: 8,
                background: "rgba(16, 185, 129, 0.12)",
                border: `1px solid ${AEGIS_THEME.accent}44`,
                color: AEGIS_THEME.accent,
                fontSize: 12,
                fontWeight: 600,
                textAlign: "center",
                fontFamily: AEGIS_THEME.textFont,
              }}
            >
              Defense Completed with Zero Collateral Sold
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
