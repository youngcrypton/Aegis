import os
from playwright.sync_api import sync_playwright

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
REPO_ROOT = r"c:\Users\ascend X elysium"
BRAND_LOGO_DIR = os.path.join(REPO_ROOT, "brand", "logo")
BRAND_GITBOOK_DIR = os.path.join(REPO_ROOT, "brand", "gitbook")
GITBOOK_ASSETS_DIR = os.path.join(REPO_ROOT, "gitbook", ".gitbook", "assets")
DOCS_ASSETS_DIR = os.path.join(REPO_ROOT, "docs", ".gitbook", "assets")

for d in [BRAND_LOGO_DIR, BRAND_GITBOOK_DIR, GITBOOK_ASSETS_DIR, DOCS_ASSETS_DIR]:
    os.makedirs(d, exist_ok=True)

# 1. Transparent Square SVG (Aegis 3-blade mark centered in square viewBox)
def create_square_transparent_svg(size=180, is_dark=True):
    grad_id = "mk-dark" if is_dark else "mk-light"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">
  <defs>
    <linearGradient id="{grad_id}" x1="10.17" y1="-0.15" x2="29.83" y2="40.15" gradientUnits="userSpaceOnUse">
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
  <!-- Approved AEGIS Mark (scaled to ~68% of square for optimal clear space) -->
  <g transform="translate({size * 0.16}, {size * 0.16}) scale({(size * 0.68) / 40.0})">
    <polygon points="13.42,3.36 21.27,3.36 9.89,36.38 2.97,36.38" fill="url(#{grad_id})"/>
    <polygon points="21.95,12.72 29.26,12.72 20.83,36.38 14.05,36.38" fill="url(#{grad_id})"/>
    <polygon points="30.06,20.78 36.77,20.78 31.18,36.38 24.78,36.38" fill="url(#{grad_id})"/>
  </g>
</svg>"""

# 2. Dark Squircle Badge SVG (Brand kit dark ground: #2B2A33 -> #1C2238 -> #0F2C2C)
def create_square_dark_badge_svg(size=180):
    rx = size * 0.22  # Squircle radius
    stroke_w = max(1.5, size * 0.012)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">
  <defs>
    <linearGradient id="bg-grad-dark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2B2A33"/>
      <stop offset="45%" stop-color="#1C2238"/>
      <stop offset="100%" stop-color="#0F2C2C"/>
    </linearGradient>
    <linearGradient id="mk-dark" x1="10.17" y1="-0.15" x2="29.83" y2="40.15" gradientUnits="userSpaceOnUse">
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
  <rect width="{size}" height="{size}" rx="{rx}" fill="url(#bg-grad-dark)"/>
  <rect width="{size - stroke_w*2}" height="{size - stroke_w*2}" x="{stroke_w}" y="{stroke_w}" rx="{rx - stroke_w}" fill="none" stroke="rgba(220, 230, 255, 0.16)" stroke-width="{stroke_w}"/>
  <g transform="translate({size * 0.19}, {size * 0.19}) scale({(size * 0.62) / 40.0})">
    <polygon points="13.42,3.36 21.27,3.36 9.89,36.38 2.97,36.38" fill="url(#mk-dark)"/>
    <polygon points="21.95,12.72 29.26,12.72 20.83,36.38 14.05,36.38" fill="url(#mk-dark)"/>
    <polygon points="30.06,20.78 36.77,20.78 31.18,36.38 24.78,36.38" fill="url(#mk-dark)"/>
  </g>
</svg>"""

