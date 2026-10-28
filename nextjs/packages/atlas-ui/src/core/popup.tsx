"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx, mxName } from "../util/cx";
import { useWidgetId } from "../util/useId";

export interface PopupWindowProps {
    /** The page shown in the popup, for the mx-name class. */
    name?: string;
    caption: ReactNode;
    /** Closing the window by its close button or Escape; Mendix cancels the page's changes. */
    onClose: () => void;
    /** Popup width in px; Mendix's default (the page's width 0) is 600. */
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
 * window markup with its underlay, centred, draggable by its header.
 */
export function PopupWindow({ name, caption, onClose, width = 600, height, className, autoFocus = true, children }: PopupWindowProps) {
    const captionId = useWidgetId("mxui_widget_Window_caption");
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ left: number; top: number } | undefined>(undefined);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;

    useLayoutEffect(() => {
        const node = ref.current;
        if (!node) return;
        const place = () => {
            const rect = node.getBoundingClientRect();
            setPosition({
                left: Math.max(0, Math.round((window.innerWidth - rect.width) / 2)),
                top: Math.max(0, Math.round((window.innerHeight - rect.height) / 2))
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
        zIndex: 1001,
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        visibility: position ? undefined : "hidden"
    };

    return createPortal(
        <>
            <div className="mx-underlay" style={{ zIndex: 1000 }} />
            <div
                ref={ref}
                className={cx("modal-dialog", "mx-window", "mx-window-active", mxName(name), className)}
                role="dialog"
                aria-modal="true"
                aria-labelledby={captionId}
                tabIndex={-1}
                style={style}
            >
                <div className="modal-content mx-window-content">
                    <div className="modal-header mx-window-header" onMouseDown={startDrag}>
                        <button type="button" className="close mx-window-close" aria-label="close" onClick={() => closeRef.current()}>
                            ×
                        </button>
                        <h4 id={captionId}>{caption}</h4>
                    </div>
                    <div className="modal-body mx-window-body">{children}</div>
                </div>
            </div>
        </>,
        document.body
    );
}
