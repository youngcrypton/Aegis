import os
import subprocess
from playwright.sync_api import sync_playwright

def generate_overlays():
    overlay_dir = "remotion/public/overlays"
    os.makedirs(overlay_dir, exist_ok=True)

    chapters = [
        {
            "num": "01",
            "title": "OVERVIEW & 0x0801 ORACLE CONSENSUS",
            "tag": "PRECOMPILE 0x0801",
            "text": "Synchronous sub-78ms mark price reads directly from HyperCore consensus",
        },
        {
            "num": "02",
            "title": "1-CLICK LITE AUTO-PILOT & INV-1 DELEGATION",
            "tag": "INVARIANT INV-1",
            "text": "Ephemeral trade-only session keys with 0% custody risk & zero withdrawal rights",
        },
        {
            "num": "03",
            "title": "PRO TERMINAL & HYPERCORE CLOB DEPTH",
            "tag": "ORDERBOOK DEPTH",
            "text": "Streaming 10-level Central Limit Orderbook directly from HyperCore",
        },
        {
            "num": "04",
            "title": "FLASH CRASH (-18%) & SUB-SECOND SHORT HEDGE",
            "tag": "PREDEPLOY 0x0802",
            "text": "Autonomous short perpetual hedge absorbs collateral drop dollar-for-dollar",
        },
        {
            "num": "05",
            "title": "V-BOUNCE, TRAILING PROFIT UNWIND & INV-4 FEE SPLIT",
            "tag": "INVARIANT INV-4",
            "text": "Trailing take-profit restores vault: 50% burned via Ascend Pools / 50% staker yield",
        },
        {
            "num": "06",
            "title": "EMERGENCY KILLSWITCH (INV-3) & AUDIT INTEGRITY",
            "tag": "INVARIANTS INV-3 & INV-5",
            "text": "Atomic single-tx manual override killswitch & strictly monotonic EIP-712 nonces",
        },
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            headless=True
        )
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        for idx, ch in enumerate(chapters, 1):
            # Top Banner HTML
            banner_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&family=Marcellus&display=swap" rel="stylesheet">
              <style>
                body {{ margin: 0; padding: 0; background: transparent; overflow: hidden; }}
                .banner {{
                  width: 1280px;
                  height: 36px;
                  box-sizing: border-box;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  padding: 0 16px;
                  background: #161B2E;
                  border-bottom: 1px solid rgba(220, 230, 255, 0.12);
                  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                  font-family: 'Inter', -apple-system, sans-serif;
                }}
                .left {{ display: flex; align-items: center; gap: 10px; }}
                .brand {{ font-family: 'Marcellus', Georgia, serif; font-size: 13px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.06em; }}
                .sep {{ width: 1px; height: 14px; background: rgba(255, 255, 255, 0.2); }}
                .status {{ display: flex; align-items: center; gap: 5px; }}
                .dot {{ width: 6px; height: 6px; border-radius: 50%; background: #5FD9BE; box-shadow: 0 0 6px #5FD9BE; }}
                .status-txt {{ font-size: 10px; font-weight: 700; letter-spacing: 0.06em; color: #5FD9BE; }}
                .center {{
                  display: flex; align-items: center; gap: 8px;
                  background: rgba(10, 12, 20, 0.6);
                  border: 1px solid rgba(95, 217, 190, 0.3);
                  padding: 3px 12px; border-radius: 16px;
                }}
                .ch-pill {{ font-size: 9px; font-weight: 800; background: #07705F; color: #FFFFFF; padding: 1px 5px; border-radius: 3px; letter-spacing: 0.04em; }}
                .ch-title {{ font-size: 10px; font-weight: 600; letter-spacing: 0.04em; color: #E8ECF8; }}
                .right {{ display: flex; align-items: center; gap: 10px; font-size: 10px; color: #A7AFCB; }}
                .net {{ font-weight: 600; color: #E8ECF8; }}
                .lat {{ color: #5FD9BE; font-weight: 700; background: rgba(95, 217, 190, 0.12); padding: 1px 6px; border-radius: 3px; }}
              </style>
            </head>
            <body>
              <div class="banner">
                <div class="left">
                  <span class="brand">AEGIS</span>
                  <div class="sep"></div>
                  <div class="status">
                    <span class="dot"></span>
                    <span class="status-txt">OFFICIAL PRODUCT DEMO</span>
                  </div>
                </div>
                <div class="center">
                  <span class="ch-pill">CH {ch['num']}</span>
                  <span class="ch-title">{ch['title']}</span>
                </div>
                <div class="right">
                  <span class="net">Elysium L2 (99801)</span>
                  <span class="lat">0x0801: 68ms</span>
                </div>
              </div>
            </body>
            </html>
            """
            page.set_content(banner_html)
            banner_el = page.locator(".banner")
            banner_path = os.path.join(overlay_dir, f"banner_ch{idx}.png")
            banner_el.screenshot(path=banner_path, omit_background=True)

            # Callout Badge HTML
            callout_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap" rel="stylesheet">
              <style>
                body {{ margin: 0; padding: 0; background: transparent; overflow: hidden; }}
                .callout {{
                  display: inline-flex;
                  align-items: center;
                  gap: 12px;
                  background: rgba(22, 27, 46, 0.96);
                  padding: 10px 18px;
                  border-radius: 12px;
                  border: 1px solid rgba(95, 217, 190, 0.35);
                  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                  font-family: 'Inter', -apple-system, sans-serif;
                  max-width: 620px;
                }}
                .tag {{
                  background: rgba(95, 217, 190, 0.15);
                  border: 1px solid #5FD9BE;
                  padding: 4px 8px;
                  border-radius: 6px;
                  color: #5FD9BE;
                  font-size: 10px;
                  font-weight: 800;
                  letter-spacing: 0.06em;
                  white-space: nowrap;
                }}
                .desc {{
                  font-size: 12px;
                  font-weight: 500;
                  line-height: 1.4;
                  color: #E8ECF8;
                }}
              </style>
            </head>
            <body>
              <div class="callout">
                <div class="tag">{ch['tag']}</div>
                <div class="desc">{ch['text']}</div>
              </div>
            </body>
            </html>
            """
            page.set_content(callout_html)
            callout_el = page.locator(".callout")
            callout_path = os.path.join(overlay_dir, f"callout_ch{idx}.png")
            callout_el.screenshot(path=callout_path, omit_background=True)
            print(f"Generated overlays for Chapter {idx}: {banner_path}, {callout_path}")

        context.close()
        browser.close()

if __name__ == "__main__":
    generate_overlays()
