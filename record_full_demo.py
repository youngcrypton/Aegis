import os
import time
from playwright.sync_api import sync_playwright

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
        print("Page loaded. Starting synchronized 160s live walkthrough...")

        # ----------------------------------------------------------------------
        # CHAPTER 1: Live Architecture & Overview (0:00 - 0:31 / 31s)
        # ----------------------------------------------------------------------
        page.wait_for_timeout(2000)
        # Connect wallet
        page.click("#walletBtn")
        page.wait_for_timeout(3000)

        # Hover over Elysium badge & 0x0801 latency badge
        page.hover(".network-badge")
        page.wait_for_timeout(3000)
        page.hover("#latencyBadge")
        page.wait_for_timeout(3000)

        # Hover over TVL and health gauge
        page.hover("#heroTvlCard")
        page.wait_for_timeout(4000)
        page.hover("#gaugeSvgContainer")
        page.wait_for_timeout(6000)

        # Hover over collateral stats
        page.hover("#posCollateralAmount")
        page.wait_for_timeout(6000)
        page.wait_for_timeout(4000)

        # ----------------------------------------------------------------------
        # CHAPTER 2: 1-Click Lite Auto-Pilot (0:31 - 0:59 / 28s)
        # ----------------------------------------------------------------------
        # Switch to Lite Auto-Pilot
        page.click("#modeLiteBtn")
        page.wait_for_timeout(3000)

        # Explore presets
        page.click("[data-preset='conservative']")
        page.wait_for_timeout(3000)
        page.click("[data-preset='aggressive']")
        page.wait_for_timeout(3000)
        page.click("[data-preset='balanced']")
        page.wait_for_timeout(3000)

        # Select 0.05 HYPE micro-chip
        page.click("[data-amount='0.05']")
        page.wait_for_timeout(2000)

        # Hover over Lite safeguards panel
        page.hover("#liteTelemetryCard")
        page.wait_for_timeout(3000)

        # Click 1-Click Activate Shield
        page.click("#btnLiteActivateShield")
        page.wait_for_timeout(5000)

        # Inspect Active shield badge
        page.hover(".armed")
        page.wait_for_timeout(3000)
        page.wait_for_timeout(3000)

        # ----------------------------------------------------------------------
        # CHAPTER 3: Pro Terminal & Algorithmic Controls (0:59 - 1:20 / 21s)
        # ----------------------------------------------------------------------
        # Switch back to Pro Terminal
        page.click("#modeProBtn")
        page.wait_for_timeout(3000)

        # Scroll to Controls Form
        page.hover("#proConfigCard")
        page.wait_for_timeout(2000)

        # Adjust coverage and trailing TP sliders cleanly via evaluate
        page.evaluate("""() => {
            const cov = document.getElementById('hedgeCoverage');
            if (cov) { cov.value = '70'; cov.dispatchEvent(new Event('input', {bubbles: true})); }
            const tp = document.getElementById('trailingTp');
            if (tp) { tp.value = '2.0'; tp.dispatchEvent(new Event('input', {bubbles: true})); }
        }""")
        page.wait_for_timeout(3000)

        # Save config
        page.click("#btnSaveConfig")
        page.wait_for_timeout(3000)

        # Hover over CLOB orderbook depth
        page.hover("#proOrderbookCard")
        page.wait_for_timeout(7000)

        # ----------------------------------------------------------------------
        # CHAPTER 4: Real Flash Crash Simulation (-18%) (1:20 - 1:48 / 28s)
        # ----------------------------------------------------------------------
        page.hover("#btnCrashTest")
        page.wait_for_timeout(2000)
        page.click("#btnCrashTest")
        print("Flash crash simulation triggered...")
        # Watch the price fall and hedge trigger
        page.wait_for_timeout(6000)
        page.hover("#activeHedgeBox")
        page.wait_for_timeout(8000)
        page.hover("#auditTerminal")
        page.wait_for_timeout(8000)
        page.wait_for_timeout(4000)

        # ----------------------------------------------------------------------
        # CHAPTER 5: V-Bounce & Trailing Profit Unwind (1:48 - 2:17 / 29s)
        # ----------------------------------------------------------------------
        page.hover("#btnRetraceTest")
        page.wait_for_timeout(2000)
        page.click("#btnRetraceTest")
        print("V-Bounce & Trailing take-profit triggered...")
        # Watch the price rebound and profit lock
        page.wait_for_timeout(6000)
        page.hover("#activeHedgeBox")
        page.wait_for_timeout(5000)
        page.hover("#gaugeSvgContainer")
        page.wait_for_timeout(5000)
        page.hover(".token-card")
        page.wait_for_timeout(8000)
        page.wait_for_timeout(3000)

        # ----------------------------------------------------------------------
        # CHAPTER 6: Emergency Killswitch (INV-3) & Wrap-Up (2:17 - 2:40 / 23s)
        # ----------------------------------------------------------------------
        page.hover("#btnManualOverride")
        page.wait_for_timeout(2000)
        page.click("#btnManualOverride")
        page.wait_for_timeout(4000)

        # Hover over audit terminal showing emergency revocation
        page.hover("#auditTerminal")
        page.wait_for_timeout(6000)

        # Reset market
        page.click("#btnResetMarket")
        page.wait_for_timeout(3000)

        # Final overview scroll to top
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        page.wait_for_timeout(4000)
        page.hover(".brand-badge")
        page.wait_for_timeout(4000)

        print("Walkthrough completed. Saving video...")
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
