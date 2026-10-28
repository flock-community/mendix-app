import { test, expect } from "../support/fixtures";
import { users } from "../support/env";

test.describe("Layout and navigation", () => {
    test.beforeEach(async ({ app }) => {
        await app.signIn(users.user);
    });

    test("the home page is the todo overview", async ({ app, page }) => {
        await expect(page).toHaveTitle("Mendix - Todos");
        await expect(app.overview.heading).toHaveText("My todos");
        await expect(page.locator("h2.mx-name-heading")).toHaveCount(1);
        await expect(app.overview.newButton).toHaveText("New todo");
        await expect(app.overview.newButton).toHaveClass(/btn-primary/);
    });

    test("the page uses the Atlas top bar layout", async ({ page }) => {
        await expect(page.locator(".layout-atlas.layout-atlas-responsive-topbar")).toBeVisible();
        await expect(page.locator(".region-topbar .topbar-content")).toBeVisible();
        await expect(page.locator(".region-content .mx-name-mainGrid")).toBeVisible();
    });

    test("the menu bar has one item, Todos, with its icon", async ({ page }) => {
        // The React client renders a menu bar as a Bootstrap navbar.
        const menu = page.locator(".region-topbar .mx-name-mainMenu.mx-navbar");
        const items = menu.locator("ul.navbar-nav > li.mx-navbar-item");

        await expect(items).toHaveCount(1);
        await expect(items.first()).toHaveText("Todos");
        await expect(items.first().locator(".mx-icon-lined.mx-icon-list-bullets")).toHaveCount(1);
        await expect(items.first().locator("a.mx-name-mainMenu-0")).toHaveAttribute("href", "/p/todos");
    });

    test("the Todos menu item opens the overview", async ({ app, page }) => {
        await page.locator(".mx-name-mainMenu li.mx-navbar-item a").first().click();

        await app.overview.waitForGrid();
        await expect(page).toHaveURL(/\/p\/todos$/);
        await expect(app.overview.heading).toHaveText("My todos");
    });

    test("the top bar's language selector lists the app's one language", async ({ page }) => {
        const selector = page.locator(".region-topbar .widget-language-selector");
        await expect(selector).toBeVisible();
        // A user without a language of their own gets the app's default.
        await expect(selector.locator(".current-language-text")).toHaveText("English, United States");

        await selector.locator(".popupmenu-trigger").click();

        await expect(selector.getByRole("option")).toHaveText([/English/]);
        await page.keyboard.press("Escape");
        await expect(selector.getByRole("option")).toHaveCount(0);
    });

    test("the grid has the five columns of the model", async ({ app }) => {
        await expect(app.overview.grid).toHaveClass(/table-hover/);
        await expect(app.overview.grid).toHaveClass(/table-striped/);
        await expect(app.overview.grid.locator(".widget-datagrid-grid-head .column-header")).toHaveText([
            "Done",
            "Title",
            "Priority",
            "Due date",
            "Actions"
        ]);
        await expect(app.overview.grid.locator(".th.column-selector")).toHaveCount(1);
    });

    test("every column but Actions is sortable and filterable", async ({ app }) => {
        const filterControl = ".filter input, .filter [role=combobox]";
        for (const caption of ["Done", "Title", "Priority", "Due date"]) {
            await expect(app.overview.sortButton(caption)).toHaveAttribute("role", "button");
            await expect(app.overview.header(caption).locator(filterControl).first()).toBeVisible();
        }
        await expect(app.overview.sortButton("Actions")).not.toHaveAttribute("role", "button");
        await expect(app.overview.header("Actions")).not.toHaveAttribute("aria-sort");
        await expect(app.overview.header("Actions").locator(filterControl)).toHaveCount(0);
    });

    test("the open-first default sort shows on the Done and Due date headers", async ({ app }) => {
        await expect(app.overview.header("Done")).toHaveAttribute("aria-sort", "ascending");
        await expect(app.overview.header("Due date")).toHaveAttribute("aria-sort", "ascending");
        await expect(app.overview.header("Title")).toHaveAttribute("aria-sort", "none");
        await expect(app.overview.header("Priority")).toHaveAttribute("aria-sort", "none");
    });
});
