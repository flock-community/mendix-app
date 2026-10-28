# TodoApp: the Next.js rebuild

A rebuild of the Mendix app in [`../mendix`](../mendix) as a Next.js app, built to
match the original in function and looks. The Playwright suite in
[`../e2e`](../e2e) runs against both apps and is the yardstick for "the same".

## Run it

Node 22.5 or later (the app uses Node's built-in `node:sqlite`).

```bash
npm install
```

```bash
npm run dev
```

The app serves on http://localhost:3000/. Sign in as `demo_user` (role User) or
`demo_administrator` (role Administrator). Both have the password
`Choose-a-passw0rd` unless you set `DEMO_PASSWORD`, or `DEMO_USER_PASSWORD` and
`DEMO_ADMINISTRATOR_PASSWORD`. The users are created, or have their password
reset, at startup, as Mendix does for demo users.

For a production build:

```bash
npm run build
```

```bash
npm run start
```

| Variable | Default | What |
|----------|---------|------|
| `DATABASE_PATH` | `data/todoapp.db` | SQLite file, created on first use |
| `DEMO_PASSWORD` | `Choose-a-passw0rd` | Password for both demo users |
| `DEMO_USER_PASSWORD`, `DEMO_ADMINISTRATOR_PASSWORD` | `DEMO_PASSWORD` | Per user |
| `DEMO_USER_SWITCHER` | `true` under `next dev`, else `false` | Show Mendix's demo user switcher, which signs in as a demo user without a password. Mendix shows it in development mode only; never turn it on where the app is reachable by others |

`npm test` runs the server's unit tests (filter compiler, validation, per-user
access). `npm run typecheck` type-checks the app and the component library.

## How it maps onto the Mendix model

| Mendix (`../mendix`) | Rebuild |
|----------------------|---------|
| Theme: `theme/`, `themesource/`, widget packages, icon collections | Compiled into `public/` by `atlas-theme` before every `dev` and `build` (`npm run theme`) |
| `theme/web/login.html` + the runtime's `login.js` | `public/login.html` (generated) + `js/login.js`, posting to `app/xas/route.ts` |
| Layout `MyFirstModule.App_Default` | `src/ui/AppDefaultLayout.tsx` |
| Layout `Atlas_Core.PopupLayout` | `PopupLayout` in the same file |
| Page `Todo.TodoItem_Overview` (URL `/p/todos`) | `app/p/todos/page.tsx` + `src/ui/TodoItemOverview.tsx` |
| Page `Todo.TodoItem_NewEdit` (popup) | `src/ui/TodoItemNewEdit.tsx` |
| Entity `Todo.TodoItem`, enumeration `Todo.Priority`, validation | `src/model/todo.ts`, table `todo_items` in `src/server/db.ts` |
| Access rule `[System.owner = '[%CurrentUser%]']` | Every query in `src/server/todos.ts` is scoped to the session's user |
| Microflow `Todo.ACT_TodoItem_ToggleDone` | `toggleDone` in `src/server/todos.ts`, `POST /api/todos/:id/toggle` |
| Data grid data source (sort, filter, paging) | `GET /api/todos?q=…`, a `ListQuery` compiled to SQL with bound parameters |
| Demo users, roles User and Administrator | Table `users`, seeded in `src/server/db.ts` |
| Session cookie `XASSESSIONID` | Same name, table `sessions` |
| Navigation: home page, one menu item | `app/page.tsx` redirects to `/p/todos`; `MENU` in the layout |

Both roles get the same module role (`Todo.User`) in the model, so they behave
the same here. The Administration module's account pages are not reachable
from the app's navigation and were not rebuilt.

## The component library

[`packages/atlas-ui`](packages/atlas-ui) (`@flock-community/atlas-ui`) is the
reusable part, meant for the next Mendix app to migrate. It has two halves.

**`atlas-theme`, a CLI.** It reads a Mendix project and writes what a non-Mendix
app needs to look like it:

```bash
npx atlas-theme --project ../mendix --out public
```

- `theme.compiled.css`: Atlas plus every module's theme source plus
  `theme/web`, compiled with dart-sass in MxBuild's order.
- `widgets/widgets.css` and assets: the CSS inside the `widgets/*.mpk`
  packages.
- `mxicons/`: the icon collections' fonts and classes, read from the `.mpr`
  (MPR v1 and v2).
- `theme/web/*` and `themesource/*/public/*`, copied to the web root as Mendix
  deploys them.
