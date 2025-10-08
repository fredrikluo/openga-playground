from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:3000", timeout=60000)
        page.screenshot(path="jules-scratch/verification/server_response.png")
        print("Successfully navigated to the page and took a screenshot.")
    except Exception as e:
        print(f"Failed to navigate to the page: {e}")
        page.screenshot(path="jules-scratch/verification/server_failure.png")
    finally:
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)