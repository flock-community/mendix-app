import { conditionToSql, FilterError, type AttributeColumns, type FilterCondition } from "@flock-community/atlas-ui/filters";
import { db } from "./db";
import { DESCRIPTION_LENGTH, isPriority, TITLE_LENGTH, validateTodoItem, type TodoItem, type TodoItemInput, type ValidationErrors } from "../model/todo";

/**
 * Todo.TodoItem on the server. Every query is scoped to the signed-in user:
 * the entity's access rule `[System.owner = '[%CurrentUser%]']`.
 */

const COLUMNS: AttributeColumns = {
    Title: { column: "title", kind: "string" },
    Description: { column: "description", kind: "string" },
    IsDone: { column: "is_done", kind: "boolean" },
    DueDate: { column: "due_date", kind: "datetime" },
    Priority: { column: "priority", kind: "enum" }
};

const SORT_COLUMNS: Record<string, string> = {
    Title: "title COLLATE NOCASE",
    Description: "description COLLATE NOCASE",
    IsDone: "is_done",
    DueDate: "due_date",
    // Mendix stores an enumeration as its key, so it sorts alphabetically on the key.
    Priority: "priority"
};

interface Row {
    id: number;
    title: string;
    description: string | null;
    is_done: number;
    due_date: number | null;
    priority: string | null;
}

function toItem(row: Row): TodoItem {
    return {
        id: String(row.id),
        Title: row.title,
        Description: row.description ?? "",
        IsDone: row.is_done === 1,
        DueDate: row.due_date === null ? null : new Date(row.due_date).toISOString(),
        Priority: isPriority(row.priority) ? row.priority : null
    };
}

export class BadRequest extends Error {}

export interface ListRequest {
    offset: number;
    limit: number;
    sort: Array<[string, "asc" | "desc"]>;
    filter?: FilterCondition;
}

/** Validates a list query as the client sent it. */
export function parseListRequest(raw: unknown): ListRequest {
    const q = (raw ?? {}) as Record<string, unknown>;
    const offset = Number(q.offset ?? 0);
    const limit = Number(q.limit ?? 20);
    if (!Number.isInteger(offset) || offset < 0) throw new BadRequest("offset");
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new BadRequest("limit");
    const sort = Array.isArray(q.sort) ? q.sort : [];
    for (const s of sort) {
        if (!Array.isArray(s) || !(s[0] in SORT_COLUMNS) || (s[1] !== "asc" && s[1] !== "desc")) throw new BadRequest("sort");
    }
    return { offset, limit, sort: sort as ListRequest["sort"], filter: (q.filter as FilterCondition | undefined) ?? undefined };
}

export function listTodos(ownerId: number, request: ListRequest): { items: TodoItem[]; totalCount: number } {
    let where;
    try {
        where = conditionToSql(request.filter, COLUMNS);
    } catch (error) {
        if (error instanceof FilterError) throw new BadRequest(error.message);
        throw error;
    }
    const order = [...request.sort.map(([attr, dir]) => `${SORT_COLUMNS[attr]} ${dir === "asc" ? "ASC" : "DESC"}`), "id ASC"].join(", ");
    const params = [ownerId, ...where.params] as Array<string | number | null>;
    const total = db().prepare(`SELECT COUNT(*) AS n FROM todo_items WHERE owner_id = ? AND ${where.sql}`).get(...params) as { n: number };
    const rows = db()
        .prepare(`SELECT id, title, description, is_done, due_date, priority FROM todo_items WHERE owner_id = ? AND ${where.sql} ORDER BY ${order} LIMIT ? OFFSET ?`)
        .all(...params, request.limit, request.offset) as unknown as Row[];
    return { items: rows.map(toItem), totalCount: total.n };
}

export function getTodo(ownerId: number, id: string): TodoItem | null {
    const row = db().prepare("SELECT id, title, description, is_done, due_date, priority FROM todo_items WHERE id = ? AND owner_id = ?").get(Number(id), ownerId) as Row | undefined;
    return row ? toItem(row) : null;
}

/** Reads the attribute values of a New/Edit form submission. */
export function parseInput(raw: unknown): TodoItemInput {
    const body = (raw ?? {}) as Record<string, unknown>;
    const text = (value: unknown, max: number) => {
        if (value === null || value === undefined) return "";
        if (typeof value !== "string") throw new BadRequest("Expected text");
        return value.slice(0, max + 1);
    };
    let due: string | null = null;
    if (body.DueDate !== null && body.DueDate !== undefined && body.DueDate !== "") {
        const time = Date.parse(String(body.DueDate));
        if (Number.isNaN(time)) throw new BadRequest("DueDate");
        due = new Date(time).toISOString();
    }
    if (body.Priority !== null && body.Priority !== undefined && !isPriority(body.Priority)) throw new BadRequest("Priority");
    return {
        Title: text(body.Title, TITLE_LENGTH),
        Description: text(body.Description, DESCRIPTION_LENGTH),
        IsDone: body.IsDone === true,
        DueDate: due,
        Priority: (body.Priority as TodoItemInput["Priority"]) ?? null
    };
}

export type SaveResult = { ok: true; item: TodoItem } | { ok: false; errors: ValidationErrors } | { ok: false; notFound: true };

export function createTodo(ownerId: number, input: TodoItemInput): SaveResult {
    const errors = validateTodoItem(input);
    if (Object.keys(errors).length) return { ok: false, errors };
    const now = Date.now();
    const result = db()
        .prepare("INSERT INTO todo_items (owner_id, title, description, is_done, due_date, priority, created_at, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(ownerId, input.Title, input.Description || null, input.IsDone ? 1 : 0, input.DueDate ? Date.parse(input.DueDate) : null, input.Priority, now, now);
    return { ok: true, item: getTodo(ownerId, String(result.lastInsertRowid))! };
}

export function updateTodo(ownerId: number, id: string, input: TodoItemInput): SaveResult {
    if (!getTodo(ownerId, id)) return { ok: false, notFound: true };
    const errors = validateTodoItem(input);
    if (Object.keys(errors).length) return { ok: false, errors };
    db()
        .prepare("UPDATE todo_items SET title = ?, description = ?, is_done = ?, due_date = ?, priority = ?, changed_at = ? WHERE id = ? AND owner_id = ?")
        .run(input.Title, input.Description || null, input.IsDone ? 1 : 0, input.DueDate ? Date.parse(input.DueDate) : null, input.Priority, Date.now(), Number(id), ownerId);
    return { ok: true, item: getTodo(ownerId, id)! };
}

export function deleteTodo(ownerId: number, id: string): boolean {
    return Number(db().prepare("DELETE FROM todo_items WHERE id = ? AND owner_id = ?").run(Number(id), ownerId).changes) > 0;
}

/** Todo.ACT_TodoItem_ToggleDone: `change $TodoItem (IsDone = not($TodoItem/IsDone)) commit refresh; return true`. */
export function toggleDone(ownerId: number, id: string): TodoItem | null {
    const changed = db().prepare("UPDATE todo_items SET is_done = 1 - is_done, changed_at = ? WHERE id = ? AND owner_id = ?").run(Date.now(), Number(id), ownerId).changes;
    return Number(changed) > 0 ? getTodo(ownerId, id) : null;
}
