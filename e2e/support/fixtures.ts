import { test as base, expect } from "@playwright/test";
import { TodoApp } from "./app";
import { users } from "./env";

type Fixtures = {
    /** The app, not signed in. */
    app: TodoApp;
    /** The app, signed in as demo_user, with every one of their todos deleted. */
    todos: TodoApp;
};

export const test = base.extend<Fixtures>({
    app: async ({ page }, use) => {
        await use(new TodoApp(page));
    },
    todos: async ({ page }, use) => {
        const app = new TodoApp(page);
        await app.signIn(users.user);
        await app.overview.deleteAll();
        await use(app);
    }
});

export { expect };
