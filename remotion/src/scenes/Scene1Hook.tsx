import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AEGIS_THEME, SPRINGS } from "../theme";
import { BackgroundGrid } from "../components/BackgroundGrid";

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo draw-on and blade slide-in
  const blade1Spring = spring({
    frame: frame - 25,
    fps,
    config: SPRINGS.smooth,
  });
  const blade2Spring = spring({
    frame: frame - 40,
    fps,
    config: SPRINGS.smooth,
  });
  const blade3Spring = spring({
    frame: frame - 55,
    fps,
    config: SPRINGS.smooth,
  });

  const b1Y = interpolate(blade1Spring, [0, 1], [-80, 0]);
  const b2Y = interpolate(blade2Spring, [0, 1], [-80, 0]);
  const b3Y = interpolate(blade3Spring, [0, 1], [-80, 0]);

  const b1Op = interpolate(blade1Spring, [0, 1], [0, 1]);
  const b2Op = interpolate(blade2Spring, [0, 1], [0, 1]);
  const b3Op = interpolate(blade3Spring, [0, 1], [0, 1]);

  // Glow pulse behind logo
  const glowSpring = spring({
    frame: frame - 60,
    fps,
    config: SPRINGS.cinematic,
  });
  const glowScale = interpolate(glowSpring, [0, 1], [0.4, 1.2]);
  const glowOpacity = interpolate(glowSpring, [0, 1], [0, 0.4]);

  // Title spring (Marcellus)
  const titleSpring = spring({
    frame: frame - 90,
    fps,
    config: SPRINGS.smooth,
  });
  const titleLetterSpacing = interpolate(titleSpring, [0, 1], [16, 6]);
  const titleY = interpolate(titleSpring, [0, 1], [30, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  // Subtitle spring
  const subSpring = spring({
    frame: frame - 140,
    fps,
    config: SPRINGS.snappy,
  });
  const subY = interpolate(subSpring, [0, 1], [20, 0]);
  const subOpacity = interpolate(subSpring, [0, 1], [0, 1]);

  // Tag badges spring
  const tagSpring = spring({
    frame: frame - 190,
    fps,
    config: SPRINGS.snappy,
  });
  const tagOpacity = interpolate(tagSpring, [0, 1], [0, 1]);

  // Exit transition towards end of scene (frame 320 to 360)
  const exitOpacity = interpolate(frame, [320, 360], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitScale = interpolate(frame, [320, 360], [1, 1.05], {
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
        transform: `scale(${exitScale})`,
      }}
    >
      <BackgroundGrid />

      {/* Center Hero Container */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        {/* Logo Container with 11-stop Aurora Gradient */}
        <div
          style={{
            position: "relative",
            width: 160,
            height: 160,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 36,
          }}
        >
          {/* Radial Aurora Aura */}
          <div
            style={{
              position: "absolute",
              width: 280,
              height: 280,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(95, 217, 190, 0.35) 0%, rgba(105, 40, 237, 0.25) 50%, transparent 75%)",
              filter: "blur(40px)",
              transform: `scale(${glowScale})`,
              opacity: glowOpacity,
              pointerEvents: "none",
            }}
          />

          <svg
            viewBox="0 0 131 128"
            width={140}
            height={140}
            style={{ overflow: "visible" }}
          >
            <defs>
              <linearGradient
                id="aegis-blade-hero-grad"
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
              fill="url(#aegis-blade-hero-grad)"
              style={{
                transform: `translateY(${b1Y}px)`,
                opacity: b1Op,
              }}
            />

            {/* Blade 2 */}
            <polygon
              points="73.00,36.00 101.10,36.00 68.70,127.00 42.60,127.00"
              fill="url(#aegis-blade-hero-grad)"
              style={{
                transform: `translateY(${b2Y}px)`,
                opacity: b2Op,
              }}
            />

            {/* Blade 3 */}
            <polygon
              points="104.20,67.00 130.00,67.00 108.50,127.00 83.90,127.00"
              fill="url(#aegis-blade-hero-grad)"
              style={{
                transform: `translateY(${b3Y}px)`,
                opacity: b3Op,
              }}
            />
          </svg>
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: AEGIS_THEME.displayFont,
            fontSize: 72,
            fontWeight: "400",
            color: AEGIS_THEME.ink,
            margin: 0,
            letterSpacing: `${titleLetterSpacing}px`,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textTransform: "uppercase",
            textShadow: "0 4px 24px rgba(0,0,0,0.6)",
          }}
        >
          AEGIS PROTOCOL
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: AEGIS_THEME.textFont,
            fontSize: 22,
            fontWeight: "500",
            color: AEGIS_THEME.inkMuted,
            marginTop: 18,
            marginBottom: 28,
            maxWidth: 720,
            lineHeight: 1.5,
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
          }}
        >
          Autonomous Risk Sentinel &amp; Non-Custodial Delta Engine for Elysium L2
        </p>

        {/* Badges Row */}
        <div
          style={{
            display: "flex",
            gap: 14,
            opacity: tagOpacity,
          }}
        >
          <div
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              border: `1px solid ${AEGIS_THEME.rule}`,
              background: AEGIS_THEME.cardGlass,
              backdropFilter: "blur(12px)",
              color: AEGIS_THEME.accent,
              fontFamily: AEGIS_THEME.textFont,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.05em",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: AEGIS_THEME.accent,
                boxShadow: `0 0 8px ${AEGIS_THEME.accent}`,
              }}
            />
            Elysium Orbit L2 (Chain 99801)
          </div>

          <div
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              border: `1px solid ${AEGIS_THEME.rule}`,
              background: AEGIS_THEME.cardGlass,
              backdropFilter: "blur(12px)",
              color: AEGIS_THEME.inkMuted,
              fontFamily: AEGIS_THEME.textFont,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            HyperCore L1 CLOB
          </div>

          <div
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              border: `1px solid ${AEGIS_THEME.rule}`,
              background: AEGIS_THEME.cardGlass,
              backdropFilter: "blur(12px)",
              color: AEGIS_THEME.inkMuted,
              fontFamily: AEGIS_THEME.textFont,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            Sub-78ms Sentinel Latency
          </div>
        </div>
      </div>
    </div>
  );
};
