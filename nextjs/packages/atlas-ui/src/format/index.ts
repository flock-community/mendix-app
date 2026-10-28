import { format as formatWithPattern, isValid, parse } from "date-fns";

/**
 * The locale settings the Mendix client formats values with. The default is
 * what Mendix uses for en_US (the same fallback its pluggable widgets carry).
 */
export interface MendixLocale {
    languageTag: string;
    code: string;
    firstDayOfWeek: number;
    patterns: { date: string; datetime: string; time: string };
    texts: { yes: string; no: string; invalidDate: string };
}

export const enUS: MendixLocale = {
    languageTag: "en-US",
    code: "en_US",
    firstDayOfWeek: 0,
    patterns: { date: "M/d/yyyy", datetime: "M/d/yyyy, h:mm a", time: "h:mm a" },
    texts: { yes: "Yes", no: "No", invalidDate: "Invalid date" }
};

let current: MendixLocale = enUS;

export function setLocale(locale: MendixLocale): void {
    current = locale;
}

export function getLocale(): MendixLocale {
    return current;
}

export type DateKind = "date" | "datetime" | "time";

/** Formats a date the way an attribute's displayValue reads in Mendix. */
export function formatDate(value: Date | string | null | undefined, kind: DateKind = "date", locale = current): string {
    if (value === null || value === undefined || value === "") return "";
    const date = typeof value === "string" ? new Date(value) : value;
    if (!isValid(date)) return "";
    return formatWithPattern(date, locale.patterns[kind]);
}

/** Parses user input in the locale's date pattern; undefined when it is not a date. */
export function parseDate(text: string, kind: DateKind = "date", locale = current): Date | undefined {
    const trimmed = text.trim();
    if (!trimmed) return undefined;
    const parsed = parse(trimmed, locale.patterns[kind], new Date());
    return isValid(parsed) ? parsed : undefined;
}

export function formatBoolean(value: boolean | null | undefined, locale = current): string {
    if (value === null || value === undefined) return "";
    return value ? locale.texts.yes : locale.texts.no;
}

/** Midnight at the start of the given date's day, in the browser's time zone. */
export function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
