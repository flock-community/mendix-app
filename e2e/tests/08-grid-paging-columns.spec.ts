import { test, expect } from "../support/fixtures";
import { uid, usDate } from "../support/app";

test.describe("Grid paging", () => {
    test.setTimeout(240_000);

    test("20 rows per page, with first, previous, next and last buttons", async ({ todos }) => {
        const { overview } = todos;
        const id = uid();
        // 23 todos, due on consecutive days so the order is known. Latest first: each
        // new one sorts to the top of page 1, where create() checks it arrived.
        for (let day = 23; day >= 1; day--) {
            await overview.create({ title: `Item ${String(day).padStart(2, "0")} ${id}`, dueDate: usDate(2031, 1, day) });
        }

        const first = overview.grid.getByRole("button", { name: "Go to first page" });
        const previous = overview.grid.getByRole("button", { name: "Go to previous page" });
        const next = overview.grid.getByRole("button", { name: "Go to next page" });
        const last = overview.grid.getByRole("button", { name: "Go to last page" });

        await expect(overview.rows).toHaveCount(20);
        await expect(overview.pagingStatus).toHaveText("1 to 20 of 23");
        await expect(first).toBeDisabled();
        await expect(previous).toBeDisabled();
        await expect(next).toBeEnabled();
        await expect(last).toBeEnabled();

        await next.click();
        await expect(overview.pagingStatus).toHaveText("21 to 23 of 23");
        await overview.expectTitles([`Item 21 ${id}`, `Item 22 ${id}`, `Item 23 ${id}`]);
        await expect(next).toBeDisabled();
        await expect(last).toBeDisabled();
        await expect(previous).toBeEnabled();

        await previous.click();
        await expect(overview.pagingStatus).toHaveText("1 to 20 of 23");

        await last.click();
        await expect(overview.pagingStatus).toHaveText("21 to 23 of 23");

        await first.click();
        await expect(overview.pagingStatus).toHaveText("1 to 20 of 23");
        await expect(overview.rowAt(0).title).toHaveText(`Item 01 ${id}`);
    });

    test("an empty list still shows the paging bar", async ({ todos }) => {
        const { overview } = todos;

        await expect(overview.rows).toHaveCount(0);
        await expect(overview.pagingStatus).toHaveText("0 to 0 of 0");
        await expect(overview.grid.getByRole("button", { name: "Go to next page" })).toBeDisabled();
        await expect(overview.grid.getByRole("button", { name: "Go to last page" })).toBeDisabled();
    });
});

test.describe("Grid columns", () => {
    test("the column selector hides and shows a column", async ({ todos, page }) => {
        const { overview } = todos;
        await overview.create({ title: `Columns ${uid()}`, priority: "High" });

        await overview.grid.locator(".column-selector-button").click();
        const menu = page.locator(".column-selectors");
        await expect(menu).toBeVisible();
        await expect(menu.locator("li label")).toHaveText(["Done", "Title", "Priority", "Due date", "Actions"]);

        await menu.locator("li", { hasText: "Priority" }).click();
        await expect(overview.header("Priority")).toHaveCount(0);
        await expect(overview.rowAt(0).root.locator(":scope > .td")).toHaveCount(5);

        await menu.locator("li", { hasText: "Priority" }).click();
        await expect(overview.header("Priority")).toHaveCount(1);
    });

    test("the last visible column cannot be hidden", async ({ todos, page }) => {
        const { overview } = todos;
        await overview.grid.locator(".column-selector-button").click();
        const menu = page.locator(".column-selectors");
        for (const caption of ["Done", "Title", "Priority", "Due date"]) {
            await menu.locator("li", { hasText: caption }).click();
        }

        await expect(menu.locator("li", { hasText: "Actions" }).locator("input")).toBeDisabled();
        await expect(overview.headerCells.filter({ hasNot: page.locator(".column-selector-content") })).toHaveCount(1);
    });

    test("dragging a column border resizes the column", async ({ todos, page }) => {
        const { overview } = todos;
        const header = overview.header("Title");
        const before = (await header.boundingBox())!.width;

        const resizer = header.locator(".column-resizer");
        const box = (await resizer.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2, { steps: 5 });
        await page.mouse.up();

        await expect.poll(async () => (await header.boundingBox())!.width).toBeLessThan(before - 40);
    });
});
