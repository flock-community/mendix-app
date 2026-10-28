import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth";
import { demoUsers, demoUserSwitcherEnabled } from "@/server/db";
import { DemoUsers } from "@/ui/DemoUsers";
import { TodoItemOverview } from "@/ui/TodoItemOverview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Todos" };

/** Page Todo.TodoItem_Overview, URL "todos" under the app's "p" prefix. Granted to module role Todo.User. */
export default async function TodoItemOverviewPage() {
    const user = await currentUser();
    if (!user) redirect(`/login.html?cont=${encodeURIComponent("/p/todos")}`);
    return (
        <>
            <TodoItemOverview />
            {demoUserSwitcherEnabled() && <DemoUsers users={demoUsers().map(u => ({ name: u.name, roles: [u.role] }))} current={user.name} />}
        </>
    );
}
