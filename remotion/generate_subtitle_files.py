import os

def format_timestamp_srt(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def format_timestamp_vtt(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"

PITCH_CAPTIONS = [
    (0.5, 5.0, "WELCOME", "Welcome to AEGIS, the first autonomous risk engine eliminating forced liquidations in DeFi."),
    (5.0, 10.5, "0x0801 TELEMETRY", "Live on Elysium Layer 2, our terminal connects directly to HyperCore Precompile 0x0801, streaming mark prices in sub-78 milliseconds."),
    (10.5, 17.0, "VAULT STATE", "On screen, our vault holds 1,000 HYPE collateral and $32,000 USDC debt..."),
    (17.0, 23.5, "HEALTH FACTOR", "...maintaining a safe 1.41 Health Factor on our live radial gauge."),
    (24.0, 29.5, "LITE AUTO-PILOT", "For everyday borrowers, the main user experience is our 1-Click Lite Auto-Pilot."),
    (29.5, 35.5, "DEFENSE PRESETS", "Calibrated for testnet faucet micro-deposits, users select Conservative, Balanced, or Aggressive presets."),
    (35.5, 43.5, "INV-1 SESSION KEY", "Activating the shield delegates an ephemeral session key under Invariant INV-1, mathematically restricted to trade-only hedging."),
    (44.5, 50.0, "PRO TERMINAL", "For institutional quants, the Pro Terminal unlocks granular parameters..."),
    (50.0, 56.5, "ALGORITHMIC RISK", "...customizable trigger prices, delta coverage ratios from 10% to 100%, and trailing profit locks."),
    (56.5, 62.5, "HYPERCORE CLOB", "Below, our terminal streams the live central limit order book directly from HyperCore, monitoring sub-tick execution depth."),
    (63.0, 68.0, "CORE ENGINE", "Now for our core functionality: eliminating liquidation loss."),
    (68.0, 74.5, "FLASH CRASH -18%", "During a live -18% flash crash simulation, as price drops toward liquidation, the Health Factor falls below 1.15."),
    (74.5, 81.0, "0x0802 SHORT HEDGE", "In under 78 milliseconds, our Sentinel dispatches an atomic short hedge via Predeploy 0x0802 on HyperCore."),
    (81.0, 87.5, "COLLATERAL SAFE", "The short absorbs the drop dollar-for-dollar. Spot collateral remains 100% safe."),
    (88.0, 94.0, "V-BOUNCE UNWIND", "When the market rebounds by our 1.5% trailing buffer, AEGIS automatically buys back the short, locking in cash profits."),
    (94.0, 100.0, "DEBT PAYDOWN", "90% of gains pay down debt, restoring the Health Factor comfortably above 1.25."),
    (100.0, 106.5, "INV-3 KILLSWITCH", "Borrowers retain an atomic Manual Override killswitch under Invariant INV-3."),
    (106.5, 113.5, "AEGIS PROTOCOL", "With 5 formal invariants verified over 160,000 fuzz runs, AEGIS eliminates liquidation loss forever.")
]

FULL_CAPTIONS = [
    (0.5, 7.0, "WELCOME", "Welcome to the live product demonstration of AEGIS, the first autonomous risk engine eliminating forced liquidations in DeFi."),
    (7.0, 14.5, "0x0801 PRECOMPILE", "We are live on Elysium L2 testnet (Chain ID 99801), streaming mark prices in sub-78ms from HyperCore Precompile 0x0801."),
    (14.5, 22.0, "VAULT POSITION", "On screen, our vault holds 1,000 HYPE collateral ($48.5k) and $32,000 USDC borrowed debt..."),
    (22.0, 30.5, "HEALTH FACTOR", "...maintaining a safe Health Factor of 1.41 on our dynamic radial gauge."),
    (31.5, 37.5, "1-CLICK AUTO-PILOT", "For everyday borrowers, AEGIS provides the 1-Click Lite Auto-Pilot."),
    (37.5, 44.5, "RISK PRESETS", "Users select from three mathematically modeled defense presets: Conservative (1.25), Aggressive (1.08), or Balanced (1.15)."),
    (44.5, 50.5, "TESTNET FAUCET", "We pick the 0.05 HYPE micro-deposit chip, calibrated for the Elysium testnet faucet cap."),
    (50.5, 58.5, "INV-1 SESSION KEY", "Clicking Activate Shield delegates an ephemeral session key under Invariant INV-1, restricted strictly to trade-only hedging."),
    (59.5, 65.0, "PRO TERMINAL", "For institutional quants, the Pro Terminal unlocks granular algorithmic parameters."),
    (65.0, 72.5, "QUANT CONTROLS", "Traders set exact collateral price triggers, health thresholds, delta coverage ratios from 10% to 100%, and trailing profit locks."),
    (72.5, 80.0, "HYPERCORE CLOB", "Below, our terminal streams the live 10-level Central Limit Orderbook directly from HyperCore, showing sub-tick execution depth."),
    (81.0, 86.5, "STRESS TEST", "Now, let's witness AEGIS under extreme volatility. We trigger a live -18% flash crash simulation."),
    (86.5, 94.0, "FLASH CRASH -18%", "As the price falls toward the $40 liquidation barrier, the Health Factor drops below our 1.15 threshold."),
    (94.0, 101.5, "0x0802 ATOMIC SHORT", "In under 78 milliseconds, the Sentinel engine detects the breach and dispatches an atomic short hedge via Predeploy 0x0802."),
    (101.5, 108.5, "COLLATERAL SAFE", "In the Active Hedge panel, our short position absorbs the drop dollar-for-dollar. Spot collateral remains 100% safe."),
    (109.5, 117.0, "V-BOUNCE REBOUND", "Next, the market bottoms out at $34.50 and rebounds. The moment price bounces by 1.5%, the take-profit trigger fires automatically."),
    (117.0, 125.0, "DEBT PAYDOWN", "The short hedge buys back on the orderbook, locking in cash profits. 90% of net profits pay down debt, restoring Health Factor above 1.25."),
    (125.0, 138.0, "INV-4 STAKER YIELD", "The 10% performance fee splits under Invariant INV-4: 50% burned via Ascend Hook Pools, and 50% paid as real yield to bonded Sentinel stakers."),
    (139.5, 147.0, "INV-3 KILLSWITCH", "Finally, safety is non-negotiable. Under Invariant INV-3, borrowers retain an atomic Manual Override killswitch to instantly revoke keys."),
    (147.0, 155.0, "INV-5 NONCES", "In the audit terminal, every intent is signed via EIP-712 with strictly monotonic nonces under Invariant INV-5, preventing replay attacks."),
    (155.0, 163.5, "AEGIS PROTOCOL", "AEGIS eliminates liquidation loss forever. Explore the live terminal at aegis.trade.")
]

def export_subtitles(captions, base_path):
    srt_lines = []
    vtt_lines = ["WEBVTT\n"]

    for idx, (s, e, badge, text) in enumerate(captions, start=1):
        # SRT
        srt_lines.append(f"{idx}")
        srt_lines.append(f"{format_timestamp_srt(s)} --> {format_timestamp_srt(e)}")
        srt_lines.append(f"[{badge}] {text}\n")

        # VTT
        vtt_lines.append(f"{idx}")
        vtt_lines.append(f"{format_timestamp_vtt(s)} --> {format_timestamp_vtt(e)}")
        vtt_lines.append(f"[{badge}] {text}\n")

    srt_path = f"{base_path}.srt"
    vtt_path = f"{base_path}.vtt"

    with open(srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))
    with open(vtt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(vtt_lines))
    
    print(f"Exported: {srt_path} & {vtt_path}")

def main():
    os.makedirs("brand/x", exist_ok=True)
    export_subtitles(PITCH_CAPTIONS, "brand/x/aegis-pitch-demo-120s")
    export_subtitles(FULL_CAPTIONS, "brand/x/aegis-live-product-demo")
    export_subtitles(FULL_CAPTIONS, "brand/x/aegis-product-demo-3min")

if __name__ == "__main__":
    main()
