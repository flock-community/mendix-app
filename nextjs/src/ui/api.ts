"use client";

import type { ListPage, ListQuery } from "@flock-community/atlas-ui";
import type { TodoItem, TodoItemInput, ValidationErrors } from "../model/todo";

/** A request the session no longer covers sends the user to the login page, as Mendix does. */
async function call(input: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(input, { credentials: "same-origin", ...init });
    if (response.status === 401) {
        window.location.assign(`/login.html?cont=${encodeURIComponent(window.location.pathname)}`);
        throw new Error("Not signed in");
    }
    return response;
}

export async function fetchTodos(query: ListQuery, signal: AbortSignal): Promise<ListPage<TodoItem>> {
    const response = await call(`/api/todos?q=${encodeURIComponent(JSON.stringify(query))}`, { signal });
    if (!response.ok) throw new Error(`Loading todos failed: ${response.status}`);
    return response.json();
}

export type SaveOutcome = { ok: true } | { ok: false; errors: ValidationErrors };

export async function saveTodo(id: string | undefined, values: TodoItemInput): Promise<SaveOutcome> {
    const response = await call(id ? `/api/todos/${id}` : "/api/todos", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
    });
    if (response.status === 422) return { ok: false, errors: (await response.json()).errors };
    if (!response.ok) throw new Error(`Saving failed: ${response.status}`);
    return { ok: true };
}

export async function deleteTodo(id: string): Promise<void> {
    const response = await call(`/api/todos/${id}`, { method: "DELETE" });
    if (!response.ok && response.status !== 404) throw new Error(`Deleting failed: ${response.status}`);
}

/** Microflow Todo.ACT_TodoItem_ToggleDone. */
export async function toggleDone(id: string): Promise<void> {
    const response = await call(`/api/todos/${id}/toggle`, { method: "POST" });
    if (!response.ok && response.status !== 404) throw new Error(`Toggling failed: ${response.status}`);
}
