import { defineConfig, devices } from "@playwright/test";

/**
 * One suite, two targets. The `mendix` project runs it against the original
 * Mendix app, the `nextjs` project against the rebuild. Both projects share
 * the same screenshot baselines (see snapshotPathTemplate), so a baseline
 * captured from Mendix is what the rebuild is compared with.
 */
const MENDIX_URL = process.env.MENDIX_URL ?? "http://localhost:8080";
const NEXTJS_URL = process.env.NEXTJS_URL ?? "http://localhost:3000";

// Start the rebuild automatically when the nextjs project is selected and
// nothing is listening yet. The Mendix app is started with mxcli (see README).
const startNextjs = process.argv.some(arg => arg === "--project=nextjs" || arg === "nextjs");

export default defineConfig({
    testDir: "./tests",
    // Both apps hold real per-user data, and the demo users are shared by
    // every test, so the tests run one at a time.
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    timeout: 60_000,
    expect: {
        timeout: 10_000,
        toHaveScreenshot: {
            // Two implementations never anti-alias identically; this still
            // catches a moved border, a changed colour or a different font.
            maxDiffPixelRatio: 0.01,
            animations: "disabled",
            caret: "hide",
            scale: "css"
        }
    },
    snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
    reporter: [["list"], ["html", { open: "never" }]],
    use: {
        viewport: { width: 1280, height: 800 },
        locale: "en-US",
        timezoneId: "UTC",
        colorScheme: "light",
        trace: "retain-on-failure",
        screenshot: "only-on-failure"
    },
    projects: [
        { name: "mendix", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, baseURL: MENDIX_URL } },
        { name: "nextjs", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, baseURL: NEXTJS_URL } }
    ],
    webServer: startNextjs
        ? {
              command: "npm run start",
              cwd: "../nextjs",
              url: `${NEXTJS_URL}/login.html`,
              reuseExistingServer: true,
              timeout: 120_000
          }
        : undefined
});
