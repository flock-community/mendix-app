import { test, expect } from "../support/fixtures";
import { mendixTexts } from "../support/env";
import { uid, usDate } from "../support/app";

test.describe("Edit a todo", () => {
    test("Edit opens the popup filled with the todo", async ({ todos }) => {
        const { overview } = todos;
        const title = `Water plants ${uid()}`;
        await overview.create({ title, description: "Kitchen and balcony", dueDate: usDate(2031, 6, 2), priority: "Low" });

        await overview.row(title).editButton.click();

        const popup = overview.popup;
        await popup.expectOpen();
        await expect(popup.title).toHaveValue(title);
        await expect(popup.description).toHaveValue("Kitchen and balcony");
        await expect(popup.dueDate).toHaveValue("6/2/2031");
        await expect(popup.priority).toHaveValue("Low");
        await expect(popup.done).not.toBeChecked();
    });

    test("saving changes updates the row", async ({ todos }) => {
        const { overview } = todos;
        const title = `Call plumber ${uid()}`;
        const renamed = `${title} (urgent)`;
        await overview.create({ title, priority: "Low" });

        await overview.row(title).editButton.click();
        await overview.popup.fill({ title: renamed, priority: "High", dueDate: usDate(2031, 1, 9), done: true });
        await overview.popup.save.click();
        await overview.popup.expectClosed();

        await expect(overview.row(title).root).toHaveCount(0);
        const row = overview.row(renamed);
        await expect(row.priority).toHaveText("High");
        await expect(row.dueDate).toContainText("1/9/2031");
        await expect(row.doneCheckbox).toBeChecked();
        await expect(overview.rows).toHaveCount(1);
    });

    test("Cancel keeps the todo as it was", async ({ todos }) => {
        const { overview } = todos;
        const title = `Return books ${uid()}`;
        await overview.create({ title, priority: "Medium" });

        await overview.row(title).editButton.click();
        await overview.popup.fill({ title: "Changed my mind", priority: "High" });
        await overview.popup.cancel.click();
        await overview.popup.expectClosed();

        const row = overview.row(title);
        await expect(row.root).toHaveCount(1);
        await expect(row.priority).toHaveText("Medium");

        // Reopening shows the stored values, not the discarded ones.
        await row.editButton.click();
        await expect(overview.popup.title).toHaveValue(title);
        await expect(overview.popup.priority).toHaveValue("Medium");
    });

    test("the close button keeps the todo as it was", async ({ todos }) => {
        const { overview } = todos;
        const title = `Renew passport ${uid()}`;
        await overview.create({ title });

        await overview.row(title).editButton.click();
        await overview.popup.fill({ title: "Something else" });
        await overview.popup.closeButton.click();

        await expect(overview.row(title).root).toHaveCount(1);
    });

    test("clearing the title is refused and the stored title stays", async ({ todos }) => {
        const { overview } = todos;
        const title = `Fix bike ${uid()}`;
        await overview.create({ title });

        await overview.row(title).editButton.click();
        await overview.popup.fill({ title: "" });
        await overview.popup.save.click();

        await expect(overview.popup.titleGroup.locator(".mx-validation-message")).toHaveText(mendixTexts.titleRequired);
        await overview.popup.cancel.click();
        await expect(overview.row(title).root).toHaveCount(1);
    });

    test("clearing the due date and description is allowed", async ({ todos }) => {
        const { overview } = todos;
        const title = `Optional fields ${uid()}`;
        await overview.create({ title, description: "Something", dueDate: usDate(2031, 2, 3) });

        await overview.row(title).editButton.click();
        await overview.popup.fill({ description: "", dueDate: "" });
        await overview.popup.save.click();
        await overview.popup.expectClosed();

        await expect(overview.row(title).dueDate).toHaveText("");
        await overview.row(title).editButton.click();
        await expect(overview.popup.description).toHaveValue("");
        await expect(overview.popup.dueDate).toHaveValue("");
    });

    test("a long description is kept", async ({ todos }) => {
        const { overview } = todos;
        const title = `Long text ${uid()}`;
        const description = "Line one\nLine two\n" + "x".repeat(500);
        await overview.create({ title, description });

        await overview.row(title).editButton.click();
        await expect(overview.popup.description).toHaveValue(description);
    });
});
