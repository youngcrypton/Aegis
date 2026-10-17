import React from "react";
import { AEGIS_THEME, AEGIS_LIGHT_THEME } from "../theme";

interface ConcentricGaugeProps {
  healthFactor: number;
  size?: number;
  statusLabel?: string;
  themeMode?: "light" | "dark";
}

export const ConcentricGauge: React.FC<ConcentricGaugeProps> = ({
  healthFactor,
  size = 300,
  statusLabel,
  themeMode = "dark",
}) => {
  const isLight = themeMode === "light";
  const theme = isLight ? AEGIS_LIGHT_THEME : AEGIS_THEME;

  // Map Health Factor to needle rotation angle (in degrees):
  // 1.0 -> 180 deg (Far left danger)
  // 1.15 -> 140 deg (Warning trigger line)
  // 1.41 -> 80 deg (Healthy buffer)
  // 2.0 -> 20 deg (Far right deep safe)
  const clampedH = Math.max(0.9, Math.min(2.0, healthFactor));
  let needleDeg = 180;
  if (clampedH <= 1.0) {
    needleDeg = 180 - (clampedH - 0.9) * 50;
  } else if (clampedH <= 1.25) {
    // 1.0 to 1.25 -> 175 to 115 deg
    needleDeg = 175 - ((clampedH - 1.0) / 0.25) * 60;
  } else {
    // 1.25 to 2.0 -> 115 to 15 deg
    needleDeg = 115 - ((clampedH - 1.25) / 0.75) * 100;
  }

  // Needle color based on health factor
  let needleColor = theme.accent;
  let statusColor = theme.accent;
  if (healthFactor <= 1.05) {
    needleColor = theme.danger;
    statusColor = theme.danger;
  } else if (healthFactor <= 1.25) {
    needleColor = theme.hedge;
    statusColor = theme.hedge;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="0 0 300 170"
        width={size}
        height={size * (170 / 300)}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="needle-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor={needleColor} />
          </linearGradient>
        </defs>

        {/* Concentric Gauge Background Track (R=110, Center: 150, 145) */}
        <path
          d="M 40 145 A 110 110 0 0 1 260 145"
          fill="none"
          stroke={isLight ? "rgba(22, 18, 48, 0.08)" : "rgba(255, 255, 255, 0.06)"}
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* Danger Segment: 180 to 145 deg (H <= 1.05) */}
        <path
          d="M 40 145 A 110 110 0 0 1 59.9 81.9"
          fill="none"
          stroke={theme.danger}
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Warning Segment: 145 to 115 deg (1.05 < H <= 1.25) */}
        <path
          d="M 59.9 81.9 A 110 110 0 0 1 103.5 45.3"
          fill="none"
          stroke={theme.hedge}
          strokeWidth="16"
          opacity="0.9"
        />

        {/* Safe Segment: 115 to 0 deg (H > 1.25) */}
        <path
          d="M 103.5 45.3 A 110 110 0 0 1 260 145"
          fill="none"
          stroke={theme.accent}
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Needle Line from pivot (150, 145) toward outer arc */}
        <g
          transform={`rotate(${needleDeg - 90}, 150, 145)`}
          style={{ transition: "transform 0.1s ease-out" }}
        >
          <line
            x1="150"
            y1="145"
            x2="150"
            y2="45"
            stroke="url(#needle-grad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Subtle needle tip indicator */}
          <circle cx="150" cy="45" r="3" fill={needleColor} />
        </g>

        {/* Center Needle Pivot */}
        <circle cx="150" cy="145" r="7" fill={isLight ? "#161230" : "#ffffff"} />
        <circle cx="150" cy="145" r="4" fill={isLight ? "#ffffff" : "#0e1726"} />

        {/* Value Readout (Strictly positioned at y=104 with 41px clear air above pivot) */}
        <text
          x="150"
          y="104"
          textAnchor="middle"
          fill={needleColor}
          style={{
            fontFamily: theme.textFont,
            fontSize: "26px",
            fontWeight: "700",
            letterSpacing: "-0.02em",
            fontFeatureSettings: "'tnum'",
          }}
        >
          {healthFactor.toFixed(2)}
        </text>

        {/* Metric Label (Strictly positioned at y=122 with 23px clearance above pivot) */}
        <text
          x="150"
          y="122"
          textAnchor="middle"
          fill={theme.inkMuted}
          style={{
            fontFamily: theme.textFont,
            fontSize: "9px",
            fontWeight: "600",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          HEALTH FACTOR
        </text>
      </svg>

      {statusLabel && (
        <div
          style={{
            marginTop: 4,
            padding: "4px 12px",
            borderRadius: 999,
            border: `1px solid ${statusColor}44`,
            background: isLight ? `${statusColor}12` : `${statusColor}18`,
            color: statusColor,
            fontFamily: theme.textFont,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          {statusLabel}
        </div>
      )}
    </div>
  );
};
