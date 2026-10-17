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

export const Act2ArchitectureLight: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = AEGIS_LIGHT_THEME;

  const titleSpring = spring({ frame: frame - 10, fps, config: SPRINGS.smooth });
  const card1Spring = spring({ frame: frame - 60, fps, config: SPRINGS.snappy });
  const card2Spring = spring({ frame: frame - 150, fps, config: SPRINGS.snappy });
  const card3Spring = spring({ frame: frame - 240, fps, config: SPRINGS.snappy });
  const invSpring = spring({ frame: frame - 330, fps, config: SPRINGS.smooth });

  return (
    <AbsoluteFill
      style={{
        background: t.bgBase,
        fontFamily: t.textFont,
        color: t.ink,
        overflow: "hidden",
        padding: 80,
        boxSizing: "border-box",
      }}
    >
      <Audio src={staticFile("audio_120s/act2_architecture.mp3")} volume={1.3} />

      {/* Ambient background glow */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "25%",
          width: 650,
          height: 650,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(214, 245, 236, 0.6) 0%, transparent 70%)",
          filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />

      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          borderBottom: `1px solid ${t.rule}`,
          paddingBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: t.displayFont, fontSize: 32, color: t.ink }}>
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
            Act 02 / The Architecture & Invariant INV-1
          </span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: `1px solid ${t.rule}`,
              background: t.raised,
              fontSize: 13,
              fontWeight: 600,
              color: t.ink,
            }}
          >
            116/116 Foundry Tests Passed
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 36,
          marginTop: 20,
        }}
      >
        {/* Title Block */}
        <div
          style={{
            transform: `translateY(${(1 - titleSpring) * 20}px)`,
            opacity: titleSpring,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.15em", color: t.accent, textTransform: "uppercase", marginBottom: 8 }}>
            Engineered for Millisecond Consensus
          </div>
          <h2 style={{ fontFamily: t.displayFont, fontSize: 52, margin: 0, fontWeight: 400, color: t.ink }}>
            Native Elysium Orbit L2 & HyperCore CLOB Execution.
          </h2>
        </div>

        {/* 3 Core Architecture Pillars */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
          {/* Pillar 1: Precompiles & Oracles */}
          <div
            style={{
              background: t.raised,
              borderRadius: 16,
              border: `1px solid ${t.rule}`,
              padding: 24,
              transform: `translateY(${(1 - card1Spring) * 30}px)`,
              opacity: card1Spring,
              boxShadow: "0 4px 20px rgba(22, 18, 48, 0.04)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: t.accent, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              PRECOMPILE 0x0801 & 0x0802
            </div>
            <div style={{ fontFamily: t.displayFont, fontSize: 24, marginBottom: 12, color: t.ink }}>
              Sub-78ms HyperCore Read
            </div>
            <div style={{ fontSize: 14, color: t.inkMuted, lineHeight: 1.5 }}>
              Synchronous mark price consensus with zero round-trip delay. Relayed oracle adapters query orderbooks directly without keeper gas bloat.
            </div>
          </div>

          {/* Pillar 2: Deployed Modular Vaults */}
          <div
            style={{
              background: t.raised,
              borderRadius: 16,
              border: `1px solid ${t.rule}`,
              padding: 24,
              transform: `translateY(${(1 - card2Spring) * 30}px)`,
              opacity: card2Spring,
              boxShadow: "0 4px 20px rgba(22, 18, 48, 0.04)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: t.accent, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              MODULAR SMART CONTRACTS
            </div>
            <div style={{ fontFamily: t.displayFont, fontSize: 24, marginBottom: 12, color: t.ink }}>
              AegisVault On-Chain
            </div>
            <div style={{ fontSize: 14, color: t.inkMuted, lineHeight: 1.5 }}>
              Clean bytecode deployed at <code style={{ fontSize: 12, color: t.ink, background: "rgba(22, 18, 48, 0.06)", padding: "2px 4px", borderRadius: 4 }}>0xC064...dA29</code>. Decoupled accounting for fees, collateral, and automated hedge dispatch.
            </div>
          </div>

          {/* Pillar 3: Central Limit Orderbook Routing */}
          <div
            style={{
              background: t.raised,
              borderRadius: 16,
              border: `1px solid ${t.rule}`,
              padding: 24,
              transform: `translateY(${(1 - card3Spring) * 30}px)`,
              opacity: card3Spring,
              boxShadow: "0 4px 20px rgba(22, 18, 48, 0.04)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: t.accent, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              HYPERCORE PERP ENGINE
            </div>
            <div style={{ fontFamily: t.displayFont, fontSize: 24, marginBottom: 12, color: t.ink }}>
              Deep CLOB Liquidity
            </div>
            <div style={{ fontSize: 14, color: t.inkMuted, lineHeight: 1.5 }}>
              Dispatches non-custodial post-only short limit orders into the Hyperliquid L1 orderbook to lock in synthetic delta neutrality.
            </div>
          </div>
        </div>

        {/* Security Invariant INV-1 Focus Box */}
        <div
          style={{
            background: t.raised,
            borderRadius: 16,
            border: `1px solid ${t.accent}44`,
            padding: "24px 32px",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 24,
            alignItems: "center",
            transform: `scale(${invSpring})`,
            opacity: invSpring,
            boxShadow: "0 8px 30px rgba(7, 112, 95, 0.06)",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: "rgba(7, 112, 95, 0.1)",
              border: `1px solid ${t.accent}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: t.accent,
              fontWeight: 700,
              fontSize: 22,
            }}
          >
            🛡️
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.accent, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                SECURITY INVARIANT INV-1
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.accent, padding: "2px 8px", background: "rgba(7, 112, 95, 0.1)", borderRadius: 6 }}>
                0% CUSTODY RISK
              </span>
            </div>
            <div style={{ fontSize: 16, color: t.ink, fontWeight: 500 }}>
              Users sign an ephemeral, trade-only session key delegation. Sentinels hold <strong>zero withdrawal permissions</strong> and cannot touch user funds under any condition.
            </div>
          </div>
          <div style={{ textAlign: "right", borderLeft: `1px solid ${t.rule}`, paddingLeft: 24 }}>
            <div style={{ fontSize: 12, color: t.inkMuted, textTransform: "uppercase" }}>Withdrawal Rights</div>
            <div style={{ fontFamily: t.displayFont, fontSize: 24, color: t.danger, fontWeight: 600 }}>0.00% (Strictly Forbidden)</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