# 3. Light Squircle Badge SVG (Brand kit light ground: #FFFFFF with hairline rule)
def create_square_light_badge_svg(size=180):
    rx = size * 0.22
    stroke_w = max(1.5, size * 0.012)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">
  <defs>
    <linearGradient id="mk-light" x1="10.17" y1="-0.15" x2="29.83" y2="40.15" gradientUnits="userSpaceOnUse">
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
  <rect width="{size}" height="{size}" rx="{rx}" fill="#FFFFFF"/>
  <rect width="{size - stroke_w*2}" height="{size - stroke_w*2}" x="{stroke_w}" y="{stroke_w}" rx="{rx - stroke_w}" fill="none" stroke="rgba(22, 18, 48, 0.13)" stroke-width="{stroke_w}"/>
  <g transform="translate({size * 0.19}, {size * 0.19}) scale({(size * 0.62) / 40.0})">
    <polygon points="13.42,3.36 21.27,3.36 9.89,36.38 2.97,36.38" fill="url(#mk-light)"/>
    <polygon points="21.95,12.72 29.26,12.72 20.83,36.38 14.05,36.38" fill="url(#mk-light)"/>
    <polygon points="30.06,20.78 36.77,20.78 31.18,36.38 24.78,36.38" fill="url(#mk-light)"/>
  </g>
</svg>"""

# 4. Horizontal Lockup "Aegis"
def create_horizontal_lockup_svg(is_dark=True):
    fill_col = "#E8ECF8" if is_dark else "#161230"
    grad_id = "mk-dark" if is_dark else "mk-light"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Marcellus&amp;display=swap');
      .brand-text {{
        font-family: 'Marcellus', Georgia, serif;
        font-size: 36px;
        fill: {fill_col};
      }}
    </style>
    <linearGradient id="{grad_id}" x1="10.17" y1="-0.15" x2="29.83" y2="40.15" gradientUnits="userSpaceOnUse">
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
  <g transform="translate(6, 6) scale(1.2)">
    <polygon points="13.42,3.36 21.27,3.36 9.89,36.38 2.97,36.38" fill="url(#{grad_id})"/>
    <polygon points="21.95,12.72 29.26,12.72 20.83,36.38 14.05,36.38" fill="url(#{grad_id})"/>
    <polygon points="30.06,20.78 36.77,20.78 31.18,36.38 24.78,36.38" fill="url(#{grad_id})"/>
  </g>
  <text x="64" y="42" class="brand-text">Aegis</text>
</svg>"""

# 5. Horizontal Lockup "Aegis_hedge"
def create_hedge_lockup_svg(is_dark=True):
    brand_col = "#E8ECF8" if is_dark else "#161230"
    hedge_col = "#5FD9BE" if is_dark else "#07705F"
    grad_id = "mk-dark" if is_dark else "mk-light"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 60" width="320" height="60">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Marcellus&amp;display=swap');
      .brand-text {{
        font-family: 'Marcellus', Georgia, serif;
        font-size: 36px;
        fill: {brand_col};
      }}
      .hedge-text {{
        font-family: 'Marcellus', Georgia, serif;
        font-size: 36px;
        fill: {hedge_col};
      }}
    </style>
    <linearGradient id="{grad_id}" x1="10.17" y1="-0.15" x2="29.83" y2="40.15" gradientUnits="userSpaceOnUse">
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
  <g transform="translate(6, 6) scale(1.2)">
    <polygon points="13.42,3.36 21.27,3.36 9.89,36.38 2.97,36.38" fill="url(#{grad_id})"/>
    <polygon points="21.95,12.72 29.26,12.72 20.83,36.38 14.05,36.38" fill="url(#{grad_id})"/>
    <polygon points="30.06,20.78 36.77,20.78 31.18,36.38 24.78,36.38" fill="url(#{grad_id})"/>
  </g>
  <text x="64" y="42"><tspan class="brand-text">Aegis</tspan><tspan class="hedge-text">_hedge</tspan></text>
</svg>"""

def render_svg(page, svg_code, out_png, width, height, dsf=1):
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Marcellus&display=swap" rel="stylesheet">
    <style>body{{margin:0;padding:0;background:transparent;overflow:hidden;}}</style>
    </head><body>{svg_code}</body></html>"""
    page.set_viewport_size({"width": width, "height": height})
    page.set_content(html)
    page.wait_for_timeout(600)
    page.locator("svg").screenshot(path=out_png, omit_background=True)