- `login.html` with Mendix's placeholders filled in, plus a `login.js` that
  speaks the runtime's `xas/` login action.

**React components** that render the Mendix React client's markup, so that CSS
styles them exactly like the original:

| Mendix widget | Component |
|---------------|-----------|
| Page, scroll container layouts, placeholder | `Page`, `ScrollContainer`, `Placeholder` |
| Layout grid, container | `LayoutGrid`, `Row`, `Column`, `Container` (+ `containerDesign`) |
| Text, action button, icons, menu bar | `DynamicText`, `ActionButton`, `Icon` / `atlasIcon`, `MenuBar` |
| Data view, text box, text area, check box, date picker | `DataView`, `TextBox`, `TextArea`, `CheckBox`, `DatePicker` (+ `Calendar`) |
| Popup page | `PopupWindow` |
| Data grid 2 and its text, drop-down and date filters | `Datagrid`, `TextFilter`, `DropdownFilter`, `DateFilter` |
| Combo box, language selector | `Combobox`, `LanguageSelector` |
| A list data source (ListValue) | `useListValue` (client), `conditionToSql` from `@flock-community/atlas-ui/filters` (server) |
| Value formatting by locale | `formatDate`, `parseDate`, `formatBoolean` from `@flock-community/atlas-ui/format` |

The pluggable widgets copy the markup of the versions in this project
(Data grid 2 3.4.0, Combo box 2.5.0, Language selector 1.1.3). They use the same
libraries those widgets use (downshift, floating-ui, react-datepicker), so
keyboard and ARIA behaviour match too. The library ships TypeScript source, so
an app lists it in `transpilePackages` (see `next.config.mjs`).

## Checking against the running Mendix app

The rebuild was first written from the model (`.mpr` units, MDL, theme, widget
packages), because mxcli could not run in the environment it was built in. The
pluggable widgets' markup is taken from their code. The `e2e` workflow now
starts the Mendix app in CI and runs the suite against both apps, comparing the
rebuild's screenshots with Mendix's (`npm run baseline:mendix`, then
`npm run test:nextjs` in `../e2e`, does the same locally).

The first run against a running Mendix app (in CI) corrected these guesses.
The DOM came from the Playwright traces of that run:

| What | Guessed | Mendix renders |
|------|---------|----------------|
| Menu bar | `div.mx-menubar > ul.mx-menubar-list` with an active item | A Bootstrap navbar: `div.navbar.mx-navbar > ul.nav.navbar-nav > li.mx-navbar-item`, no active item |
| Delete button | Deletes without asking | Asks "Are you sure you want to delete this?" in a `.mx-dialog` (`confirmation()`), with the button `aria-disabled` meanwhile |
| Date-time column | `M/d/yyyy, h:mm a` | The date only, `M/d/yyyy` |
| Language selector | Shows no current language | Shows the app's default language, "English, United States" |
| Page frame | `#content > .mx-page[data-page]`, layout classes on the scroll container | `#root.profile-desktop.role-<role> > .mx-page.<layout classes>`; without side regions the center region is `.mx-scrollcontainer-middle` itself |
| Layout grid | `col-lg-12 col-md-12 col-12` | `container-fluid`, and tablet and phone default to auto-fill: `col-lg-12 col-md col` |
| Check box | Label before, no form group without a label | `label-after form-group no-columns`, label after the box |
| Buttons | `disabled` attribute | `aria-disabled` and `data-disabled`, `title=""`, `data-button-id="p.<page>.<name>"` |
| Stylesheets | Theme, then widgets | Widgets (`dist/widgets.css`), then the theme |
| Demo user switcher | "Demo users", administrator first | "Select user" with Mendix's description, demo_user first |

These choices are still inferred rather than seen, and are the first places
to look when the two apps differ:

| What | Chosen | Why |
|------|--------|-----|
| Date picker | Input fills the row, calendar button at its end, popup calendar in `.mx-calendar` markup | Atlas styles `.mx-compound-control` and `.mx-calendar`; the exact element structure is not in the CSS |
| Form labels | Above the inputs (`form-group no-columns`) | Mendix 10+ default; the page sets no form orientation |
| Popup window | 600px wide (mxui's default), centred in the viewport | `PopupWidth` 0 in the model |
| Sorting | Empty due dates first when ascending; ties by creation order | HSQLDB's and SQLite's default, the database the model's configuration names |
