"use client";

import { autoUpdate, flip, size, useFloating } from "@floating-ui/react";
import { useCombobox } from "downshift";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { FormGroup, useDataView } from "../core/form";
import { cx } from "../util/cx";
import { useWidgetId } from "../util/useId";

export interface ComboboxOption {
    value: string;
    caption: string;
}

export interface ComboboxProps {
    name: string;
    label?: ReactNode;
    className?: string;
    /** The selected value, or null for none. */
    value: string | null;
    /** The values to choose from, e.g. an enumeration in model order. */
    options: ComboboxOption[];
    onChange?: (value: string | null) => void;
    clearable?: boolean;
    editable?: boolean;
    readOnlyStyle?: "bordered" | "text";
    filterType?: "contains" | "startsWith" | "none";
    noOptionsText?: string;
    ariaLabel?: string;
    clearButtonAriaLabel?: string;
    error?: ReactNode;
}

function CaptionText({ children }: { children: ReactNode }) {
    return <span className="widget-combobox-caption-text">{children}</span>;
}

function ClearIcon() {
    return (
        <span className="widget-combobox-icon-container">
            <svg width={14} height={14} viewBox="0 0 32 32" className="widget-combobox-clear-button-icon">
                <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="currentColor"
                    d="M27.71 5.71004L26.29 4.29004L16 14.59L5.71004 4.29004L4.29004 5.71004L14.59 16L4.29004 26.29L5.71004 27.71L16 17.41L26.29 27.71L27.71 26.29L17.41 16L27.71 5.71004Z"
                />
            </svg>
        </span>
    );
}

function DownArrow({ isOpen }: { isOpen: boolean }) {
    return (
        <span className="widget-combobox-icon-container">
            <svg className={cx("widget-combobox-down-arrow-icon", "mx-icon-lined", "mx-icon-chevron-down", { active: isOpen })} width="16" height="16" viewBox="0 0 32 32">
                <path d="M16 23.41L4.29004 11.71L5.71004 10.29L16 20.59L26.29 10.29L27.71 11.71L16 23.41Z" />
            </svg>
        </span>
    );
}

