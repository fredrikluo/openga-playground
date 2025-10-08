from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the application
        page.goto("http://localhost:3000")

        # Click on the "Folders" tab
        page.get_by_role("button", name="Folders").click()

        # Wait for the folder view to be visible
        expect(page.locator("text=Home")).to_be_visible()

        # Check that the "All Folders" list is not present
        all_folders_heading = page.locator("text=All Folders (for editing/deleting)")
        expect(all_folders_heading).not_to_be_visible()

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)