/**
 * The Todo module's domain model (mendix/mdlsource/01-todo.mdl), shared by the
 * server and the pages.
 */

/** Todo.Priority, in model order. Values are the enumeration keys Mendix stores. */
export const PRIORITIES = [
    { value: "Low", caption: "Low" },
    { value: "Medium", caption: "Medium" },
    { value: "High", caption: "High" }
] as const;

export type Priority = (typeof PRIORITIES)[number]["value"];

export function isPriority(value: unknown): value is Priority {
    return PRIORITIES.some(p => p.value === value);
}

/** Todo.TodoItem as the pages see it. */
export interface TodoItem {
    id: string;
    Title: string;
    Description: string;
    IsDone: boolean;
    /** ISO instant, or null. */
    DueDate: string | null;
    Priority: Priority | null;
}

/** The attribute values a New/Edit form sends. */
export type TodoItemInput = Omit<TodoItem, "id">;

export const TITLE_LENGTH = 200;
export const DESCRIPTION_LENGTH = 2000;

/** A new TodoItem with the domain model's defaults (IsDone false, Priority Medium). */
export function newTodoItem(): TodoItemInput {
    return { Title: "", Description: "", IsDone: false, DueDate: null, Priority: "Medium" };
}

export type ValidationErrors = Partial<Record<keyof TodoItemInput, string>>;

/** The entity's validation rules. */
export function validateTodoItem(item: TodoItemInput): ValidationErrors {
    const errors: ValidationErrors = {};
    if (!item.Title) errors.Title = "Title is required";
    else if (item.Title.length > TITLE_LENGTH) errors.Title = "Value too long.";
    if (item.Description && item.Description.length > DESCRIPTION_LENGTH) errors.Description = "Value too long.";
    return errors;
}
