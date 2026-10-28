import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth";
import { TodoItemOverview } from "@/ui/TodoItemOverview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Todos" };

/** Page Todo.TodoItem_Overview, URL "todos" under the app's "p" prefix. Granted to module role Todo.User. */
export default async function TodoItemOverviewPage() {
    if (!(await currentUser())) redirect(`/login.html?cont=${encodeURIComponent("/p/todos")}`);
    return <TodoItemOverview />;
}
