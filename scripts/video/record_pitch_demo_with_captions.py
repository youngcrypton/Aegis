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

PITCH_CAPTIONS = [
    # Chapter 1: 0.5s -> 24.0s (Live Architecture & Telemetry Overview)
    {"start": 0.5, "end": 5.0, "badge": "WELCOME", "text": "Welcome to AEGIS, the first autonomous risk engine eliminating forced liquidations in DeFi."},
    {"start": 5.0, "end": 10.5, "badge": "0x0801 TELEMETRY", "text": "Live on Elysium Layer 2, our terminal connects directly to HyperCore Precompile 0x0801, streaming mark prices in sub-78 milliseconds."},
    {"start": 10.5, "end": 17.0, "badge": "VAULT STATE", "text": "On screen, our vault holds 1,000 HYPE collateral and $32,000 USDC debt..."},
    {"start": 17.0, "end": 23.5, "badge": "HEALTH FACTOR", "text": "...maintaining a safe 1.41 Health Factor on our live radial gauge."},

    # Chapter 2: 24.0s -> 44.5s (1-Click Lite Auto-Pilot Experience)
    {"start": 24.0, "end": 29.5, "badge": "LITE AUTO-PILOT", "text": "For everyday borrowers, the main user experience is our 1-Click Lite Auto-Pilot."},
    {"start": 29.5, "end": 35.5, "badge": "DEFENSE PRESETS", "text": "Calibrated for testnet faucet micro-deposits, users select Conservative, Balanced, or Aggressive presets."},
    {"start": 35.5, "end": 43.5, "badge": "INV-1 SESSION KEY", "text": "Activating the shield delegates an ephemeral session key under Invariant INV-1, mathematically restricted to trade-only hedging."},

    # Chapter 3: 44.5s -> 63.0s (Pro Terminal Controls & CLOB Depth)
    {"start": 44.5, "end": 50.0, "badge": "PRO TERMINAL", "text": "For institutional quants, the Pro Terminal unlocks granular parameters..."},
    {"start": 50.0, "end": 56.5, "badge": "ALGORITHMIC RISK", "text": "...customizable trigger prices, delta coverage ratios from 10% to 100%, and trailing profit locks."},
    {"start": 56.5, "end": 62.5, "badge": "HYPERCORE CLOB", "text": "Below, our terminal streams the live central limit order book directly from HyperCore, monitoring sub-tick execution depth."},

    # Chapter 4: 63.0s -> 88.0s (Live Flash Crash Simulation & Atomic Short Hedge)
    {"start": 63.0, "end": 68.0, "badge": "CORE ENGINE", "text": "Now for our core functionality: eliminating liquidation loss."},
    {"start": 68.0, "end": 74.5, "badge": "FLASH CRASH -18%", "text": "During a live -18% flash crash simulation, as price drops toward liquidation, the Health Factor falls below 1.15."},
    {"start": 74.5, "end": 81.0, "badge": "0x0802 SHORT HEDGE", "text": "In under 78 milliseconds, our Sentinel dispatches an atomic short hedge via Predeploy 0x0802 on HyperCore."},
    {"start": 81.0, "end": 87.5, "badge": "COLLATERAL SAFE", "text": "The short absorbs the drop dollar-for-dollar. Spot collateral remains 100% safe."},

    # Chapter 5: 88.0s -> 114.0s (V-Bounce Trailing Profit Unwind, Killswitch & Wrap-Up)
    {"start": 88.0, "end": 94.0, "badge": "V-BOUNCE UNWIND", "text": "When the market rebounds by our 1.5% trailing buffer, AEGIS automatically buys back the short, locking in cash profits."},
    {"start": 94.0, "end": 100.0, "badge": "DEBT PAYDOWN", "text": "90% of gains pay down debt, restoring the Health Factor comfortably above 1.25."},
    {"start": 100.0, "end": 106.5, "badge": "INV-3 KILLSWITCH", "text": "Borrowers retain an atomic Manual Override killswitch under Invariant INV-3."},
    {"start": 106.5, "end": 113.5, "badge": "AEGIS PROTOCOL", "text": "With 5 formal invariants verified over 160,000 fuzz runs, AEGIS eliminates liquidation loss forever."}
]

def inject_cursor_and_captions(page):
    page.evaluate(CURSOR_AND_CAPTION_SCRIPT)
    page.evaluate(f"window.__initCaptionTimeline({json.dumps(PITCH_CAPTIONS)})")

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

