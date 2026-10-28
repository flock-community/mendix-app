"use client";

import { DemoUserSwitcher } from "@flock-community/atlas-ui";

/** Mendix's demo user switcher, wired to the xas/ endpoint. */
export function DemoUsers({ users, current }: { users: Array<{ name: string; roles: string[] }>; current: string }) {
    return (
        <DemoUserSwitcher
            users={users}
            current={current}
            onSwitch={async name => {
                const response = await fetch("/xas/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "demoLogin", params: { username: name } })
                });
                if (response.ok) window.location.reload();
            }}
        />
    );
}
