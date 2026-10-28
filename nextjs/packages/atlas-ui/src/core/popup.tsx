"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "../util/cx";
import { useWidgetId } from "../util/useId";
import { PageScope } from "./page";

export interface PopupWindowProps {
    /** The qualified name of the page shown in the popup, e.g. "Todo.TodoItem_NewEdit". */
    page?: string;
    caption: ReactNode;
    /** Closing the window by its close button or Escape; Mendix cancels the page's changes. */
    onClose: () => void;
    /** Popup width in px; without it the theme's .mx-window width applies (600px), as in Mendix. */
    width?: number;
    height?: number;
    className?: string;
    /** Focus the first input when opened (the page's "Autofocus: desktop only"). */
    autoFocus?: boolean;
    children: ReactNode;
}

const FOCUSABLE = 'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])';

/**
 * A page shown as a modal popup (a page with a ModalPopup layout): Mendix's
 * window markup followed by its underlay, centred horizontally and placed at
 * 35% of the free height (as the runtime does), draggable by its header.
 */
export function PopupWindow({ page, caption, onClose, width, height, className, autoFocus = true, children }: PopupWindowProps) {
    const windowId = useWidgetId("mxui_widget_Window");
    const captionId = `${windowId}_caption`;
    const bodyId = `${windowId}_body`;
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ left: number; top: number } | undefined>(undefined);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;

    useLayoutEffect(() => {
        const node = ref.current;
        if (!node) return;
        const place = () => {
            // Mendix measures with offsetWidth/offsetHeight, whole pixels.
            const rect = { width: node.offsetWidth, height: node.offsetHeight };
            setPosition({
                left: Math.max(0, (window.innerWidth - rect.width) / 2),
                top: Math.max(0, (window.innerHeight - rect.height) * 0.35)
            });
        };
        place();
    }, []);

    // Focus once the window is placed: while it is still hidden for measuring, nothing in it can take focus.
    const placed = position !== undefined;
    const focused = useRef(false);
    useEffect(() => {
        if (!autoFocus || !placed || focused.current) return;
        focused.current = true;
        const first = ref.current?.querySelector<HTMLElement>(FOCUSABLE);
        (first ?? ref.current)?.focus();
    }, [autoFocus, placed]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !event.defaultPrevented) {
                event.preventDefault();
                closeRef.current();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const startDrag = (event: React.MouseEvent) => {
        if (event.button !== 0 || (event.target as HTMLElement).closest("button") || !position) return;
        const origin = { x: event.clientX, y: event.clientY, ...position };
        const move = (e: MouseEvent) => setPosition({ left: origin.left + e.clientX - origin.x, top: Math.max(0, origin.top + e.clientY - origin.y) });
        const up = () => {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", up);
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
    };

    const style: CSSProperties = {
        width,
        height,
        zIndex: 102,
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? undefined : "hidden"
    };

    const body = page ? <PageScope page={page}>{children}</PageScope> : children;
    return createPortal(
        <>
            <div
                ref={ref}
                id={windowId}
                className={cx("modal-dialog", "mx-window", "mx-window-active", className)}
                role="dialog"
                data-focus-capturing="modal"
                aria-modal="true"
                aria-labelledby={captionId}
                aria-describedby={bodyId}
                tabIndex={-1}
                style={style}
            >
                <div className="modal-content mx-window-content" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <div className="modal-header mx-window-header" style={{ userSelect: "none", flex: "0 0 auto" }} onMouseDown={startDrag}>
                        <button type="button" className="close" title="close" aria-label="close" onClick={() => closeRef.current()}>
                            ×
                        </button>
                        <h4 id={captionId} role="heading" aria-level={2} className="">
                            {caption}
                        </h4>
                    </div>
                    <div id={bodyId} className="modal-body mx-window-body" style={{ flex: "1 1 auto" }}>
                        {body}
                    </div>
                </div>
            </div>
            <div className="mx-underlay" style={{ zIndex: 101 }} />
        </>,
        document.body
    );
}
