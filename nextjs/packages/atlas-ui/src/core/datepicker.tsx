"use client";

import { autoUpdate, flip, shift, useDismiss, useFloating, useInteractions } from "@floating-ui/react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import { addDays, formatDate, getLocale, parseDate, startOfDay } from "../format";
import { cx } from "../util/cx";
import { useWidgetId } from "../util/useId";
import { FormGroup, useDataView } from "./form";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface CalendarProps {
    value: Date | null;
    onSelect: (date: Date) => void;
    firstDayOfWeek?: number;
    /** Placement and ref from the date picker, which positions the calendar itself. */
    style?: CSSProperties;
    calendarRef?: Ref<HTMLDivElement>;
}

/**
 * Mendix's month calendar, the .mx-calendar popup of the date picker, in the
 * runtime's markup: a month header with Atlas icons, a grid of days labelled
 * with their date, and a year switcher.
 */
export function Calendar({ value, onSelect, firstDayOfWeek = getLocale().firstDayOfWeek, style, calendarRef }: CalendarProps) {
    const id = useWidgetId("MonthDropDown");
    const [month, setMonth] = useState(() => {
        const base = value ?? new Date();
        return new Date(base.getFullYear(), base.getMonth(), 1);
    });
    const [monthMenu, setMonthMenu] = useState(false);
    const selected = value ? startOfDay(value).getTime() : undefined;

    const weeks = useMemo(() => {
        const lead = (month.getDay() - firstDayOfWeek + 7) % 7;
        const first = addDays(month, -lead);
        const rows: Date[][] = [];
        for (let w = 0; w < 6; w++) rows.push(Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)));
        return rows;
    }, [month, firstDayOfWeek]);

    const shiftMonth = (by: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));
    const year = month.getFullYear();
    const monthName = MONTHS[month.getMonth()];

    return (
        <div ref={calendarRef} className="mx-calendar" role="presentation" style={style}>
            <div className="mx-calendar-month-header" aria-hidden="true">
                <button className="mx-calendar-month-previous" tabIndex={-1} onClick={() => shiftMonth(-1)}>
                    <span className="mx-icon-filled mx-icon-substract" aria-hidden="true" />
                </button>
                <div
                    id={id}
                    className="mx-calendar-month-dropdown"
                    role="button"
                    tabIndex={-1}
                    aria-haspopup="true"
                    aria-expanded={monthMenu}
                    aria-owns={`${id}_mdd`}
                    onClick={() => setMonthMenu(open => !open)}
                >
                    <div className="mx-calendar-month-current">
                        <div className="mx-calendar-month-spacer" aria-hidden="true">
                            {MONTHS.map(m => (
                                <div key={m}>{m}</div>
                            ))}
                        </div>
                        <div className="mx-calendar-month-label">{monthName}</div>
                    </div>
                    <span className="mx-icon-filled mx-icon-chevron-down" aria-hidden="true" />
                    {monthMenu && (
                        <div id={`${id}_mdd`} className="mx-calendar-month-dropdown-options" role="listbox">
                            {MONTHS.map((m, i) => (
                                <div
                                    key={m}
                                    role="option"
                                    tabIndex={0}
                                    aria-selected={i === month.getMonth()}
                                    onClick={event => {
                                        event.stopPropagation();
                                        setMonth(new Date(year, i, 1));
                                        setMonthMenu(false);
                                    }}
                                >
                                    {m}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <button className="mx-calendar-month-next" tabIndex={-1} onClick={() => shiftMonth(1)}>
                    <span className="mx-icon-filled mx-icon-add" aria-hidden="true" />
                </button>
            </div>
            <table role="grid" summary={monthName}>
                <thead>
                    <tr role="row">
                        {Array.from({ length: 7 }, (_, i) => {
                            const day = WEEKDAYS[(i + firstDayOfWeek) % 7];
                            return (
                                <th key={day} role="columnheader" scope="col" title={day}>
                                    {day.slice(0, 3)}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {weeks.map((week, w) => (
                        <tr key={w} role="row">
                            {week.map(day => {
                                const time = day.getTime();
                                const isSelected = time === selected;
                                const place = day.getMonth() === month.getMonth() ? "current" : day < month ? "previous" : "next";
                                return (
                                    <td
                                        key={time}
                                        role="gridcell"
                                        aria-label={formatDate(day)}
                                        aria-selected={isSelected}
                                        tabIndex={isSelected ? 0 : -1}
                                        className={cx(`mx-calendar-day-month-${place}`, { "mx-calendar-day-selected": isSelected, "mx-calendar-day-active": isSelected })}
                                        onClick={() => onSelect(day)}
                                    >
                                        {day.getDate()}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="mx-calendar-year-switcher" role="presentation">
                <span className="mx-calendar-year-previous" tabIndex={-1} onClick={() => setMonth(new Date(year - 1, month.getMonth(), 1))}>
                    {year - 1}
                </span>
                <span className="mx-calendar-year-selected" tabIndex={-1}>
                    {year}
                </span>
                <span className="mx-calendar-year-next" tabIndex={-1} onClick={() => setMonth(new Date(year + 1, month.getMonth(), 1))}>
                    {year + 1}
                </span>
            </div>
        </div>
    );
}

export interface DatePickerProps {
    name: string;
    label?: ReactNode;
    className?: string;
    value: Date | null;
    onChange?: (value: Date | null) => void;
    editable?: boolean;
    error?: ReactNode;
    placeholder?: string;
}

/** Mendix's date picker: a text input in the locale's date pattern plus a calendar button. */
export function DatePicker(props: DatePickerProps) {
    const id = useWidgetId("datePicker");
    const dataView = useDataView();
    const editable = props.editable ?? dataView.editable;
    const [text, setText] = useState(() => formatDate(props.value));
    const [parseError, setParseError] = useState(false);
    const [open, setOpen] = useState(false);

    // Follow outside changes of the value (calendar picks, a reset form).
    useEffect(() => {
        setText(formatDate(props.value));
        setParseError(false);
    }, [props.value]);

    // Mendix opens the calendar right under the input (not the button), at
    // unrounded coordinates set as left and top.
    const { refs, x, y, strategy, context } = useFloating({
        open,
        onOpenChange: setOpen,
        placement: "bottom-start",
        strategy: "fixed",
        middleware: [flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate
    });
    const { getReferenceProps } = useInteractions([useDismiss(context)]);

    const commit = () => {
        if (!text.trim()) {
            setParseError(false);
            if (props.value !== null) props.onChange?.(null);
            return;
        }
        const parsed = parseDate(text);
        if (!parsed) {
            setParseError(true);
            return;
        }
        setParseError(false);
        setText(formatDate(parsed));
        if (!props.value || startOfDay(props.value).getTime() !== parsed.getTime()) props.onChange?.(parsed);
    };

    const error = parseError ? getLocale().texts.invalidDate : props.error;
    return (
        <FormGroup name={props.name} widgetClass="mx-datepicker" className={props.className} label={props.label} labelFor={id} labelId={`${id}-label`} error={error} errorId={`${id}-error`}>
            <div className="mx-compound-control" ref={refs.setReference} {...getReferenceProps()}>
                <input
                    ref={refs.setPositionReference}
                    id={id}
                    type="text"
                    className="form-control"
                    value={text}
                    // Mendix shows the date pattern, lower-cased: m/d/yyyy.
                    placeholder={props.placeholder ?? getLocale().patterns.date.toLowerCase()}
                    readOnly={!editable}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-error` : undefined}
                    onChange={event => setText(event.target.value)}
                    onBlur={commit}
                    onKeyDown={event => {
                        if (event.key === "Enter") commit();
                    }}
                />
                {editable && (
                    <button type="button" className="btn mx-button" aria-label="Show date picker" tabIndex={-1} onClick={() => setOpen(o => !o)}>
                        <span className="mx-icon-filled mx-icon-calendar" />
                    </button>
                )}
            </div>
            {open &&
                // The theme gives .mx-calendar its z-index; Mendix wraps it in a display: contents focus container.
                createPortal(
                    <div data-focuscontainer={id} style={{ display: "contents" }}>
                        <Calendar
                            calendarRef={refs.setFloating}
                            style={{ position: strategy, left: x, top: y }}
                            value={props.value}
                            onSelect={day => {
                                setOpen(false);
                                setParseError(false);
                                setText(formatDate(day));
                                props.onChange?.(day);
                            }}
                        />
                    </div>,
                    document.body
                )}
        </FormGroup>
    );
}
