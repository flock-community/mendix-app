"use client";

import { autoUpdate, useFloating } from "@floating-ui/react";
import { useSelect } from "downshift";
import { cx } from "../../util/cx";

export interface FilterOption<V extends string> {
    value: V;
    label: string;
}

/** The operator button of the text, number and date filters, with its list of operators. */
export function FilterSelector<V extends string>({ value, options, onSelect, ariaLabel }: { value: V; options: Array<FilterOption<V>>; onSelect(value: V): void; ariaLabel?: string }) {
    const selected = options.find(o => o.value === value) ?? null;
    const label = ariaLabel || "Select filter type";
    const { isOpen, getToggleButtonProps, getMenuProps, getItemProps, highlightedIndex } = useSelect({
        items: options,
        selectedItem: selected,
        itemToString: item => item?.label ?? "",
        onSelectedItemChange: ({ selectedItem }) => {
            if (selectedItem) onSelect(selectedItem.value);
        }
    });
    const { refs, floatingStyles } = useFloating({ open: isOpen, placement: "bottom-start", strategy: "fixed", whileElementsMounted: autoUpdate });

    return (
        <div className="filter-selector">
            <div className="filter-selector-content">
                <button
                    className={cx("btn btn-default filter-selector-button button-icon", value)}
                    {...getToggleButtonProps({
                        "aria-label": selected?.label || label,
                        ref: refs.setReference,
                        onKeyDown: event => {
                            if (event.key === "Backspace" || event.key === "Delete") onSelect(options[0].value);
                        }
                    })}
                >
                    {" "}
                </button>
                <ul className={cx("filter-selectors", { hidden: !isOpen, visible: isOpen })} {...getMenuProps({ "aria-label": label, ref: refs.setFloating })} style={floatingStyles}>
                    {isOpen &&
                        options.map((option, index) => (
                            <li
                                key={option.value}
                                className={cx("filter-listitem", { "filter-selected": option.value === value, "filter-highlighted": highlightedIndex === index })}
                                {...getItemProps({ item: option, index })}
                            >
                                <div className={cx("filter-icon", option.value)} aria-hidden={true} />
                                <div className="filter-label">{option.label}</div>
                            </li>
                        ))}
                </ul>
            </div>
        </div>
    );
}
