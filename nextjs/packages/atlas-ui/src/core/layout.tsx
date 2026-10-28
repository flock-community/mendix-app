import type { CSSProperties, ReactNode } from "react";
import { cx, mxName } from "../util/cx";

/**
 * Page structure: the page root, layouts (scroll containers), placeholders,
 * layout grids and containers. Markup follows the Mendix React client so the
 * Atlas layout rules (layout-atlas-*, region-*, mx-scrollcontainer-*) apply.
 */

export interface PageProps {
    /** Qualified page name, e.g. "Todo.TodoItem_Overview"; rendered as a data attribute. */
    page: string;
    className?: string;
    children: ReactNode;
}

export function Page({ page, className, children }: PageProps) {
    return (
        <div className={cx("mx-page", className)} data-page={page}>
            {children}
        </div>
    );
}

export function Placeholder({ children, className }: { children?: ReactNode; className?: string }) {
    return <div className={cx("mx-placeholder", className)}>{children}</div>;
}

export interface RegionProps {
    className?: string;
    /** Width (left/right) or height (top/bottom) in px; omit for "fit content". */
    size?: number;
    children?: ReactNode;
}

export interface ScrollContainerProps {
    name?: string;
    className?: string;
    /** Headline: the top and bottom regions span the full width. Sidebar: left and right do. */
    layoutMode?: "headline" | "sidebar";
    /** Per region: each region scrolls on its own and the container fills its parent. */
    scrollBehavior?: "perRegion" | "fullWidget";
    top?: RegionProps;
    left?: RegionProps;
    right?: RegionProps;
    bottom?: RegionProps;
    center: RegionProps;
    style?: CSSProperties;
}

function Region({ side, region }: { side: "top" | "left" | "right" | "bottom" | "center"; region: RegionProps | undefined }) {
    if (!region) return null;
    const style = region.size !== undefined ? ({ "--sidebar-size": `${region.size}px` } as CSSProperties) : undefined;
    return (
        <div className={cx(`mx-scrollcontainer-${side}`, region.className)} style={style}>
            <div className="mx-scrollcontainer-wrapper">{region.children}</div>
        </div>
    );
}

export function ScrollContainer(props: ScrollContainerProps) {
    const { layoutMode = "headline", scrollBehavior = "perRegion" } = props;
    const middleSides = (
        <>
            <Region side="left" region={props.left} />
            <Region side="center" region={props.center} />
            <Region side="right" region={props.right} />
        </>
    );
    const rootClass = cx(
        "mx-scrollcontainer",
        { "mx-scrollcontainer-fixed": scrollBehavior === "perRegion" },
        layoutMode === "headline" ? "mx-scrollcontainer-vertical" : "mx-scrollcontainer-horizontal",
        props.className,
        mxName(props.name)
    );
    if (layoutMode === "headline") {
        return (
            <div className={rootClass} style={props.style}>
                <Region side="top" region={props.top} />
                <div className="mx-scrollcontainer-middle mx-scrollcontainer-horizontal">{middleSides}</div>
                <Region side="bottom" region={props.bottom} />
            </div>
        );
    }
    return (
        <div className={rootClass} style={props.style}>
            <Region side="left" region={props.left} />
            <div className="mx-scrollcontainer-middle mx-scrollcontainer-vertical">
                <Region side="top" region={props.top} />
                <Region side="center" region={props.center} />
                <Region side="bottom" region={props.bottom} />
            </div>
            <Region side="right" region={props.right} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Layout grid
// ---------------------------------------------------------------------------

/** A column width: 1-12, "autofill" (share the rest) or "autofit" (fit content). */
export type ColumnWeight = number | "autofill" | "autofit";

export interface LayoutGridProps {
    name?: string;
    className?: string;
    width?: "fullWidth" | "fixedWidth";
    children: ReactNode;
}

export function LayoutGrid({ name, className, width = "fullWidth", children }: LayoutGridProps) {
    return <div className={cx("mx-layoutgrid", width === "fullWidth" ? "mx-layoutgrid-fluid" : "mx-layoutgrid-fixed", className, mxName(name))}>{children}</div>;
}

export function Row({ className, children }: { className?: string; children: ReactNode }) {
    return <div className={cx("row", className)}>{children}</div>;
}

function columnClass(infix: string, weight: ColumnWeight): string {
    const base = infix ? `col-${infix}` : "col";
    if (weight === "autofill") return base;
    if (weight === "autofit") return `${base}-auto`;
    return `${base}-${weight}`;
}

export interface ColumnProps {
    /** Desktop width. Tablet and phone inherit it unless set. */
    desktop: ColumnWeight;
    tablet?: ColumnWeight;
    phone?: ColumnWeight;
    className?: string;
    children: ReactNode;
}

export function Column({ desktop, tablet, phone, className, children }: ColumnProps) {
    return <div className={cx(columnClass("lg", desktop), columnClass("md", tablet ?? desktop), columnClass("", phone ?? tablet ?? desktop), className)}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

export interface ContainerProps {
    name?: string;
    className?: string;
    style?: CSSProperties;
    renderMode?: "div" | "section" | "article" | "header" | "footer" | "main" | "nav" | "aside";
    children?: ReactNode;
}

export function Container({ name, className, style, renderMode = "div", children }: ContainerProps) {
    const Tag = renderMode;
    return (
        <Tag className={cx(mxName(name), className)} style={style}>
            {children}
        </Tag>
    );
}

/**
 * Atlas's flex design properties for containers. Mendix turns each into a
 * class, or for "Grow / shrink (self)" into an inline `flex` style.
 */
export const containerDesign = {
    flexRow: "flex-row",
    flexColumn: "flex-column",
    alignYCenter: "align-y-center",
    disableRowWrap: "flex-nowrap",
    /** "Grow / shrink (self): Fill container (only grow)". */
    fillContainer: { flex: "var(--flex-grow)" } as CSSProperties,
    /** "Grow / shrink (self): Hug content (only shrink)". */
    hugContent: { flex: "var(--flex-fit-content)" } as CSSProperties
} as const;
