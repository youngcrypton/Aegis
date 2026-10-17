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

export const Scene4FlashCrash: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Crash starts at frame 40
  const crashProgress = interpolate(frame, [40, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Camera subtle shake during crash
  const shakeIntensity = interpolate(frame, [50, 110], [0, 6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }) * interpolate(frame, [110, 180], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shakeX = Math.sin(frame * 0.8) * shakeIntensity;
  const shakeY = Math.cos(frame * 0.7) * shakeIntensity;

  // Price plunges from $82.50 to $67.65
  const currentPrice = interpolate(crashProgress, [0, 1], [82.5, 67.65]);

  // Health Factor plunges from 1.41 to 1.12
  const currentH = interpolate(crashProgress, [0, 1], [1.41, 1.12]);

  // Sentinel trigger fires around frame 130
  const isTriggered = frame >= 130;
  const triggerSpring = spring({
    frame: frame - 130,
    fps,
    config: SPRINGS.snappy,
  });
  const triggerScale = interpolate(triggerSpring, [0, 1], [0.8, 1.0]);
  const triggerOp = interpolate(triggerSpring, [0, 1], [0, 1]);

  // Invariant badge pops at frame 240
  const invSpring = spring({
    frame: frame - 230,
    fps,
    config: SPRINGS.smooth,
  });
  const invY = interpolate(invSpring, [0, 1], [30, 0]);
  const invOp = interpolate(invSpring, [0, 1], [0, 1]);

  // Exit transition (frame 620 to 660)
  const exitOpacity = interpolate(frame, [620, 660], [1, 0], {
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
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      }}
    >
      <BackgroundGrid activeAlert={frame >= 60} />

      {/* Main Terminal Window */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: 1440,
          background: "rgba(10, 15, 24, 0.94)",
          border: isTriggered
            ? `1px solid ${AEGIS_THEME.hedge}`
            : `1px solid ${AEGIS_THEME.danger}88`,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: isTriggered
            ? "0 24px 80px rgba(245, 158, 11, 0.2)"
            : "0 24px 80px rgba(239, 68, 68, 0.25)",
          transition: "border 0.3s ease, box-shadow 0.3s ease",
        }}
      >
        {/* Alert Banner */}
        <div
          style={{
            height: 48,
            padding: "0 28px",
            background: frame >= 60 && !isTriggered
              ? "rgba(239, 68, 68, 0.25)"
              : "rgba(245, 158, 11, 0.2)",
            borderBottom: `1px solid ${isTriggered ? AEGIS_THEME.hedge : AEGIS_THEME.danger}`,
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
                background: isTriggered ? AEGIS_THEME.hedge : AEGIS_THEME.danger,
                boxShadow: `0 0 10px ${isTriggered ? AEGIS_THEME.hedge : AEGIS_THEME.danger}`,
              }}
            />
            <span
              style={{
                fontFamily: AEGIS_THEME.textFont,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: isTriggered ? AEGIS_THEME.hedge : AEGIS_THEME.danger,
                textTransform: "uppercase",
              }}
            >
              {isTriggered
                ? "HIGH-FREQUENCY DELTA HEDGE DISPATCHED ON HYPERCORE CLOB"
                : "MARKET ANOMALY DETECTED: -18% VOLATILITY CRASH IN PROGRESS"}
            </span>
          </div>

          <div
            style={{
              fontFamily: AEGIS_THEME.textFont,
              fontSize: 12,
              fontWeight: 600,
              color: AEGIS_THEME.ink,
              fontFeatureSettings: "'tnum'",
            }}
          >
            Match Latency: <strong>72ms</strong> • Slippage: <strong>0.02%</strong>
          </div>
        </div>

        {/* Dashboard Content */}
        <div style={{ padding: 32, display: "flex", gap: 28 }}>
          {/* Left Column: Live Hedge Execution Card */}
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
                  Flash Crash Defense Active
                </h3>
                <span style={{ color: AEGIS_THEME.inkMuted, fontSize: 13 }}>
                  Live Execution via AgentDispatchAdapter.sol
                </span>
              </div>

              <div
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  background: isTriggered
                    ? "rgba(245, 158, 11, 0.2)"
                    : "rgba(239, 68, 68, 0.2)",
                  color: isTriggered ? AEGIS_THEME.hedge : AEGIS_THEME.danger,
                  fontFamily: AEGIS_THEME.textFont,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {isTriggered ? "HEDGE POSITION OPEN" : "THRESHOLD TRIGGERED"}
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
                  100% Intact (0 Withdrawn)
                </div>
              </div>

              {/* Metric: Crashed Price */}
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  border: `1px solid ${AEGIS_THEME.danger}44`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ color: AEGIS_THEME.danger, fontSize: 13, fontWeight: 600 }}>
                  Live L1 Mark Price
                </div>
                <div
                  style={{
                    color: AEGIS_THEME.danger,
                    fontSize: 24,
                    fontWeight: 700,
                    marginTop: 4,
                    fontFeatureSettings: "'tnum'",
                  }}
                >
                  ${currentPrice.toFixed(2)} USD
                </div>
                <div style={{ color: AEGIS_THEME.danger, fontSize: 12, marginTop: 2 }}>
                  -18.00% Flash Drop
                </div>
              </div>

              {/* Metric: Hedge Position */}
              <div
                style={{
                  background: isTriggered
                    ? "rgba(245, 158, 11, 0.1)"
                    : "rgba(255, 255, 255, 0.03)",
                  border: isTriggered
                    ? `1px solid ${AEGIS_THEME.hedge}66`
                    : `1px solid ${AEGIS_THEME.ruleSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                  transform: isTriggered ? `scale(${triggerScale})` : "scale(1)",
                  opacity: isTriggered ? triggerOp : 0.6,
                }}
              >
                <div style={{ color: AEGIS_THEME.inkMuted, fontSize: 13 }}>
                  Active Short Hedge
                </div>
                <div
                  style={{
                    color: isTriggered ? AEGIS_THEME.hedge : AEGIS_THEME.inkMuted,
                    fontSize: 24,
                    fontWeight: 700,
                    marginTop: 4,
                  }}
                >
                  {isTriggered ? "500 HYPE Short" : "Routing..."}
                </div>
                <div style={{ color: AEGIS_THEME.inkMuted, fontSize: 12, marginTop: 2 }}>
                  HyperCore Perp @ $67.65
                </div>
              </div>

              {/* Metric: Net Delta */}
              <div
                style={{
                  background: isTriggered
                    ? "rgba(16, 185, 129, 0.1)"
                    : "rgba(255, 255, 255, 0.03)",
                  border: isTriggered
                    ? `1px solid ${AEGIS_THEME.accent}66`
                    : `1px solid ${AEGIS_THEME.ruleSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ color: AEGIS_THEME.inkMuted, fontSize: 13 }}>
                  Net Portfolio Delta
                </div>
                <div
                  style={{
                    color: isTriggered ? AEGIS_THEME.accent : AEGIS_THEME.danger,
                    fontSize: 24,
                    fontWeight: 700,
                    marginTop: 4,
                  }}
                >
                  {isTriggered ? "Δ = 0.00 (Neutral)" : "Δ > 0 (Exposed)"}
                </div>
                <div
                  style={{
                    color: isTriggered ? AEGIS_THEME.accent : AEGIS_THEME.danger,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {isTriggered ? "Downward Loss Fully Sealed" : "Vulnerable"}
                </div>
              </div>
            </div>

            {/* Invariant Proof Card */}
            <div
              style={{
                opacity: invOp,
                transform: `translateY(${invY}px)`,
                padding: "16px 20px",
                borderRadius: 12,
                background: "rgba(16, 185, 129, 0.12)",
                border: `1px solid ${AEGIS_THEME.accent}55`,
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
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Formal Invariant INV-1 Verified: Non-Custodial Bounds
                </div>
                <div
                  style={{
                    color: AEGIS_THEME.inkMuted,
                    fontSize: 12,
                    marginTop: 3,
                  }}
                >
                  Session key holds trade-only dispatch permissions. ΔQ_vault = 0. Zero withdrawal or approve capability reachable.
                </div>
              </div>

              <div
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: "rgba(16, 185, 129, 0.2)",
                  color: AEGIS_THEME.accent,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                160k FUZZ PASS
              </div>
            </div>
          </div>

          {/* Right Column: Gauge under Stress */}
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
                color: isTriggered ? AEGIS_THEME.hedge : AEGIS_THEME.danger,
                fontFamily: AEGIS_THEME.textFont,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Hedge Trigger Line Reached
            </div>

            <ConcentricGauge
              healthFactor={currentH}
              size={360}
              statusLabel={
                isTriggered
                  ? `H = ${currentH.toFixed(2)} (Hedge Synthetically Stabilized)`
                  : `H = ${currentH.toFixed(2)} (Approaching Trigger 1.15)`
              }
            />

            <div
              style={{
                marginTop: 20,
                padding: "10px 16px",
                borderRadius: 8,
                background: "rgba(245, 158, 11, 0.12)",
                border: `1px solid ${AEGIS_THEME.hedge}44`,
                color: AEGIS_THEME.hedge,
                fontSize: 12,
                fontWeight: 600,
                textAlign: "center",
                fontFamily: AEGIS_THEME.textFont,
              }}
            >
              Liquidation Prevented • Zero Collateral Dumped
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
