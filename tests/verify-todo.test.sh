#!/usr/bin/env bash
# Browser test of the Todo app; needs it running (./mxcli run --local --detach).
# Run with: ./mxcli playwright verify tests/ -p TodoApp.mpr
set -euo pipefail
cd "$(dirname "$0")/.."

# Sign both demo users in; the walk reuses the sessions mxcli saves.
for role in User Administrator; do
  ./mxcli playwright check /p/todos -p TodoApp.mpr --role "$role" --assert-text 'My todos'
done

node tests/e2e/todo.e2e.js "$PWD"
