"""
Generate complete suite of AEGIS favicons:
1. favicon.svg (Vector SVG favicon with dark brand squircle and gradient AEGIS blades)
2. favicon.ico (Multi-size ICO with 16x16, 32x32, 48x48, 64x64)
3. favicon-16x16.png & favicon-32x32.png
4. apple-touch-icon.png (180x180)
5. icon-192x192.png & icon-512x512.png (PWA icons)
"""
import os
from playwright.sync_api import sync_playwright
from PIL import Image

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SVG_FAVICON = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2B2A33"/>
      <stop offset="50%" stop-color="#1C2238"/>
      <stop offset="100%" stop-color="#0F2C2C"/>
    </linearGradient>
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
  </defs>
  <!-- Sleek Dark Squircle Badge -->
  <rect width="128" height="128" rx="28" fill="url(#bg-grad)"/>
  <rect width="126" height="126" x="1" y="1" rx="27" fill="none" stroke="rgba(220, 230, 255, 0.16)" stroke-width="1.5"/>
  <!-- Centered Scaled AEGIS Blades -->
  <g transform="translate(16.5, 17.5) scale(0.725)">
    <polygon points="40.20,0.00 70.40,0.00 26.60,127.00 0.00,127.00" fill="url(#aegis-grad)"/>
    <polygon points="73.00,36.00 101.10,36.00 68.70,127.00 42.60,127.00" fill="url(#aegis-grad)"/>
    <polygon points="104.20,67.00 130.00,67.00 108.50,127.00 83.90,127.00" fill="url(#aegis-grad)"/>
  </g>
</svg>"""

def main():
    # Write SVG favicon
    svg_path = os.path.join(BASE_DIR, "favicon.svg")
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(SVG_FAVICON)
    print("Written favicon.svg")

    # Render 512x512 master high-res PNG via Playwright Edge
    master_png = os.path.join(BASE_DIR, "icon-512x512.png")
    html_wrap = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ background: transparent; overflow: hidden; display: flex; }}
  svg {{ width: 512px; height: 512px; display: block; }}
</style>
</head>
<body>
{SVG_FAVICON}
</body>
</html>"""

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=EDGE_PATH, headless=True)
        page = browser.new_page(viewport={"width": 512, "height": 512}, device_scale_factor=2)
        page.set_content(html_wrap)
        page.wait_for_timeout(500)
        page.screenshot(path=master_png, omit_background=True)
        browser.close()
    print("Rendered icon-512x512.png")

    # Now use PIL to generate all derived icons
    im512 = Image.open(master_png).convert("RGBA")

    # 192x192
    im192 = im512.resize((192, 192), Image.Resampling.LANCZOS)
    im192.save(os.path.join(BASE_DIR, "icon-192x192.png"))

    # Apple touch icon 180x180
    im180 = im512.resize((180, 180), Image.Resampling.LANCZOS)
    im180.save(os.path.join(BASE_DIR, "apple-touch-icon.png"))

    # 64x64, 48x48, 32x32, 16x16
    im64 = im512.resize((64, 64), Image.Resampling.LANCZOS)
    im48 = im512.resize((48, 48), Image.Resampling.LANCZOS)
    im32 = im512.resize((32, 32), Image.Resampling.LANCZOS)
    im16 = im512.resize((16, 16), Image.Resampling.LANCZOS)

    im32.save(os.path.join(BASE_DIR, "favicon-32x32.png"))
    im16.save(os.path.join(BASE_DIR, "favicon-16x16.png"))

    # Multi-resolution favicon.ico
    ico_path = os.path.join(BASE_DIR, "favicon.ico")
    im256 = im512.resize((256, 256), Image.Resampling.LANCZOS)
    im256.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f"Generated favicon.ico with 6 sizes (16px to 256px)")

if __name__ == "__main__":
    main()
