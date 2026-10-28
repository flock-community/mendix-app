"use client";

import { useRef, useState, type ComponentType } from "react";
import ReactDatePickerComponent from "react-datepicker";

// react-datepicker's props are a union over its single/range/multiple modes; both uses below are plain.
const ReactDatePicker = ReactDatePickerComponent as unknown as ComponentType<Record<string, unknown>>;
import { and, compare, empty, notEmpty, or, type FilterCondition } from "../../data/filters";
import { addDays, getLocale, startOfDay } from "../../format";
import { cx, mxName } from "../../util/cx";
import { useWidgetId } from "../../util/useId";
import { useColumnFilter } from "../datagrid/context";
import { FilterSelector, type FilterOption } from "./FilterSelector";

export type DateFilterType = "between" | "greater" | "greaterEqual" | "equal" | "notEqual" | "smaller" | "smallerEqual" | "empty" | "notEmpty";

const OPTIONS: Array<FilterOption<DateFilterType>> = [
    { value: "between", label: "Between" },
    { value: "greater", label: "Greater than" },
    { value: "greaterEqual", label: "Greater than or equal" },
    { value: "equal", label: "Equal" },
    { value: "notEqual", label: "Not equal" },
    { value: "smaller", label: "Smaller than" },
    { value: "smallerEqual", label: "Smaller than or equal" },
    { value: "empty", label: "Empty" },
    { value: "notEmpty", label: "Not empty" }
];

/**
 * Day comparisons, resolved here in the browser's time zone into instant
 * comparisons (Mendix's dayEquals, dayGreaterThan, … do the same server-side
 * with the session's time zone).
 */
export function dateCondition(attr: string, type: DateFilterType, value: Date | null, end: Date | null = null): FilterCondition | undefined {
    if (type === "empty") return empty(attr);
    if (type === "notEmpty") return notEmpty(attr);
    if (!value) return undefined;
    const day = startOfDay(value).toISOString();
    const nextDay = addDays(startOfDay(value), 1).toISOString();
    switch (type) {
        case "equal":
            return and(compare(attr, "greaterEqual", day), compare(attr, "smaller", nextDay));
        case "notEqual":
            return or(compare(attr, "smaller", day), compare(attr, "greaterEqual", nextDay));
        case "greater":
            return compare(attr, "greaterEqual", nextDay);
        case "greaterEqual":
            return compare(attr, "greaterEqual", day);
        case "smaller":
            return compare(attr, "smaller", day);
        case "smallerEqual":
            return compare(attr, "smaller", nextDay);
        case "between":
            if (!end) return undefined;
            return and(compare(attr, "greaterEqual", day), compare(attr, "smaller", addDays(startOfDay(end), 1).toISOString()));
    }
}

function CalendarIcon() {
    return (
        <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
            <path
                fill="currentColor"
                d="M27,5h-3V3h-4v2H12V3h-4v2h-3c-.55,0-1,.45-1,1V28c0,.55,.45,1,1,1H27c.55,0,1-.45,1-1V6c0-.55-.45-1-1-1ZM12,23h-4v-2h4v2Zm0-5h-4v-2h4v2Zm6,5h-4v-2h4v2Zm0-5h-4v-2h4v2Zm6,0h-4v-2h4v2Zm0-5H8v-2H24v2Z"
            />
        </svg>
    );
}

export interface DateFilterProps {
    name: string;
    className?: string;
    defaultFilter?: DateFilterType;
    adjustable?: boolean;
    placeholder?: string;
    screenReaderButtonCaption?: string;
    screenReaderCalendarCaption?: string;
    screenReaderInputCaption?: string;
}

/** Data grid 2 date filter (com.mendix.widget.web.datagriddatefilter), on react-datepicker like the original. */
export function DateFilter({ name, className, defaultFilter = "equal", adjustable = true, placeholder, screenReaderButtonCaption, screenReaderCalendarCaption, screenReaderInputCaption }: DateFilterProps) {
    const { attribute, setCondition } = useColumnFilter("Date filter");
    const id = useWidgetId("DateFilter");
    const [portalId] = useState(() => `datepicker_${Math.random()}`);
    const [type, setType] = useState<DateFilterType>(defaultFilter);
    const [value, setValue] = useState<Date | null>(null);
    const [range, setRange] = useState<[Date | null, Date | null]>([null, null]);
    const [open, setOpen] = useState(false);
    const picker = useRef<ReactDatePickerComponent>(null);
    const locale = getLocale();

    const apply = (nextType: DateFilterType, nextValue: Date | null, nextRange = range) => {
        if (!attribute) return;
        setCondition(nextType === "between" ? dateCondition(attribute.id, "between", nextRange[0], nextRange[1]) : dateCondition(attribute.id, nextType, nextValue));
    };

    const selectsRange = type === "between";
    const common = {
        allowSameDay: false,
        ariaLabelledBy: `${id}-label`,
        autoFocus: false,
        calendarStartDay: locale.firstDayOfWeek,
        className: cx("form-control", { "filter-input": adjustable }),
        dateFormat: locale.patterns.date,
        disabled: type === "empty" || type === "notEmpty",
        dropdownMode: "select" as const,
        enableTabLoop: true,
        open,
        onClickOutside: () => setOpen(false),
        onInputClick: () => undefined,
        placeholderText: placeholder,
        popperPlacement: "bottom-start" as const,
        popperProps: { strategy: "fixed" as const },
        portalId,
        ref: picker,
        shouldCloseOnSelect: false,
        showMonthDropdown: true,
        showPopperArrow: false,
        showYearDropdown: true,
        strictParsing: true,
        useWeekdaysShort: false
    };

    return (
        <div className={cx("filter-container", mxName(name), className)} data-focusindex={0}>
            {adjustable && (
                <FilterSelector
                    ariaLabel={screenReaderButtonCaption ?? "Select filter type"}
                    value={type}
                    options={OPTIONS}
                    onSelect={next => {
                        setType(next);
                        apply(next, value);
                    }}
                />
            )}
            <div id={portalId} className="date-filter-container" />
            <span className="sr-only" id={`${id}-label`}>
                {screenReaderInputCaption || "date filter"}
            </span>
            {selectsRange ? (
                <ReactDatePicker
                    {...common}
                    selectsRange
                    isClearable
                    startDate={range[0] ?? undefined}
                    endDate={range[1] ?? undefined}
                    onChange={(dates: [Date | null, Date | null]) => {
                        setRange(dates);
                        apply("between", null, dates);
                    }}
                />
            ) : (
                <ReactDatePicker
                    {...common}
                    selected={value}
                    onChange={(date: Date | null) => {
                        setValue(date);
                        apply(type, date);
                    }}
                />
            )}
            <button
                aria-controls={portalId}
                aria-expanded={open}
                aria-haspopup={true}
                aria-label={screenReaderCalendarCaption || "Show calendar"}
                className="btn btn-default btn-calendar"
                onMouseDown={event => {
                    event.preventDefault();
                    setOpen(o => !o);
                }}
                onKeyDown={event => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setOpen(o => !o);
                    }
                }}
            >
                <CalendarIcon />
            </button>
        </div>
    );
}
