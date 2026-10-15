import os
import json
import time
from playwright.sync_api import sync_playwright

CURSOR_AND_CAPTION_SCRIPT = """
(() => {
    if (document.getElementById('aegisVirtualCursor')) return;

    // --- 1. Styles ---
    const style = document.createElement('style');
    style.id = 'aegisRecordingStyle';
    style.textContent = `
        /* Virtual Presenter Cursor */
        #aegisVirtualCursor {
            position: fixed;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 2147483647;
            transform: translate3d(640px, 360px, 0);
            will-change: transform;
        }
        #aegisCursorHalo {
            position: absolute;
            top: -30px;
            left: -30px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(13, 148, 136, 0.45) 0%, rgba(13, 148, 136, 0.15) 50%, rgba(13, 148, 136, 0) 75%);
            border: 2px solid rgba(13, 148, 136, 0.95);
            box-shadow: 0 0 18px rgba(13, 148, 136, 0.65), inset 0 0 10px rgba(13, 148, 136, 0.35);
            animation: aegisHaloPulse 1.2s ease-in-out infinite alternate;
        }
        @keyframes aegisHaloPulse {
            0% { transform: scale(0.92); opacity: 0.85; }
            100% { transform: scale(1.25); opacity: 1; }
        }
        #aegisCursorRipple {
            position: absolute;
            top: -26px;
            left: -26px;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            border: 3.5px solid #0D9488;
            box-shadow: 0 0 20px #0D9488;
            transform: scale(0.2);
            opacity: 0;
            pointer-events: none;
        }
        #aegisCursorPointer {
            position: absolute;
            top: 0;
            left: 0;
            filter: drop-shadow(0 4px 10px rgba(14, 22, 38, 0.45));
        }
        #aegisCursorTag {
            position: absolute;
            top: 26px;
            left: 22px;
            white-space: nowrap;
            background: #1C2238;
            color: #FFFFFF;
            border: 1.5px solid #0D9488;
            border-radius: 6px;
            padding: 5px 12px;
            font-family: 'Inter', -apple-system, sans-serif;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.3px;
            box-shadow: 0 8px 24px rgba(14, 22, 38, 0.3);
            opacity: 0;
            transform: translateY(4px);
            transition: opacity 0.2s ease, transform 0.2s ease;
        }
        #aegisCursorTag.visible {
            opacity: 1;
            transform: translateY(0);
        }

        /* Brand Embedded Caption Component */
        #aegisCaptionContainer {
            position: fixed;
            bottom: 22px;
            left: 0;
            right: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            pointer-events: none;
            z-index: 2147483640;
            padding: 0 24px;
        }
        #aegisCaptionCard {
            background: rgba(14, 22, 38, 0.94);
            border: 1px solid rgba(13, 148, 136, 0.6);
            border-radius: 12px;
            padding: 9px 20px;
            box-shadow: 0 10px 32px rgba(0, 0, 0, 0.42), 0 0 16px rgba(13, 148, 136, 0.2);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 980px;
            opacity: 0;
            transform: translateY(8px);
            transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        #aegisCaptionCard.visible {
            opacity: 1;
            transform: translateY(0);
        }
        #aegisCaptionBadge {
            background: rgba(13, 148, 136, 0.25);
            color: #5FD9BE;
            border: 1px solid rgba(95, 217, 190, 0.6);
            border-radius: 6px;
            padding: 3px 8px;
            font-family: 'Inter', -apple-system, sans-serif;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            flex-shrink: 0;
        }
        #aegisCaptionText {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 14.5px;
            font-weight: 500;
            line-height: 1.4;
            color: #FFFFFF;
            letter-spacing: -0.01em;
            text-shadow: 0 1px 2px rgba(0,0,0,0.6);
        }
    `;
    document.head.appendChild(style);

    // --- 2. Cursor DOM ---
    const wrap = document.createElement('div');
    wrap.id = 'aegisVirtualCursor';
    wrap.innerHTML = `
        <div id="aegisCursorHalo"></div>
        <div id="aegisCursorRipple"></div>
        <svg id="aegisCursorPointer" width="34" height="34" viewBox="0 0 34 34" fill="none">
            <path d="M4 2 L28 14 L16 18 L12 30 L4 2 Z" fill="#0D9488" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>
        </svg>
        <div id="aegisCursorTag"></div>
    `;
    document.body.appendChild(wrap);

    // --- 3. Caption DOM ---
    const captionWrap = document.createElement('div');
    captionWrap.id = 'aegisCaptionContainer';
    captionWrap.innerHTML = `
        <div id="aegisCaptionCard">
            <span id="aegisCaptionBadge"></span>
            <span id="aegisCaptionText"></span>
        </div>
    `;
    document.body.appendChild(captionWrap);

    // --- 4. Controls & Timeline ---
    window.__cursorState = {
        x: 640,
        y: 360,
        el: wrap,
        tagEl: wrap.querySelector('#aegisCursorTag'),
        rippleEl: wrap.querySelector('#aegisCursorRipple')
    };

    window.__captionCard = captionWrap.querySelector('#aegisCaptionCard');
    window.__captionBadge = captionWrap.querySelector('#aegisCaptionBadge');
    window.__captionText = captionWrap.querySelector('#aegisCaptionText');

    window.__setCursorPos = (x, y) => {
        window.__cursorState.x = x;
        window.__cursorState.y = y;
        window.__cursorState.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    window.__showTag = (text) => {
        if (!text) {
            window.__cursorState.tagEl.classList.remove('visible');
            return;
        }
        window.__cursorState.tagEl.textContent = text;
        window.__cursorState.tagEl.classList.add('visible');
    };

    window.__triggerRipple = () => {
        const r = window.__cursorState.rippleEl;
        r.style.transition = 'none';
        r.style.transform = 'scale(0.2)';
        r.style.opacity = '1';
        requestAnimationFrame(() => {
            r.style.transition = 'transform 0.45s ease-out, opacity 0.45s ease-out';
            r.style.transform = 'scale(2.2)';
            r.style.opacity = '0';
        });
    };

    window.__moveCursorSmooth = (targetX, targetY, durationMs = 500) => {
        return new Promise(resolve => {
            const startX = window.__cursorState.x;
            const startY = window.__cursorState.y;
            const startTime = performance.now();

            function step(now) {
                const elapsed = now - startTime;
                const progress = Math.min(1, elapsed / durationMs);
                const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                const curX = startX + (targetX - startX) * ease;
                const curY = startY + (targetY - startY) * ease;
                window.__setCursorPos(curX, curY);

                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    window.__setCursorPos(targetX, targetY);
                    resolve();
                }
            }
            requestAnimationFrame(step);
        });
    };

    // Auto-running deterministic caption ticker
    window.__initCaptionTimeline = (captions) => {
        window.__captionsList = captions;
        window.__timelineStart = performance.now();
        let currentIdx = -1;

        function tick() {
            const now = performance.now();
            const elapsed = (now - window.__timelineStart) / 1000;

            let active = null;
            let activeIdx = -1;
            for (let i = 0; i < window.__captionsList.length; i++) {
                const c = window.__captionsList[i];
                if (elapsed >= c.start && elapsed < c.end) {
                    active = c;
                    activeIdx = i;
                    break;
                }
            }

            if (active) {
                if (activeIdx !== currentIdx) {
                    window.__captionBadge.textContent = active.badge;
                    window.__captionText.textContent = active.text;
                    window.__captionCard.classList.add('visible');
                    currentIdx = activeIdx;
                }
            } else {
                if (currentIdx !== -1) {
                    window.__captionCard.classList.remove('visible');
                    currentIdx = -1;
                }
            }

            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    };
})();
"""

