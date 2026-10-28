"use client";

import { useEffect, useRef, useState } from "react";
import { compare, empty, notEmpty, type ComparisonOperator, type FilterCondition, type TextOperator } from "../../data/filters";
import { cx, mxName } from "../../util/cx";
import { useColumnFilter } from "../datagrid/context";
import { FilterSelector, type FilterOption } from "./FilterSelector";

export type TextFilterType = "contains" | "startsWith" | "endsWith" | "greater" | "greaterEqual" | "equal" | "notEqual" | "smaller" | "smallerEqual" | "empty" | "notEmpty";

const OPTIONS: Array<FilterOption<TextFilterType>> = [
    { value: "contains", label: "Contains" },
    { value: "startsWith", label: "Starts with" },
    { value: "endsWith", label: "Ends with" },
    { value: "greater", label: "Greater than" },
    { value: "greaterEqual", label: "Greater than or equal" },
    { value: "equal", label: "Equal" },
    { value: "notEqual", label: "Not equal" },
    { value: "smaller", label: "Smaller than" },
    { value: "smallerEqual", label: "Smaller than or equal" },
    { value: "empty", label: "Empty" },
    { value: "notEmpty", label: "Not empty" }
];

const toOperator: Record<Exclude<TextFilterType, "empty" | "notEmpty">, ComparisonOperator | TextOperator> = {
    contains: "contains",
    startsWith: "startsWith",
    endsWith: "endsWith",
    greater: "greater",
    greaterEqual: "greaterEqual",
    equal: "equals",
    notEqual: "notEqual",
    smaller: "smaller",
    smallerEqual: "smallerEqual"
};

export function textCondition(attr: string, type: TextFilterType, value: string): FilterCondition | undefined {
    if (type === "empty") return empty(attr);
    if (type === "notEmpty") return notEmpty(attr);
    if (!value) return undefined;
    return compare(attr, toOperator[type], value);
}

export interface TextFilterProps {
    name: string;
    className?: string;
    defaultFilter?: TextFilterType;
    adjustable?: boolean;
    placeholder?: string;
    /** Milliseconds to wait after typing before filtering. */
    delay?: number;
    screenReaderButtonCaption?: string;
    screenReaderInputCaption?: string;
}

/** Data grid 2 text filter (com.mendix.widget.web.datagridtextfilter). */
export function TextFilter({ name, className, defaultFilter = "contains", adjustable = true, placeholder, delay = 500, screenReaderButtonCaption, screenReaderInputCaption }: TextFilterProps) {
    const { attribute, setCondition } = useColumnFilter("Text filter");
    const [type, setType] = useState<TextFilterType>(defaultFilter);
    const [value, setValue] = useState("");
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const apply = (nextType: TextFilterType, nextValue: string) => {
        if (attribute) setCondition(textCondition(attribute.id, nextType, nextValue));
    };

    useEffect(() => () => clearTimeout(timer.current), []);

    const noInput = type === "empty" || type === "notEmpty";
    return (
        <div className={cx("filter-container", mxName(name), className)} data-focusindex={0}>
            {adjustable && (
                <FilterSelector
                    ariaLabel={screenReaderButtonCaption}
                    value={type}
                    options={OPTIONS}
                    onSelect={next => {
                        setType(next);
                        clearTimeout(timer.current);
                        apply(next, value);
                    }}
                />
            )}
            <input
                aria-label={screenReaderInputCaption || "filter"}
                className={cx("form-control", { "filter-input": adjustable })}
                disabled={noInput}
                placeholder={placeholder}
                value={value}
                type="text"
                onChange={event => {
                    const next = event.target.value;
                    setValue(next);
                    clearTimeout(timer.current);
                    timer.current = setTimeout(() => apply(type, next), delay);
                }}
            />
        </div>
    );
}
