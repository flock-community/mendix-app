import { test, expect } from "../support/fixtures";
import { mendixTexts } from "../support/env";
import { uid, usDate, type OverviewPage } from "../support/app";

async function seed(overview: OverviewPage, id: string): Promise<void> {
    await overview.create({ title: `Buy milk ${id}`, priority: "High", dueDate: usDate(2031, 3, 10) });
    await overview.create({ title: `Buy bread ${id}`, priority: "Low", dueDate: usDate(2031, 3, 11) });
    await overview.create({ title: `Paint fence ${id}`, priority: "Medium", dueDate: usDate(2031, 3, 12), done: true });
    await overview.create({ title: `Call milkman ${id}`, priority: "High", dueDate: usDate(2031, 3, 13) });
}

test.describe("Grid filters", () => {
    test("the title filter keeps rows that contain the text, ignoring case", async ({ todos }) => {
        const { overview } = todos;
        const id = uid();
        await seed(overview, id);

        await overview.titleFilter.fill("MILK");

        await overview.expectTitles([`Buy milk ${id}`, `Call milkman ${id}`]);
        await expect(overview.pagingStatus).toHaveText("1 to 2 of 2");
    });

    test("clearing the title filter brings every row back", async ({ todos }) => {
        const { overview } = todos;
        const id = uid();
        await seed(overview, id);
        await overview.titleFilter.fill("bread");
        await overview.expectTitles([`Buy bread ${id}`]);

        await overview.titleFilter.fill("");

        await expect(overview.rows).toHaveCount(4);
    });

    test("a title filter without matches empties the grid", async ({ todos }) => {
        const { overview } = todos;
        await seed(overview, uid());

        await overview.titleFilter.fill("no such todo");

        await expect(overview.rows).toHaveCount(0);
        await expect(overview.pagingStatus).toHaveText("0 to 0 of 0");
    });

    test("the title filter's operator can be changed to Starts with", async ({ todos, page }) => {
        const { overview } = todos;
        const id = uid();
        await seed(overview, id);

        const selector = overview.grid.locator(".mx-name-fTitle .filter-selector-button");
        await selector.click();
        await expect(page.locator(".filter-selectors .filter-label")).toHaveText([
            "Contains",
            "Starts with",
            "Ends with",
            "Greater than",
            "Greater than or equal",
            "Equal",
            "Not equal",
            "Smaller than",
            "Smaller than or equal",
            "Empty",
            "Not empty"
        ]);
        await page.locator(".filter-selectors .filter-listitem", { hasText: "Starts with" }).click();
        await overview.titleFilter.fill("buy");

        await overview.expectTitles([`Buy milk ${id}`, `Buy bread ${id}`]);
    });

    test("the Done filter shows only done or only open todos", async ({ todos }) => {
        const { overview } = todos;
        const id = uid();
        await seed(overview, id);

        await overview.chooseDropdownFilter("fDone", mendixTexts.booleanTrue);
        await overview.expectTitles([`Paint fence ${id}`]);

        await overview.chooseDropdownFilter("fDone", mendixTexts.booleanFalse);
        await overview.expectTitles([`Buy milk ${id}`, `Buy bread ${id}`, `Call milkman ${id}`]);

        await overview.clearDropdownFilter("fDone");
        await expect(overview.rows).toHaveCount(4);
    });

    test("the Done filter offers an empty option, Yes and No", async ({ todos, page }) => {
        const { overview } = todos;
        await overview.openDropdownFilter("fDone");

        await expect(page.getByRole("option")).toHaveText(["", mendixTexts.booleanTrue, mendixTexts.booleanFalse]);
    });

    test("choosing the empty option clears the Done filter", async ({ todos, page }) => {
        const { overview } = todos;
        const id = uid();
        await seed(overview, id);
        await overview.chooseDropdownFilter("fDone", mendixTexts.booleanTrue);
        await overview.expectTitles([`Paint fence ${id}`]);

        await overview.openDropdownFilter("fDone");
        await page.getByRole("option").first().click();

        await expect(overview.rows).toHaveCount(4);
    });

    test("the Priority filter shows one priority", async ({ todos }) => {
        const { overview } = todos;
        const id = uid();
        await seed(overview, id);

        await overview.chooseDropdownFilter("fPriority", "High");
        await overview.expectTitles([`Buy milk ${id}`, `Call milkman ${id}`]);

        await overview.chooseDropdownFilter("fPriority", "Low");
        await overview.expectTitles([`Buy bread ${id}`]);

        await overview.clearDropdownFilter("fPriority");
        await expect(overview.rows).toHaveCount(4);
    });

    test("the Priority filter lists an empty option and the enumeration captions", async ({ todos, page }) => {
        const { overview } = todos;
        await overview.openDropdownFilter("fPriority");

        await expect(page.getByRole("option")).toHaveText(["", "Low", "Medium", "High"]);
    });

    test("the Priority filter shows the chosen caption, and Select when empty", async ({ todos }) => {
        const { overview } = todos;
        await expect(overview.dropdownFilter("fPriority")).toContainText("Select");

        await overview.chooseDropdownFilter("fPriority", "Medium");

        await expect(overview.dropdownFilter("fPriority")).toContainText("Medium");
    });

    test("the Due date filter keeps the todos due on that day", async ({ todos }) => {
        const { overview } = todos;
        const id = uid();
        await seed(overview, id);

        await overview.dueDateFilter.fill(usDate(2031, 3, 11));
        await overview.dueDateFilter.press("Enter");

        await overview.expectTitles([`Buy bread ${id}`]);
    });

    test("filters combine", async ({ todos }) => {
        const { overview } = todos;
        const id = uid();
        await seed(overview, id);

        await overview.chooseDropdownFilter("fPriority", "High");
        await overview.titleFilter.fill("call");

        await overview.expectTitles([`Call milkman ${id}`]);
    });

    test("a new todo that does not match the filter is saved but hidden", async ({ todos }) => {
        const { overview } = todos;
        const id = uid();
        await seed(overview, id);
        await overview.titleFilter.fill("milk");
        await overview.expectTitles([`Buy milk ${id}`, `Call milkman ${id}`]);

        await overview.newButton.click();
        await overview.popup.fill({ title: `Walk dog ${id}` });
        await overview.popup.save.click();
        await overview.popup.expectClosed();

        await overview.expectTitles([`Buy milk ${id}`, `Call milkman ${id}`]);
        await overview.titleFilter.fill("");
        await expect(overview.rows).toHaveCount(5);
    });
});
