"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";

export interface ConfirmationOptions {
    /** The question; Mendix's delete action asks "Are you sure you want to delete this?". */
    question: string;
    caption?: string;
    proceed?: string;
    cancel?: string;
}

const RESIZERS = [
    ["north", "n"],
    ["east", "e"],
    ["south", "s"],
    ["west", "w"],
    ["northeast", "ne"],
    ["southeast", "se"],
    ["southwest", "sw"],
    ["northwest", "nw"]
] as const;

// Mendix numbers its message dialogs per page load: mxui_widget_DialogMessage_0, _1, ...
let dialogCount = 0;

/**
 * Asks the user to confirm, the way a Mendix action with a confirmation does:
 * the runtime's DialogMessage markup, 500px wide, centred horizontally and
 * placed at 35% of the free height, over an underlay. Resolves true on OK and
 * false on Cancel, the close button or Escape.
 */
export function confirmation(options: ConfirmationOptions): Promise<boolean> {
    // A detached root that portals into <body>, where Mendix puts its dialogs.
    const root = createRoot(document.createElement("div"));
    const id = `mxui_widget_DialogMessage_${dialogCount++}`;
    return new Promise(resolve => {
        const answer = (value: boolean) => {
            root.unmount();
            resolve(value);
        };
        root.render(createPortal(<DialogMessage id={id} options={options} onAnswer={answer} />, document.body));
    });
}

function DialogMessage({ id, options, onAnswer }: { id: string; options: ConfirmationOptions; onAnswer: (value: boolean) => void }) {
    const { question, caption = "Confirmation", proceed = "OK", cancel = "Cancel" } = options;
    const ref = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState<{ left: number; top: number } | undefined>(undefined);

    useLayoutEffect(() => {
        const node = ref.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        setPosition({
            left: Math.max(0, (window.innerWidth - rect.width) / 2),
            top: Math.max(0, (window.innerHeight - rect.height) * 0.35)
        });
    }, []);

    // Mendix focuses the first focusable element: the close button.
    useEffect(() => {
        if (position) closeRef.current?.focus();
    }, [position]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                onAnswer(false);
            }
        };
        document.addEventListener("keydown", onKey, true);
        return () => document.removeEventListener("keydown", onKey, true);
    }, [onAnswer]);

    return (
        <>
            <div
                ref={ref}
                id={id}
                className="modal-dialog mx-dialog"
                role="dialog"
                data-focus-capturing="modal"
                aria-modal="true"
                aria-labelledby={`${id}_caption`}
                aria-describedby={`${id}_content`}
                tabIndex={-1}
                style={{ width: 500, zIndex: 1002, top: position?.top ?? 0, left: position?.left ?? 0, visibility: position ? undefined : "hidden" }}
            >
                <div className="modal-content mx-dialog-content" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <div className="modal-header mx-dialog-header" style={{ userSelect: "none", flex: "0 0 auto" }}>
                        <button ref={closeRef} type="button" className="close mx-dialog-close" title="close" aria-label="close" onClick={() => onAnswer(false)}>
                            ×
                        </button>
                        <h4 id={`${id}_caption`} role="heading" aria-level={2} className="caption mx-dialog-caption">
                            {caption}
                        </h4>
                    </div>
                    <div id={`${id}_content`} className="modal-body mx-dialog-body" style={{ flex: "1 1 auto" }}>
                        <p>{question}</p>
                    </div>
                    <div className="modal-footer mx-dialog-footer" data-focusindex="0">
                        <button className="btn btn-primary" onClick={() => onAnswer(true)}>
                            {proceed}
                        </button>
                        <button className="btn" onClick={() => onAnswer(false)}>
                            {cancel}
                        </button>
                    </div>
                </div>
                {RESIZERS.map(([direction, short]) => (
                    <div key={short} role="button" data-testid={`resize-${direction}`} className={`mx-resizer mx-resizer-${short}`} style={{ userSelect: "none" }} />
                ))}
            </div>
            <div className="mx-underlay" style={{ zIndex: 1001 }} />
        </>
    );
}