FULL_DEMO_CAPTIONS = [
    # Chapter 1: 0.5s -> 31.0s (Live Architecture & Telemetry Overview)
    {"start": 0.5, "end": 7.0, "badge": "WELCOME", "text": "Welcome to the live product demonstration of AEGIS, the first autonomous risk engine eliminating forced liquidations in DeFi."},
    {"start": 7.0, "end": 14.5, "badge": "0x0801 PRECOMPILE", "text": "We are live on Elysium L2 testnet (Chain ID 99801), streaming mark prices in sub-78ms from HyperCore Precompile 0x0801."},
    {"start": 14.5, "end": 22.0, "badge": "VAULT POSITION", "text": "On screen, our vault holds 1,000 HYPE collateral ($48.5k) and $32,000 USDC borrowed debt..."},
    {"start": 22.0, "end": 30.5, "badge": "HEALTH FACTOR", "text": "...maintaining a safe Health Factor of 1.41 on our dynamic radial gauge."},

    # Chapter 2: 31.5s -> 59.0s (1-Click Lite Auto-Pilot)
    {"start": 31.5, "end": 37.5, "badge": "1-CLICK AUTO-PILOT", "text": "For everyday borrowers, AEGIS provides the 1-Click Lite Auto-Pilot."},
    {"start": 37.5, "end": 44.5, "badge": "RISK PRESETS", "text": "Users select from three mathematically modeled defense presets: Conservative (1.25), Aggressive (1.08), or Balanced (1.15)."},
    {"start": 44.5, "end": 50.5, "badge": "TESTNET FAUCET", "text": "We pick the 0.05 HYPE micro-deposit chip, calibrated for the Elysium testnet faucet cap."},
    {"start": 50.5, "end": 58.5, "badge": "INV-1 SESSION KEY", "text": "Clicking Activate Shield delegates an ephemeral session key under Invariant INV-1, restricted strictly to trade-only hedging."},

    # Chapter 3: 59.5s -> 80.5s (Pro Terminal Controls)
    {"start": 59.5, "end": 65.0, "badge": "PRO TERMINAL", "text": "For institutional quants, the Pro Terminal unlocks granular algorithmic parameters."},
    {"start": 65.0, "end": 72.5, "badge": "QUANT CONTROLS", "text": "Traders set exact collateral price triggers, health thresholds, delta coverage ratios from 10% to 100%, and trailing profit locks."},
    {"start": 72.5, "end": 80.0, "badge": "HYPERCORE CLOB", "text": "Below, our terminal streams the live 10-level Central Limit Orderbook directly from HyperCore, showing sub-tick execution depth."},

    # Chapter 4: 81.0s -> 109.0s (Live -18% Flash Crash Simulation)
    {"start": 81.0, "end": 86.5, "badge": "STRESS TEST", "text": "Now, let's witness AEGIS under extreme volatility. We trigger a live -18% flash crash simulation."},
    {"start": 86.5, "end": 94.0, "badge": "FLASH CRASH -18%", "text": "As the price falls toward the $40 liquidation barrier, the Health Factor drops below our 1.15 threshold."},
    {"start": 94.0, "end": 101.5, "badge": "0x0802 ATOMIC SHORT", "text": "In under 78 milliseconds, the Sentinel engine detects the breach and dispatches an atomic short hedge via Predeploy 0x0802."},
    {"start": 101.5, "end": 108.5, "badge": "COLLATERAL SAFE", "text": "In the Active Hedge panel, our short position absorbs the drop dollar-for-dollar. Spot collateral remains 100% safe."},

    # Chapter 5: 109.5s -> 138.5s (V-Bounce & Trailing Profit Unwind)
    {"start": 109.5, "end": 117.0, "badge": "V-BOUNCE REBOUND", "text": "Next, the market bottoms out at $34.50 and rebounds. The moment price bounces by 1.5%, the take-profit trigger fires automatically."},
    {"start": 117.0, "end": 125.0, "badge": "DEBT PAYDOWN", "text": "The short hedge buys back on the orderbook, locking in cash profits. 90% of net profits pay down debt, restoring Health Factor above 1.25."},
    {"start": 125.0, "end": 138.0, "badge": "INV-4 STAKER YIELD", "text": "The 10% performance fee splits under Invariant INV-4: 50% burned via Ascend Hook Pools, and 50% paid as real yield to bonded Sentinel stakers."},

    # Chapter 6: 139.5s -> 164.0s (Emergency Killswitch & Pitch Wrap-Up)
    {"start": 139.5, "end": 147.0, "badge": "INV-3 KILLSWITCH", "text": "Finally, safety is non-negotiable. Under Invariant INV-3, borrowers retain an atomic Manual Override killswitch to instantly revoke keys."},
    {"start": 147.0, "end": 155.0, "badge": "INV-5 NONCES", "text": "In the audit terminal, every intent is signed via EIP-712 with strictly monotonic nonces under Invariant INV-5, preventing replay attacks."},
    {"start": 155.0, "end": 163.5, "badge": "AEGIS PROTOCOL", "text": "AEGIS eliminates liquidation loss forever. Explore the live terminal at aegis.trade."}
]

