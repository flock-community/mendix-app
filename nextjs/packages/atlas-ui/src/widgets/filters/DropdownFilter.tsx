"use client";

import { autoUpdate, size, useFloating } from "@floating-ui/react";
import { useSelect } from "downshift";
import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { compare, or } from "../../data/filters";
import { cx, mxName } from "../../util/cx";
import { useColumnFilter } from "../datagrid/context";

const NONE = "[[__none__]]";

interface Option {
    value: string;
    caption: string;
    raw?: string | boolean;
}

export interface DropdownFilterProps {
    name: string;
    className?: string;
    /** Shown when nothing is selected. */
    emptySelectionCaption?: string;
    /** Caption of the "no filter" option at the top of the list. */
    emptyOptionCaption?: string;
    clearable?: boolean;
    multiSelect?: boolean;
    ariaLabel?: string;
}

const cls = (part?: string) => (part ? `widget-dropdown-filter-${part}` : "widget-dropdown-filter");

function ClearIcon({ className }: { className: string }) {
    return (
        <svg width="14" height="14" viewBox="0 0 32 32" className={className}>
            <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="currentColor"
                d="M27.71 5.71004L26.29 4.29004L16 14.59L5.71004 4.29004L4.29004 5.71004L14.59 16L4.29004 26.29L5.71004 27.71L16 17.41L26.29 27.71L27.71 26.29L17.41 16L27.71 5.71004Z"
            />
        </svg>
    );
}

function StateIcon({ className }: { className: string }) {
    return (
        <svg width="16" height="16" viewBox="0 0 32 32" className={className}>
            <path d="M16 23.41L4.29004 11.71L5.71004 10.29L16 20.59L26.29 10.29L27.71 11.71L16 23.41Z" />
        </svg>
    );
}

/**
 * Data grid 2 drop-down filter (com.mendix.widget.web.datagriddropdownfilter)
 * for Boolean and Enumeration attributes, with options taken from the
 * attribute's values, in its "select" form (not filterable).
 */
export function DropdownFilter({ name, className, emptySelectionCaption = "", emptyOptionCaption = "", clearable = true, multiSelect = false, ariaLabel }: DropdownFilterProps) {
    const { attribute, setCondition } = useColumnFilter("Drop-down filter");
    const [selected, setSelected] = useState<string[]>([]);

    const options: Option[] = (attribute?.universe ?? []).map(u => ({ value: String(u.value), caption: u.caption, raw: u.value }));
    const items: Option[] = multiSelect ? options : [{ value: NONE, caption: emptyOptionCaption }, ...options];

    const apply = (values: string[]) => {
        setSelected(values);
        if (!attribute) return;
        const chosen = options.filter(o => values.includes(o.value));
        setCondition(or(...chosen.map(o => compare(attribute.id, "equals", o.raw ?? o.value))));
    };

    const { isOpen, highlightedIndex, getToggleButtonProps, getMenuProps, getItemProps } = useSelect<Option>({
        items,
        itemToKey: item => item?.value,
        itemToString: item => item?.caption ?? "",
        selectedItem: multiSelect ? null : (options.find(o => o.value === selected[0]) ?? null),
        onSelectedItemChange: ({ selectedItem }) => {
            if (!selectedItem) return;
            if (selectedItem.value === NONE) apply([]);
            else if (multiSelect) apply(selected.includes(selectedItem.value) ? selected.filter(v => v !== selectedItem.value) : [...selected, selectedItem.value]);
            else apply([selectedItem.value]);
        }
    });
    const { refs, floatingStyles } = useFloating({
        open: isOpen,
        placement: "bottom-start",
        strategy: "fixed",
        middleware: [
            size({
                apply({ rects, elements }) {
                    Object.assign(elements.floating.style, { width: `${rects.reference.width}px` });
                }
            })
        ],
        whileElementsMounted: autoUpdate
    });

    const isEmpty = selected.length === 0;
    const value = isEmpty ? emptySelectionCaption : options.filter(o => selected.includes(o.value)).map(o => o.caption).join(", ");
    const stop = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") event.stopPropagation();
    };

    return (
        <div
            className={cx(cls(), "form-control", "variant-select", mxName(name), className)}
            data-expanded={isOpen}
            data-empty={isEmpty || undefined}
            {...getToggleButtonProps({ "aria-label": ariaLabel || "filter", ref: refs.setReference })}
        >
            <div className={cls("input-container")}>
                <span className={cls("toggle")}>{value}</span>
                <div className={cls("controls")}>
                    {clearable && !isEmpty && (
                        <button
                            className={cls("clear")}
                            aria-label="Clear selection"
                            onClick={(event: MouseEvent) => {
                                event.stopPropagation();
                                event.preventDefault();
                                apply([]);
                            }}
                            onKeyDown={stop}
                        >
                            <ClearIcon className={cls("clear-icon")} />
                        </button>
                    )}
                    <StateIcon className={cls("state-icon")} />
                </div>
            </div>
            <div className={cls("popover")} hidden={!isOpen} ref={refs.setFloating} style={floatingStyles}>
                <div className={cls("menu-slot")}>
                    <ul {...getMenuProps({ className: cls("menu"), "aria-label": ariaLabel ?? "" })}>
                        {isOpen &&
                            items.map((item, index) => {
                                const isSelected = selected.includes(item.value);
                                return (
                                    <li
                                        key={item.value || index}
                                        data-selected={isSelected || undefined}
                                        data-highlighted={highlightedIndex === index || undefined}
                                        className={cls("menu-item")}
                                        title={item.caption}
                                        {...getItemProps({ item, index, "aria-selected": isSelected, onClick: (e: MouseEvent) => e.stopPropagation() })}
                                    >
                                        {multiSelect && (
                                            <span className={cls("checkbox-slot")}>
                                                <input className={cls("checkbox")} role="presentation" type="checkbox" checked={isSelected} value={item.caption} onChange={() => undefined} tabIndex={-1} />
                                            </span>
                                        )}
                                        <span className={cls("menu-item-text")}>{item.caption || " "}</span>
                                    </li>
                                );
                            })}
                    </ul>
                </div>
            </div>
        </div>
    );
}
