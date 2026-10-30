import { expect, type Locator, type Page } from "@playwright/test";
import type { DemoUser } from "./env";

/**
 * Page objects for the TodoApp. Every selector is one the Mendix runtime
 * renders: the `mx-name-<widget>` class Mendix puts on each named widget, the
 * Data grid 2 / filter / Combo box widget markup, or Atlas's login page. The
 * rebuild renders the same markup, which is what lets one suite drive both.
 */

export type Priority = "Low" | "Medium" | "High";

export interface TodoInput {
    title: string;
    description?: string;
    /** In the app's en-US date format, M/d/yyyy. */
    dueDate?: string;
    priority?: Priority;
    done?: boolean;
}

/** A date in the M/d/yyyy format Mendix uses for en-US. */
export function usDate(year: number, month: number, day: number): string {
    return `${month}/${day}/${year}`;
}

let counter = 0;
/** A short id that keeps titles unique across tests and reruns. */
export function uid(): string {
    counter += 1;
    return `${Date.now().toString(36).slice(-5)}${counter}`;
}

/** The question Mendix asks before a delete action. */
export const DELETE_QUESTION = "Are you sure you want to delete this?";

function exact(text: string): RegExp {
    return new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`);
}

export class LoginPage {
    readonly form: Locator;
    readonly header: Locator;
    readonly username: Locator;
    readonly password: Locator;
    readonly passwordToggle: Locator;
    readonly submit: Locator;
    readonly message: Locator;

    constructor(readonly page: Page) {
        this.form = page.locator("#loginForm");
        this.header = page.locator("#loginHeader");
        this.username = page.locator("#usernameInput");
        this.password = page.locator("#passwordInput");
        this.passwordToggle = page.locator("#passwordToggle");
        this.submit = page.locator("#loginButton");
        this.message = page.locator("#loginMessage");
    }

    async goto(): Promise<void> {
        await this.page.goto("/login.html");
        await expect(this.form).toBeVisible();
    }

    async signIn(user: DemoUser): Promise<void> {
        await this.username.fill(user.name);
        await this.password.fill(user.password);
        await this.submit.click();
    }
}

export class EditTodoPopup {
    readonly root: Locator;
    readonly caption: Locator;
    readonly closeButton: Locator;
    readonly title: Locator;
    readonly titleGroup: Locator;
    readonly description: Locator;
    readonly dueDate: Locator;
    readonly priority: Locator;
    readonly priorityGroup: Locator;
    readonly done: Locator;
    readonly save: Locator;
    readonly cancel: Locator;

    constructor(readonly page: Page) {
        this.root = page.locator(".mx-window").filter({ has: page.locator(".mx-name-dvTodoItem") });
        this.caption = this.root.locator(".modal-header h4");
        this.closeButton = this.root.locator(".modal-header .close");
        this.titleGroup = this.root.locator(".mx-name-txtTitle");
        this.title = this.titleGroup.locator("input");
        this.description = this.root.locator(".mx-name-txtDescription textarea");
        this.dueDate = this.root.locator(".mx-name-dpDueDate input");
        this.priorityGroup = this.root.locator(".mx-name-cbPriority");
        this.priority = this.priorityGroup.locator("input");
        this.done = this.root.locator(".mx-name-cbIsDone input[type=checkbox]");
        this.save = this.root.locator(".mx-name-btnSave");
        this.cancel = this.root.locator(".mx-name-btnCancel");
    }

    async expectOpen(): Promise<void> {
        await expect(this.root).toBeVisible();
        await expect(this.caption).toHaveText("Edit todo");
    }

    async expectClosed(): Promise<void> {
        await expect(this.root).toHaveCount(0);
    }

    async choosePriority(priority: Priority): Promise<void> {
        await this.priority.click();
        await this.page.getByRole("option", { name: priority, exact: true }).click();
        await expect(this.priority).toHaveValue(priority);
    }

    async fill(todo: Partial<TodoInput>): Promise<void> {
        if (todo.title !== undefined) {
            await this.title.fill(todo.title);
        }
        if (todo.description !== undefined) {
            await this.description.fill(todo.description);
        }
        if (todo.dueDate !== undefined) {
            await this.dueDate.fill(todo.dueDate);
            await this.dueDate.press("Tab");
        }
        if (todo.priority !== undefined) {
            await this.choosePriority(todo.priority);
        }
        if (todo.done !== undefined) {
            await this.done.setChecked(todo.done);
        }
    }
}

/** Mendix's confirmation dialog (DialogMessage), e.g. before a delete. */
export class ConfirmationDialog {
    readonly root: Locator;
    readonly caption: Locator;
    readonly question: Locator;
    readonly ok: Locator;
    readonly cancel: Locator;
    readonly close: Locator;

    constructor(readonly page: Page) {
        this.root = page.locator(".modal-dialog.mx-dialog");
        this.caption = this.root.locator(".mx-dialog-caption");
        this.question = this.root.locator(".mx-dialog-body");
        this.ok = this.root.locator(".mx-dialog-footer .btn-primary");
        this.cancel = this.root.locator(".mx-dialog-footer .btn:not(.btn-primary)");
        this.close = this.root.locator(".mx-dialog-close");
    }

    async expectOpen(question: string): Promise<void> {
        await expect(this.root).toBeVisible();
        await expect(this.caption).toHaveText("Confirmation");
        await expect(this.question).toHaveText(question);
    }

    async expectClosed(): Promise<void> {
        await expect(this.root).toHaveCount(0);
    }
}

export class TodoRow {
    constructor(readonly root: Locator) {}

    cell(index: number): Locator {
        return this.root.locator(":scope > .td").nth(index);
    }

    get doneCheckbox(): Locator {
        return this.root.locator(".mx-name-cbDone input[type=checkbox]");
    }
    get title(): Locator {
        return this.cell(1);
    }
    get priority(): Locator {
        return this.cell(2);
    }
    get dueDate(): Locator {
        return this.cell(3);
    }
    get toggleButton(): Locator {
        return this.root.locator(".mx-name-btnToggle");
    }
    get editButton(): Locator {
        return this.root.locator(".mx-name-btnEdit");
    }
    get deleteButton(): Locator {
        return this.root.locator(".mx-name-btnDelete");
    }
}

export class OverviewPage {
    readonly heading: Locator;
    readonly newButton: Locator;
    readonly grid: Locator;
    readonly headerCells: Locator;
    readonly rows: Locator;
    readonly pagingStatus: Locator;
    readonly popup: EditTodoPopup;
    readonly confirmation: ConfirmationDialog;

    constructor(readonly page: Page) {
        this.heading = page.locator(".mx-name-heading");
        this.newButton = page.locator(".mx-name-btnNew");
        this.grid = page.locator(".mx-name-dgTodos");
        this.headerCells = this.grid.locator(".widget-datagrid-grid-head .th");
        this.rows = this.grid.locator(".widget-datagrid-grid-body > .tr");
        this.pagingStatus = this.grid.locator(".paging-status");
        this.popup = new EditTodoPopup(page);
        this.confirmation = new ConfirmationDialog(page);
    }

    async goto(): Promise<void> {
        await this.page.goto("/p/todos");
        await this.waitForGrid();
    }

    async waitForGrid(): Promise<void> {
        await expect(this.grid).toBeVisible({ timeout: 30_000 });
        await expect(this.grid.locator(".widget-datagrid-loader-container, .widget-datagrid-skeleton")).toHaveCount(0, {
            timeout: 30_000
        });
    }

    header(caption: string): Locator {
        return this.headerCells.filter({ has: this.page.locator(".column-header", { hasText: exact(caption) }) });
    }

    sortButton(caption: string): Locator {
        return this.header(caption).locator(".column-header");
    }

    row(title: string): TodoRow {
        return new TodoRow(this.rows.filter({ has: this.page.locator(".td-text", { hasText: exact(title) }) }));
    }

    rowAt(index: number): TodoRow {
        return new TodoRow(this.rows.nth(index));
    }

    async titles(): Promise<string[]> {
        const texts = await this.rows.locator(":scope > .td:nth-child(2)").allInnerTexts();
        return texts.map(t => t.trim());
    }

    async expectTitles(titles: string[]): Promise<void> {
        await expect.poll(() => this.titles(), { timeout: 10_000 }).toEqual(titles);
    }

    /**
     * Opens the New todo popup, ready to type in. When New follows a save's
     * grid refresh within about 100 ms, Mendix's client now and then opens the
     * popup without binding its new object: the inputs stay disabled, with no
     * error. A person would close it and click New again, and so does this,
     * once; a popup that stays disabled the second time fails the test.
     */
    async openNew(): Promise<void> {
        for (let attempt = 1; ; attempt++) {
            await this.newButton.click();
            await this.popup.expectOpen();
            try {
                await expect(this.popup.title).toBeEnabled({ timeout: 5_000 });
                return;
            } catch (error) {
                if (attempt === 2) throw error;
                await this.popup.closeButton.click();
                await this.popup.expectClosed();
            }
        }
    }

    async create(todo: TodoInput): Promise<void> {
        await this.openNew();
        await this.popup.fill(todo);
        await this.popup.save.click();
        await this.popup.expectClosed();
        await expect(this.row(todo.title).root).toHaveCount(1);
    }

    /** Deletes a row: Delete, then OK in the confirmation Mendix asks. */
    async delete(row: TodoRow): Promise<void> {
        await row.deleteButton.click();
        await this.confirmation.expectOpen(DELETE_QUESTION);
        await this.confirmation.ok.click();
        await this.confirmation.expectClosed();
    }

    /** Deletes every todo the signed-in user has, page by page. */
    async deleteAll(): Promise<void> {
        await this.waitForGrid();
        for (let guard = 0; guard < 500; guard++) {
            const count = await this.rows.count();
            if (count === 0) {
                return;
            }
            const status = await this.pagingStatus.innerText();
            await this.delete(this.rowAt(0));
            await expect(this.pagingStatus).not.toHaveText(status);
        }
        throw new Error("deleteAll did not finish");
    }

    // ---- filters -------------------------------------------------------

    get titleFilter(): Locator {
        return this.grid.locator(".mx-name-fTitle input");
    }
    get dueDateFilter(): Locator {
        return this.grid.locator(".mx-name-fDueDate input");
    }

    dropdownFilter(name: "fDone" | "fPriority"): Locator {
        return this.grid.locator(`.mx-name-${name}[role="combobox"], .mx-name-${name} [role="combobox"]`).first();
    }

    /** Opens a drop-down filter by its caption: in a narrow column its centre is the clear button. */
    async openDropdownFilter(name: "fDone" | "fPriority"): Promise<void> {
        await this.dropdownFilter(name).click({ position: { x: 12, y: 12 } });
    }

    async chooseDropdownFilter(name: "fDone" | "fPriority", option: string): Promise<void> {
        await this.openDropdownFilter(name);
        await this.page.getByRole("option", { name: option, exact: true }).click();
    }

    async clearDropdownFilter(name: "fDone" | "fPriority"): Promise<void> {
        await this.grid.locator(`.mx-name-${name} .widget-dropdown-filter-clear, .mx-name-${name}.widget-dropdown-filter .widget-dropdown-filter-clear`).first().click();
    }
}

export class TodoApp {
    readonly login: LoginPage;
    readonly overview: OverviewPage;
    /** The CSRF token the Mendix client sends with its requests; the rebuild has none. */
    private csrfToken: string | undefined;

    constructor(readonly page: Page) {
        this.login = new LoginPage(page);
        this.overview = new OverviewPage(page);
        page.on("request", request => {
            const token = request.headers()["x-csrf-token"];
            if (token) this.csrfToken = token;
        });
    }

    /**
     * Ends the session, as the client's sign-out does. An unlicensed Mendix
     * runtime allows six sessions at a time and keeps an idle one for ten
     * minutes, so every test signs out when it is done (see fixtures.ts).
     */
    async signOut(): Promise<void> {
        if (this.page.isClosed() || !/^https?:/.test(this.page.url())) return;
        await this.page.request
            .post(new URL("/xas/", this.page.url()).href, {
                data: { action: "logout", params: {} },
                headers: this.csrfToken ? { "X-Csrf-Token": this.csrfToken } : {},
                failOnStatusCode: false
            })
            .catch(() => undefined);
    }

    /** Signs in through the login page and waits for the home page. */
    async signIn(user: DemoUser): Promise<void> {
        await this.login.goto();
        await this.login.signIn(user);
        await this.overview.waitForGrid();
    }

    /** Waits until web fonts and the grid have settled, for screenshots. */
    async settle(): Promise<void> {
        await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
        await this.page.mouse.move(0, 0);
    }
}
