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

export const Scene3Terminal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Camera zoom-in from 0.95 to 1.0
  const zoomSpring = spring({
    frame,
    fps,
    config: SPRINGS.smooth,
  });
  const zoomScale = interpolate(zoomSpring, [0, 1], [0.94, 1.0]);
  const zoomOpacity = interpolate(zoomSpring, [0, 1], [0, 1]);

  // Counting health factor from 1.00 to 1.41
  const hSpring = spring({
    frame: frame - 25,
    fps,
    config: SPRINGS.smooth,
  });
  const currentH = interpolate(hSpring, [0, 1], [1.05, 1.41]);

  // Live price count from 70.00 to 82.50
  const priceSpring = spring({
    frame: frame - 20,
    fps,
    config: SPRINGS.smooth,
  });
  const currentPrice = interpolate(priceSpring, [0, 1], [74.2, 82.5]);

  // Micro-ticker subtle pulse
  const tickerPulse = Math.sin(frame * 0.15) * 0.08;

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
      }}
    >
      <BackgroundGrid />

      {/* Main Terminal Window */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: 1440,
          background: "rgba(10, 15, 24, 0.92)",
          border: `1px solid ${AEGIS_THEME.rule}`,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
          transform: `scale(${zoomScale})`,
          opacity: zoomOpacity,
        }}
      >
        {/* Terminal Header */}
        <div
          style={{
            height: 64,
            padding: "0 28px",
            background: "rgba(14, 23, 38, 0.9)",
            borderBottom: `1px solid ${AEGIS_THEME.rule}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Header Left */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#10b981" }} />
            </div>

            <div style={{ height: 20, width: 1, background: AEGIS_THEME.rule }} />

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="24" height="24" viewBox="0 0 40 40">
                <defs>
                  <linearGradient id="t-blade-grad" x1="10" y1="0" x2="30" y2="40">
                    <stop offset="0%" stopColor="#6928ED" />
                    <stop offset="100%" stopColor="#087E6D" />
                  </linearGradient>
                </defs>
                <polygon points="13.42,3.36 21.27,3.36 9.89,36.38 2.97,36.38" fill="url(#t-blade-grad)" />
                <polygon points="21.95,12.72 29.26,12.72 20.83,36.38 14.05,36.38" fill="url(#t-blade-grad)" />
                <polygon points="30.06,20.78 36.77,20.78 31.18,36.38 24.78,36.38" fill="url(#t-blade-grad)" />
              </svg>
              <span
                style={{
                  fontFamily: AEGIS_THEME.displayFont,
                  fontSize: 20,
                  color: AEGIS_THEME.ink,
                  letterSpacing: "0.08em",
                }}
              >
                AEGIS TERMINAL
              </span>
            </div>

            <div
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                background: "rgba(16, 185, 129, 0.15)",
                border: `1px solid ${AEGIS_THEME.accent}44`,
                color: AEGIS_THEME.accent,
                fontFamily: AEGIS_THEME.textFont,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              ELYSIUM TESTNET (99801)
            </div>
          </div>

          {/* Header Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                fontFamily: AEGIS_THEME.textFont,
                fontSize: 12,
                color: AEGIS_THEME.inkMuted,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: AEGIS_THEME.accent }} />
              RPC 100% Operational (Block #10,717,040)
            </div>

            <div
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.05)",
                border: `1px solid ${AEGIS_THEME.rule}`,
                color: AEGIS_THEME.ink,
                fontFamily: AEGIS_THEME.textFont,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              0xf0e7...9d64
            </div>
          </div>
        </div>

        {/* Dashboard Body */}
        <div style={{ padding: 32, display: "flex", gap: 28 }}>
          {/* Left Column: Protected Vault Position */}
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
                  Protected Vault Position #0482
                </h3>
                <span
                  style={{
                    color: AEGIS_THEME.inkMuted,
                    fontSize: 13,
                    fontFamily: AEGIS_THEME.textFont,
                  }}
                >
                  Non-Custodial Multi-Collateral Safe
                </span>
              </div>

              <div
                style={{
                  padding: "4px 12px",
                  borderRadius: 999,
                  background: "rgba(16, 185, 129, 0.15)",
                  color: AEGIS_THEME.accent,
                  fontFamily: AEGIS_THEME.textFont,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                LIVE SENTINEL ARMED
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
              {/* Metric 1 */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${AEGIS_THEME.ruleSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ color: AEGIS_THEME.inkMuted, fontSize: 13 }}>
                  Collateral Asset
                </div>
                <div
                  style={{
                    color: AEGIS_THEME.ink,
                    fontSize: 24,
                    fontWeight: 700,
                    marginTop: 4,
                    fontFeatureSettings: "'tnum'",
                  }}
                >
                  0.1000 WHYPE
                </div>
                <div style={{ color: AEGIS_THEME.accent, fontSize: 12, marginTop: 2 }}>
                  100% Unencumbered
                </div>
              </div>

              {/* Metric 2 */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${AEGIS_THEME.ruleSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ color: AEGIS_THEME.inkMuted, fontSize: 13 }}>
                  Borrowed Debt
                </div>
                <div
                  style={{
                    color: AEGIS_THEME.ink,
                    fontSize: 24,
                    fontWeight: 700,
                    marginTop: 4,
                    fontFeatureSettings: "'tnum'",
                  }}
                >
                  $0.81 USDC
                </div>
                <div style={{ color: AEGIS_THEME.inkMuted, fontSize: 12, marginTop: 2 }}>
                  Overcollateralized
                </div>
              </div>

              {/* Metric 3 */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${AEGIS_THEME.ruleSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ color: AEGIS_THEME.inkMuted, fontSize: 13 }}>
                  Live L1 Mark Price
                </div>
                <div
                  style={{
                    color: AEGIS_THEME.ink,
                    fontSize: 24,
                    fontWeight: 700,
                    marginTop: 4,
                    fontFeatureSettings: "'tnum'",
                  }}
                >
                  ${(currentPrice + tickerPulse).toFixed(2)} USD
                </div>
                <div style={{ color: AEGIS_THEME.accent, fontSize: 12, marginTop: 2 }}>
                  Hyperliquid API Live Feed
                </div>
              </div>

              {/* Metric 4 */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${AEGIS_THEME.ruleSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ color: AEGIS_THEME.inkMuted, fontSize: 13 }}>
                  Liquidation Price
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
                  $44.20 USD
                </div>
                <div style={{ color: AEGIS_THEME.inkMuted, fontSize: 12, marginTop: 2 }}>
                  Buffer: +86.6% safe
                </div>
              </div>
            </div>

            {/* Bottom Status Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                borderRadius: 10,
                background: "rgba(16, 185, 129, 0.08)",
                border: `1px solid ${AEGIS_THEME.accent}33`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                    fontWeight: 600,
                    color: AEGIS_THEME.ink,
                    fontSize: 14,
                  }}
                >
                  STANDBY — Autonomous Risk Monitored
                </span>
              </div>
              <span
                style={{
                  fontFamily: AEGIS_THEME.textFont,
                  fontSize: 13,
                  color: AEGIS_THEME.accent,
                  fontWeight: 700,
                }}
              >
                Hedge Ratio: 50% Short Prepared
              </span>
            </div>
          </div>

          {/* Right Column: Concentric Gauge Showcase */}
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
                color: AEGIS_THEME.inkMuted,
                fontFamily: AEGIS_THEME.textFont,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Dynamic Solvency Telemetry
            </div>

            <ConcentricGauge
              healthFactor={currentH}
              size={360}
              statusLabel={`H = ${currentH.toFixed(2)} (Buffer: +$38.30 Safe)`}
            />

            <div
              style={{
                marginTop: 24,
                textAlign: "center",
                maxWidth: 320,
                color: AEGIS_THEME.inkMuted,
                fontSize: 12,
                lineHeight: 1.6,
                fontFamily: AEGIS_THEME.textFont,
              }}
            >
              Continuous Multicall3 batch inspection ensures sub-100ms risk detection across all registered vault accounts.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
