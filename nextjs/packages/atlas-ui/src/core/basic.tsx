"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { cx, mxName } from "../util/cx";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

/**
 * An icon. `glyph` is a Bootstrap glyphicon name ("calendar"); `icon` is an
 * icon-collection icon given as its classes, e.g. ["mx-icon-lined", "mx-icon-list-bullets"]
 * (see `atlasIcon`), whose font atlas-theme generates from the project.
 */
export type IconSpec = { glyph: string } | { icon: [collectionClass: string, iconClass: string] };

export function atlasIcon(name: string, style: "lined" | "filled" = "lined"): IconSpec {
    return { icon: [`mx-icon-${style}`, `mx-icon-${name}`] };
}

export function Icon({ spec, className }: { spec: IconSpec; className?: string }) {
    if ("glyph" in spec) return <span className={cx("glyphicon", `glyphicon-${spec.glyph}`, className)} aria-hidden="true" />;
    return <span className={cx(spec.icon[0], spec.icon[1], className)} aria-hidden="true" />;
}

// ---------------------------------------------------------------------------
// Dynamic text
// ---------------------------------------------------------------------------

export interface DynamicTextProps {
    name?: string;
    className?: string;
    renderMode?: "text" | "paragraph" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    children: ReactNode;
}

export function DynamicText({ name, className, renderMode = "text", children }: DynamicTextProps) {
    const Tag = renderMode === "text" ? "span" : renderMode === "paragraph" ? "p" : renderMode;
    return <Tag className={cx(mxName(name), "mx-text", className)}>{children}</Tag>;
}

// ---------------------------------------------------------------------------
// Action button
// ---------------------------------------------------------------------------

export type ButtonStyle = "default" | "inverse" | "primary" | "info" | "success" | "warning" | "danger";

export interface ActionButtonProps {
    name: string;
    caption?: ReactNode;
    buttonStyle?: ButtonStyle;
    renderType?: "button" | "link";
    icon?: IconSpec;
    className?: string;
    tooltip?: string;
    /** May return a promise; the button is disabled until it settles (Mendix's "disabled during action"). */
    onClick?: (event: MouseEvent<HTMLElement>) => unknown;
    disabledDuringExecution?: boolean;
    disabled?: boolean;
    tabIndex?: number;
}

export function ActionButton(props: ActionButtonProps) {
    const { buttonStyle = "default", renderType = "button", disabledDuringExecution = true } = props;
    const [busy, setBusy] = useState(false);
    const handleClick = (event: MouseEvent<HTMLElement>) => {
        if (renderType === "link") event.preventDefault();
        if (!props.onClick || busy) return;
        const result = props.onClick(event);
        if (disabledDuringExecution && result instanceof Promise) {
            setBusy(true);
            result.finally(() => setBusy(false));
        }
    };
    const content = (
        <>
            {props.icon && <Icon spec={props.icon} />}
            {props.icon && props.caption ? " " : null}
            {props.caption}
        </>
    );
    if (renderType === "link") {
        return (
            <a href="#" className={cx("mx-link", mxName(props.name), props.className)} title={props.tooltip} onClick={handleClick} tabIndex={props.tabIndex}>
                {content}
            </a>
        );
    }
    return (
        <button
            type="button"
            className={cx("btn", "mx-button", mxName(props.name), `btn-${buttonStyle}`, props.className)}
            title={props.tooltip}
            disabled={props.disabled || busy}
            onClick={handleClick}
            tabIndex={props.tabIndex}
        >
            {content}
        </button>
    );
}

// ---------------------------------------------------------------------------
// Menu bar (navigation)
// ---------------------------------------------------------------------------

export interface MenuItem {
    caption: string;
    href: string;
    icon?: IconSpec;
    active?: boolean;
    onNavigate?: (href: string) => void;
}

export interface MenuBarProps {
    name: string;
    className?: string;
    orientation?: "horizontal" | "vertical";
    items: MenuItem[];
}

export function MenuBar({ name, className, orientation = "horizontal", items }: MenuBarProps) {
    return (
        <div className={cx("mx-menubar", mxName(name), { "mx-menubar-vertical": orientation === "vertical" }, className)}>
            <ul className="mx-menubar-list" role="menubar">
                {items.map(item => (
                    <li key={item.href + item.caption} className={cx("mx-menubar-item", { active: item.active })} role="none">
                        <a
                            href={item.href}
                            role="menuitem"
                            aria-current={item.active ? "page" : undefined}
                            onClick={event => {
                                if (!item.onNavigate || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                                event.preventDefault();
                                item.onNavigate(item.href);
                            }}
                        >
                            {item.icon && <Icon spec={item.icon} />}
                            {item.caption}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
