import React from "react";
import {
  AbsoluteFill,
  Audio,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AEGIS_LIGHT_THEME, SPRINGS } from "../theme";

export const Act6OutroLight: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = AEGIS_LIGHT_THEME;

  const logoSpring = spring({ frame: frame - 10, fps, config: SPRINGS.smooth });
  const titleSpring = spring({ frame: frame - 25, fps, config: SPRINGS.cinematic });
  const badgeSpring = spring({ frame: frame - 50, fps, config: SPRINGS.snappy });
  const ctaSpring = spring({ frame: frame - 80, fps, config: SPRINGS.snappy });

  // Subtle pulsing glow for CTA button
  const ctaPulse = Math.sin(frame / 12) * 0.04 + 1.0;

  return (
    <AbsoluteFill
      style={{
        background: t.bgBase,
        fontFamily: t.textFont,
        color: t.ink,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 60,
        boxSizing: "border-box",
      }}
    >
      <Audio src={staticFile("audio_120s/act6_outro.mp3")} volume={1.3} />

      {/* Light Ambient Radiance */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(214, 245, 236, 0.7) 0%, rgba(220, 203, 255, 0.4) 45%, transparent 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      {/* 3-Blade Master Logo */}
      <div
        style={{
          transform: `scale(${logoSpring})`,
          opacity: logoSpring,
          marginBottom: 20,
        }}
      >
        <svg width="84" height="84" viewBox="0 0 40 40" fill="none">
          <defs>
            <linearGradient id="act6-blade-grad" x1="10.17" y1="-0.15" x2="29.83" y2="40.15" gradientUnits="userSpaceOnUse">
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
          <polygon points="13.42,3.36 21.27,3.36 9.89,36.38 2.97,36.38" fill="url(#act6-blade-grad)" />
          <polygon points="21.95,12.72 29.26,12.72 20.83,36.38 14.05,36.38" fill="url(#act6-blade-grad)" />
          <polygon points="30.06,20.78 36.77,20.78 31.18,36.38 24.78,36.38" fill="url(#act6-blade-grad)" />
        </svg>
      </div>

      {/* Brand Title & Tagline */}
      <div
        style={{
          transform: `translateY(${(1 - titleSpring) * 20}px)`,
          opacity: titleSpring,
          marginBottom: 32,
        }}
      >
        <h1
          style={{
            fontFamily: t.displayFont,
            fontSize: 72,
            lineHeight: 1.0,
            color: t.ink,
            margin: 0,
            marginBottom: 12,
            fontWeight: 400,
          }}
        >
          Aegis Protocol
        </h1>
        <p style={{ fontSize: 24, color: t.inkMuted, margin: 0, letterSpacing: "0.02em" }}>
          Non-Custodial. Autonomous. Unliquidatable.
        </p>
      </div>

      {/* Verification Pills */}
      <div
        style={{
          display: "flex",
          gap: 16,
          justifyContent: "center",
          flexWrap: "wrap",
          marginBottom: 44,
          transform: `translateY(${(1 - badgeSpring) * 15}px)`,
          opacity: badgeSpring,
        }}
      >
        <div style={{ padding: "8px 20px", borderRadius: 999, background: t.raised, border: `1px solid ${t.rule}`, fontSize: 14, fontWeight: 600, color: t.ink }}>
          Elysium Orbit L2 • Chain 99801
        </div>
        <div style={{ padding: "8px 20px", borderRadius: 999, background: t.raised, border: `1px solid ${t.rule}`, fontSize: 14, fontWeight: 600, color: t.accent }}>
          116/116 Tests Passing (100%)
        </div>
        <div style={{ padding: "8px 20px", borderRadius: 999, background: t.raised, border: `1px solid ${t.rule}`, fontSize: 14, fontWeight: 600, color: t.ink }}>
          AegisVault: 0xC064...dA29
        </div>
      </div>

      {/* Call to Action Card Button */}
      <div
        style={{
          transform: `scale(${ctaSpring * ctaPulse})`,
          opacity: ctaSpring,
        }}
      >
        <div
          style={{
            padding: "20px 48px",
            borderRadius: 16,
            background: t.accent,
            color: t.onAccent,
            fontFamily: t.textFont,
            fontSize: 22,
            fontWeight: 600,
            boxShadow: "0 12px 35px rgba(7, 112, 95, 0.25)",
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span>Launch Live Terminal at</span>
          <span style={{ textDecoration: "underline", textUnderlineOffset: 4 }}>aegishedge.xyz</span>
          <span style={{ fontSize: 24 }}>↗</span>
        </div>
      </div>

      <div style={{ marginTop: 24, fontSize: 14, color: t.inkMuted }}>
        Open Public Testnet • No Invite Codes Required
      </div>
    </AbsoluteFill>
  );
};
