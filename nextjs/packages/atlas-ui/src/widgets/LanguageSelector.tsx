"use client";

import { autoUpdate, flip, FloatingFocusManager, offset, useClick, useDismiss, useFloating, useInteractions, useListNavigation, useRole } from "@floating-ui/react";
import { useRef, useState } from "react";
import { cx, mxName } from "../util/cx";

export interface Language {
    id: string;
    caption: string;
}

export interface LanguageSelectorProps {
    name?: string;
    className?: string;
    languages: Language[];
    /** The signed-in user's language; Mendix leaves it empty for users without one. */
    current?: Language;
    onSelect?: (language: Language) => void;
    position?: "left" | "right" | "top" | "bottom";
    hideForSingle?: boolean;
    screenReaderLabelCaption?: string;
}

/** The Language selector widget (com.mendix.widget.web.languageselector). */
export function LanguageSelector({ name, className, languages, current, onSelect, position = "bottom", hideForSingle = false, screenReaderLabelCaption }: LanguageSelectorProps) {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const listRef = useRef<Array<HTMLElement | null>>([]);
    const { refs, floatingStyles, context } = useFloating({
        open,
        onOpenChange: setOpen,
        placement: position === "left" ? "left-start" : position === "right" ? "right-start" : position === "top" ? "top-start" : "bottom-start",
        middleware: [offset(4), flip()],
        whileElementsMounted: autoUpdate
    });
    const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
        useClick(context),
        useDismiss(context),
        useRole(context, { role: "listbox" }),
        useListNavigation(context, { listRef, activeIndex, onNavigate: setActiveIndex, selectedIndex: languages.findIndex(l => l.id === current?.id) })
    ]);

    if (hideForSingle && languages.length < 2) return null;

    const select = (index: number) => {
        onSelect?.(languages[index]);
        setOpen(false);
    };

    return (
        <div className={cx(mxName(name), className, "widget-language-selector", "popupmenu")}>
            <div
                ref={refs.setReference}
                className="popupmenu-trigger popupmenu-trigger-alignment"
                aria-label={screenReaderLabelCaption || "Language selector"}
                aria-autocomplete="none"
                tabIndex={0}
                {...getReferenceProps()}
            >
                <span className="current-language-text">{current?.caption ?? ""}</span>
                <span className="language-arrow" aria-hidden="true">
                    <div className={`arrow-image ${open ? "arrow-up" : "arrow-down"}`} />
                </span>
            </div>
            {open && (
                <FloatingFocusManager context={context} modal={false}>
                    <div className="popupmenu-menu" ref={refs.setFloating} style={{ ...floatingStyles, outline: 0, overflowY: "auto" }} {...getFloatingProps()}>
                        {languages.map((language, index) => (
                            <div
                                key={language.id}
                                ref={node => {
                                    listRef.current[index] = node;
                                }}
                                role="option"
                                tabIndex={index === activeIndex ? 0 : -1}
                                aria-selected={language.id === current?.id}
                                className={cx("popupmenu-basic-item", { active: language.id === current?.id, highlighted: activeIndex === index })}
                                {...getItemProps({
                                    onClick: () => select(index),
                                    onKeyDown: event => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            select(index);
                                        }
                                    }
                                })}
                            >
                                {language.caption}
                            </div>
                        ))}
                    </div>
                </FloatingFocusManager>
            )}
        </div>
    );
}
