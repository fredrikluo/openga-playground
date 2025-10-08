from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:3000", timeout=60000)

        # Wait for the main content to be present, indicating the page has loaded.
        page.wait_for_selector("main", timeout=60000)

        # Click on the Folders tab, with a longer timeout
        folders_tab = page.get_by_role("tab", name="Folders")
        expect(folders_tab).to_be_visible(timeout=60000)
        folders_tab.click()

        # Take a screenshot of the initial folder view
        page.screenshot(path="jules-scratch/verification/01_initial_view.png")

        # Create a new folder
        page.get_by_placeholder("Folder Name").fill("Test Folder")
        page.get_by_role("button", name="Add").click()

        # Wait for the new folder to appear in the main view and take a screenshot
        # We use .first() because the folder name will also appear in the "All Folders" list
        new_folder_in_view = page.get_by_text("Test Folder").first
        expect(new_folder_in_view).to_be_visible()
        page.screenshot(path="jules-scratch/verification/02_folder_created.png")

        # Click on the new folder to navigate into it
        new_folder_in_view.click()

        # Take a screenshot inside the new folder
        expect(page.get_by_role("heading", name="Test Folder")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/03_inside_folder.png")

        # Go back to the parent folder
        page.get_by_label("Go back").click()

        # Take a screenshot of the view after going back
        expect(page.get_by_role("heading", name="Home")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/04_after_back.png")

    except Exception as e:
        print(f"Playwright script failed: {e}")
        page.screenshot(path="jules-scratch/verification/failure_screenshot.png")
        with open("jules-scratch/verification/failure_page_source.html", "w") as f:
            f.write(page.content())
        raise # re-raise the exception after saving the state
    finally:
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)