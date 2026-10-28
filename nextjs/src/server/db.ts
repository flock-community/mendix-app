import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import bcrypt from "bcryptjs";

/**
 * The app's database: SQLite through Node's built-in node:sqlite, in
 * data/todoapp.db (DATABASE_PATH overrides). It holds what the Mendix app
 * keeps in its database: the accounts (System.User / Administration.Account),
 * their sessions and Todo.TodoItem.
 */

type SqliteModule = typeof import("node:sqlite");

function loadSqlite(): SqliteModule {
    // node:sqlite still announces itself as experimental; keep that out of the logs.
    const emitWarning = process.emitWarning;
    process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
        if (String(warning).includes("SQLite")) return;
        (emitWarning as (...args: unknown[]) => void).call(process, warning, ...rest);
    }) as typeof process.emitWarning;
    try {
        // getBuiltinModule keeps the bundler from trying to resolve it.
        return process.getBuiltinModule("node:sqlite") as SqliteModule;
    } finally {
        process.emitWarning = emitWarning;
    }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS todo_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_done INTEGER NOT NULL DEFAULT 0,
    due_date INTEGER,
    priority TEXT,
    created_at INTEGER NOT NULL,
    changed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS todo_items_owner ON todo_items(owner_id);
`;

/** The project's demo users (Security$ProjectSecurity.DemoUsers), with passwords from the environment. */
export function demoUsers(): Array<{ name: string; role: "User" | "Administrator"; password: string }> {
    const shared = process.env.DEMO_PASSWORD ?? "Choose-a-passw0rd";
    return [
        { name: "demo_administrator", role: "Administrator", password: process.env.DEMO_ADMINISTRATOR_PASSWORD ?? shared },
        { name: "demo_user", role: "User", password: process.env.DEMO_USER_PASSWORD ?? shared }
    ];
}

/**
 * Whether pages show Mendix's demo user switcher, which signs in as any demo
 * user without a password. Mendix shows it in development mode only; here it
 * follows DEMO_USER_SWITCHER, and is on under `next dev` when that is unset.
 */
export function demoUserSwitcherEnabled(): boolean {
    const setting = process.env.DEMO_USER_SWITCHER;
    return setting ? setting === "true" : process.env.NODE_ENV === "development";
}

/** Mendix's hash settings: BCrypt, cost 12. */
export const BCRYPT_COST = 12;

function open(): DatabaseSyncType {
    const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "todoapp.db");
    if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
    const { DatabaseSync } = loadSqlite();
    const db = new DatabaseSync(file);
    db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    db.exec(SCHEMA);

    // Like Mendix with demo users enabled: they exist at startup, with the configured password.
    const find = db.prepare("SELECT id, password_hash FROM users WHERE name = ?");
    const insert = db.prepare("INSERT INTO users (name, password_hash, role) VALUES (?, ?, ?)");
    const update = db.prepare("UPDATE users SET password_hash = ?, role = ? WHERE id = ?");
    for (const user of demoUsers()) {
        const row = find.get(user.name) as { id: number; password_hash: string } | undefined;
        if (!row) insert.run(user.name, bcrypt.hashSync(user.password, BCRYPT_COST), user.role);
        else if (!bcrypt.compareSync(user.password, row.password_hash)) update.run(bcrypt.hashSync(user.password, BCRYPT_COST), user.role, row.id);
    }
    return db;
}

const globalForDb = globalThis as unknown as { todoappDb?: DatabaseSyncType };

/** One connection per server process (kept across hot reloads in development). */
export function db(): DatabaseSyncType {
    globalForDb.todoappDb ??= open();
    return globalForDb.todoappDb;
}
