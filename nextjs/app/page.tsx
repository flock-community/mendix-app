import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

/** The app root: the navigation's home page for a signed-in user, the login page otherwise. */
export default async function Home() {
    redirect((await currentUser()) ? "/p/todos" : "/login.html");
}
