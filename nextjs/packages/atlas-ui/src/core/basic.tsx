"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { cx, mxName } from "../util/cx";
import { usePageName } from "./page";

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
    return <Tag className={cx("mx-text", mxName(name), className)}>{children}</Tag>;
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
    const page = usePageName();
    const [busy, setBusy] = useState(false);
    const disabled = Boolean(props.disabled || busy);
    const handleClick = (event: MouseEvent<HTMLElement>) => {
        if (renderType === "link") event.preventDefault();
        if (!props.onClick || disabled) return;
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
        // Mendix marks a disabled button with aria-disabled and data-disabled, not the disabled attribute.
        <button
            type="button"
            className={cx("btn", "mx-button", mxName(props.name), `btn-${buttonStyle}`, props.className)}
            title={props.tooltip ?? ""}
            aria-disabled={disabled ? "true" : undefined}
            data-disabled={String(disabled)}
            data-button-id={page ? `p.${page}.${props.name}` : undefined}
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

/**
 * The menu bar widget (Forms$MenuBar). The React client renders it as a
 * Bootstrap navbar: div.navbar.mx-navbar > ul.nav.navbar-nav > li.mx-navbar-item.
 */
export function MenuBar({ name, className, orientation = "horizontal", items }: MenuBarProps) {
    return (
        <div className={cx("navbar", "navbar-default", "mx-navbar", mxName(name), { "mx-navbar-vertical": orientation === "vertical" }, className)} tabIndex={-1}>
            <ul className="nav navbar-nav" role="menu">
                {items.map((item, index) => (
                    <li key={item.href + item.caption} className={cx("mx-navbar-item", { active: item.active })} role="none">
                        <a
                            className={name ? `mx-name-${name}-${index}` : undefined}
                            href={item.href}
                            role="menuitem"
                            title={item.caption}
                            onClick={event => {
                                if (!item.onNavigate || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                                event.preventDefault();
                                item.onNavigate(item.href);
                            }}
                        >
                            {item.icon && <Icon spec={item.icon} />} {item.caption}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
