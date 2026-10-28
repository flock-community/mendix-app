import assert from "node:assert/strict";
import { before, test } from "node:test";

import { demoUser, verifyCredentials } from "../src/server/auth";
import { db } from "../src/server/db";
import * as todos from "../src/server/todos";

let user = 0;
let admin = 0;

before(() => {
    const id = (name: string) => (db().prepare("SELECT id FROM users WHERE name = ?").get(name) as { id: number }).id;
    user = id("demo_user");
    admin = id("demo_administrator");
});

const input = (title: string, extra: Partial<Parameters<typeof todos.createTodo>[1]> = {}) =>
    todos.parseInput({ Title: title, Description: "", IsDone: false, DueDate: null, Priority: "Medium", ...extra });

test("the demo users exist with the configured password", () => {
    assert.ok(verifyCredentials("demo_user", "Choose-a-passw0rd"));
    assert.equal(verifyCredentials("demo_user", "wrong"), null);
    assert.equal(verifyCredentials("nobody", "Choose-a-passw0rd"), null);
});

test("signing in without a password needs the demo user switcher on", () => {
    delete process.env.DEMO_USER_SWITCHER;
    assert.equal(demoUser("demo_user"), null);
    process.env.DEMO_USER_SWITCHER = "true";
    try {
        assert.equal(demoUser("demo_user")?.name, "demo_user");
        assert.equal(demoUser("someone_else"), null);
    } finally {
        delete process.env.DEMO_USER_SWITCHER;
    }
});

test("a todo needs a title", () => {
    const result = todos.createTodo(user, input(""));
    assert.deepEqual(result, { ok: false, errors: { Title: "Title is required" } });
});

test("each user lists only their own todos", () => {
    todos.createTodo(user, input("mine"));
    todos.createTodo(admin, input("theirs"));
    const titles = todos.listTodos(user, todos.parseListRequest({})).items.map(t => t.Title);
    assert.ok(titles.includes("mine"));
    assert.ok(!titles.includes("theirs"));
});

test("another user's todo cannot be read, changed, toggled or deleted", () => {
    const created = todos.createTodo(admin, input("admin only"));
    assert.ok(created.ok);
    const id = created.item.id;
    assert.equal(todos.getTodo(user, id), null);
    assert.deepEqual(todos.updateTodo(user, id, input("hijacked")), { ok: false, notFound: true });
    assert.equal(todos.toggleDone(user, id), null);
    assert.equal(todos.deleteTodo(user, id), false);
    assert.equal(todos.getTodo(admin, id)?.Title, "admin only");
});

test("toggling flips IsDone and saves it", () => {
    const created = todos.createTodo(user, input("toggle me"));
    assert.ok(created.ok);
    assert.equal(todos.toggleDone(user, created.item.id)?.IsDone, true);
    assert.equal(todos.toggleDone(user, created.item.id)?.IsDone, false);
});

test("priority sorts on the enumeration key", () => {
    for (const p of ["Medium", "High", "Low"] as const) todos.createTodo(user, input(`p-${p}`, { Priority: p }));
    const items = todos.listTodos(user, todos.parseListRequest({ sort: [["Priority", "asc"]], filter: { op: "startsWith", attr: "Title", value: "p-" } })).items;
    assert.deepEqual(
        items.map(t => t.Priority),
        ["High", "Low", "Medium"]
    );
});

test("malformed list requests are refused", () => {
    assert.throws(() => todos.parseListRequest({ sort: [["owner_id", "asc"]] }), todos.BadRequest);
    assert.throws(() => todos.parseListRequest({ limit: 100000 }), todos.BadRequest);
    assert.throws(() => todos.listTodos(user, todos.parseListRequest({ filter: { op: "equals", attr: "owner_id", value: 1 } })), todos.BadRequest);
});

test("input is checked", () => {
    assert.throws(() => todos.parseInput({ Title: "x", Priority: "Urgent" }), todos.BadRequest);
    assert.throws(() => todos.parseInput({ Title: "x", DueDate: "not a date" }), todos.BadRequest);
});
