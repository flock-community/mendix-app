import { test, expect } from "../support/fixtures";
import { uid, usDate } from "../support/app";

test.describe("Grid sorting", () => {
    test("open todos come first, each group by due date", async ({ todos }) => {
        const { overview } = todos;
        const id = uid();
        // Created in an order that is neither the expected order nor its reverse.
        await overview.create({ title: `Done late ${id}`, dueDate: usDate(2031, 5, 1), done: true });
        await overview.create({ title: `Open late ${id}`, dueDate: usDate(2031, 4, 1) });
        await overview.create({ title: `Done early ${id}`, dueDate: usDate(2031, 1, 1), done: true });
        await overview.create({ title: `Open early ${id}`, dueDate: usDate(2031, 2, 1) });

        await overview.expectTitles([`Open early ${id}`, `Open late ${id}`, `Done early ${id}`, `Done late ${id}`]);
    });

    test("clicking a header sorts by it, again reverses, a third time clears", async ({ todos }) => {
        const { overview } = todos;
        const id = uid();
        await overview.create({ title: `B ${id}`, dueDate: usDate(2031, 1, 1) });
        await overview.create({ title: `C ${id}`, dueDate: usDate(2031, 1, 2) });
        await overview.create({ title: `A ${id}`, dueDate: usDate(2031, 1, 3) });
        await overview.expectTitles([`B ${id}`, `C ${id}`, `A ${id}`]);

        await overview.sortButton("Title").click();
        await expect(overview.header("Title")).toHaveAttribute("aria-sort", "ascending");
        await expect(overview.header("Due date")).toHaveAttribute("aria-sort", "none");
        await expect(overview.header("Title").locator("svg.fa-long-arrow-alt-up")).toHaveCount(1);
        await overview.expectTitles([`A ${id}`, `B ${id}`, `C ${id}`]);

        await overview.sortButton("Title").click();
        await expect(overview.header("Title")).toHaveAttribute("aria-sort", "descending");
        await expect(overview.header("Title").locator("svg.fa-long-arrow-alt-down")).toHaveCount(1);
        await overview.expectTitles([`C ${id}`, `B ${id}`, `A ${id}`]);

        // No column sort left: the data source's own sort (open first, by due date) applies again.
        await overview.sortButton("Title").click();
        await expect(overview.header("Title")).toHaveAttribute("aria-sort", "none");
        await expect(overview.header("Title").locator("svg.fa-arrows-alt-v")).toHaveCount(1);
        await overview.expectTitles([`B ${id}`, `C ${id}`, `A ${id}`]);
    });

    test("sorting by priority sorts on the enumeration key, as Mendix stores it", async ({ todos }) => {
        const { overview } = todos;
        const id = uid();
        await overview.create({ title: `Medium ${id}`, priority: "Medium" });
        await overview.create({ title: `High ${id}`, priority: "High" });
        await overview.create({ title: `Low ${id}`, priority: "Low" });

        await overview.sortButton("Priority").click();
        await overview.expectTitles([`High ${id}`, `Low ${id}`, `Medium ${id}`]);

        await overview.sortButton("Priority").click();
        await overview.expectTitles([`Medium ${id}`, `Low ${id}`, `High ${id}`]);
    });

    test("the Done header sorts descending on the first click, because it starts ascending", async ({ todos }) => {
        const { overview } = todos;
        const id = uid();
        await overview.create({ title: `Open ${id}`, dueDate: usDate(2031, 1, 1) });
        await overview.create({ title: `Closed ${id}`, dueDate: usDate(2031, 1, 2), done: true });
        await overview.expectTitles([`Open ${id}`, `Closed ${id}`]);

        await overview.sortButton("Done").click();

        await expect(overview.header("Done")).toHaveAttribute("aria-sort", "descending");
        await overview.expectTitles([`Closed ${id}`, `Open ${id}`]);
    });

    test("the keyboard sorts too", async ({ todos }) => {
        const { overview } = todos;
        const id = uid();
        await overview.create({ title: `Y ${id}` });
        await overview.create({ title: `X ${id}` });

        await overview.sortButton("Title").focus();
        await overview.sortButton("Title").press("Enter");

        await overview.expectTitles([`X ${id}`, `Y ${id}`]);
    });
});
