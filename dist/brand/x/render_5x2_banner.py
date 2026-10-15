"""
Generate 5:2 ratio (1500x600) official AEGIS article banners (both Dark and Light themes)
strictly adhering to the AEGIS Brand Kit (Marcellus display font, Inter body text,
official 3-blade logo mark, brand tokens, and technical telemetry motif).
Renders high-resolution 2x Retina PNGs (3000x1200) via Playwright Edge.
"""

import os
from playwright.sync_api import sync_playwright

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DARK_SVG = os.path.join(BASE_DIR, "aegis-article-banner-5x2-dark.svg")
DARK_PNG = os.path.join(BASE_DIR, "aegis-article-banner-5x2-dark.png")

LIGHT_SVG = os.path.join(BASE_DIR, "aegis-article-banner-5x2-light.svg")
LIGHT_PNG = os.path.join(BASE_DIR, "aegis-article-banner-5x2-light.png")

def create_dark_svg_content():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 600" width="1500" height="600">
  <defs>
    <!-- Background Gradient (Brand Kit: Blade Ground) -->
    <linearGradient id="bg-dark" x1="0" y1="0" x2="1500" y2="600" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2B2A33"/>
      <stop offset="45%" stop-color="#1C2238"/>
      <stop offset="100%" stop-color="#0F2C2C"/>
    </linearGradient>

    <!-- Aurora Glows -->
    <radialGradient id="aurTeal" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#5CF0D6" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#5CF0D6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aurViolet" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#C9A6FF" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#C9A6FF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aurMarkGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#087E6D" stop-opacity="0.45"/>
      <stop offset="50%" stop-color="#5A1FC9" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#1C2238" stop-opacity="0"/>
    </radialGradient>

    <!-- Approved Master AEGIS Blade Gradient (brand/logo/aegis-mark.svg) -->
    <linearGradient id="aegis-grad" gradientUnits="userSpaceOnUse" x1="27.70" y1="-13.51" x2="103.30" y2="141.51">
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

    <!-- Hairline Grid Pattern -->
    <pattern id="grid-dark" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(220, 230, 255, 0.04)" stroke-width="1"/>
    </pattern>

    <style>
      @import url('https://fonts.googleapis.com/css2?family=Marcellus&amp;family=Inter:wght@400;500;600;700&amp;display=swap');
      .display { font-family: 'Marcellus', Georgia, serif; }
      .sans { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
      .mono { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
    </style>
  </defs>

  <!-- Base Canvas -->
  <rect width="1500" height="600" fill="url(#bg-dark)"/>
  <rect width="1500" height="600" fill="url(#grid-dark)"/>

  <!-- Ambient Aurora Glows -->
  <circle cx="1240" cy="290" r="440" fill="url(#aurTeal)"/>
  <circle cx="200" cy="100" r="440" fill="url(#aurViolet)"/>
  <circle cx="1180" cy="270" r="280" fill="url(#aurMarkGlow)"/>

  <!-- 1px Rule Outer Border Frame (16px radius per brand kit) -->
  <rect x="20" y="20" width="1460" height="560" rx="16" fill="none" stroke="rgba(220, 230, 255, 0.12)" stroke-width="1"/>

  <!-- Top Pill Badges -->
  <g transform="translate(64, 52)">
    <rect width="360" height="30" rx="15" fill="#1C2238" stroke="rgba(92, 240, 214, 0.4)" stroke-width="1"/>
    <circle cx="15" cy="15" r="4.5" fill="#5CF0D6"/>
    <text x="28" y="19" class="sans" font-size="11.5" font-weight="600" fill="#5CF0D6" letter-spacing="1.4">ELYSIUM L2 &bull; HYPERCORE CLOB</text>
  </g>
  <g transform="translate(440, 52)">
    <rect width="220" height="30" rx="15" fill="#1C2238" stroke="rgba(201, 166, 255, 0.4)" stroke-width="1"/>
    <circle cx="15" cy="15" r="4.5" fill="#C9A6FF"/>
    <text x="28" y="19" class="sans" font-size="11.5" font-weight="600" fill="#C9A6FF" letter-spacing="1.2">5 INVARIANTS VERIFIED</text>
  </g>

  <!-- Main Headline Block (Left / Center) -->
  <text x="64" y="150" class="display" font-size="56" fill="#E8ECF8" letter-spacing="-0.5">AEGIS PROTOCOL</text>
  <text x="64" y="198" class="display" font-size="25" fill="#5CF0D6" letter-spacing="0.2">Hedge drawdowns. Never get liquidated.</text>
  
  <text x="64" y="238" class="sans" font-size="15.5" fill="#A7AFCB" font-weight="400">Autonomous sub-second risk sentinel bridging Elysium L2 smart contracts with HyperCore’s L1 orderbook.</text>
  <text x="64" y="262" class="sans" font-size="15.5" fill="#A7AFCB" font-weight="400">Your spot collateral stays 100% untouched while automated short hedges absorb crash volatility.</text>

  <!-- Telemetry Parameter Matrix (4 Glass Chips) -->
  <g transform="translate(64, 296)">
    <!-- Chip 1: 0x0801 -->
    <rect x="0" y="0" width="220" height="66" rx="12" fill="#1C2238" stroke="rgba(220, 230, 255, 0.12)" stroke-width="1"/>
    <text x="16" y="25" class="mono" font-size="11" fill="#A7AFCB">0x0801 PRECOMPILE</text>
    <text x="16" y="49" class="sans" font-size="17" font-weight="600" fill="#5CF0D6">&lt; 78ms Consensus</text>

    <!-- Chip 2: 0x0802 -->
    <rect x="236" y="0" width="220" height="66" rx="12" fill="#1C2238" stroke="rgba(220, 230, 255, 0.12)" stroke-width="1"/>
    <text x="252" y="25" class="mono" font-size="11" fill="#A7AFCB">0x0802 PREDEPLOY</text>
    <text x="252" y="49" class="sans" font-size="17" font-weight="600" fill="#E8ECF8">&lt; 100ms CLOB Dispatch</text>

    <!-- Chip 3: INV-1 Non-Custodial -->
    <rect x="472" y="0" width="220" height="66" rx="12" fill="#1C2238" stroke="rgba(220, 230, 255, 0.12)" stroke-width="1"/>
    <text x="488" y="25" class="mono" font-size="11" fill="#A7AFCB">INVARIANT INV-1</text>
    <text x="488" y="49" class="sans" font-size="17" font-weight="600" fill="#FFBE7A">100% Non-Custodial</text>

    <!-- Chip 4: Trailing Take-Profit -->
    <rect x="708" y="0" width="220" height="66" rx="12" fill="#1C2238" stroke="rgba(220, 230, 255, 0.12)" stroke-width="1"/>
    <text x="724" y="25" class="mono" font-size="11" fill="#A7AFCB">DYNAMIC V-BOUNCE</text>
    <text x="724" y="49" class="sans" font-size="17" font-weight="600" fill="#C9A6FF">+1.5% Profit Lock</text>
  </g>

  <!-- Technical Liquidation & Trailing Hedge Trajectory Ribbon -->
  <g transform="translate(64, 388)">
    <!-- Base Ribbon Card -->
    <rect x="0" y="0" width="928" height="152" rx="14" fill="rgba(28, 34, 56, 0.65)" stroke="rgba(220, 230, 255, 0.10)" stroke-width="1"/>
    
    <!-- Threshold Reference Lines -->
    <line x1="24" y1="104" x2="904" y2="104" stroke="#FF8A9A" stroke-width="1" stroke-dasharray="4 6" opacity="0.45"/>
    <text x="28" y="122" class="mono" font-size="10.5" fill="#FF8A9A">Liquidation Barrier (H = 1.00)</text>

    <line x1="24" y1="62" x2="904" y2="62" stroke="#FFBE7A" stroke-width="1" stroke-dasharray="6 6" opacity="0.6"/>
    <text x="28" y="54" class="mono" font-size="10.5" fill="#FFBE7A">Sentinel Defense Threshold (H = 1.15)</text>

    <!-- Live Hedged Trajectory Curve -->
    <path d="M 24 38 C 140 38, 220 44, 320 62 C 400 76, 460 98, 520 102 C 590 104, 650 82, 730 48 C 800 24, 840 22, 904 22" fill="none" stroke="#5CF0D6" stroke-width="2.6" stroke-linecap="round"/>

    <!-- Key Event Markers -->
    <!-- Event 1: Trigger -->
    <circle cx="320" cy="62" r="5" fill="#FFBE7A"/>
    <circle cx="320" cy="62" r="10" fill="none" stroke="#FFBE7A" stroke-width="1.2" opacity="0.7"/>
    <rect x="334" y="38" width="186" height="20" rx="4" fill="#1C2238" stroke="rgba(255, 190, 122, 0.4)" stroke-width="1"/>
    <text x="342" y="52" class="mono" font-size="9.5" fill="#FFBE7A" font-weight="600">0x0802 Hedge Dispatched</text>

    <!-- Event 2: Bottom Wick -->
    <circle cx="520" cy="102" r="4.5" fill="#FF8A9A"/>
    <text x="470" y="124" class="mono" font-size="10" fill="#FF8A9A">Market Trough (P_lowest)</text>

    <!-- Event 3: Rebound Take Profit -->
    <circle cx="730" cy="48" r="5" fill="#5CF0D6"/>
    <circle cx="730" cy="48" r="10" fill="none" stroke="#5CF0D6" stroke-width="1.2" opacity="0.7"/>
    <rect x="584" y="16" width="220" height="20" rx="4" fill="#1C2238" stroke="rgba(92, 240, 214, 0.4)" stroke-width="1"/>
    <text x="592" y="30" class="mono" font-size="9.5" fill="#5CF0D6" font-weight="600">+1.5% V-Bounce &bull; Debt Paydown</text>
  </g>

  <!-- Official Master 3-Blade AEGIS Mark (Right Side) -->
  <g transform="translate(1080, 110) scale(2.85)">
    <!-- Approved Master Blade Geometry from brand/logo/aegis-mark.svg -->
    <polygon points="40.20,0.00 70.40,0.00 26.60,127.00 0.00,127.00" fill="url(#aegis-grad)"/>
    <polygon points="73.00,36.00 101.10,36.00 68.70,127.00 42.60,127.00" fill="url(#aegis-grad)"/>
    <polygon points="104.20,67.00 130.00,67.00 108.50,127.00 83.90,127.00" fill="url(#aegis-grad)"/>
  </g>

  <!-- Bottom Right Brand Seal & URLs -->
  <g transform="translate(1060, 506)">
    <rect width="376" height="34" rx="8" fill="#1C2238" stroke="rgba(220, 230, 255, 0.12)" stroke-width="1"/>
    <text x="16" y="22" class="mono" font-size="11.5" fill="#A7AFCB">CHAIN ID: 99801 &bull; TESTNET &bull; aegis.trade</text>
  </g>
</svg>"""

def create_light_svg_content():
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 600" width="1500" height="600">
  <defs>
    <!-- Background Gradient (Brand Kit: Light Grand Palette) -->
    <linearGradient id="bg-light" x1="0" y1="0" x2="1500" y2="600" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFF6EC"/>
      <stop offset="45%" stop-color="#D6F5EC"/>
      <stop offset="100%" stop-color="#DCCBFF"/>
    </linearGradient>

    <!-- Aurora Glows Light Mode -->
    <radialGradient id="aurTealLight" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#07705F" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#07705F" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aurVioletLight" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#6930EA" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#6930EA" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aurMarkGlowLight" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#07705F" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="#6930EA" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>

    <!-- Approved Master AEGIS Blade Gradient (brand/logo/aegis-mark.svg) -->
    <linearGradient id="aegis-grad" gradientUnits="userSpaceOnUse" x1="27.70" y1="-13.51" x2="103.30" y2="141.51">
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

    <!-- Hairline Grid Pattern Light Mode -->
    <pattern id="grid-light" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(22, 18, 48, 0.04)" stroke-width="1"/>
    </pattern>

    <style>
      @import url('https://fonts.googleapis.com/css2?family=Marcellus&amp;family=Inter:wght@400;500;600;700&amp;display=swap');
      .display { font-family: 'Marcellus', Georgia, serif; }
      .sans { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
      .mono { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
    </style>
  </defs>

  <!-- Base Canvas -->
  <rect width="1500" height="600" fill="url(#bg-light)"/>
  <rect width="1500" height="600" fill="url(#grid-light)"/>

  <!-- Ambient Aurora Glows -->
  <circle cx="1240" cy="290" r="440" fill="url(#aurTealLight)"/>
  <circle cx="200" cy="100" r="440" fill="url(#aurVioletLight)"/>
  <circle cx="1180" cy="270" r="280" fill="url(#aurMarkGlowLight)"/>

  <!-- 1px Rule Outer Border Frame (16px radius per brand kit) -->
  <rect x="20" y="20" width="1460" height="560" rx="16" fill="none" stroke="rgba(22, 18, 48, 0.13)" stroke-width="1"/>

  <!-- Top Pill Badges -->
  <g transform="translate(64, 52)">
    <rect width="360" height="30" rx="15" fill="#FFFFFF" stroke="rgba(7, 112, 95, 0.35)" stroke-width="1"/>
    <circle cx="15" cy="15" r="4.5" fill="#07705F"/>
    <text x="28" y="19" class="sans" font-size="11.5" font-weight="600" fill="#07705F" letter-spacing="1.4">ELYSIUM L2 &bull; HYPERCORE CLOB</text>
  </g>
  <g transform="translate(440, 52)">
    <rect width="220" height="30" rx="15" fill="#FFFFFF" stroke="rgba(105, 48, 234, 0.35)" stroke-width="1"/>
    <circle cx="15" cy="15" r="4.5" fill="#6930EA"/>
    <text x="28" y="19" class="sans" font-size="11.5" font-weight="600" fill="#6930EA" letter-spacing="1.2">5 INVARIANTS VERIFIED</text>
  </g>

  <!-- Main Headline Block (Left / Center) -->
  <text x="64" y="150" class="display" font-size="56" fill="#161230" letter-spacing="-0.5">AEGIS PROTOCOL</text>
  <text x="64" y="198" class="display" font-size="25" fill="#07705F" letter-spacing="0.2">Hedge drawdowns. Never get liquidated.</text>
  
  <text x="64" y="238" class="sans" font-size="15.5" fill="#5C5778" font-weight="400">Autonomous sub-second risk sentinel bridging Elysium L2 smart contracts with HyperCore’s L1 orderbook.</text>
  <text x="64" y="262" class="sans" font-size="15.5" fill="#5C5778" font-weight="400">Your spot collateral stays 100% untouched while automated short hedges absorb crash volatility.</text>

  <!-- Telemetry Parameter Matrix (4 Glass Chips) -->
  <g transform="translate(64, 296)">
    <!-- Chip 1: 0x0801 -->
    <rect x="0" y="0" width="220" height="66" rx="12" fill="#FFFFFF" stroke="rgba(22, 18, 48, 0.12)" stroke-width="1"/>
    <text x="16" y="25" class="mono" font-size="11" fill="#5C5778">0x0801 PRECOMPILE</text>
    <text x="16" y="49" class="sans" font-size="17" font-weight="600" fill="#07705F">&lt; 78ms Consensus</text>

    <!-- Chip 2: 0x0802 -->
    <rect x="236" y="0" width="220" height="66" rx="12" fill="#FFFFFF" stroke="rgba(22, 18, 48, 0.12)" stroke-width="1"/>
    <text x="252" y="25" class="mono" font-size="11" fill="#5C5778">0x0802 PREDEPLOY</text>
    <text x="252" y="49" class="sans" font-size="17" font-weight="600" fill="#161230">&lt; 100ms CLOB Dispatch</text>

    <!-- Chip 3: INV-1 Non-Custodial -->
    <rect x="472" y="0" width="220" height="66" rx="12" fill="#FFFFFF" stroke="rgba(22, 18, 48, 0.12)" stroke-width="1"/>
    <text x="488" y="25" class="mono" font-size="11" fill="#5C5778">INVARIANT INV-1</text>
    <text x="488" y="49" class="sans" font-size="17" font-weight="600" fill="#A34A08">100% Non-Custodial</text>

    <!-- Chip 4: Trailing Take-Profit -->
    <rect x="708" y="0" width="220" height="66" rx="12" fill="#FFFFFF" stroke="rgba(22, 18, 48, 0.12)" stroke-width="1"/>
    <text x="724" y="25" class="mono" font-size="11" fill="#5C5778">DYNAMIC V-BOUNCE</text>
    <text x="724" y="49" class="sans" font-size="17" font-weight="600" fill="#6930EA">+1.5% Profit Lock</text>
  </g>

  <!-- Technical Liquidation & Trailing Hedge Trajectory Ribbon -->
  <g transform="translate(64, 388)">
    <!-- Base Ribbon Card -->
    <rect x="0" y="0" width="928" height="152" rx="14" fill="rgba(255, 255, 255, 0.85)" stroke="rgba(22, 18, 48, 0.11)" stroke-width="1"/>
    
    <!-- Threshold Reference Lines -->
    <line x1="24" y1="104" x2="904" y2="104" stroke="#B8254F" stroke-width="1" stroke-dasharray="4 6" opacity="0.45"/>
    <text x="28" y="122" class="mono" font-size="10.5" fill="#B8254F">Liquidation Barrier (H = 1.00)</text>

    <line x1="24" y1="62" x2="904" y2="62" stroke="#A34A08" stroke-width="1" stroke-dasharray="6 6" opacity="0.6"/>
    <text x="28" y="54" class="mono" font-size="10.5" fill="#A34A08">Sentinel Defense Threshold (H = 1.15)</text>

    <!-- Live Hedged Trajectory Curve -->
    <path d="M 24 38 C 140 38, 220 44, 320 62 C 400 76, 460 98, 520 102 C 590 104, 650 82, 730 48 C 800 24, 840 22, 904 22" fill="none" stroke="#07705F" stroke-width="2.7" stroke-linecap="round"/>

    <!-- Key Event Markers -->
    <!-- Event 1: Trigger -->
    <circle cx="320" cy="62" r="5" fill="#A34A08"/>
    <circle cx="320" cy="62" r="10" fill="none" stroke="#A34A08" stroke-width="1.2" opacity="0.7"/>
    <rect x="334" y="38" width="186" height="20" rx="4" fill="#FFFFFF" stroke="rgba(163, 74, 8, 0.4)" stroke-width="1"/>
    <text x="342" y="52" class="mono" font-size="9.5" fill="#A34A08" font-weight="600">0x0802 Hedge Dispatched</text>

    <!-- Event 2: Bottom Wick -->
    <circle cx="520" cy="102" r="4.5" fill="#B8254F"/>
    <text x="470" y="124" class="mono" font-size="10" fill="#B8254F">Market Trough (P_lowest)</text>

    <!-- Event 3: Rebound Take Profit -->
    <circle cx="730" cy="48" r="5" fill="#07705F"/>
    <circle cx="730" cy="48" r="10" fill="none" stroke="#07705F" stroke-width="1.2" opacity="0.7"/>
    <rect x="584" y="16" width="220" height="20" rx="4" fill="#FFFFFF" stroke="rgba(7, 112, 95, 0.4)" stroke-width="1"/>
    <text x="592" y="30" class="mono" font-size="9.5" fill="#07705F" font-weight="600">+1.5% V-Bounce &bull; Debt Paydown</text>
  </g>

  <!-- Official Master 3-Blade AEGIS Mark (Right Side) -->
  <g transform="translate(1080, 110) scale(2.85)">
    <!-- Approved Master Blade Geometry from brand/logo/aegis-mark.svg -->
    <polygon points="40.20,0.00 70.40,0.00 26.60,127.00 0.00,127.00" fill="url(#aegis-grad)"/>
    <polygon points="73.00,36.00 101.10,36.00 68.70,127.00 42.60,127.00" fill="url(#aegis-grad)"/>
    <polygon points="104.20,67.00 130.00,67.00 108.50,127.00 83.90,127.00" fill="url(#aegis-grad)"/>
  </g>

  <!-- Bottom Right Brand Seal & URLs -->
  <g transform="translate(1060, 506)">
    <rect width="376" height="34" rx="8" fill="#FFFFFF" stroke="rgba(22, 18, 48, 0.13)" stroke-width="1"/>
    <text x="16" y="22" class="mono" font-size="11.5" fill="#5C5778">CHAIN ID: 99801 &bull; TESTNET &bull; aegis.trade</text>
  </g>
</svg>"""

def render_banners():
    print("Writing updated 5:2 ratio SVG files (1500x600)...")
    dark_svg_content = create_dark_svg_content()
    with open(DARK_SVG, "w", encoding="utf-8") as f:
        f.write(dark_svg_content)
    print(f"Saved: {DARK_SVG}")

    light_svg_content = create_light_svg_content()
    with open(LIGHT_SVG, "w", encoding="utf-8") as f:
        f.write(light_svg_content)
    print(f"Saved: {LIGHT_SVG}")

    items = [
        {"svg": DARK_SVG, "png": DARK_PNG, "content": dark_svg_content},
        {"svg": LIGHT_SVG, "png": LIGHT_PNG, "content": light_svg_content},
    ]

    print("Launching Playwright Edge to re-render 2x Retina PNGs (3000x1200)...")
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=EDGE_PATH, headless=True)
        for item in items:
            html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ background: transparent; overflow: hidden; display: flex; }}
  svg {{ width: 1500px; height: 600px; display: block; }}
</style>
</head>
<body>
{item["content"]}
</body>
</html>"""
            page = browser.new_page(
                viewport={"width": 1500, "height": 600},
                device_scale_factor=2
            )
            page.set_content(html)
            page.wait_for_timeout(1400)
            page.screenshot(path=item["png"])
            page.close()
            print(f"Rendered: {item['png']} (3000x1200 @ 2x)")

        browser.close()
    print("Done! Both 5:2 banners re-rendered with refined typography and zero collisions.")

if __name__ == "__main__":
    render_banners()
