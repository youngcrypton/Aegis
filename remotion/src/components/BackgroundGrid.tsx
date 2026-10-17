import React from "react";
import { useCurrentFrame } from "remotion";
import { AEGIS_THEME } from "../theme";

export const BackgroundGrid: React.FC<{ activeAlert?: boolean }> = ({ activeAlert = false }) => {
  const frame = useCurrentFrame();

  // Subtle floating grid pan
  const offsetY = (frame * 0.4) % 40;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: AEGIS_THEME.bgBase,
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      {/* Background Radial Glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 900,
          height: 600,
          borderRadius: "50%",
          background: activeAlert
            ? "radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, rgba(245, 158, 11, 0.05) 50%, transparent 75%)"
            : "radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(31, 14, 76, 0.25) 50%, transparent 75%)",
          filter: "blur(60px)",
          transition: "background 0.5s ease",
        }}
      />

      {/* Grid Canvas Overlay */}
      <svg
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.18,
        }}
      >
        <defs>
          <pattern
            id="aegis-tech-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(0, ${offsetY})`}
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#aegis-tech-grid)" />
      </svg>

      {/* Vignette border */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxShadow: "inset 0 0 160px rgba(0, 0, 0, 0.8)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
