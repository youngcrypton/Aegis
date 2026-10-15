import os
import time
from playwright.sync_api import sync_playwright

CURSOR_INJECTION_SCRIPT = """
(() => {
    if (document.getElementById('aegisVirtualCursor')) return;

    const style = document.createElement('style');
    style.id = 'aegisCursorStyle';
    style.textContent = `
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
            transition: none;
        }
        #aegisCursorPointer {
            position: absolute;
            top: 0;
            left: 0;
            filter: drop-shadow(0 4px 10px rgba(14, 22, 38, 0.4));
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
    `;
    document.head.appendChild(style);

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

    window.__cursorState = {
        x: 640,
        y: 360,
        el: wrap,
        tagEl: wrap.querySelector('#aegisCursorTag'),
        rippleEl: wrap.querySelector('#aegisCursorRipple')
    };

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
})();
"""

def inject_cursor(page):
    page.evaluate(CURSOR_INJECTION_SCRIPT)

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

def record_pitch_demo():
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

        inject_cursor(page)
        print("Page loaded in verified LIGHT MODE & bold presenter cursor injected.")
        print("Starting synchronized 114.0s Master Pitch walkthrough...")

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
        # Sign the session authorization modal cleanly
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

    # Rename the captured video to pitch-demo-recording.webm
    files = [f for f in os.listdir(output_dir) if f.endswith(".webm")]
    if files:
        latest_file = sorted(files, key=lambda x: os.path.getmtime(os.path.join(output_dir, x)))[-1]
        target_path = os.path.join(output_dir, "pitch-demo-recording.webm")
        if os.path.exists(target_path):
            os.remove(target_path)
        os.rename(os.path.join(output_dir, latest_file), target_path)
        print(f"Recorded pitch video saved to: {target_path}")

if __name__ == "__main__":
    record_pitch_demo()
