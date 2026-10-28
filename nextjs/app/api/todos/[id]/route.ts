import { NextResponse } from "next/server";
import { withUser } from "@/server/http";
import { deleteTodo, getTodo, parseInput, updateTodo } from "@/server/todos";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
    const { id } = await params;
    return withUser(user => {
        const item = getTodo(user.id, id);
        return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
    });
}

/** PUT: commit changes to a todo (the New/Edit popup's Save). */
export async function PUT(request: Request, { params }: Context) {
    const { id } = await params;
    return withUser(async user => {
        const result = updateTodo(user.id, id, parseInput(await request.json()));
        if (!result.ok) return NextResponse.json(result, { status: "errors" in result ? 422 : 404 });
        return NextResponse.json(result.item);
    });
}

/** DELETE: the overview's Delete button. */
export async function DELETE(_request: Request, { params }: Context) {
    const { id } = await params;
    return withUser(user => (deleteTodo(user.id, id) ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Not found" }, { status: 404 })));
}
