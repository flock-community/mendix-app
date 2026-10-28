import { test, expect } from "../support/fixtures";
import { mendixTexts, users } from "../support/env";

test.describe("Sign in", () => {
    test("shows the login page", async ({ app, page }) => {
        await app.login.goto();

        await expect(page).toHaveTitle("Login");
        await expect(app.login.header).toHaveText("Sign in");
        await expect(page.locator("#usernameLabel")).toHaveText("User name");
        await expect(page.locator("#passwordLabel")).toHaveText("Password");
        await expect(app.login.username).toHaveAttribute("placeholder", "User name");
        await expect(app.login.password).toHaveAttribute("placeholder", "Password");
        await expect(app.login.password).toHaveAttribute("type", "password");
        await expect(app.login.submit).toHaveText("Sign in");
        await expect(app.login.message).toBeHidden();
        await expect(page.locator(".loginpage-logo img")).toBeVisible();
    });

    test("the eye icon shows and hides the password", async ({ app }) => {
        await app.login.goto();
        await app.login.password.fill("secret");

        await expect(app.login.passwordToggle).toHaveClass(/glyphicon-eye-close/);
        await app.login.passwordToggle.click();
        await expect(app.login.password).toHaveAttribute("type", "text");
        await expect(app.login.passwordToggle).toHaveClass(/glyphicon-eye-open/);

        await app.login.passwordToggle.click();
        await expect(app.login.password).toHaveAttribute("type", "password");
        await expect(app.login.passwordToggle).toHaveClass(/glyphicon-eye-close/);
    });

    test("a wrong password is refused", async ({ app, page }) => {
        await app.login.goto();
        await app.login.signIn({ name: users.user.name, password: "Not-the-passw0rd" });

        await expect(app.login.message).toBeVisible();
        await expect(app.login.message).toHaveText(mendixTexts.loginFailed);
        await expect(app.login.form).toBeVisible();
        await expect(page.locator(".mx-name-dgTodos")).toHaveCount(0);
    });

    test("an unknown user is refused", async ({ app }) => {
        await app.login.goto();
        await app.login.signIn({ name: "nobody_here", password: "Not-the-passw0rd" });

        await expect(app.login.message).toHaveText(mendixTexts.loginFailed);
    });

    test("demo_user signs in and lands on the todo list", async ({ app }) => {
        await app.signIn(users.user);

        await expect(app.overview.heading).toHaveText("My todos");
    });

    test("demo_administrator signs in and lands on the todo list", async ({ app }) => {
        await app.signIn(users.admin);

        await expect(app.overview.heading).toHaveText("My todos");
    });

    test("an anonymous visitor is sent to the login page", async ({ app, page }) => {
        await page.goto("/");

        await expect(app.login.form).toBeVisible();
        await expect(page.locator(".mx-name-dgTodos")).toHaveCount(0);
    });

    test("the page URL needs a signed-in user too", async ({ app, page }) => {
        await page.goto("/p/todos");
        await expect(app.login.form).toBeVisible();

        await app.login.signIn(users.user);
        await app.overview.waitForGrid();
        await expect(app.overview.heading).toHaveText("My todos");
    });

    test("the session survives a reload", async ({ app, page }) => {
        await app.signIn(users.user);
        await page.reload();

        await app.overview.waitForGrid();
        await expect(app.overview.heading).toHaveText("My todos");
    });
});