def inject_cursor_and_captions(page):
    page.evaluate(CURSOR_AND_CAPTION_SCRIPT)
    page.evaluate(f"window.__initCaptionTimeline({json.dumps(FULL_DEMO_CAPTIONS)})")

def point_to(page, selector, tag=None, duration_ms=450, pause_after_ms=600, click=False):
    coords = page.evaluate(f"""() => {{
        const el = document.querySelector("{selector}");
        if (!el) return null;
        el.scrollIntoView({{ behavior: 'smooth', block: 'nearest' }});
        const rect = el.getBoundingClientRect();
        return {{
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2)
        }};
    }}""")

    if coords:
        if tag:
            page.evaluate(f"window.__showTag('{tag}')")
        page.evaluate(f"window.__moveCursorSmooth({coords['x']}, {coords['y']}, {duration_ms})")
        page.wait_for_timeout(duration_ms + 40)
        if click:
            page.evaluate("window.__triggerRipple()")
            page.evaluate(f"""() => {{
                const el = document.querySelector("{selector}");
                if (el) el.click();
            }}""")
            page.wait_for_timeout(100)
    if pause_after_ms > 0:
        page.wait_for_timeout(pause_after_ms)

def record_full_demo_with_captions():
    output_dir = "remotion/public/recordings"
    os.makedirs(output_dir, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            headless=True
        )
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            record_video_dir=output_dir,
            record_video_size={"width": 1280, "height": 720}
        )

        context.add_init_script("""
            localStorage.setItem('aegis-theme', 'light');
            localStorage.setItem('aegis_access_authorized', 'true');
            localStorage.setItem('aegis_access_code', 'AEGIS-TESTNET-SP9Y-MTKP');
        """)

        page = context.new_page()
        page.goto("http://localhost:3000")
        page.wait_for_load_state("networkidle")

        page.evaluate("""() => {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('aegis-theme', 'light');
            const toggle = document.getElementById('themeToggleText');
            if (toggle) toggle.textContent = 'Dark mode';
        }""")

        inject_cursor_and_captions(page)
        print("Page loaded in LIGHT MODE & synchronized captions + cursor initialized.")
        print("Starting synchronized 164.0s Full Walkthrough with embedded captions...")

        start_time = time.time()

        def wait_until(target_s):
            elapsed = time.time() - start_time
            rem_ms = int((target_s - elapsed) * 1000)
            if rem_ms > 0:
                page.wait_for_timeout(rem_ms)

        # ======================================================================
        # CHAPTER 1: Live Architecture & Overview (Target: 0.0s -> 31.0s)
        # ======================================================================
        page.wait_for_timeout(600)
        point_to(page, "#walletBtn", tag="Connect Elysium L2 Wallet", duration_ms=400, pause_after_ms=800, click=True)
        point_to(page, "#btnConfirmSign", tag="Sign & Connect (Chain 99801)", duration_ms=350, pause_after_ms=1000, click=True)
        point_to(page, ".network-badge", tag="Elysium L2 (Chain 99801)", duration_ms=450, pause_after_ms=2500)
        point_to(page, "#latencyBadge", tag="0x0801 Precompile: 68ms Latency", duration_ms=450, pause_after_ms=3000)
        point_to(page, "#posCollateralAmount", tag="1,000.00 HYPE Collateral ($48.5k)", duration_ms=450, pause_after_ms=3500)
        point_to(page, "#posDebtAmount", tag="$32,000.00 USDC Borrowed Debt", duration_ms=450, pause_after_ms=3000)
        point_to(page, "#gaugeSvgContainer", tag="Health Factor: 1.41 (Safe Zone)", duration_ms=450, pause_after_ms=4000)
        wait_until(31.0)
        print(f"Chapter 1 completed at {time.time() - start_time:.2f}s")

        # ======================================================================
        # CHAPTER 2: 1-Click Lite Auto-Pilot (Target: 31.0s -> 59.0s)
        # ======================================================================
        point_to(page, "#modeLiteBtn", tag="Switch to Lite Auto-Pilot", duration_ms=450, pause_after_ms=1800, click=True)
        point_to(page, "#presetConservative", tag="Conservative Preset (H <= 1.25)", duration_ms=450, pause_after_ms=2000, click=True)
        point_to(page, "#presetAggressive", tag="Aggressive Preset (H <= 1.08)", duration_ms=450, pause_after_ms=2000, click=True)
        point_to(page, "#presetBalanced", tag="Balanced Preset (H <= 1.15)", duration_ms=450, pause_after_ms=2000, click=True)
        point_to(page, "#chip005", tag="0.05 HYPE Faucet Deposit", duration_ms=400, pause_after_ms=1600, click=True)
        point_to(page, "#btnLiteActivateShield", tag="Activate Auto-Pilot Shield", duration_ms=450, pause_after_ms=2500, click=True)
        point_to(page, "#liteTelemetryCard", tag="Session Key Armed (INV-1)", duration_ms=450, pause_after_ms=3500)
        wait_until(59.0)
        print(f"Chapter 2 completed at {time.time() - start_time:.2f}s")

        # ======================================================================
        # CHAPTER 3: Pro Terminal & Algorithmic Controls (Target: 59.0s -> 80.5s)
        # ======================================================================
        point_to(page, "#modeProBtn", tag="Switch to Pro Terminal", duration_ms=450, pause_after_ms=1500, click=True)
        point_to(page, "#hedgeCoverage", tag="Delta Coverage Ratio: 70%", duration_ms=400, pause_after_ms=600)
        page.evaluate("""() => {
            const cov = document.getElementById('hedgeCoverage');
            if (cov) { cov.value = '70'; cov.dispatchEvent(new Event('input', {bubbles: true})); }
        }""")
        page.wait_for_timeout(1400)

        point_to(page, "#trailingTp", tag="Trailing Profit Lock: 2.0%", duration_ms=400, pause_after_ms=600)
        page.evaluate("""() => {
            const tp = document.getElementById('trailingTp');
            if (tp) { tp.value = '2.0'; tp.dispatchEvent(new Event('input', {bubbles: true})); }
        }""")
        page.wait_for_timeout(1400)

        point_to(page, "#btnSaveConfig", tag="Save Parameters on Elysium", duration_ms=450, pause_after_ms=1800, click=True)
        point_to(page, "#proOrderbookCard", tag="HyperCore L1 CLOB Depth (0x0801)", duration_ms=450, pause_after_ms=4000)
        wait_until(80.5)
        print(f"Chapter 3 completed at {time.time() - start_time:.2f}s")

        # ======================================================================
        # CHAPTER 4: Real Flash Crash Simulation (-18%) (Target: 80.5s -> 109.0s)
        # ======================================================================
        point_to(page, "#btnCrashTest", tag="Trigger -18% Flash Crash", duration_ms=450, pause_after_ms=1500, click=True)
        print("Flash crash simulation triggered...")
        point_to(page, "#liveMarkPrice", tag="Mark Price Falling: $48 -> $34", duration_ms=450, pause_after_ms=3800)
        point_to(page, "#gaugeSvgContainer", tag="Health Drops Below 1.15 Trigger", duration_ms=450, pause_after_ms=3800)
        point_to(page, "#activeHedgeBox", tag="0x0802 Sub-78ms Short Hedge Active", duration_ms=450, pause_after_ms=4500)
        point_to(page, "#hedgePnlVal", tag="Floating PnL Absorbs Loss (+$5,480)", duration_ms=450, pause_after_ms=4800)
        wait_until(109.0)
        print(f"Chapter 4 completed at {time.time() - start_time:.2f}s")

        # ======================================================================
        # CHAPTER 5: V-Bounce & Trailing Profit Unwind (Target: 109.0s -> 138.5s)
        # ======================================================================
        point_to(page, "#btnRetraceTest", tag="Trigger V-Bounce Rebound", duration_ms=450, pause_after_ms=1500, click=True)
        print("V-Bounce & Trailing take-profit triggered...")
        point_to(page, "#liveMarkPrice", tag="Price Rebounding from $34.50", duration_ms=450, pause_after_ms=3800)
        point_to(page, "#activeHedgeBox", tag="Short Buyback: Cash Profit Locked", duration_ms=450, pause_after_ms=4000)
        point_to(page, "#gaugeSvgContainer", tag="Debt Reduced & Health > 1.25", duration_ms=450, pause_after_ms=4000)
        point_to(page, ".token-card", tag="INV-4: 50% Burn / 50% Staker Yield", duration_ms=450, pause_after_ms=5000)
        wait_until(138.5)
        print(f"Chapter 5 completed at {time.time() - start_time:.2f}s")

        # ======================================================================
        # CHAPTER 6: Emergency Killswitch (INV-3) & Wrap-Up (Target: 138.5s -> 164.0s)
        # ======================================================================
        point_to(page, "#btnManualOverride", tag="Emergency Override Killswitch (INV-3)", duration_ms=450, pause_after_ms=3200, click=True)
        point_to(page, "#auditTerminal", tag="Monotonic Nonces (INV-5) Logged", duration_ms=450, pause_after_ms=4500)
        point_to(page, "#btnResetMarket", tag="Reset Simulation", duration_ms=400, pause_after_ms=2200, click=True)
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        point_to(page, ".brand-badge", tag="AEGIS Protocol: aegis.trade", duration_ms=450, pause_after_ms=3500)
        wait_until(164.0)
        print(f"Chapter 6 completed at {time.time() - start_time:.2f}s")

        print(f"Synchronized walkthrough complete in {time.time() - start_time:.2f}s. Finalizing recording...")
        context.close()
        browser.close()

    files = [f for f in os.listdir(output_dir) if f.endswith(".webm")]
    if files:
        latest_file = sorted(files, key=lambda x: os.path.getmtime(os.path.join(output_dir, x)))[-1]
        target_path = os.path.join(output_dir, "live-product-demo.webm")
        if os.path.exists(target_path):
            os.remove(target_path)
        os.rename(os.path.join(output_dir, latest_file), target_path)
        print(f"Recorded live demo with captions saved to: {target_path}")

if __name__ == "__main__":
    record_full_demo_with_captions()
