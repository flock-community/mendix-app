/**
 * The demo users both apps ship with. Their passwords are not in this repo's
 * docs: set them on the Mendix side with
 *   ./mxcli -p TodoApp.mpr -c "create or modify demo user 'demo_user' ( Password: '…', UserRoles: (User) );"
 * and pass the same value here (the rebuild seeds its users from the same
 * variables, see nextjs/README.md).
 */
const sharedPassword = process.env.E2E_PASSWORD ?? "Choose-a-passw0rd";

export const users = {
    user: {
        name: process.env.E2E_USER ?? "demo_user",
        password: process.env.E2E_USER_PASSWORD ?? sharedPassword
    },
    admin: {
        name: process.env.E2E_ADMIN ?? "demo_administrator",
        password: process.env.E2E_ADMIN_PASSWORD ?? sharedPassword
    }
} as const;

export type DemoUser = (typeof users)[keyof typeof users];

/**
 * Texts the app renders that come from Mendix rather than from the model.
 * They live here so a difference with a real Mendix run is a one-line fix.
 */
export const mendixTexts = {
    loginFailed: /user ?name or password you entered is incorrect/i,
    booleanTrue: "Yes",
    booleanFalse: "No",
    titleRequired: "Title is required"
};
