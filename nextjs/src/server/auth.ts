import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";

/** Mendix's session cookie name, kept so the two apps look alike to a browser. */
export const SESSION_COOKIE = "XASSESSIONID";

export interface SessionUser {
    id: number;
    name: string;
    role: "User" | "Administrator";
}

// Compared against when the user name is unknown, so a wrong name and a
// wrong password take the same time.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

/** Checks the credentials; returns the user, or null when they are wrong. */
export function verifyCredentials(name: string, password: string): SessionUser | null {
    const row = db().prepare("SELECT id, name, role, password_hash, active FROM users WHERE name = ?").get(name) as
        | { id: number; name: string; role: SessionUser["role"]; password_hash: string; active: number }
        | undefined;
    const ok = bcrypt.compareSync(password, row?.password_hash ?? DUMMY_HASH);
    if (!row || !ok || !row.active) return null;
    return { id: row.id, name: row.name, role: row.role };
}

export function createSession(userId: number): string {
    const token = randomBytes(32).toString("base64url");
    const now = Date.now();
    db().prepare("INSERT INTO sessions (token, user_id, created_at, last_seen) VALUES (?, ?, ?, ?)").run(token, userId, now, now);
    return token;
}

export function destroySession(token: string): void {
    db().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function userForToken(token: string | undefined): SessionUser | null {
    if (!token) return null;
    const row = db()
        .prepare("SELECT u.id, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND u.active = 1")
        .get(token) as SessionUser | undefined;
    if (!row) return null;
    db().prepare("UPDATE sessions SET last_seen = ? WHERE token = ?").run(Date.now(), token);
    return { id: row.id, name: row.name, role: row.role };
}

/** The signed-in user of the current request, from its session cookie. */
export async function currentUser(): Promise<SessionUser | null> {
    const store = await cookies();
    return userForToken(store.get(SESSION_COOKIE)?.value);
}
