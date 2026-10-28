"use client";

import { autoUpdate, flip, offset, shift, useDismiss, useFloating, useInteractions, FloatingPortal } from "@floating-ui/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { addDays, formatDate, getLocale, parseDate, startOfDay } from "../format";
import { cx } from "../util/cx";
import { useWidgetId } from "../util/useId";
import { FormGroup, useDataView } from "./form";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export interface CalendarProps {
    value: Date | null;
    onSelect: (date: Date) => void;
    firstDayOfWeek?: number;
}

/** Mendix's month calendar (the .mx-calendar popup of the date picker). */
export function Calendar({ value, onSelect, firstDayOfWeek = getLocale().firstDayOfWeek }: CalendarProps) {
    const [month, setMonth] = useState(() => {
        const base = value ?? new Date();
        return new Date(base.getFullYear(), base.getMonth(), 1);
    });
    const [monthMenu, setMonthMenu] = useState(false);
    const selected = value ? startOfDay(value).getTime() : undefined;
    const today = startOfDay(new Date()).getTime();

    const weeks = useMemo(() => {
        const lead = (month.getDay() - firstDayOfWeek + 7) % 7;
        const first = addDays(month, -lead);
        const rows: Date[][] = [];
        for (let w = 0; w < 6; w++) rows.push(Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)));
        return rows;
    }, [month, firstDayOfWeek]);

    const shiftMonth = (by: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));
    const year = month.getFullYear();

    return (
        <div className="mx-calendar" role="dialog" aria-label={`${MONTHS[month.getMonth()]} ${year}`}>
            <div className="mx-calendar-month-header">
                <button type="button" className="mx-calendar-month-previous" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
                    <span className="glyphicon glyphicon-chevron-left" aria-hidden="true" />
                </button>
                <div className="mx-calendar-month-dropdown" role="button" tabIndex={0} aria-haspopup="listbox" onClick={() => setMonthMenu(open => !open)}>
                    <span className="mx-calendar-month-current">{MONTHS[month.getMonth()]}</span>
                    <span className="glyphicon glyphicon-chevron-down" aria-hidden="true" />
                    <div className="mx-calendar-month-spacer" aria-hidden="true">
                        {MONTHS.map(m => (
                            <div key={m}>{m}</div>
                        ))}
                    </div>
                    {monthMenu && (
                        <div className="mx-calendar-month-dropdown-options" role="listbox">
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
                <button type="button" className="mx-calendar-month-next" aria-label="Next month" onClick={() => shiftMonth(1)}>
                    <span className="glyphicon glyphicon-chevron-right" aria-hidden="true" />
                </button>
            </div>
            <table role="grid">
                <thead>
                    <tr>
                        {Array.from({ length: 7 }, (_, i) => (
                            <th key={i} scope="col">
                                {WEEKDAYS[(i + firstDayOfWeek) % 7]}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {weeks.map((week, w) => (
                        <tr key={w}>
                            {week.map(day => {
                                const time = day.getTime();
                                const outside = day.getMonth() !== month.getMonth();
                                return (
                                    <td
                                        key={time}
                                        role="gridcell"
                                        aria-selected={time === selected}
                                        className={cx({
                                            "mx-calendar-day-month-previous": outside && day < month,
                                            "mx-calendar-day-month-next": outside && day > month,
                                            "mx-calendar-day-selected": time === selected,
                                            "mx-calendar-day-today": time === today
                                        })}
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
            <div className="mx-calendar-year-switcher">
                <span role="button" tabIndex={0} onClick={() => setMonth(new Date(year - 1, month.getMonth(), 1))}>
                    {year - 1}
                </span>
                <span className="mx-calendar-year-selected">{year}</span>
                <span role="button" tabIndex={0} onClick={() => setMonth(new Date(year + 1, month.getMonth(), 1))}>
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

    const { refs, floatingStyles, context } = useFloating({
        open,
        onOpenChange: setOpen,
        placement: "bottom-start",
        strategy: "fixed",
        middleware: [offset(4), flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate
    });
    const { getReferenceProps, getFloatingProps } = useInteractions([useDismiss(context)]);

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
            {open && (
                <FloatingPortal>
                    <div ref={refs.setFloating} style={{ ...floatingStyles, zIndex: 10010 }} {...getFloatingProps()}>
                        <Calendar
                            value={props.value}
                            onSelect={day => {
                                setOpen(false);
                                setParseError(false);
                                setText(formatDate(day));
                                props.onChange?.(day);
                            }}
                        />
                    </div>
                </FloatingPortal>
            )}
        </FormGroup>
    );
}
