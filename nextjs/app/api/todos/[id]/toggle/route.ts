import { NextResponse } from "next/server";
import { withUser } from "@/server/http";
import { toggleDone } from "@/server/todos";

/** POST: microflow Todo.ACT_TodoItem_ToggleDone on one todo. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return withUser(user => {
        const item = toggleDone(user.id, id);
        return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
    });
}
