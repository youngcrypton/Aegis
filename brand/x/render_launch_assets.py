"""
Render launch announcement SVGs into high-resolution, pixel-perfect PNG assets
using headless Microsoft Edge via Playwright with 2x device scale factor (Retina).
"""

import os
from playwright.sync_api import sync_playwright

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

ASSETS = [
    {
        "svg": os.path.join(BASE_DIR, "launch-article-banner-1200x675.svg"),
        "png": os.path.join(BASE_DIR, "launch-article-banner-1200x675.png"),
        "width": 1200,
        "height": 675,
    },
    {
        "svg": os.path.join(BASE_DIR, "launch-square-1080x1080.svg"),
        "png": os.path.join(BASE_DIR, "launch-square-1080x1080.png"),
        "width": 1080,
        "height": 1080,
    },
]

def render_assets():
    print(f"Starting Playwright Edge rendering from {BASE_DIR}...")
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=EDGE_PATH, headless=True)
        for item in ASSETS:
            svg_path = item["svg"]
            png_path = item["png"]
            w = item["width"]
            h = item["height"]
            
            with open(svg_path, "r", encoding="utf-8") as f:
                svg_content = f.read()

            html_wrap = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ background: transparent; overflow: hidden; display: flex; }}
  svg {{ width: {w}px; height: {h}px; display: block; }}
</style>
</head>
<body>
{svg_content}
</body>
</html>"""
            page = browser.new_page(
                viewport={"width": w, "height": h},
                device_scale_factor=2
            )
            page.set_content(html_wrap)
            # Give Google Fonts a moment to resolve
            page.wait_for_timeout(1200)
            page.screenshot(path=png_path)
            page.close()
            print(f"Rendered: {png_path} ({w}x{h} @ 2x)")
        
        browser.close()
    print("All assets rendered successfully.")

if __name__ == "__main__":
    render_assets()
