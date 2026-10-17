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

export const Act3ProductTourLight: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = AEGIS_LIGHT_THEME;

  // Toggle from Lite Mode (0-360 frames / 12s) to Pro Mode (360-750 frames / 13s)
  const isProMode = frame >= 360;
  const modeSwitchProgress = interpolate(frame, [350, 380], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Spring animations
  const liteSpring = spring({ frame: frame - 15, fps, config: SPRINGS.smooth });
  const proSpring = spring({ frame: frame - 370, fps, config: SPRINGS.smooth });

  // Health factor counts up smoothly to 1.41
  const animatedHealth = interpolate(frame, [0, 120], [1.0, 1.41], { extrapolateRight: "clamp" });

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
      <Audio src={staticFile("audio_120s/act3_product_tour.mp3")} volume={1.3} />

      {/* Top Header with Interactive Mode Pill Switcher */}
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
              color: t.inkMuted,
              textTransform: "uppercase",
              padding: "4px 8px",
              borderRadius: 6,
              background: "rgba(22, 18, 48, 0.05)",
            }}
          >
            Act 03 / Live Dual Terminal Tour
          </span>
        </div>

        {/* Mode Switcher Pill */}
        <div
          style={{
            display: "flex",
            background: "rgba(22, 18, 48, 0.06)",
            padding: 4,
            borderRadius: 999,
            border: `1px solid ${t.rule}`,
          }}
        >
          <div
            style={{
              padding: "6px 18px",
              borderRadius: 999,
              background: !isProMode ? t.raised : "transparent",
              color: !isProMode ? t.ink : t.inkMuted,
              fontWeight: 600,
              fontSize: 13,
              boxShadow: !isProMode ? "0 2px 8px rgba(22, 18, 48, 0.08)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            Lite Auto-Pilot
          </div>
          <div
            style={{
              padding: "6px 18px",
              borderRadius: 999,
              background: isProMode ? t.raised : "transparent",
              color: isProMode ? t.ink : t.inkMuted,
              fontWeight: 600,
              fontSize: 13,
              boxShadow: isProMode ? "0 2px 8px rgba(22, 18, 48, 0.08)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            Pro Terminal
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.accent }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: t.inkMuted }}>Live Mark: $83.46</span>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ flex: 1, position: "relative", marginTop: 30 }}>
        {/* VIEW 1: LITE AUTO-PILOT (Frames 0 - 360) */}
        {!isProMode && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              gridTemplateColumns: "1.1fr 1fr",
              gap: 48,
              alignItems: "center",
              transform: `translateY(${(1 - liteSpring) * 20}px)`,
              opacity: liteSpring * (1 - modeSwitchProgress),
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.accent, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
                1-Click Everyday Borrower Shield
              </div>
              <h2 style={{ fontFamily: t.displayFont, fontSize: 48, lineHeight: 1.1, color: t.ink, margin: 0, marginBottom: 20 }}>
                Autonomous Risk Defense with Zero Complexity.
              </h2>
              <p style={{ fontSize: 18, color: t.inkMuted, lineHeight: 1.6, marginBottom: 32 }}>
                Select your collateral balance and pick a battle-tested risk preset. AEGIS sentinel monitors the orderbook twenty-four-seven in the background.
              </p>

              {/* 3 Preset Options */}
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ padding: "12px 20px", borderRadius: 12, border: `1px solid ${t.rule}`, background: t.raised }}>
                  <div style={{ fontSize: 11, color: t.inkMuted, textTransform: "uppercase" }}>Conservative</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: t.ink }}>H &lt; 1.25</div>
                </div>
                <div style={{ padding: "12px 20px", borderRadius: 12, border: `2px solid ${t.accent}`, background: "rgba(7, 112, 95, 0.06)" }}>
                  <div style={{ fontSize: 11, color: t.accent, fontWeight: 700, textTransform: "uppercase" }}>Balanced (Active)</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: t.accent }}>H &lt; 1.15</div>
                </div>
                <div style={{ padding: "12px 20px", borderRadius: 12, border: `1px solid ${t.rule}`, background: t.raised }}>
                  <div style={{ fontSize: 11, color: t.inkMuted, textTransform: "uppercase" }}>Aggressive</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: t.ink }}>H &lt; 1.05</div>
                </div>
              </div>
            </div>

            {/* Lite Shield Card */}
            <div
              style={{
                background: t.raised,
                borderRadius: 20,
                border: `1px solid ${t.rule}`,
                padding: 36,
                boxShadow: "0 12px 40px rgba(22, 18, 48, 0.06)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: t.ink }}>Collateral Protected</span>
                <span style={{ fontFamily: t.displayFont, fontSize: 24, color: t.accent, fontWeight: 700 }}>0.10 HYPE</span>
              </div>
              <div style={{ height: 8, background: "rgba(22, 18, 48, 0.08)", borderRadius: 999, overflow: "hidden", marginBottom: 28 }}>
                <div style={{ width: "65%", height: "100%", background: t.accent, borderRadius: 999 }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
                <div style={{ padding: 16, borderRadius: 12, background: t.ground }}>
                  <div style={{ fontSize: 11, color: t.inkMuted, textTransform: "uppercase" }}>Liquidation Price</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: t.danger, fontFeatureSettings: "'tnum'" }}>$67.75</div>
                </div>
                <div style={{ padding: 16, borderRadius: 12, background: t.ground }}>
                  <div style={{ fontSize: 11, color: t.inkMuted, textTransform: "uppercase" }}>Trigger Price</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: t.hedge, fontFeatureSettings: "'tnum'" }}>$74.50</div>
                </div>
              </div>

              <div
                style={{
                  padding: "16px",
                  borderRadius: 12,
                  background: t.accent,
                  color: t.onAccent,
                  textAlign: "center",
                  fontWeight: 600,
                  fontSize: 16,
                  letterSpacing: "0.02em",
                }}
              >
                ✓ Sentinel Shield Armed (Non-Custodial)
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: PRO TERMINAL & CONCENTRIC GAUGE (Frames 360 - 750) */}
        {isProMode && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              gridTemplateColumns: "1.3fr 1fr",
              gap: 36,
              alignItems: "center",
              transform: `translateY(${(1 - proSpring) * 20}px)`,
              opacity: proSpring,
            }}
          >
            {/* Pro Chart & Orderbook */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Orderbook Depth Summary */}
              <div
                style={{
                  background: t.raised,
                  borderRadius: 16,
                  border: `1px solid ${t.rule}`,
                  padding: 24,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: t.accent, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    HyperCore CLOB 10-Level Depth
                  </span>
                  <span style={{ fontSize: 12, color: t.inkMuted }}>Sub-78ms Execution Stream</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontFeatureSettings: "'tnum'" }}>
                    <span style={{ color: t.danger }}>83.52 (Ask)</span>
                    <span style={{ color: t.inkMuted }}>1,240 HYPE</span>
                    <span style={{ color: t.ink }}>$103,564</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontFeatureSettings: "'tnum'" }}>
                    <span style={{ color: t.danger }}>83.48 (Ask)</span>
                    <span style={{ color: t.inkMuted }}>2,850 HYPE</span>
                    <span style={{ color: t.ink }}>$237,918</span>
                  </div>
                  <div style={{ height: 1, background: t.rule, margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontFeatureSettings: "'tnum'" }}>
                    <span style={{ color: t.accent, fontWeight: 700 }}>83.46 (Mark)</span>
                    <span style={{ color: t.accent, fontWeight: 700 }}>SPREAD: $0.02</span>
                    <span style={{ color: t.accent }}>DEEP LIQUIDITY</span>
                  </div>
                  <div style={{ height: 1, background: t.rule, margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontFeatureSettings: "'tnum'" }}>
                    <span style={{ color: t.accent }}>83.44 (Bid)</span>
                    <span style={{ color: t.inkMuted }}>3,410 HYPE</span>
                    <span style={{ color: t.ink }}>$284,530</span>
                  </div>
                </div>
              </div>

              {/* Position Metrics Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div style={{ background: t.raised, padding: 16, borderRadius: 12, border: `1px solid ${t.rule}` }}>
                  <div style={{ fontSize: 11, color: t.inkMuted, textTransform: "uppercase" }}>Vault Collateral</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: t.ink }}>0.10 HYPE</div>
                </div>
                <div style={{ background: t.raised, padding: 16, borderRadius: 12, border: `1px solid ${t.rule}` }}>
                  <div style={{ fontSize: 11, color: t.inkMuted, textTransform: "uppercase" }}>Active Debt</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: t.ink }}>$5.42 USDC</div>
                </div>
                <div style={{ background: t.raised, padding: 16, borderRadius: 12, border: `1px solid ${t.rule}` }}>
                  <div style={{ fontSize: 11, color: t.inkMuted, textTransform: "uppercase" }}>Trailing TP (τ)</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: t.accent }}>1.50%</div>
                </div>
              </div>
            </div>

            {/* Concentric Health Gauge Card */}
            <div
              style={{
                background: t.raised,
                borderRadius: 20,
                border: `1px solid ${t.rule}`,
                padding: 36,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 12px 40px rgba(22, 18, 48, 0.06)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: t.inkMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>
                Real-Time Mathematical Solvency
              </div>

              <ConcentricGauge
                healthFactor={animatedHealth}
                size={340}
                statusLabel="H = 1.41 • Solvency Safe"
                themeMode="light"
              />

              <div style={{ marginTop: 24, fontSize: 13, color: t.inkMuted, textAlign: "center", maxWidth: 280 }}>
                Monitored synchronously via Precompile 0x0801 with zero off-chain oracle delay.
              </div>
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
