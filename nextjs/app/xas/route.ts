import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, demoUser, destroySession, SESSION_COOKIE, verifyCredentials } from "@/server/auth";

/**
 * The runtime endpoint the Mendix login page talks to: { action: "login",
 * params: { username, password } } signs in and sets the session cookie;
 * { action: "logout" } ends the session. With the demo user switcher on,
 * { action: "demoLogin", params: { username } } signs in as a demo user.
 */
export async function POST(request: Request) {
    let body: { action?: string; params?: { username?: unknown; password?: unknown } };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    const store = await cookies();

    if (body.action === "login" || body.action === "demoLogin") {
        const username = typeof body.params?.username === "string" ? body.params.username : "";
        const password = typeof body.params?.password === "string" ? body.params.password : "";
        const user = body.action === "demoLogin" ? demoUser(username) : username && password ? verifyCredentials(username, password) : null;
        if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        const previous = store.get(SESSION_COOKIE)?.value;
        if (previous) destroySession(previous);
        store.set(SESSION_COOKIE, createSession(user.id), { httpOnly: true, sameSite: "lax", path: "/", secure: new URL(request.url).protocol === "https:" });
        return NextResponse.json({});
    }

    if (body.action === "logout") {
        const token = store.get(SESSION_COOKIE)?.value;
        if (token) destroySession(token);
        store.delete(SESSION_COOKIE);
        return NextResponse.json({});
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
