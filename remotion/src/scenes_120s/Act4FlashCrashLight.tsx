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
import { ConcentricGauge } from "../components/ConcentricGauge";
import { AEGIS_LIGHT_THEME, SPRINGS } from "../theme";

export const Act4FlashCrashLight: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = AEGIS_LIGHT_THEME;

  // Flash crash animation:
  // Price drops from 83.46 down to 68.40 (-18%) between frames 30 and 180
  const currentPrice = interpolate(frame, [30, 180], [83.46, 68.40], { extrapolateRight: "clamp" });
  
  // Health factor drops from 1.41 down to 1.12 (preventing liquidation)
  const healthFactor = interpolate(frame, [45, 195], [1.41, 1.12], { extrapolateRight: "clamp" });

  // Sentinel Trigger event at frame 150
  const triggerFired = frame >= 150;
  const triggerSpring = spring({ frame: frame - 150, fps, config: SPRINGS.snappy });

  // Execution dispatch confirmed at frame 210 (sub-78ms)
  const hedgeConfirmed = frame >= 210;
  const hedgeSpring = spring({ frame: frame - 210, fps, config: SPRINGS.snappy });

  // Delta neutral lock-in badge at frame 360
  const lockedIn = frame >= 360;
  const lockedSpring = spring({ frame: frame - 360, fps, config: SPRINGS.smooth });

  return (
    <AbsoluteFill
      style={{
        background: t.bgBase,
        fontFamily: t.textFont,
        color: t.ink,
        overflow: "hidden",
        padding: 60,
        boxSizing: "border-box",
      }}
    >
      <Audio src={staticFile("audio_120s/act4_flash_crash.mp3")} volume={1.3} />

      {/* Dynamic Warning Alert Tint during crash */}
      {frame > 60 && frame < 360 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 50% 30%, rgba(184, 37, 79, 0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          borderBottom: `1px solid ${t.rule}`,
          paddingBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: t.displayFont, fontSize: 30, color: t.ink }}>
            Aegis
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.12em",
              color: frame > 60 ? t.danger : t.inkMuted,
              textTransform: "uppercase",
              padding: "4px 8px",
              borderRadius: 6,
              background: frame > 60 ? "rgba(184, 37, 79, 0.1)" : "rgba(22, 18, 48, 0.05)",
              transition: "all 0.3s ease",
            }}
          >
            Act 04 / -18% Flash Crash & Sub-Second Defense
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Price Ticker */}
          <div
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              background: frame > 60 ? "rgba(184, 37, 79, 0.12)" : t.raised,
              border: `1px solid ${frame > 60 ? t.danger : t.rule}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, color: t.inkMuted }}>HYPE / USD:</span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: frame > 60 ? t.danger : t.ink,
                fontFeatureSettings: "'tnum'",
              }}
            >
              ${currentPrice.toFixed(2)}
            </span>
            {frame > 60 && (
              <span style={{ fontSize: 13, fontWeight: 700, color: t.danger }}>
                (-18.0%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Simulation View */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 40,
          alignItems: "center",
          marginTop: 24,
        }}
      >
        {/* Left Column: Live Sentinel Execution Terminal Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Status Headline */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: frame > 150 ? t.hedge : t.accent, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>
              {frame < 150 ? "MONITORING LIVE ORDERBOOK" : "HIGH-FREQUENCY TRIGGER ACTIVATED"}
            </div>
            <h2 style={{ fontFamily: t.displayFont, fontSize: 44, margin: 0, fontWeight: 400, color: t.ink, lineHeight: 1.1 }}>
              {frame < 210 ? "Autonomous Delta Sentinel Engaged." : "Synthetic Short Hedge Executed on HyperCore."}
            </h2>
          </div>

          {/* Trigger Alert Card */}
          {triggerFired && (
            <div
              style={{
                background: t.raised,
                borderRadius: 14,
                border: `1px solid ${t.hedge}66`,
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transform: `scale(${triggerSpring})`,
                opacity: triggerSpring,
                boxShadow: "0 6px 20px rgba(163, 74, 8, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.hedge, textTransform: "uppercase" }}>
                    Trigger Condition Breached
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t.ink }}>
                    Health Factor H ≤ 1.15 threshold reached at $74.50
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.hedge, padding: "4px 8px", background: "rgba(163, 74, 8, 0.1)", borderRadius: 6 }}>
                &lt; 78ms LATENCY
              </span>
            </div>
          )}

          {/* Hedge Execution Card */}
          {hedgeConfirmed && (
            <div
              style={{
                background: t.raised,
                borderRadius: 14,
                border: `1px solid ${t.accent}66`,
                padding: "20px",
                transform: `scale(${hedgeSpring})`,
                opacity: hedgeSpring,
                boxShadow: "0 8px 25px rgba(7, 112, 95, 0.08)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: t.accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  HYPERCORE CLOB SHORT ROUTED
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: t.accent, padding: "2px 8px", background: "rgba(7, 112, 95, 0.1)", borderRadius: 6 }}>
                  AGENT DISPATCH ADAPTER
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: t.inkMuted }}>Order Type</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.ink }}>Post-Only Limit</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: t.inkMuted }}>Position Size</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.ink }}>Short 500 HYPE</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: t.inkMuted }}>Fill Price</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.accent }}>$68.40</div>
                </div>
              </div>
            </div>
          )}

          {/* Delta Neutral Invariant Result */}
          {lockedIn && (
            <div
              style={{
                padding: "16px 20px",
                borderRadius: 14,
                background: "rgba(7, 112, 95, 0.06)",
                border: `1px solid ${t.accent}44`,
                display: "flex",
                alignItems: "center",
                gap: 16,
                transform: `translateY(${(1 - lockedSpring) * 15}px)`,
                opacity: lockedSpring,
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: t.accent, color: t.onAccent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                ✓
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.accent, textTransform: "uppercase" }}>
                  INVARIANT INV-1 PRESERVED: LIQUIDATION AVERTED
                </div>
                <div style={{ fontSize: 14, color: t.ink }}>
                  Collateral drawdown offset by perp short gains. Net equity remains solvent at H = 1.12.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Concentric Gauge Deflection */}
        <div
          style={{
            background: t.raised,
            borderRadius: 20,
            border: `1px solid ${t.rule}`,
            padding: 36,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxShadow: "0 12px 40px rgba(22, 18, 48, 0.06)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: t.inkMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
            Live Health Factor Needle
          </div>

          <ConcentricGauge
            healthFactor={healthFactor}
            size={340}
            statusLabel={frame > 180 ? "H = 1.12 • Delta Neutral Short Armed" : "H = 1.41 • Safe"}
            themeMode="light"
          />

          {/* Safety Threshold Reference */}
          <div
            style={{
              marginTop: 20,
              width: "100%",
              paddingTop: 16,
              borderTop: `1px solid ${t.rule}`,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <div>
              <span style={{ color: t.inkMuted }}>Liquidation Threshold: </span>
              <strong style={{ color: t.danger }}>H &le; 0.80</strong>
            </div>
            <div>
              <span style={{ color: t.inkMuted }}>Buffer Saved: </span>
              <strong style={{ color: t.accent }}>+32% Margin</strong>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
