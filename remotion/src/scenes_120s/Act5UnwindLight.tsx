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

export const Act5UnwindLight: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = AEGIS_LIGHT_THEME;

  // Market V-bounce from 68.40 back up to 76.20
  const bouncePrice = interpolate(frame, [0, 180], [68.40, 76.20], { extrapolateRight: "clamp" });

  // Trailing Take-Profit Auto-Unwind triggers at frame 90
  const unwindSpring = spring({ frame: frame - 90, fps, config: SPRINGS.smooth });
  
  // Health factor recovers smoothly back to 1.45
  const restoredHealth = interpolate(frame, [60, 240], [1.12, 1.45], { extrapolateRight: "clamp" });

  // Value count-up: Liquidations averted up to $48,250
  const savedValue = interpolate(frame, [90, 270], [0, 48250], { extrapolateRight: "clamp" });

  // Burn count-up: 164,820 AEGIS
  const burnedTokens = interpolate(frame, [150, 330], [0, 164820], { extrapolateRight: "clamp" });

  const flywheelSpring = spring({ frame: frame - 210, fps, config: SPRINGS.snappy });

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
      <Audio src={staticFile("audio_120s/act5_unwind.mp3")} volume={1.3} />

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
              color: t.accent,
              textTransform: "uppercase",
              padding: "4px 8px",
              borderRadius: 6,
              background: "rgba(7, 112, 95, 0.08)",
            }}
          >
            Act 05 / Trailing Take-Profit & Economic Flywheel
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.accent }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: t.inkMuted }}>
            Market V-Bounce: ${bouncePrice.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Main Grid */}
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
        {/* Left Column: Autonomous Unwind & Realized Gain */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.accent, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>
              DYNAMIC TRAILING TAKE-PROFIT (τ = 1.5%)
            </div>
            <h2 style={{ fontFamily: t.displayFont, fontSize: 44, margin: 0, fontWeight: 400, color: t.ink, lineHeight: 1.1 }}>
              Unwinds Short into Strength. Collateral Fully Restored.
            </h2>
          </div>

          {/* Liquidations Averted Metric Box */}
          <div
            style={{
              background: t.raised,
              borderRadius: 16,
              border: `1px solid ${t.accent}44`,
              padding: 24,
              boxShadow: "0 10px 30px rgba(7, 112, 95, 0.06)",
              transform: `scale(${unwindSpring})`,
              opacity: unwindSpring,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: t.accent, textTransform: "uppercase", marginBottom: 8 }}>
              Realized Value Protected
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
              <span style={{ fontFamily: t.displayFont, fontSize: 48, color: t.accent, fontFeatureSettings: "'tnum'" }}>
                +${Math.round(savedValue).toLocaleString()}
              </span>
              <span style={{ fontSize: 15, color: t.inkMuted, fontWeight: 600 }}>
                Averted Liquidations
              </span>
            </div>
            <div style={{ fontSize: 14, color: t.inkMuted }}>
              Short gains are captured directly back into borrower vault collateral. Zero manual intervention required.
            </div>
          </div>

          {/* Fee Flywheel Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              transform: `translateY(${(1 - flywheelSpring) * 20}px)`,
              opacity: flywheelSpring,
            }}
          >
            {/* 20% Burn */}
            <div style={{ background: t.raised, borderRadius: 14, border: `1px solid ${t.rule}`, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.violet, textTransform: "uppercase", marginBottom: 6 }}>
                20% PROTOCOL FEE BURN
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: t.ink, fontFeatureSettings: "'tnum'", marginBottom: 4 }}>
                {Math.round(burnedTokens).toLocaleString()} AEGIS
              </div>
              <div style={{ fontSize: 12, color: t.inkMuted }}>
                Permanently burned from circulating supply via AegisFeeCollector.
              </div>
            </div>

            {/* 80% Staker Yield */}
            <div style={{ background: t.raised, borderRadius: 14, border: `1px solid ${t.rule}`, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.accent, textTransform: "uppercase", marginBottom: 6 }}>
                80% STAKER YIELD (USDC)
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: t.accent, fontFeatureSettings: "'tnum'", marginBottom: 4 }}>
                $14,210 USDC
              </div>
              <div style={{ fontSize: 12, color: t.inkMuted }}>
                Real yield distributed directly to AEGIS vault stakers.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Restored Concentric Health Gauge */}
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
            Solvency Status Post-Unwind
          </div>

          <ConcentricGauge
            healthFactor={restoredHealth}
            size={340}
            statusLabel={frame > 180 ? "H = 1.45 • Healthy Buffer Restored" : "Rebounding"}
            themeMode="light"
          />

          <div
            style={{
              marginTop: 20,
              padding: "10px 16px",
              borderRadius: 10,
              background: "rgba(7, 112, 95, 0.08)",
              color: t.accent,
              fontSize: 13,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            ✓ Position Returned to Delta Neutral Baseline
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
