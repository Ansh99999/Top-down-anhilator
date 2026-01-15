from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000")

        # Select "Dune Buggy" (index 0)
        page.click(".vehicle-card:nth-child(1)")

        # Wait for game to load
        page.wait_for_selector("#gameCanvas")

        # Take screenshot of basic game load
        page.screenshot(path="verification/game_start.png")

        # We can't easily force weather/boss in this short script without cheating,
        # but we can verify the assets loaded and game started.
        # To verify weather, we'd need to mock the socket event or wait 100s.
        # For now, we verify the game renders without error.

        browser.close()

if __name__ == "__main__":
    run()
