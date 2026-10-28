# TodoApp

A simple Todo app, built with [mxcli](https://github.com/mendixlabs/mxcli) (Mendix CLI)
instead of Studio Pro.

## What it does

Users keep a list of todos. Each todo has a title, an optional description, a due
date, a priority (Low, Medium, High) and a done flag. The home page lists all todos
with a filter on each column; buttons create, edit, delete and mark a todo done or
not done. Anyone with the `User` or `Administrator` role can do all of this.

## Layout

| Path | What |
|------|------|
| `mdlsource/01-todo.mdl` | The model: `Todo` module, `TodoItem` entity, pages, microflow, security, navigation |
| `tests/Todo.test.mdl` | Microflow tests for `Todo.ACT_TodoItem_ToggleDone` |
| `FINDINGS.md` | Notes on what went wrong or surprised us while building |

The MDL scripts are `mdl 1`: each one starts with `mdl 1;`.

## Status

The Mendix project (`TodoApp.mpr`) does not exist yet: creating it needs MxBuild from
`cdn.mendix.com`, which this environment's network policy blocks. See `FINDINGS.md`.

## Build it

```bash
curl -fsSL -o ./mxcli https://github.com/mendixlabs/mxcli/releases/download/nightly/mxcli-linux-amd64
chmod +x ./mxcli
./mxcli new TodoApp --version <mendix-version>          # then move it to the repo root
./mxcli check mdlsource/01-todo.mdl -p TodoApp.mpr --references
./mxcli exec mdlsource/01-todo.mdl -p TodoApp.mpr
./mxcli test tests/ -p TodoApp.mpr --local
./mxcli run --local -p TodoApp.mpr
```
