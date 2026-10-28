import fs from "node:fs";
import type { Locator, Page, TestInfo } from "@playwright/test";
import { test, expect } from "../support/fixtures";
import { TodoApp, usDate, type OverviewPage } from "../support/app";
import { users } from "../support/env";

/**
 * Pixel comparisons. The baselines are screenshots of the MENDIX app: capture
 * them with `npm run baseline:mendix`, then `npm run test:nextjs` compares the
 * rebuild with them. Until a baseline exists, a test takes its screenshot,
 * attaches it to the report and skips, rather than passing against itself.
 */

async function snap(testInfo: TestInfo, target: Page | Locator, name: string): Promise<void> {
    const baseline = testInfo.snapshotPath(name, { kind: "screenshot" });
    const updating = testInfo.config.updateSnapshots === "all" || testInfo.config.updateSnapshots === "changed";
    if (!fs.existsSync(baseline) && !(updating && testInfo.project.name === "mendix")) {
        const shot = await target.screenshot({ animations: "disabled", caret: "hide" });
        await testInfo.attach(`${name} (no baseline yet)`, { body: shot, contentType: "image/png" });
        test.skip(true, `No Mendix baseline for ${name}: run "npm run baseline:mendix" against the Mendix app first`);
    }
    await expect(target).toHaveScreenshot(name);
}

async function seed(overview: OverviewPage): Promise<void> {
    await overview.create({ title: "Buy groceries", description: "Milk, bread and eggs", priority: "High", dueDate: usDate(2031, 3, 10) });
    await overview.create({ title: "Call the plumber", priority: "Medium", dueDate: usDate(2031, 3, 12) });
    await overview.create({ title: "Renew passport", priority: "Low", dueDate: usDate(2031, 4, 1), done: true });
    await overview.expectTitles(["Buy groceries", "Call the plumber", "Renew passport"]);
}

test.describe("Visual parity @visual", () => {
    test("login page", async ({ app, page }, testInfo) => {
        await app.login.goto();
        await app.settle();
        await snap(testInfo, page, "login.png");
    });

    test("login page with an error", async ({ app, page }, testInfo) => {
        await app.login.goto();
        await app.login.signIn({ name: users.user.name, password: "Not-the-passw0rd" });
        await expect(app.login.message).toBeVisible();
        await app.login.password.blur();
        await app.settle();
        await snap(testInfo, page, "login-error.png");
    });

    test("empty todo list", async ({ todos, page }, testInfo) => {
        await todos.settle();
        await snap(testInfo, page, "overview-empty.png");
    });

    test("todo list", async ({ todos, page }, testInfo) => {
        await seed(todos.overview);
        await todos.settle();
        await snap(testInfo, page, "overview.png");
    });

    test("todo list, hovering a row", async ({ todos, page }, testInfo) => {
        await seed(todos.overview);
        await todos.settle();
        await todos.overview.rowAt(1).title.hover();
        await snap(testInfo, page, "overview-hover.png");
    });

    test("todo list sorted by title, descending", async ({ todos, page }, testInfo) => {
        await seed(todos.overview);
        await todos.overview.sortButton("Title").click();
        await todos.overview.sortButton("Title").click();
        await todos.overview.expectTitles(["Renew passport", "Call the plumber", "Buy groceries"]);
        await todos.settle();
        await snap(testInfo, page, "overview-sorted.png");
    });

    test("new todo popup", async ({ todos, page }, testInfo) => {
        await todos.overview.newButton.click();
        await todos.overview.popup.expectOpen();
        await todos.settle();
        await snap(testInfo, page, "popup-new.png");
    });

    test("new todo popup with a validation error", async ({ todos, page }, testInfo) => {
        await todos.overview.newButton.click();
        await todos.overview.popup.save.click();
        await expect(todos.overview.popup.titleGroup.locator(".mx-validation-message")).toBeVisible();
        await todos.settle();
        await snap(testInfo, page, "popup-validation.png");
    });

    test("edit todo popup", async ({ todos, page }, testInfo) => {
        await seed(todos.overview);
        await todos.overview.row("Buy groceries").editButton.click();
        await todos.overview.popup.expectOpen();
        await todos.overview.popup.title.blur();
        await todos.settle();
        await snap(testInfo, page, "popup-edit.png");
    });

    test("priority combo box, open", async ({ todos, page }, testInfo) => {
        await todos.overview.newButton.click();
        await todos.overview.popup.priority.click();
        await expect(page.getByRole("option")).toHaveCount(3);
        await todos.settle();
        await snap(testInfo, page, "popup-priority-open.png");
    });

    test("date picker calendar, open", async ({ todos, page }, testInfo) => {
        await seed(todos.overview);
        await todos.overview.row("Buy groceries").editButton.click();
        await todos.overview.popup.root.locator(".mx-name-dpDueDate button").click();
        await expect(page.locator(".mx-calendar")).toBeVisible();
        await todos.settle();
        await snap(testInfo, page, "popup-calendar-open.png");
    });

    test("priority filter, open", async ({ todos, page }, testInfo) => {
        await seed(todos.overview);
        await todos.overview.openDropdownFilter("fPriority");
        await expect(page.getByRole("option")).toHaveCount(4);
        await todos.settle();
        await snap(testInfo, page, "filter-priority-open.png");
    });

    test("title filter operators, open", async ({ todos, page }, testInfo) => {
        await todos.overview.grid.locator(".mx-name-fTitle .filter-selector-button").click();
        await expect(page.locator(".filter-selectors .filter-listitem").first()).toBeVisible();
        await todos.settle();
        await snap(testInfo, page, "filter-title-operators-open.png");
    });

    test("column selector, open", async ({ todos, page }, testInfo) => {
        await seed(todos.overview);
        await todos.overview.grid.locator(".column-selector-button").click();
        await expect(page.locator(".column-selectors")).toBeVisible();
        await todos.settle();
        await snap(testInfo, page, "column-selector-open.png");
    });

    test("todo list in dark mode", async ({ browser }, testInfo) => {
        const context = await browser.newContext({ colorScheme: "dark", viewport: { width: 1280, height: 800 }, locale: "en-US", timezoneId: "UTC" });
        try {
            const app = new TodoApp(await context.newPage());
            await app.signIn(users.user);
            await app.overview.deleteAll();
            await seed(app.overview);
            await app.settle();
            await snap(testInfo, app.page, "overview-dark.png");
        } finally {
            await context.close();
        }
    });

    test("todo list on a phone", async ({ browser }, testInfo) => {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "UTC" });
        try {
            const app = new TodoApp(await context.newPage());
            await app.signIn(users.user);
            await app.overview.deleteAll();
            await seed(app.overview);
            await app.settle();
            await snap(testInfo, app.page, "overview-phone.png");
        } finally {
            await context.close();
        }
    });
});
