import { NextResponse } from "next/server";
import { currentUser, type SessionUser } from "./auth";
import { BadRequest } from "./todos";

/** Runs a route handler for a signed-in user; anonymous requests get 401, malformed ones 400. */
export async function withUser(handler: (user: SessionUser) => Promise<Response> | Response): Promise<Response> {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    try {
        return await handler(user);
    } catch (error) {
        if (error instanceof BadRequest || error instanceof SyntaxError) {
            return NextResponse.json({ error: `Bad request: ${error.message}` }, { status: 400 });
        }
        throw error;
    }
}
