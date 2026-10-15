from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        headless=True
    )
    page = browser.new_page(viewport={"width": 1280, "height": 850})
    page.goto("http://localhost:3000/access.html")
    page.evaluate("""() => {
        localStorage.removeItem('aegis_access_authorized');
        document.documentElement.setAttribute('data-theme', 'light');
    }""")
    page.wait_for_timeout(500)
    page.screenshot(path="remotion/public/access_card_current_light.png")

    page.evaluate("""() => {
        document.documentElement.setAttribute('data-theme', 'dark');
    }""")
    page.wait_for_timeout(500)
    page.screenshot(path="remotion/public/access_card_current_dark.png")
    browser.close()
print("Screenshots captured successfully.")
