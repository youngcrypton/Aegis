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
import { AEGIS_TOKENS, SPRINGS } from "../theme";

export const AegisSentinelScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = AEGIS_TOKENS.light;

  // -------------------------------------------------------------
  // Timing & Flow (60 fps, 510 frames = 8.5 seconds)
  // Continuous light-mode luxury editorial aesthetic.
  // Matching film.html palette: #DCCBFF to #FFF6EC with #FFFFFF surfaces.
  //
  // Phase 1 (0-75): Seamless hand-off from flyover end card
  // Phase 2 (75-200): Live drawdown simulation (ETH drops 30%)
  // Phase 3 (200-310): Trigger line hit & HyperCore delta hedge opens
  // Phase 4 (310-410): Specification list & capital preservation readout
  // Phase 5 (410-510): Closing editorial statement in Marcellus
  // -------------------------------------------------------------

  // Ingress animation
  const introSpring = spring({ frame, fps, config: { damping: 18, stiffness: 85 } });
  const cardY = interpolate(introSpring, [0, 1], [60, 0]);
  const cardOpacity = interpolate(introSpring, [0, 1], [0, 1]);

  // Protocol Simulation Variables (exact figures from brand kit & index.html)
  // 12.40 ETH collateral, $22,000 debt, $3,412.80 base mark, trigger at 1.20, liq at 1.10.
  const dropProgress = interpolate(frame, [80, 195], [0, 0.30], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const basePrice = 3412.8;
  const currentPrice = basePrice * (1 - dropProgress);
  const collateralValue = 12.4 * currentPrice;
  const rawCollateralRatio = collateralValue / 22000;

  // Hedge opens when collateral ratio reaches 1.20 (at frame 195)
  const isHedged = frame >= 195;
  const hedgeSpring = spring({ frame: frame - 195, fps, config: SPRINGS.snappy });
  const hedgeRatio = isHedged ? interpolate(hedgeSpring, [0, 1], [0, 1.0]) : 0;

  // Health factor drops from 1.92 to 1.20, then locks flat at 1.20 via the hedge
  const healthFactor = isHedged
    ? 1.20
    : rawCollateralRatio;

  // Chart drawing progress
  const chartDrawProgress = interpolate(frame, [85, 230], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Specification reveal
  const specSpring = spring({ frame: frame - 300, fps, config: { damping: 16, stiffness: 100 } });
  const specOpacity = interpolate(specSpring, [0, 1], [0, 1]);
  const specY = interpolate(specSpring, [0, 1], [20, 0]);

  // Closing editorial statement (Phase 5)
  const outroSpring = spring({ frame: frame - 400, fps, config: { damping: 18, stiffness: 80 } });
  const outroOpacity = interpolate(outroSpring, [0, 1], [0, 1]);
  const outroY = interpolate(outroSpring, [0, 1], [30, 0]);
  const panelSettleY = interpolate(outroSpring, [0, 1], [0, -18]);

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #FFF6EC 0%, #D6F5EC 45%, #DCCBFF 100%)",
        backgroundColor: "#F7F1FA",
        fontFamily: t.textFont,
        color: t.ink,
        overflow: "hidden",
      }}
    >
      {/* High-Fidelity Light-Mode Audio Soundscape */}
      <Audio src={staticFile("audio/aegis-light-theme.wav")} volume={1.0} />

      {/* Floating Header Pill Badge (Exact replica of film.html #badge) */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "#FFFFFF",
          borderRadius: 999,
          padding: "8px 24px 8px 10px",
          fontFamily: t.textFont,
          fontWeight: 600,
          fontSize: 20,
          lineHeight: 1,
          color: "#161230",
          letterSpacing: "0.01em",
          boxShadow: "0 8px 24px rgba(22, 18, 48, 0.10)",
          border: `1px solid ${t.rule}`,
          zIndex: 20,
        }}
      >
        <img
          src={staticFile("logo_tile.png")}
          alt="AEGIS"
          style={{ width: 28, height: 28, borderRadius: 7 }}
        />
        <span>AEGIS</span>
        <span style={{ fontSize: 13, color: t.ink2, fontWeight: 500, marginLeft: 4 }}>
          PROTOCOL SENTINEL
        </span>
      </div>

      {/* Main Surface Card (1180px Wide, matching brand kit reading measure) */}
      <div
        style={{
          position: "absolute",
          top: 104,
          left: "50%",
          transform: `translateX(-50%) translateY(${cardY + panelSettleY}px)`,
          width: 1180,
          opacity: cardOpacity,
          background: "#FFFFFF",
          border: `1px solid ${t.rule}`,
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(22, 18, 48, 0.08)",
          padding: "36px 44px",
          zIndex: 10,
        }}
      >
        {/* Top Header Row of the Card */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 20,
            borderBottom: `1px solid ${t.rule}`,
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: t.ink2, fontWeight: 500 }}>
              Autonomous Delta-Hedging Simulator
            </div>
            <div
              style={{
                fontFamily: t.displayFont,
                fontSize: 28,
                color: t.ink,
                marginTop: 2,
              }}
            >
              12.40 ETH collateral · $22,000 debt
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                padding: "6px 16px",
                borderRadius: 999,
                border: `1px solid ${isHedged ? t.hedge : t.accent}`,
                color: isHedged ? t.hedge : t.accent,
                background: isHedged ? "rgba(163, 74, 8, 0.06)" : "rgba(7, 112, 95, 0.06)",
                transition: "all 300ms ease",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: isHedged ? t.hedge : t.accent,
                }}
              />
              {isHedged ? "Hedge active" : "Healthy"}
            </span>

            <span style={{ fontSize: 14, color: t.ink2, fontVariantNumeric: "tabular-nums" }}>
              Trigger level 1.20
            </span>
          </div>
        </div>

        {/* Content Body: Two Columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 40,
            marginTop: 26,
            alignItems: "start",
          }}
        >
          {/* Left Column: The Two-Line Comparison Chart (from Brand Kit Graphics) */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.ink2, letterSpacing: "0.04em" }}>
                COLLATERAL DRAWDOWN & HEDGE OFFSET
              </span>
              <span style={{ fontSize: 12, color: t.ink2, fontVariantNumeric: "tabular-nums" }}>
                Price: ${currentPrice.toFixed(2)} (−{(dropProgress * 100).toFixed(1)}%)
              </span>
            </div>

            {/* SVG Chart with Brand Kit Motif */}
            <div
              style={{
                width: "100%",
                height: 220,
                background: "#F7F1FA",
                borderRadius: 12,
                border: `1px solid ${t.rule}`,
                position: "relative",
                padding: "16px 20px",
                overflow: "hidden",
              }}
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 580 180"
                preserveAspectRatio="none"
                style={{ overflow: "visible" }}
              >
                {/* Horizontal Trigger Line (Dashed Amber line at 1.20) */}
                <line
                  x1="0"
                  y1="105"
                  x2="580"
                  y2="105"
                  stroke={t.hedge}
                  strokeWidth="1.5"
                  strokeDasharray="6 6"
                  opacity={0.85}
                />
                <text x="410" y="100" fill={t.hedge} fontSize="11" fontWeight="600">
                  Trigger line 1.20
                </text>

                {/* Collateral Curve Falling (Rose / Danger line: #B8254F) */}
                <path
                  d="M 20 30 C 140 38, 260 70, 360 105 S 480 148, 560 156"
                  fill="none"
                  stroke={t.danger}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeDasharray="600"
                  strokeDashoffset={600 * (1 - chartDrawProgress)}
                />

                {/* HyperCore Hedge Rising (Teal line: #07705F) */}
                {isHedged && (
                  <path
                    d="M 360 105 C 420 80, 490 60, 560 54"
                    fill="none"
                    stroke={t.accent}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeDasharray="300"
                    strokeDashoffset={300 * (1 - hedgeRatio)}
                  />
                )}

                {/* Flat Combined Net Position holding level */}
                {isHedged && (
                  <line
                    x1="360"
                    y1="105"
                    x2="560"
                    y2="105"
                    stroke={t.accent}
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    opacity={hedgeRatio * 0.9}
                  />
                )}
              </svg>

              {/* Chart Legend */}
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 20,
                  right: 20,
                  display: "flex",
                  gap: 20,
                  fontSize: 11,
                  color: t.ink2,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 14, height: 3, background: t.danger, borderRadius: 2 }} />
                  <span>Collateral value (unhedged)</span>
                </div>
                {isHedged && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 14, height: 3, background: t.accent, borderRadius: 2 }} />
                    <span style={{ color: t.accent, fontWeight: 600 }}>
                      HyperCore short perp (delta = 0)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Readout Split Row (Brand Kit Readout Component) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                marginTop: 18,
                border: `1px solid ${t.rule}`,
                borderRadius: 12,
                background: "#F7F1FA",
                padding: "16px 20px",
              }}
            >
              <div style={{ borderRight: `1px solid ${t.rule}`, paddingRight: 16 }}>
                <div style={{ fontSize: 12, color: t.ink2 }}>HyperCore hedge</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: t.ink, marginTop: 4 }}>
                  {isHedged ? "6.20 ETH" : "0.00 ETH"}
                </div>
                <div style={{ fontSize: 11, color: t.ink2, marginTop: 2 }}>
                  {isHedged ? "Short open · offsetting 100%" : "Standby · trigger 1.20"}
                </div>
              </div>

              <div style={{ paddingLeft: 20 }}>
                <div style={{ fontSize: 12, color: t.ink2 }}>Capital preserved</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: t.accent, marginTop: 4 }}>
                  {isHedged ? "+$2,200" : "$0"}
                </div>
                <div style={{ fontSize: 11, color: t.ink2, marginTop: 2 }}>
                  10% liquidation fee avoided
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Health Factor Indicator & Specification List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Health Factor Display */}
            <div
              style={{
                background: "#F7F1FA",
                borderRadius: 12,
                border: `1px solid ${t.rule}`,
                padding: "24px 28px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <span style={{ fontSize: 12, color: t.ink2, fontWeight: 500, letterSpacing: "0.04em" }}>
                    HEALTH FACTOR
                  </span>
                  <div
                    style={{
                      fontFamily: t.displayFont,
                      fontSize: 64,
                      lineHeight: 0.95,
                      color: isHedged ? t.hedge : t.ink,
                      marginTop: 8,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {healthFactor.toFixed(2)}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 12, color: t.ink2 }}>Collateral ratio</span>
                  <div style={{ fontSize: 20, fontWeight: 600, color: t.ink, fontVariantNumeric: "tabular-nums" }}>
                    {Math.round(rawCollateralRatio * 100)}%
                  </div>
                </div>
              </div>

              {/* 4px Progress Track */}
              <div
                style={{
                  position: "relative",
                  height: 4,
                  borderRadius: 4,
                  background: t.rule,
                  marginTop: 22,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${Math.max(0, Math.min(1, (healthFactor - 1) / 1.0)) * 100}%`,
                    background: isHedged ? t.hedge : t.accent,
                    borderRadius: 4,
                    transition: "width 200ms ease, background 300ms ease",
                  }}
                />
              </div>
            </div>

            {/* Specification List (Direct from Brand Kit lines 473-480) */}
            <div
              style={{
                opacity: specOpacity,
                transform: `translateY(${specY}px)`,
                background: "#F7F1FA",
                borderRadius: 12,
                border: `1px solid ${t.rule}`,
                padding: "20px 24px",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: t.ink2, letterSpacing: "0.08em", marginBottom: 12 }}>
                PROTOCOL SPECIFICATION
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${t.rule}`, paddingBottom: 8 }}>
                  <span style={{ color: t.ink2 }}>Precompile</span>
                  <span style={{ fontWeight: 600, fontFamily: "monospace" }}>0x0801</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${t.rule}`, paddingBottom: 8 }}>
                  <span style={{ color: t.ink2 }}>Read latency</span>
                  <span style={{ fontWeight: 600 }}>under 70ms</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${t.rule}`, paddingBottom: 8 }}>
                  <span style={{ color: t.ink2 }}>Gas cost</span>
                  <span style={{ fontWeight: 600, color: t.accent }}>zero</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: t.ink2 }}>Spot collateral seized</span>
                  <span style={{ fontWeight: 600, color: t.accent }}>0.00 ETH (100% intact)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editorial Closing Statement (Phase 5: Brand Kit Voice & Typography) */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: outroOpacity,
          transform: `translateY(${outroY}px)`,
          zIndex: 30,
        }}
      >
        <div
          style={{
            fontFamily: t.displayFont,
            fontSize: 54,
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            color: t.ink,
          }}
        >
          Hedge drawdowns. Never get liquidated.
        </div>

        <div
          style={{
            fontFamily: t.displayFont,
            fontStyle: "italic",
            fontSize: 42,
            lineHeight: 1.15,
            color: t.violet,
            marginTop: 6,
          }}
        >
          Autonomous risk engine on Elysium Orbit L2
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 16,
            marginTop: 18,
            fontSize: 13,
            color: t.ink2,
            letterSpacing: "0.04em",
          }}
        >
          <span>12.40 ETH TESTED</span>
          <span>•</span>
          <span>HYPERCORE CLOB SETTLED</span>
          <span>•</span>
          <span>AEGISHEDGE.XYZ</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
