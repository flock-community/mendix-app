import { test as base, expect, type BrowserContext, type BrowserContextOptions } from "@playwright/test";
import { TodoApp } from "./app";
import { users } from "./env";

type Fixtures = {
    /** The app, not signed in. */
    app: TodoApp;
    /** The app, signed in as demo_user, with every one of their todos deleted. */
    todos: TodoApp;
    /** Opens the app in a browser of its own (another user, a phone, dark mode). */
    openApp: (options?: BrowserContextOptions) => Promise<TodoApp>;
};

// Every fixture signs its sessions out after the test: an unlicensed Mendix
// runtime refuses a seventh session, and idle ones linger for ten minutes.
export const test = base.extend<Fixtures>({
    app: async ({ page }, use) => {
        const app = new TodoApp(page);
        await use(app);
        await app.signOut();
    },
    todos: async ({ page }, use) => {
        const app = new TodoApp(page);
        await app.signIn(users.user);
        await app.overview.deleteAll();
        await use(app);
        await app.signOut();
    },
    openApp: async ({ browser }, use) => {
        const opened: Array<{ app: TodoApp; context: BrowserContext }> = [];
        await use(async options => {
            const context = await browser.newContext(options);
            const app = new TodoApp(await context.newPage());
            opened.push({ app, context });
            return app;
        });
        for (const { app, context } of opened) {
            await app.signOut();
            await context.close();
        }
    }
});

export { expect };
