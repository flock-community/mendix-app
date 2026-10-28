"use client";

import { useState } from "react";
import { cx } from "../util/cx";

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
 * and one link per demo user to sign in as that user.
 */
export function DemoUserSwitcher({ users, current, onSwitch }: DemoUserSwitcherProps) {
    const [open, setOpen] = useState(false);
    return (
        <div className="mx-demouserswitcher" style={{ right: open ? 0 : -WIDTH, transition: "right 0.25s ease" }}>
            <div className="mx-demouserswitcher-toggle" title="Demo users" role="button" tabIndex={0} aria-expanded={open} onClick={() => setOpen(o => !o)} onKeyDown={e => (e.key === "Enter" || e.key === " ") && setOpen(o => !o)} />
            <div className="mx-demouserswitcher-content">
                <h2>Demo users</h2>
                <ul>
                    {users.map(user => (
                        <li key={user.name}>
                            <a
                                href="#"
                                className={cx({ active: user.name === current })}
                                onClick={event => {
                                    event.preventDefault();
                                    onSwitch(user.name);
                                }}
                            >
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
