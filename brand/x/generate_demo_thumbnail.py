"""
Generate the official high-production Live Product Demo Thumbnail for AEGIS Protocol.
Adheres strictly to AGENTS.md, brand/kit/tokens.css, and official AEGIS Brand Guidelines.
Renders to 1200x675 (16:9) and 2400x1350 (2x Retina PNG) using Playwright Edge.
"""

import os
from playwright.sync_api import sync_playwright

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>AEGIS Live Product Demo Thumbnail</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Marcellus&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 675px;
    overflow: hidden;
    background: #06090e;
    font-family: 'Inter', -apple-system, sans-serif;
    color: #EDF2F7;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 38px 46px;
  }

  /* Multi-layer atmospheric ambient background */
  .bg-canvas {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: radial-gradient(circle at 15% 15%, rgba(90, 31, 201, 0.28) 0%, transparent 45%),
                radial-gradient(circle at 85% 85%, rgba(8, 126, 109, 0.32) 0%, transparent 50%),
                radial-gradient(circle at 50% 50%, rgba(15, 114, 134, 0.12) 0%, transparent 60%),
                linear-gradient(180deg, #070A0F 0%, #0B1019 50%, #06090F 100%);
  }

  /* Grid overlay */
  .bg-grid {
    position: absolute;
    inset: 0;
    z-index: 2;
    background-image: 
      linear-gradient(to right, rgba(220, 230, 255, 0.035) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(220, 230, 255, 0.035) 1px, transparent 1px);
    background-size: 38px 38px;
  }

  /* Outer Border Frame */
  .frame-border {
    position: absolute;
    inset: 18px;
    z-index: 3;
    border: 1px solid rgba(220, 230, 255, 0.12);
    border-radius: 18px;
    pointer-events: none;
    box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.6);
  }

  .content-layer {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: space-between;
  }

  /* Top Bar */
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand-group {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .brand-logo-svg {
    width: 44px;
    height: 44px;
    filter: drop-shadow(0 4px 12px rgba(92, 240, 214, 0.35));
  }

  .brand-text-wrap {
    display: flex;
    flex-direction: column;
  }

  .brand-name {
    font-family: 'Marcellus', Georgia, serif;
    font-size: 26px;
    letter-spacing: 0.5px;
    color: #F8FAFC;
    line-height: 1;
  }

  .brand-sub {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    color: #5CF0D6;
    margin-top: 3px;
  }

  .top-badges {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 14px;
    border-radius: 9999px;
    font-size: 11.5px;
    font-weight: 600;
    background: rgba(18, 24, 38, 0.85);
    border: 1px solid rgba(220, 230, 255, 0.14);
    backdrop-filter: blur(8px);
    letter-spacing: 0.3px;
  }

  .badge-pulse {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #5CF0D6;
    box-shadow: 0 0 8px #5CF0D6;
  }

  .badge-accent {
    color: #5CF0D6;
    border-color: rgba(92, 240, 214, 0.45);
    background: rgba(8, 126, 109, 0.2);
  }

  .badge-danger {
    color: #FF8A9A;
    border-color: rgba(255, 138, 154, 0.4);
    background: rgba(255, 138, 154, 0.12);
  }

  /* Center Stage */
  .center-stage {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 40px;
    margin: auto 0;
  }

  .headline-block {
    flex: 1;
    max-width: 580px;
  }

  .category-kicker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    background: rgba(90, 31, 201, 0.25);
    border: 1px solid rgba(201, 166, 255, 0.35);
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: #C9A6FF;
    text-transform: uppercase;
    margin-bottom: 14px;
  }

  .main-title {
    font-family: 'Marcellus', Georgia, serif;
    font-size: 48px;
    line-height: 1.1;
    color: #FFFFFF;
    margin-bottom: 14px;
    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  }

  .main-title span {
    background: linear-gradient(135deg, #5CF0D6 0%, #C9A6FF 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .main-desc {
    font-size: 15px;
    line-height: 1.55;
    color: #94A3B8;
    margin-bottom: 22px;
  }

  .pill-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .pill-item {
    font-size: 12px;
    font-weight: 600;
    padding: 6px 13px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #CBD5E1;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Right Visual: Terminal Preview Card with Floating Cursor and Central Glass Play Button */
  .preview-wrapper {
    position: relative;
    width: 480px;
    height: 300px;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75), 0 0 30px rgba(92, 240, 214, 0.15);
    border: 1.5px solid rgba(92, 240, 214, 0.4);
    background: #070B12;
  }

  .preview-screenshot {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    filter: brightness(0.92) contrast(1.05);
  }

  /* Floating UI Presenter Badge on Screenshot */
  .cursor-overlay {
    position: absolute;
    bottom: 38px;
    left: 42px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 5;
    pointer-events: none;
  }

  .cursor-halo {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(92, 240, 214, 0.6) 0%, rgba(92, 240, 214, 0.15) 60%, transparent 80%);
    border: 2px solid #5CF0D6;
    box-shadow: 0 0 20px #5CF0D6;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cursor-pointer-svg {
    width: 22px;
    height: 22px;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.8));
  }

  .cursor-tag {
    background: rgba(6, 11, 19, 0.94);
    color: #5CF0D6;
    border: 1px solid rgba(92, 240, 214, 0.7);
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.3px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.8);
  }

  /* Central Frosted Glass Play Button */
  .play-button-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 76px;
    height: 76px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, rgba(92, 240, 214, 0.35) 0%, rgba(7, 112, 95, 0.5) 70%, rgba(6, 11, 19, 0.75) 100%);
    border: 2px solid #5CF0D6;
    box-shadow: 0 0 35px rgba(92, 240, 214, 0.65), 0 10px 25px rgba(0,0,0,0.8);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 8;
  }

  .play-triangle {
    width: 0;
    height: 0;
    border-top: 14px solid transparent;
    border-bottom: 14px solid transparent;
    border-left: 24px solid #FFFFFF;
    margin-left: 5px;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
  }

  /* Bottom Telemetry Bar */
  .bottom-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid rgba(220, 230, 255, 0.08);
  }

  .telemetry-items {
    display: flex;
    gap: 28px;
  }

  .tel-stat {
    display: flex;
    flex-direction: column;
  }

  .tel-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1.2px;
    color: #64748B;
    text-transform: uppercase;
  }

  .tel-val {
    font-size: 13.5px;
    font-weight: 700;
    font-family: 'SFMono-Regular', Consolas, monospace;
    color: #E2E8F0;
    margin-top: 2px;
  }

  .tel-val.accent { color: #5CF0D6; }
  .tel-val.violet { color: #C9A6FF; }

  .duration-badge {
    background: linear-gradient(135deg, rgba(8, 126, 109, 0.5) 0%, rgba(90, 31, 201, 0.5) 100%);
    border: 1px solid rgba(92, 240, 214, 0.6);
    padding: 8px 18px;
    border-radius: 9999px;
    font-weight: 700;
    font-size: 13px;
    color: #FFFFFF;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 16px rgba(92, 240, 214, 0.25);
  }
</style>
</head>
<body>

  <!-- Background Layers -->
  <div class="bg-canvas"></div>
  <div class="bg-grid"></div>
  <div class="frame-border"></div>

  <!-- Shared Global SVGs for 3-Blade Master Logo Mark -->
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <defs>
      <linearGradient id="blade-grad" x1="10.17" y1="-0.15" x2="29.83" y2="40.15" gradientUnits="userSpaceOnUse">
        <stop offset="0.00" stop-color="#1F0E4C"/>
        <stop offset="0.10" stop-color="#241056"/>
        <stop offset="0.20" stop-color="#40178D"/>
        <stop offset="0.30" stop-color="#5A1FC9"/>
        <stop offset="0.40" stop-color="#6928ED"/>
        <stop offset="0.50" stop-color="#642FEB"/>
        <stop offset="0.60" stop-color="#4C44CB"/>
        <stop offset="0.70" stop-color="#305EA5"/>
        <stop offset="0.80" stop-color="#157286"/>
        <stop offset="0.90" stop-color="#087B75"/>
        <stop offset="1.00" stop-color="#087E6D"/>
      </linearGradient>
    </defs>
  </svg>

  <div class="content-layer">

    <!-- Top Bar -->
    <div class="top-bar">
      <div class="brand-group">
        <svg class="brand-logo-svg" viewBox="0 0 40 40">
          <polygon points="13.42,3.36 21.27,3.36 9.89,36.38 2.97,36.38" fill="url(#blade-grad)"/>
          <polygon points="21.95,12.72 29.26,12.72 20.83,36.38 14.05,36.38" fill="url(#blade-grad)"/>
          <polygon points="30.06,20.78 36.77,20.78 31.18,36.38 24.78,36.38" fill="url(#blade-grad)"/>
        </svg>
        <div class="brand-text-wrap">
          <span class="brand-name">Aegis</span>
          <span class="brand-sub">PROTOCOL &bull; SENTINEL</span>
        </div>
      </div>

      <div class="top-badges">
        <div class="badge">
          <span class="badge-pulse"></span>
          <span>Elysium L2</span>
          <strong style="color: #5CF0D6; margin-left: 3px;">99801</strong>
        </div>
        <div class="badge badge-accent">
          <span>0x0801 Precompile:</span>
          <strong>&lt;78ms</strong>
        </div>
        <div class="badge">
          <span>Session Key:</span>
          <strong style="color: #A78BFA; margin-left: 3px;">Trade-Only (INV-1)</strong>
        </div>
      </div>
    </div>

    <!-- Center Stage -->
    <div class="center-stage">
      
      <!-- Left: Title & Value Proposition -->
      <div class="headline-block">
        <div class="category-kicker">
          Official Hackathon Product Walkthrough
        </div>
        <h1 class="main-title">
          Never Get <span>Liquidated.</span>
        </h1>
        <p class="main-desc">
          Live walkthrough of AEGIS: the autonomous non-custodial risk engine executing sub-second delta-hedges via HyperCore consensus and synchronous Elysium L2 precompiles.
        </p>
        <div class="pill-row">
          <div class="pill-item">⚡ 0x0801 Synchronous Oracle</div>
          <div class="pill-item">🛡️ 1-Click Lite Auto-Pilot</div>
          <div class="pill-item">📉 -18% Flash Crash Defense</div>
          <div class="pill-item">📈 Trailing Profit Lock</div>
        </div>
      </div>

      <!-- Right: Real Screen Capture with Highlighted Cursor & Frosted Play Button -->
      <div class="preview-wrapper">
        <img class="preview-screenshot" src="__SCREENSHOT_SRC__" alt="AEGIS Terminal Live Capture">
        
        <!-- Center Play Button -->
        <div class="play-button-center">
          <div class="play-triangle"></div>
        </div>

        <!-- Presenter Pointer Callout (1,000 HYPE Collateral) -->
        <div class="cursor-overlay">
          <div class="cursor-halo">
            <svg class="cursor-pointer-svg" viewBox="0 0 34 34" fill="none">
              <path d="M4 2 L28 14 L16 18 L12 30 L4 2 Z" fill="#FFFFFF" stroke="#060B13" stroke-width="2.5" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="cursor-tag">1,000.00 HYPE Collateral</div>
        </div>
      </div>

    </div>

    <!-- Bottom Telemetry Bar -->
    <div class="bottom-bar">
      <div class="telemetry-items">
        <div class="tel-stat">
          <span class="tel-label">Vault Balance</span>
          <span class="tel-val accent">1,000 HYPE ($48.5k)</span>
        </div>
        <div class="tel-stat">
          <span class="tel-label">Liability</span>
          <span class="tel-val">$32,000.00 USDC</span>
        </div>
        <div class="tel-stat">
          <span class="tel-label">Health Factor</span>
          <span class="tel-val accent">H = 1.41 (Safe Zone)</span>
        </div>
        <div class="tel-stat">
          <span class="tel-label">Invariant Security</span>
          <span class="tel-val violet">INV-1 to INV-5 Verified</span>
        </div>
      </div>

      <div class="duration-badge">
        <span>▶ WATCH DEMO</span>
        <span style="opacity: 0.7;">&bull;</span>
        <span>02:44</span>
      </div>
    </div>

  </div>

</body>
</html>
"""

def generate_thumbnail():
    print("Generating high-production demo thumbnail...")
    screenshot_path = os.path.join(BASE_DIR, "aegis-thumbnail-frame.png")

    # First extract a crisp full-res 1280x720 video frame from our master video
    ffmpeg_exe = os.path.join(r"c:\Users\ascend X elysium\remotion", "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")
    video_mp4 = os.path.join(BASE_DIR, "aegis-product-demo-3min.mp4")

    import subprocess
    cmd = [ffmpeg_exe, "-y", "-ss", "16", "-i", video_mp4, "-frames:v", "1", "-update", "1", screenshot_path]
    subprocess.run(cmd, check=True)
    print(f"Extracted background frame to: {screenshot_path}")

    # Read base64 data for inline embedding
    import base64
    with open(screenshot_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")
    data_uri = f"data:image/png;base64,{img_b64}"

    final_html = HTML_TEMPLATE.replace("__SCREENSHOT_SRC__", data_uri)

    html_file = os.path.join(BASE_DIR, "temp_thumbnail.html")
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(final_html)

    # Render via Playwright
    target_png = os.path.join(BASE_DIR, "aegis-demo-thumbnail-1200x675.png")
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=EDGE_PATH, headless=True)
        page = browser.new_page(
            viewport={"width": 1200, "height": 675},
            device_scale_factor=2 # 2400x1350 Retina
        )
        page.goto(f"file:///{html_file.replace(os.sep, '/')}")
        page.wait_for_timeout(1500)
        page.screenshot(path=target_png)
        browser.close()

    print(f"Rendered Retina 2x Thumbnail: {target_png}")
    print(f"Size: {os.path.getsize(target_png)} bytes ({os.path.getsize(target_png)/(1024*1024):.2f} MB)")

    # Clean up temp
    if os.path.exists(html_file): os.remove(html_file)
    if os.path.exists(screenshot_path): os.remove(screenshot_path)

if __name__ == "__main__":
    generate_thumbnail()