/** The Combo box widget (com.mendix.widget.web.combobox) in its single-selection form. */
export function Combobox(props: ComboboxProps) {
    const { options, value, clearable = true, filterType = "contains", readOnlyStyle = "bordered" } = props;
    const id = useWidgetId("comboBox");
    const dataView = useDataView();
    const readOnly = !(props.editable ?? dataView.editable);
    const inputRef = useRef<HTMLInputElement>(null);
    const captionOf = (v: string | null) => options.find(o => o.value === v)?.caption ?? "";
    const [filter, setFilter] = useState("");

    const shown = useMemo(() => {
        const term = filter.trim().toLowerCase();
        if (!term || filterType === "none") return options;
        return options.filter(o => (filterType === "startsWith" ? o.caption.toLowerCase().startsWith(term) : o.caption.toLowerCase().includes(term)));
    }, [options, filter, filterType]);

    const selectedItem = options.find(o => o.value === value) ?? null;
    const { isOpen, highlightedIndex, getToggleButtonProps, getMenuProps, getItemProps, getInputProps, closeMenu } = useCombobox<ComboboxOption>({
        items: shown,
        itemToString: item => item?.caption ?? "",
        selectedItem,
        inputId: `${id}-input`,
        labelId: `${id}-label`,
        defaultHighlightedIndex: 0,
        initialInputValue: captionOf(value),
        onInputValueChange: ({ inputValue, type }) => {
            if (type === useCombobox.stateChangeTypes.InputChange) setFilter(inputValue ?? "");
        },
        onSelectedItemChange: ({ selectedItem: item }) => {
            setFilter("");
            props.onChange?.(item ? item.value : null);
        },
        stateReducer(state, { changes, type }) {
            switch (type) {
                case useCombobox.stateChangeTypes.ToggleButtonClick:
                case useCombobox.stateChangeTypes.InputClick:
                    // Opening clears the input, so every option shows; the current one stays as placeholder.
                    return { ...changes, inputValue: changes.isOpen ? "" : captionOf(value), highlightedIndex: changes.isOpen && selectedItem ? -1 : changes.highlightedIndex };
                case useCombobox.stateChangeTypes.ControlledPropUpdatedSelectedItem:
                    return { ...changes, inputValue: captionOf(changes.selectedItem?.value ?? null) };
                case useCombobox.stateChangeTypes.InputKeyDownEscape:
                case useCombobox.stateChangeTypes.FunctionCloseMenu:
                    // Escape closes the menu; it never clears the value.
                    setFilter("");
                    return { ...changes, selectedItem: state.selectedItem, isOpen: false, inputValue: captionOf(value) };
                case useCombobox.stateChangeTypes.InputBlur:
                    // Leaving the field keeps the value: no selecting the highlighted option on blur.
                    setFilter("");
                    return { ...state, isOpen: false, inputValue: captionOf(value) };
                default:
                    return changes;
            }
        }
    });

    const { refs, floatingStyles } = useFloating({
        open: isOpen,
        placement: "bottom-start",
        strategy: "fixed",
        middleware: [
            flip(),
            size({
                apply({ rects, elements }) {
                    Object.assign(elements.floating.style, { width: `${rects.reference.width}px` });
                }
            })
        ],
        whileElementsMounted: autoUpdate
    });

    const toggle = getToggleButtonProps({ disabled: readOnly });
    const showText = readOnly && readOnlyStyle === "text";

    return (
        <FormGroup name={props.name} widgetClass="" className={props.className} label={props.label} labelFor={`${id}-input`} labelId={`${id}-label`}>
            <div className="widget-combobox">
                <div
                    ref={refs.setReference}
                    tabIndex={-1}
                    className={cx("widget-combobox-input-container", {
                        "widget-combobox-input-container-active": isOpen,
                        "widget-combobox-input-container-disabled": readOnly,
                        "form-control-static": showText,
                        "form-control": !showText
                    })}
                    id={toggle.id}
                    onClick={toggle.onClick}
                >
                    <div className="widget-combobox-selected-items">
                        <input
                            className={cx("widget-combobox-input", { "widget-combobox-input-nofilter": filterType === "none" })}
                            {...getInputProps({
                                // The input sits inside the toggle; its own click toggles the menu, not both.
                                onClick: event => event.stopPropagation(),
                                disabled: readOnly,
                                readOnly: filterType === "none",
                                ref: inputRef,
                                "aria-label": props.label ? undefined : props.ariaLabel
                            })}
                            placeholder=" "
                        />
                        <div className={cx("widget-combobox-placeholder-text", { "widget-combobox-placeholder-empty": !selectedItem })}>{selectedItem && <CaptionText>{selectedItem.caption}</CaptionText>}</div>
                    </div>
                    {!readOnly && clearable && selectedItem && (
                        <button
                            className="widget-combobox-clear-button"
                            aria-label={props.clearButtonAriaLabel ?? "Clear selection"}
                            onClick={event => {
                                event.stopPropagation();
                                inputRef.current?.focus();
                                props.onChange?.(null);
                                closeMenu();
                            }}
                        >
                            <ClearIcon />
                        </button>
                    )}
                    {!showText && (
                        <div className="widget-combobox-down-arrow">
                            <DownArrow isOpen={isOpen} />
                        </div>
                    )}
                </div>
                {props.error ? (
                    <div className="alert alert-danger mx-validation-message" role="alert">
                        {props.error}
                    </div>
                ) : null}
                <div ref={refs.setFloating} className={cx("widget-combobox-menu", { "widget-combobox-menu-hidden": !isOpen })} style={isOpen ? floatingStyles : { visibility: "hidden", position: "fixed" }}>
                    <ul className="widget-combobox-menu-list" {...getMenuProps({ onMouseDown: e => e.preventDefault() }, { suppressRefError: true })}>
                        {isOpen &&
                            (shown.length === 0 ? (
                                <li className="widget-combobox-item widget-combobox-no-options" role="option" aria-selected={false}>
                                    {props.noOptionsText ?? ""}
                                </li>
                            ) : (
                                shown.map((option, index) => (
                                    <li
                                        key={option.value}
                                        className={cx("widget-combobox-item", {
                                            "widget-combobox-item-selected": option.value === value,
                                            "widget-combobox-item-highlighted": highlightedIndex === index
                                        })}
                                        {...getItemProps({ item: option, index })}
                                        aria-selected={option.value === value}
                                    >
                                        <CaptionText>{option.caption}</CaptionText>
                                    </li>
                                ))
                            ))}
                    </ul>
                </div>
            </div>
        </FormGroup>
    );
}
