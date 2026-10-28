"use client";

import { createContext, useContext, type ReactNode } from "react";
import { cx } from "../util/cx";

/** The qualified name of the page being rendered, e.g. "Todo.TodoItem_Overview". */
const PageContext = createContext<string | undefined>(undefined);

export function usePageName(): string | undefined {
    return useContext(PageContext);
}

/** Makes `page` the current page for the widgets inside, without a page root (a popup's content). */
export function PageScope({ page, children }: { page: string; children: ReactNode }) {
    return <PageContext.Provider value={page}>{children}</PageContext.Provider>;
}

export interface PageProps {
    /** Qualified page name, e.g. "Todo.TodoItem_Overview"; widgets derive their ids from it. */
    page: string;
    /** The layout's classes, which Mendix puts on the page root, e.g. "layout-atlas layout-atlas-responsive-topbar". */
    className?: string;
    children: ReactNode;
}

/** The page root, div.mx-page, with the page's layout classes. */
export function Page({ page, className, children }: PageProps) {
    return (
        <PageContext.Provider value={page}>
            <div className={cx("mx-page", className)} data-focusindex="0">
                {children}
            </div>
        </PageContext.Provider>
    );
}

export interface AppRootProps {
    /** The signed-in user's user roles; each becomes a role-<name> class. */
    roles: string[];
    /** The navigation profile, as profile-<name>. */
    profile?: "desktop" | "tablet" | "phone";
    children: ReactNode;
}

/** The client's root element, #root, marked with the navigation profile and the user's roles. */
export function AppRoot({ roles, profile = "desktop", children }: AppRootProps) {
    return (
        <div id="root" className={cx(`profile-${profile}`, ...roles.map(role => `role-${role.toLowerCase()}`))} data-focus-capturing="non-modal">
            {children}
        </div>
    );
}