def main():
    # 1. Generate SVGs
    svg_map = {
        # Square formats (GitBook recommended 180x180)
        "aegis-square-logo-180": (create_square_transparent_svg(180, True), 180, 180),
        "aegis-square-logo-dark-180": (create_square_dark_badge_svg(180), 180, 180),
        "aegis-square-logo-light-180": (create_square_light_badge_svg(180), 180, 180),
        
        # Square formats (512x512 high-res)
        "aegis-square-logo-512": (create_square_transparent_svg(512, True), 512, 512),
        "aegis-square-logo-dark-512": (create_square_dark_badge_svg(512), 512, 512),
        "aegis-square-logo-light-512": (create_square_light_badge_svg(512), 512, 512),

        # Horizontal lockups
        "aegis-logo-dark": (create_horizontal_lockup_svg(True), 240, 60),
        "aegis-logo-light": (create_horizontal_lockup_svg(False), 240, 60),
        "aegis-hedge-logo-dark": (create_hedge_lockup_svg(True), 320, 60),
        "aegis-hedge-logo-light": (create_hedge_lockup_svg(False), 320, 60),
    }

    # Write SVGs to brand/logo and brand/gitbook
    for name, (svg_code, _, _) in svg_map.items():
        for target_dir in [BRAND_LOGO_DIR, BRAND_GITBOOK_DIR]:
            with open(os.path.join(target_dir, f"{name}.svg"), "w", encoding="utf-8") as f:
                f.write(svg_code)

    # Render PNGs using Playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=EDGE_PATH, headless=True)
        page = browser.new_page(device_scale_factor=1)

        for name, (svg_code, w, h) in svg_map.items():
            png_logo = os.path.join(BRAND_LOGO_DIR, f"{name}.png")
            render_svg(page, svg_code, png_logo, w, h)
            
            # Copy to brand/gitbook
            png_gb = os.path.join(BRAND_GITBOOK_DIR, f"{name}.png")
            with open(png_logo, "rb") as sf, open(png_gb, "wb") as df:
                df.write(sf.read())
            print(f"Rendered {name}.png ({w}x{h})")

        browser.close()

    # Create canonical aliases in brand/gitbook:
    # GitBook prompt: "Use a square image, at least 32x32px (180x180px recommended)"
    # We provide:
    # - gitbook-logo-square-180.png (Dark squircle badge 180x180 - best match for GitBook site logo)
    # - gitbook-logo-square-transparent-180.png (Transparent square 180x180)
    # - gitbook-logo-square-light-180.png (Light squircle badge 180x180)
    # - gitbook-logo-square-512.png (512x512 high-res)
    aliases = [
        ("aegis-square-logo-dark-180.png", "gitbook-logo-square-180.png"),
        ("aegis-square-logo-dark-180.png", "gitbook-logo-square-dark-180.png"),
        ("aegis-square-logo-180.png", "gitbook-logo-square-transparent-180.png"),
        ("aegis-square-logo-light-180.png", "gitbook-logo-square-light-180.png"),
        ("aegis-square-logo-dark-512.png", "gitbook-logo-square-512.png"),
        ("aegis-square-logo-dark-180.png", "gitbook-icon.png"),
    ]

    for src_name, dst_name in aliases:
        src = os.path.join(BRAND_GITBOOK_DIR, src_name)
        dst = os.path.join(BRAND_GITBOOK_DIR, dst_name)
        if os.path.exists(src):
            with open(src, "rb") as sf, open(dst, "wb") as df:
                df.write(sf.read())

    # Sync assets into space directories (.gitbook/assets/)
    for asset_dir in [GITBOOK_ASSETS_DIR, DOCS_ASSETS_DIR]:
        for fname in os.listdir(BRAND_GITBOOK_DIR):
            if fname.endswith(('.png', '.svg')):
                src = os.path.join(BRAND_GITBOOK_DIR, fname)
                dst = os.path.join(asset_dir, fname)
                with open(src, "rb") as sf, open(dst, "wb") as df:
                    df.write(sf.read())

    print("Generated all square 180x180 and 512x512 assets successfully.")

if __name__ == "__main__":
    main()
