import { test, expect } from "../support/fixtures";
import { DELETE_QUESTION, uid, usDate } from "../support/app";

test.describe("Mark done and delete", () => {
    test("Done / undo marks an open todo done and moves it below the open ones", async ({ todos }) => {
        const { overview } = todos;
        const id = uid();
        const first = `First ${id}`;
        const second = `Second ${id}`;
        await overview.create({ title: first, dueDate: usDate(2031, 1, 1) });
        await overview.create({ title: second, dueDate: usDate(2031, 1, 2) });
        await overview.expectTitles([first, second]);

        await overview.row(first).toggleButton.click();

        await expect(overview.row(first).doneCheckbox).toBeChecked();
        await overview.expectTitles([second, first]);
    });

    test("Done / undo reopens a done todo", async ({ todos }) => {
        const { overview } = todos;
        const title = `Reopen ${uid()}`;
        await overview.create({ title, done: true });

        await overview.row(title).toggleButton.click();
        await expect(overview.row(title).doneCheckbox).not.toBeChecked();

        await overview.row(title).toggleButton.click();
        await expect(overview.row(title).doneCheckbox).toBeChecked();
    });

    test("the Done change is saved", async ({ todos, page }) => {
        const { overview } = todos;
        const title = `Persisted ${uid()}`;
        await overview.create({ title });
        await overview.row(title).toggleButton.click();
        await expect(overview.row(title).doneCheckbox).toBeChecked();

        await page.reload();
        await overview.waitForGrid();
        await expect(overview.row(title).doneCheckbox).toBeChecked();
    });

    test("the Done checkbox in the grid is read-only", async ({ todos }) => {
        const { overview } = todos;
        const title = `Read only ${uid()}`;
        await overview.create({ title });

        await expect(overview.row(title).doneCheckbox).toBeDisabled();
    });

    test("Delete asks for confirmation, and OK removes the todo", async ({ todos, page }) => {
        const { overview } = todos;
        const id = uid();
        const keep = `Keep ${id}`;
        const remove = `Remove ${id}`;
        await overview.create({ title: keep });
        await overview.create({ title: remove });

        await overview.row(remove).deleteButton.click();
        await overview.confirmation.expectOpen(DELETE_QUESTION);
        await expect(overview.row(remove).deleteButton).toHaveAttribute("aria-disabled", "true");
        await overview.confirmation.ok.click();
        await overview.confirmation.expectClosed();

        await expect(overview.row(remove).root).toHaveCount(0);
        await expect(overview.row(keep).root).toHaveCount(1);
        await expect(overview.pagingStatus).toHaveText("1 to 1 of 1");

        await page.reload();
        await overview.waitForGrid();
        await expect(overview.row(remove).root).toHaveCount(0);
    });

    test("Cancel or closing the confirmation keeps the todo", async ({ todos }) => {
        const { overview } = todos;
        const title = `Not now ${uid()}`;
        await overview.create({ title });

        await overview.row(title).deleteButton.click();
        await overview.confirmation.expectOpen(DELETE_QUESTION);
        await overview.confirmation.cancel.click();
        await overview.confirmation.expectClosed();
        await expect(overview.row(title).root).toHaveCount(1);
        await expect(overview.row(title).deleteButton).not.toHaveAttribute("aria-disabled", "true");

        await overview.row(title).deleteButton.click();
        await overview.confirmation.expectOpen(DELETE_QUESTION);
        await overview.confirmation.close.click();
        await overview.confirmation.expectClosed();
        await expect(overview.row(title).root).toHaveCount(1);
    });

    test("the action buttons have the model's captions and styles", async ({ todos }) => {
        const { overview } = todos;
        const title = `Buttons ${uid()}`;
        await overview.create({ title });
        const row = overview.row(title);

        await expect(row.toggleButton).toHaveText("Done / undo");
        await expect(row.toggleButton).toHaveClass(/btn-default/);
        await expect(row.editButton).toHaveText("Edit");
        await expect(row.editButton).toHaveClass(/btn-default/);
        await expect(row.deleteButton).toHaveText("Delete");
        await expect(row.deleteButton).toHaveClass(/btn-danger/);
    });
});
