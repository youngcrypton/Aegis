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
            top: -32px;
            left: -32px;
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(95, 217, 190, 0.55) 0%, rgba(95, 217, 190, 0.22) 50%, rgba(95, 217, 190, 0) 75%);
            border: 2px solid rgba(95, 217, 190, 0.95);
            box-shadow: 0 0 26px rgba(95, 217, 190, 0.8), inset 0 0 14px rgba(95, 217, 190, 0.45);
            animation: aegisHaloPulse 1.2s ease-in-out infinite alternate;
        }
        @keyframes aegisHaloPulse {
            0% { transform: scale(0.92); opacity: 0.85; }
            100% { transform: scale(1.22); opacity: 1; }
        }
        #aegisCursorRipple {
            position: absolute;
            top: -26px;
            left: -26px;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            border: 3.5px solid #5FD9BE;
            box-shadow: 0 0 20px #5FD9BE;
            transform: scale(0.2);
            opacity: 0;
            pointer-events: none;
            transition: none;
        }
        #aegisCursorPointer {
            position: absolute;
            top: 0;
            left: 0;
            filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.9));
        }
        #aegisCursorTag {
            position: absolute;
            top: 26px;
            left: 22px;
            white-space: nowrap;
            background: rgba(6, 11, 19, 0.96);
            color: #5FD9BE;
            border: 1px solid rgba(95, 217, 190, 0.7);
            border-radius: 6px;
            padding: 4px 10px;
            font-family: 'Inter', -apple-system, sans-serif;
            font-size: 11.5px;
            font-weight: 600;
            letter-spacing: 0.3px;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.75);
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
            <path d="M4 2 L28 14 L16 18 L12 30 L4 2 Z" fill="#FFFFFF" stroke="#060B13" stroke-width="2.5" stroke-linejoin="round"/>
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

def record_aegis_demo():
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
        page = context.new_page()
        page.goto("http://localhost:3000")
        page.wait_for_load_state("networkidle")
        inject_cursor(page)
        print("Page loaded & bold virtual presenter cursor injected.")
        print("Starting synchronized 164.0s live product walkthrough...")

        start_time = time.time()

        def wait_until(target_s):
            elapsed = time.time() - start_time
            rem_ms = int((target_s - elapsed) * 1000)
            if rem_ms > 0:
                page.wait_for_timeout(rem_ms)

        # ======================================================================
        # CHAPTER 1: Live Architecture & Overview (Target: 0.0s -> 31.0s)
        # ======================================================================
        page.wait_for_timeout(800)
        point_to(page, "#walletBtn", tag="Connect Elysium Wallet", duration_ms=450, pause_after_ms=1200, click=True)
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

    # Find the created video
    files = [f for f in os.listdir(output_dir) if f.endswith(".webm")]
    if files:
        latest_file = sorted(files, key=lambda x: os.path.getmtime(os.path.join(output_dir, x)))[-1]
        target_path = os.path.join(output_dir, "live-product-demo.webm")
        if os.path.exists(target_path):
            os.remove(target_path)
        os.rename(os.path.join(output_dir, latest_file), target_path)
        print(f"Recorded live demo saved to: {target_path}")

if __name__ == "__main__":
    record_aegis_demo()
