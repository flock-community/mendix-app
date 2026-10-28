"use client";

import { useState } from "react";

export interface DemoUser {
    name: string;
    /** The user's roles, shown under the name. */
    roles: string[];
}

export interface DemoUserSwitcherProps {
    users: DemoUser[];
    /** The signed-in user's name. */
    current?: string;
    onSwitch: (name: string) => void;
}

const WIDTH = 360;

/**
 * The panel Mendix adds to the right edge of every page when demo users are
 * enabled and the app runs in development mode: a tab that slides it open,
 * and one entry per demo user to sign in as that user. Markup and texts are
 * the runtime's.
 */
export function DemoUserSwitcher({ users, current, onSwitch }: DemoUserSwitcherProps) {
    const [open, setOpen] = useState(false);
    return (
        <div className="mx-demouserswitcher" style={{ right: open ? 0 : -WIDTH, transition: "right 0.3s" }}>
            <div className="mx-demouserswitcher-toggle" onClick={() => setOpen(o => !o)} />
            <div className="mx-demouserswitcher-content">
                <h2>Select user</h2>
                <p>Select one of the demo users to view the application with the associated user roles.</p>
                <ul>
                    {users.map(user => (
                        <li key={user.name} className={user.name === current ? "active" : ""} style={{ cursor: "pointer" }} onClick={() => onSwitch(user.name)}>
                            <a>
                                <h3>{user.name}</h3>
                                <p>{user.roles.join(", ")}</p>
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
