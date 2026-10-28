# TodoApp end-to-end tests

One Playwright suite for two apps: the Mendix original in `../mendix` and the
Next.js rebuild in `../nextjs`. The suite is the specification of the rebuild.
A scenario that passes on Mendix must pass on the rebuild, and a screenshot
taken from Mendix is the baseline the rebuild is compared with.

| Project | Target | Default URL |
|---------|--------|-------------|
| `mendix` | The Mendix app, started with mxcli | `http://localhost:8080` (`MENDIX_URL`) |
| `nextjs` | The rebuild | `http://localhost:3000` (`NEXTJS_URL`) |

## What is covered

| File | Scenarios |
|------|-----------|
| `01-sign-in` | Login page texts and fields, password eye toggle, wrong password, unknown user, both demo users, anonymous visitor sent to login, deep link needs sign-in, session survives reload |
| `02-layout` | Page title and heading, Atlas top bar layout, menu bar item and icon, menu navigation, language selector, grid columns and design properties, which columns sort and filter, default sort indicators |
| `03-create` | New todo popup and its defaults, autofocus, save with only a title, save with every field, title required, Cancel, close button, Escape, priority options, date picker calendar, invalid date |
| `04-edit` | Edit popup filled in, save changes, Cancel and close keep the old values, title cannot be cleared, optional fields can be cleared, long description |
| `05-toggle-delete` | Done / undo both ways and the re-sort, persistence, read-only checkbox, Delete, button captions and styles |
| `06-grid-sorting` | Open first by due date, header sort asc → desc → back to default, enumeration sort, Done header, keyboard |
| `07-grid-filters` | Title contains (case-insensitive), clear, no match, operator Starts with, Done and Priority drop-downs and their options, Due date, filters combined, new todo hidden by a filter |
| `08-grid-paging-columns` | 20 rows per page and the four paging buttons, empty list, column selector hide/show, last column cannot be hidden, column resize |
| `09-security` | Each user sees only their own todos, one user's deletes do not touch the other, two sessions of one user |
| `10-visual` | 16 screenshots: login, login error, empty and filled list, hover, sorted, new/edit popups, validation, open combo box, calendar, filters, column selector, dark mode, phone |

Every selector is something the Mendix runtime renders: the `mx-name-<widget>`
class Mendix puts on each named widget, the Data grid 2, filter and Combo box
widget markup, and the ids of Atlas's `login.html`. The rebuild renders the same
markup, which is what lets one suite drive both.

The tests create their own data through the UI and delete the signed-in user's
todos first, so they run one at a time (`workers: 1`) against the shared demo
users.

## Setup

```bash
npm install
```

Both apps need the demo users `demo_user` and `demo_administrator` with a
known password. The tests use `Choose-a-passw0rd` unless `E2E_PASSWORD` (or
`E2E_USER_PASSWORD` / `E2E_ADMIN_PASSWORD`) says otherwise.

### Against Mendix

From `../mendix`, with mxcli downloaded as its README describes:

```bash
./mxcli -p TodoApp.mpr -c "create or modify demo user 'demo_user' ( Password: 'Choose-a-passw0rd', UserRoles: (User) );"
```

```bash
./mxcli -p TodoApp.mpr -c "create or modify demo user 'demo_administrator' ( Password: 'Choose-a-passw0rd', UserRoles: (Administrator) );"
```

```bash
./mxcli run --local --detach --ensure-db -p TodoApp.mpr
```

Then, from this folder:

```bash
npm run test:mendix
```

### Against the rebuild

```bash
npm run test:nextjs
```

This starts the rebuild with `npm run start` in `../nextjs` when nothing is
listening on port 3000 yet (build it first with `npm run build` there). Its
demo users get the same default password.

## Visual parity

The screenshots in `tests/10-visual.spec.ts` are compared against baselines in
`tests/__screenshots__/`. Both projects share them, and they must come from
Mendix:

```bash
npm run baseline:mendix
```

```bash
npm run test:nextjs
```

The first command writes the baselines from the running Mendix app. The second
compares the rebuild against them, allowing a 1% pixel difference for
anti-aliasing. Until a baseline exists, a visual test takes its screenshot,
attaches it to the HTML report (`npm run report`) and skips. It never passes
against itself.

The viewport is 1280×800, the browser runs in en-US and UTC, and the colour
scheme is forced to light, except in the dark-mode test. The theme follows the
OS colour scheme.

A Mendix app run locally (development mode, demo users on) shows the demo user
switcher's tab on the right edge of every page. Start the rebuild with
`DEMO_USER_SWITCHER=true` when comparing against such baselines, so it shows the
tab too.

## In CI

`.github/workflows/e2e.yml` runs on every push (and by hand from the Actions
tab). On one runner it:

1. Builds the rebuild (type check and unit tests first) and starts it on port 3000.
2. Downloads mxcli, gives both demo users the test password, and starts the
   Mendix app on port 8080 with `mxcli run --local --db-type hsqldb`. MxBuild
   and the runtime are cached in `~/.mxcli`.
3. Runs the suite against Mendix with `--update-snapshots=all`, so its
   screenshots become the baselines.
4. Runs the suite against the rebuild, which compares its screenshots with those.
5. Uploads the HTML reports (`playwright` artifact), the Mendix baselines
   (`mendix-baselines`) and both apps' logs (`app-logs`).

The job fails when Mendix does not start or either run has a failing test. A
Mendix failure does not stop the rebuild's run. The rebuild runs with
`DEMO_USER_SWITCHER=true` because Mendix shows the switcher's tab when it runs
locally.

Set `MXCLI_RELEASE` in the workflow to a release tag to stop following mxcli's
nightly build.

## Texts that come from Mendix, not the model

The login error, the Yes/No captions of a Boolean and the required-field
message are kept in `support/env.ts` (`mendixTexts`). They match the project's
system texts. If a run against Mendix shows another wording, that file is the
one place to change.
