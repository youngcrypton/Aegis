import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface AegisLogoProps {
  size?: number;
  glow?: boolean;
}

export const AegisLogo: React.FC<AegisLogoProps> = ({ size = 128, glow = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Staggered entry for each of the 3 blades
  const spr1 = spring({ frame: frame - 5, fps, config: { damping: 14, stiffness: 120 } });
  const spr2 = spring({ frame: frame - 12, fps, config: { damping: 14, stiffness: 120 } });
  const spr3 = spring({ frame: frame - 19, fps, config: { damping: 14, stiffness: 120 } });

  const y1 = interpolate(spr1, [0, 1], [-40, 0]);
  const y2 = interpolate(spr2, [0, 1], [-40, 0]);
  const y3 = interpolate(spr3, [0, 1], [-40, 0]);

  const opacity1 = interpolate(spr1, [0, 1], [0, 1]);
  const opacity2 = interpolate(spr2, [0, 1], [0, 1]);
  const opacity3 = interpolate(spr3, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {glow && (
        <div
          style={{
            position: "absolute",
            width: size * 1.4,
            height: size * 1.4,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(95, 217, 190, 0.25) 0%, rgba(105, 40, 237, 0.15) 50%, transparent 75%)",
            filter: "blur(20px)",
            pointerEvents: "none",
          }}
        />
      )}
      <svg
        viewBox="0 0 131 128"
        width={size}
        height={size}
        style={{ overflow: "visible", position: "relative" }}
      >
        <defs>
          <linearGradient
            id="aegis-motion-grad"
            gradientUnits="userSpaceOnUse"
            x1="27.70"
            y1="-13.51"
            x2="103.30"
            y2="141.51"
          >
            <stop offset="0.00" stopColor="#1F0E4C" />
            <stop offset="0.10" stopColor="#241056" />
            <stop offset="0.20" stopColor="#40178D" />
            <stop offset="0.30" stopColor="#5A1FC9" />
            <stop offset="0.40" stopColor="#6928ED" />
            <stop offset="0.50" stopColor="#642FEB" />
            <stop offset="0.60" stopColor="#4C44CB" />
            <stop offset="0.70" stopColor="#305EA5" />
            <stop offset="0.80" stopColor="#157286" />
            <stop offset="0.90" stopColor="#087B75" />
            <stop offset="1.00" stopColor="#087E6D" />
          </linearGradient>
        </defs>

        {/* Blade 1 */}
        <polygon
          points="40.20,0.00 70.40,0.00 26.60,127.00 0.00,127.00"
          fill="url(#aegis-motion-grad)"
          style={{
            transform: `translateY(${y1}px)`,
            opacity: opacity1,
          }}
        />

        {/* Blade 2 */}
        <polygon
          points="73.00,36.00 101.10,36.00 68.70,127.00 42.60,127.00"
          fill="url(#aegis-motion-grad)"
          style={{
            transform: `translateY(${y2}px)`,
            opacity: opacity2,
          }}
        />

        {/* Blade 3 */}
        <polygon
          points="104.20,67.00 130.00,67.00 108.50,127.00 83.90,127.00"
          fill="url(#aegis-motion-grad)"
          style={{
            transform: `translateY(${y3}px)`,
            opacity: opacity3,
          }}
        />
      </svg>
    </div>
  );
};
