import { test, expect } from "../support/fixtures";
import { mendixTexts } from "../support/env";
import { uid, usDate } from "../support/app";

test.describe("Create a todo", () => {
    test("New todo opens an empty Edit todo popup with the model's defaults", async ({ todos }) => {
        const { overview } = todos;
        await overview.newButton.click();

        const popup = overview.popup;
        await popup.expectOpen();
        await expect(popup.root.locator(".control-label")).toHaveText(["Title", "Description", "Due date", "Priority", "Done"]);
        await expect(popup.title).toHaveValue("");
        await expect(popup.description).toHaveValue("");
        await expect(popup.dueDate).toHaveValue("");
        // Priority defaults to Medium and IsDone to false in the domain model.
        await expect(popup.priority).toHaveValue("Medium");
        await expect(popup.done).not.toBeChecked();
        await expect(popup.save).toHaveText("Save");
        await expect(popup.save).toHaveClass(/btn-primary/);
        await expect(popup.cancel).toHaveText("Cancel");
    });

    test("the title field has focus when the popup opens", async ({ todos }) => {
        await todos.overview.newButton.click();
        await todos.overview.popup.expectOpen();

        await expect(todos.overview.popup.title).toBeFocused();
    });

    test("saving with only a title adds a row with the defaults", async ({ todos }) => {
        const { overview } = todos;
        const title = `Buy milk ${uid()}`;

        await overview.create({ title });

        const row = overview.row(title);
        await expect(row.doneCheckbox).not.toBeChecked();
        await expect(row.doneCheckbox).toBeDisabled();
        await expect(row.priority).toHaveText("Medium");
        await expect(row.dueDate).toHaveText("");
        await expect(overview.pagingStatus).toHaveText("1 to 1 of 1");
    });

    test("saving every field shows them all in the row", async ({ todos }) => {
        const { overview } = todos;
        const title = `Plan trip ${uid()}`;

        await overview.create({
            title,
            description: "Book the train and a hotel",
            dueDate: usDate(2031, 3, 14),
            priority: "High",
            done: true
        });

        const row = overview.row(title);
        await expect(row.doneCheckbox).toBeChecked();
        await expect(row.priority).toHaveText("High");
        await expect(row.dueDate).toContainText("3/14/2031");
    });

    test("a todo needs a title", async ({ todos }) => {
        const { overview } = todos;
        await overview.newButton.click();
        const popup = overview.popup;
        await popup.expectOpen();

        await popup.fill({ description: "No title here" });
        await popup.save.click();

        await expect(popup.titleGroup.locator(".mx-validation-message")).toHaveText(mendixTexts.titleRequired);
        await expect(popup.titleGroup).toHaveClass(/has-error/);
        await popup.expectOpen();
        await expect(overview.rows).toHaveCount(0);

        // Fixing the title clears the error once the field is left, and saves.
        const title = `Fixed later ${uid()}`;
        await popup.fill({ title });
        await popup.title.press("Tab");
        await expect(popup.titleGroup.locator(".mx-validation-message")).toHaveCount(0);
        await expect(popup.titleGroup).not.toHaveClass(/has-error/);
        await popup.save.click();
        await popup.expectClosed();
        await expect(overview.row(title).root).toHaveCount(1);
    });

    test("Cancel discards the new todo", async ({ todos }) => {
        const { overview } = todos;
        await overview.newButton.click();
        await overview.popup.fill({ title: `Never saved ${uid()}`, priority: "Low" });
        await overview.popup.cancel.click();

        await overview.popup.expectClosed();
        await expect(overview.rows).toHaveCount(0);
        await expect(overview.pagingStatus).toHaveText("0 to 0 of 0");
    });

    test("the close button discards the new todo", async ({ todos }) => {
        const { overview } = todos;
        await overview.newButton.click();
        await overview.popup.fill({ title: `Never saved ${uid()}` });
        await overview.popup.closeButton.click();

        await overview.popup.expectClosed();
        await expect(overview.rows).toHaveCount(0);
    });

    test("Escape closes the popup without saving", async ({ todos, page }) => {
        const { overview } = todos;
        await overview.newButton.click();
        await overview.popup.fill({ title: `Never saved ${uid()}` });
        await page.keyboard.press("Escape");

        await overview.popup.expectClosed();
        await expect(overview.rows).toHaveCount(0);
    });

    test("the priority combo box lists the enumeration in model order", async ({ todos, page }) => {
        const { overview } = todos;
        await overview.newButton.click();
        await overview.popup.priority.click();

        await expect(page.getByRole("option")).toHaveText(["Low", "Medium", "High"]);
    });

    test("the date picker button opens a calendar to pick the due date", async ({ todos, page }) => {
        const { overview } = todos;
        await overview.newButton.click();
        const popup = overview.popup;
        await popup.fill({ title: `Calendar ${uid()}` });

        await popup.root.locator(".mx-name-dpDueDate button").click();
        const calendar = page.locator(".mx-calendar");
        await expect(calendar).toBeVisible();
        await calendar.locator("td:not(.mx-calendar-day-month-previous):not(.mx-calendar-day-month-next)", { hasText: /^15$/ }).click();

        await expect(popup.dueDate).toHaveValue(/^\d{1,2}\/15\/\d{4}$/);
    });

    test("a date that is not a date is refused", async ({ todos }) => {
        const { overview } = todos;
        await overview.newButton.click();
        const popup = overview.popup;
        await popup.fill({ title: `Bad date ${uid()}`, dueDate: "not a date" });

        await expect(popup.root.locator(".mx-name-dpDueDate .mx-validation-message")).toBeVisible();
    });
});
