from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:3000", timeout=60000)
        page.wait_for_selector("main", timeout=60000)

        # 1. Navigate to Folders Tab
        page.get_by_role("tab", name="Folders").click()
        page.screenshot(path="jules-scratch/verification/final_01_folders_tab.png")

        # 2. Create a new folder
        page.get_by_placeholder("Folder Name").fill("Final Test Folder")
        page.get_by_role("button", name="Add").click()
        expect(page.get_by_text("Final Test Folder")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/final_02_folder_created.png")

        # 3. Navigate into the new folder
        page.get_by_text("Final Test Folder").first.click()
        expect(page.get_by_role("heading", name="Final Test Folder")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/final_03_inside_folder.png")

        # 4. Add a Kahoot to the folder
        page.get_by_placeholder("Kahoot Name").fill("My New Kahoot")
        page.get_by_role("button", name="Add Kahoot").click()
        expect(page.get_by_text("My New Kahoot")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/final_04_kahoot_added.png")

        # 5. Go back to the home view
        page.get_by_label("Go back").click()
        expect(page.get_by_role("heading", name="Home")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/final_05_back_home.png")

        # 6. Delete the folder
        page.get_by_role("button", name="Delete").click()
        expect(page.get_by_text("Final Test Folder")).not_to_be_visible()
        page.screenshot(path="jules-scratch/verification/final_06_folder_deleted.png")


    except Exception as e:
        print(f"Playwright script failed: {e}")
        page.screenshot(path="jules-scratch/verification/failure_screenshot.png")
        with open("jules-scratch/verification/failure_page_source.html", "w") as f:
            f.write(page.content())
        raise
    finally:
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)