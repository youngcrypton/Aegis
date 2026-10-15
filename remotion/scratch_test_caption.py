from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        headless=True
    )
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    page.goto("http://localhost:3000")
    page.wait_for_load_state("networkidle")
    
    # Inject test caption styling
    page.evaluate("""() => {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('aegis-theme', 'light');

        const style = document.createElement('style');
        style.textContent = `
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
                padding: 0 20px;
            }
            #aegisCaptionCard {
                background: rgba(14, 22, 38, 0.94);
                border: 1px solid rgba(13, 148, 136, 0.6);
                border-radius: 12px;
                padding: 9px 20px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), 0 0 16px rgba(13, 148, 136, 0.2);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                display: flex;
                align-items: center;
                gap: 12px;
                max-width: 960px;
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
            }
        `;
        document.head.appendChild(style);

        const wrap = document.createElement('div');
        wrap.id = 'aegisCaptionContainer';
        wrap.innerHTML = `
            <div id="aegisCaptionCard">
                <span id="aegisCaptionBadge">LIVE SENTINEL</span>
                <span id="aegisCaptionText">Connected directly to HyperCore Precompile 0x0801, streaming mark prices in sub-78 milliseconds.</span>
            </div>
        `;
        document.body.appendChild(wrap);
    }""")

    page.wait_for_timeout(400)
    page.screenshot(path="remotion/public/test_caption_preview.png")
    browser.close()

print("Caption test screenshot captured.")
