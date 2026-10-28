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
