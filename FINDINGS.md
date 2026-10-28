# Findings

## 2026-10-28 — first session

- mxcli: `nightly-20261028-8b6f421ea`. Mendix version: not chosen yet.
- **Blocked: `cdn.mendix.com` is not reachable** from the Claude Code cloud environment
  (DNS fails under its network policy). `mxcli new`, `mxcli setup mxbuild` and
  `mxcli setup mxruntime` all download from it, so no `.mpr` can be created and
  nothing can be built or run. GitHub release downloads (the mxcli binary) work.
  Fix: allow `cdn.mendix.com` in the environment's network settings.
- `mdlsource/01-todo.mdl` and `tests/Todo.test.mdl` pass `mxcli check` (syntax only,
  no project). Still unverified against a real project: the template's user role names
  (`User`, `Administrator`), the `Responsive` navigation profile, the
  `Atlas_Core.Atlas_Default` / `Atlas_Core.PopupLayout` layouts (`mxcli new` creates
  an app-owned layout by default, so the pages may need repointing) and the
  `Atlas_Core.Atlas."list-bullets"` icon.
- `mxcli check` on a test file rejects `@verify` with the default `@cleanup rollback`
  (MDL-TEST01): the rollback happens before the query runs. Dropped that test rather
  than leave rows behind with `@cleanup none`.

## 2026-10-28 — second session: project created, built, run

- `cdn.mendix.com` is reachable now. The newest MxBuild on it is 11.16.0 (11.17+ and
  11.16.1+ are 404), so the project is Mendix 11.16.0: `mxcli new TodoApp --version
  11.16.0` took ~1m40s and its first build passed. It set JavaVersion to 21 because
  this machine has no JDK 25.
- The first session's open questions, answered by the real project: roles `User` and
  `Administrator`, profile `Responsive`, `Atlas_Core.PopupLayout` and the
  `list-bullets` icon all exist. `mxcli new` did create an app-owned
  `MyFirstModule.App_Default`, and the overview page now uses it instead of
  `Atlas_Core.Atlas_Default`.
- **The blank app has security level Off.** Every grant and role mapping in the script
  was silently ignored, and there was no login and no current user. The script now sets
  `SecurityLevel: production`; `mx check` still reports 0 errors.
- **The heading said "My todos" but every user saw every todo.** Added `owner:
  AutoOwner` and constrained the access rule to `[System.owner = '[%CurrentUser%]']`.
  Verified in the browser: neither demo user sees the other's todos.
- **A `grant ... where [...]` adds a rule next to an existing unconstrained one for
  the same role; it does not replace it.** Mendix ORs access rules, so the constraint
  did nothing until the old rule went (`revoke all on entity Todo.TodoItem from
  Todo.User`, then exec again). A fresh project only ever gets the constrained rule.
  Check with `show access on Todo.TodoItem`.
- `alter navigation ... insert { menu item ... }` is not re-runnable: each exec would
  add another item. Replaced with `create or modify navigation Responsive home page ...
  { menu item 'Todos' ... }`, which also drops the template's 'Home' item (it opened
  the blank-app welcome page).
- Gates on the final model: `check` passes; a second `exec` writes nothing; `lint` 0
  errors, 4 warnings; `report` 96/100; `docker check` 0 errors (also with
  `--no-update-widgets`); `test` 2/2 pass. Warnings left on purpose: SEC003 (demo
  users at Production; how you sign in locally), CONV010 (a one-action toggle
  microflow does not need a SUB_), CONV006 (the grid's own New/Delete buttons need
  entity create/delete; rows are owner-scoped), ARCH003 (a todo has no business key).
- `describe demo user` masks passwords (`'***'`) and Mendix generated random ones, so
  the browser test signs in with `mxcli playwright check --role R` and reuses the
  Playwright session it saves under `.mxcli/playwright-check/`.
- `mxcli playwright verify` refuses to start without `playwright-cli` on PATH, even
  for a script that does not use it. `bash tests/verify-todo.test.sh` runs it directly.
- The grid's Delete button asks "Are you sure you want to delete this?" (OK/Cancel).
- Toggling done updates the row's checkbox first; the grid re-queries and re-sorts
  a moment later. Tests must wait for the order, not read it right after the click.
- Selecting from the Combo box right after typing in another field can fail: that
  field's blur re-renders the form and closes the menu that just opened.
- The generated skills (`.ai-context/skills/`, `.claude/skills/`) and the VS Code
  `.vsix` are git-ignored. Tested on a clone with them deleted:
  `mxcli init --sync-skills .` (what the session hook runs) restores the skills
  byte-identically even though the version stamp says current, but not the 43
  per-project widget docs in `skills/widgets/`; `mxcli widget docs -p TodoApp.mpr`
  writes those. It does not restore `.claude/commands/` or `.claude/lint-rules/`
  either, so those stay committed.