def record_pitch_demo_with_captions():
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

        # Enforce Light Mode and authorized access
        context.add_init_script("""
            localStorage.setItem('aegis-theme', 'light');
            localStorage.setItem('aegis_access_authorized', 'true');
            localStorage.setItem('aegis_access_code', 'AEGIS-TESTNET-SP9Y-MTKP');
        """)

        page = context.new_page()
        page.goto("http://localhost:3000")
        page.wait_for_load_state("networkidle")

        # Explicitly verify Light Mode attribute
        page.evaluate("""() => {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('aegis-theme', 'light');
            const toggle = document.getElementById('themeToggleText');
            if (toggle) toggle.textContent = 'Dark mode';
        }""")

        inject_cursor_and_captions(page)
        print("Page loaded in LIGHT MODE & synchronized captions + cursor initialized.")
        print("Starting synchronized 114.0s Master Pitch walkthrough with embedded captions...")

        start_time = time.time()

        def wait_until(target_s):
            elapsed = time.time() - start_time
            rem_ms = int((target_s - elapsed) * 1000)
            if rem_ms > 0:
                page.wait_for_timeout(rem_ms)

        # ======================================================================
        # CHAPTER 1: Live Architecture & Overview (Target: 0.0s -> 24.0s)
        # Voice: 0.5s -> 23.23s
        # ======================================================================
        page.wait_for_timeout(600)
        point_to(page, "#walletBtn", tag="Connect Elysium L2 Wallet", duration_ms=400, pause_after_ms=800, click=True)
        point_to(page, "#btnConfirmSign", tag="Sign & Connect (Chain 99801)", duration_ms=350, pause_after_ms=1000, click=True)
        point_to(page, "#latencyBadge", tag="0x0801 Precompile: 68ms Latency", duration_ms=450, pause_after_ms=3000)
        point_to(page, "#posCollateralAmount", tag="1,000.00 HYPE Collateral ($48,500)", duration_ms=450, pause_after_ms=3200)
        point_to(page, "#posDebtAmount", tag="$32,000.00 USDC Borrowed Debt", duration_ms=450, pause_after_ms=3000)
        point_to(page, "#gaugeSvgContainer", tag="Health Factor: 1.41 (Safe Zone)", duration_ms=450, pause_after_ms=3500)
        point_to(page, "#proOrderbookCard", tag="Live Streaming CLOB Depth", duration_ms=450, pause_after_ms=2500)
        wait_until(24.0)
        print(f"Chapter 1 completed at {time.time() - start_time:.2f}s")

        # ======================================================================
        # CHAPTER 2: 1-Click Lite Auto-Pilot Experience (Target: 24.0s -> 44.5s)
        # Voice: 24.0s -> 43.36s
        # ======================================================================
        point_to(page, "#modeLiteBtn", tag="1-Click Lite Auto-Pilot", duration_ms=450, pause_after_ms=1800, click=True)
        point_to(page, "#presetConservative", tag="Conservative Preset (H <= 1.25)", duration_ms=450, pause_after_ms=1800, click=True)
        point_to(page, "#presetAggressive", tag="Aggressive Preset (H <= 1.08)", duration_ms=450, pause_after_ms=1800, click=True)
        point_to(page, "#presetBalanced", tag="Balanced Preset (H <= 1.15)", duration_ms=450, pause_after_ms=1800, click=True)
        point_to(page, "#chip005", tag="0.05 HYPE Faucet Deposit", duration_ms=400, pause_after_ms=1500, click=True)
        point_to(page, "#btnLiteActivateShield", tag="Activate Auto-Pilot Shield", duration_ms=450, pause_after_ms=2200, click=True)
        point_to(page, "#liteTelemetryCard", tag="Session Key Armed (INV-1 Invariant)", duration_ms=450, pause_after_ms=3000)
        wait_until(44.5)
        print(f"Chapter 2 completed at {time.time() - start_time:.2f}s")

        # ======================================================================
        # CHAPTER 3: Pro Terminal Controls & CLOB Depth (Target: 44.5s -> 63.0s)
        # Voice: 44.5s -> 61.62s
        # ======================================================================
        point_to(page, "#modeProBtn", tag="Pro Trader Terminal", duration_ms=450, pause_after_ms=1600, click=True)
        point_to(page, "#hedgeCoverage", tag="Delta Coverage Ratio: 75%", duration_ms=400, pause_after_ms=600)
        page.evaluate("""() => {
            const cov = document.getElementById('hedgeCoverage');
            if (cov) { cov.value = '75'; cov.dispatchEvent(new Event('input', {bubbles: true})); }
        }""")
        page.wait_for_timeout(1400)

        point_to(page, "#trailingTp", tag="Trailing Take-Profit: 2.5%", duration_ms=400, pause_after_ms=600)
        page.evaluate("""() => {
            const tp = document.getElementById('trailingTp');
            if (tp) { tp.value = '2.5'; tp.dispatchEvent(new Event('input', {bubbles: true})); }
        }""")
        page.wait_for_timeout(1400)

        point_to(page, "#btnSaveConfig", tag="Save Parameters on Elysium L2", duration_ms=450, pause_after_ms=2000, click=True)
        point_to(page, "#proOrderbookCard", tag="HyperCore L1 CLOB Depth (0x0801)", duration_ms=450, pause_after_ms=3500)
        wait_until(63.0)
        print(f"Chapter 3 completed at {time.time() - start_time:.2f}s")

        # ======================================================================
        # CHAPTER 4: Live -18% Flash Crash & Atomic Short Hedge (Target: 63.0s -> 88.0s)
        # Voice: 63.0s -> 86.97s
        # ======================================================================
        point_to(page, "#btnCrashTest", tag="Trigger -18% Flash Crash", duration_ms=450, pause_after_ms=1600, click=True)
        print("Flash crash simulation triggered...")
        point_to(page, "#liveMarkPrice", tag="Mark Price Falling: $48.50 -> $39.77", duration_ms=450, pause_after_ms=3600)
        point_to(page, "#gaugeSvgContainer", tag="Health Drops Below 1.15 Sentinel Trigger", duration_ms=450, pause_after_ms=3800)
        point_to(page, "#activeHedgeBox", tag="0x0802 Sub-78ms Atomic Short Hedge", duration_ms=450, pause_after_ms=4500)
        point_to(page, "#hedgePnlVal", tag="Short PnL Offsets Loss (+$5,480)", duration_ms=450, pause_after_ms=4500)
        point_to(page, "#auditTerminal", tag="Elysium Precompile Log: 0x0802 Hedged", duration_ms=450, pause_after_ms=3500)
        wait_until(88.0)
        print(f"Chapter 4 completed at {time.time() - start_time:.2f}s")

        # ======================================================================
        # CHAPTER 5: V-Bounce, Trailing Profit Unwind, Killswitch & Pitch Wrap-Up (Target: 88.0s -> 114.0s)
        # Voice: 88.0s -> 111.15s
        # ======================================================================
        point_to(page, "#btnRetraceTest", tag="Trigger V-Bounce Rebound", duration_ms=450, pause_after_ms=1600, click=True)
        print("V-Bounce & Trailing take-profit triggered...")
        point_to(page, "#liveMarkPrice", tag="Price Rebounding from Bottom Wick", duration_ms=450, pause_after_ms=3600)
        point_to(page, "#activeHedgeBox", tag="Trailing Profit-Take: Short Unwound to USDC", duration_ms=450, pause_after_ms=4200)
        point_to(page, "#gaugeSvgContainer", tag="Debt Reduced & Health Restored (>1.35)", duration_ms=450, pause_after_ms=4000)
        point_to(page, "#btnManualOverride", tag="Emergency Killswitch Guard (INV-3)", duration_ms=450, pause_after_ms=3500, click=True)
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        point_to(page, ".brand-badge", tag="AEGIS Protocol: aegis.trade", duration_ms=450, pause_after_ms=3500)
        wait_until(114.0)
        print(f"Chapter 5 completed at {time.time() - start_time:.2f}s")

        print(f"Master pitch walkthrough complete in {time.time() - start_time:.2f}s. Closing context to flush video...")
        context.close()
        browser.close()

    files = [f for f in os.listdir(output_dir) if f.endswith(".webm")]
    if files:
        latest_file = sorted(files, key=lambda x: os.path.getmtime(os.path.join(output_dir, x)))[-1]
        target_path = os.path.join(output_dir, "pitch-demo-recording.webm")
        if os.path.exists(target_path):
            os.remove(target_path)
        os.rename(os.path.join(output_dir, latest_file), target_path)
        print(f"Recorded pitch video with captions saved to: {target_path}")

if __name__ == "__main__":
    record_pitch_demo_with_captions()
