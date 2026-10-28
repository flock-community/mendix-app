import { test, expect } from "../support/fixtures";
import { uid } from "../support/app";
import { users } from "../support/env";

test.describe("Each user sees only their own todos", () => {
    test("todos of demo_administrator and demo_user stay apart", async ({ openApp }) => {
        const id = uid();
        const admin = await openApp();
        const user = await openApp();
        await admin.signIn(users.admin);
        await user.signIn(users.user);
        await admin.overview.deleteAll();
        await user.overview.deleteAll();

        await admin.overview.create({ title: `Admin only ${id}` });
        await user.overview.create({ title: `User only ${id}` });

        await user.page.reload();
        await user.overview.waitForGrid();
        await user.overview.expectTitles([`User only ${id}`]);

        await admin.page.reload();
        await admin.overview.waitForGrid();
        await admin.overview.expectTitles([`Admin only ${id}`]);
    });

    test("one user's changes do not touch the other's list", async ({ openApp }) => {
        const id = uid();
        const admin = await openApp();
        const user = await openApp();
        await admin.signIn(users.admin);
        await user.signIn(users.user);
        await user.overview.deleteAll();
        await user.overview.create({ title: `Mine ${id}` });

        await admin.overview.deleteAll();
        await user.page.reload();
        await user.overview.waitForGrid();

        await user.overview.expectTitles([`Mine ${id}`]);
    });
});

test.describe("Sessions", () => {
    test("two browsers can be signed in as the same user", async ({ openApp }) => {
        const a = await openApp();
        const b = await openApp();
        await a.signIn(users.user);
        await b.signIn(users.user);
        await a.overview.deleteAll();
        const title = `Shared ${uid()}`;
        await a.overview.create({ title });

        await b.page.reload();
        await b.overview.waitForGrid();
        await expect(b.overview.row(title).root).toHaveCount(1);
    });
});
