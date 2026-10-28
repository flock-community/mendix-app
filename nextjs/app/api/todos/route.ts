import { NextResponse } from "next/server";
import { withUser } from "@/server/http";
import { createTodo, listTodos, parseInput, parseListRequest } from "@/server/todos";

/** GET ?q=<list query JSON>: a page of the signed-in user's todos. */
export async function GET(request: Request) {
    return withUser(user => {
        const raw = new URL(request.url).searchParams.get("q");
        return NextResponse.json(listTodos(user.id, parseListRequest(raw ? JSON.parse(raw) : {})));
    });
}

/** POST: commit a new todo (the New/Edit popup's Save). */
export async function POST(request: Request) {
    return withUser(async user => {
        const result = createTodo(user.id, parseInput(await request.json()));
        if (!result.ok) return NextResponse.json(result, { status: "errors" in result ? 422 : 404 });
        return NextResponse.json(result.item, { status: 201 });
    });
}
