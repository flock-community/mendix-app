/**
 * Filter conditions, modelled on mendix/filters/builders: what the grid's
 * filter widgets produce and what a list data source sends to the server.
 * Plain JSON, so it crosses the wire as is; compile it with `conditionToSql`.
 *
 * Day comparisons ("due on 3/14") depend on the user's time zone, so the
 * filter widgets resolve them in the browser into instant ranges before
 * sending; the server only ever compares instants.
 */
export type ComparisonOperator = "equals" | "notEqual" | "greater" | "greaterEqual" | "smaller" | "smallerEqual";
export type TextOperator = "contains" | "startsWith" | "endsWith";

export type FilterValue = string | number | boolean | null;

export type GroupCondition = { op: "and" | "or"; args: FilterCondition[] };
export type ValueCondition = { op: ComparisonOperator | TextOperator; attr: string; value: FilterValue };
export type PresenceCondition = { op: "empty" | "notEmpty"; attr: string };
export type FilterCondition = GroupCondition | ValueCondition | PresenceCondition;

function isGroup(c: FilterCondition): c is GroupCondition {
    return c.op === "and" || c.op === "or";
}

function isPresence(c: FilterCondition): c is PresenceCondition {
    return c.op === "empty" || c.op === "notEmpty";
}

export const and = (...args: Array<FilterCondition | undefined>): FilterCondition | undefined => combine("and", args);
export const or = (...args: Array<FilterCondition | undefined>): FilterCondition | undefined => combine("or", args);

function combine(op: "and" | "or", args: Array<FilterCondition | undefined>): FilterCondition | undefined {
    const present = args.filter((a): a is FilterCondition => a !== undefined);
    if (present.length === 0) return undefined;
    if (present.length === 1) return present[0];
    return { op, args: present };
}

export const compare = (attr: string, op: ComparisonOperator | TextOperator, value: FilterValue): FilterCondition => ({ op, attr, value });
export const empty = (attr: string): FilterCondition => ({ op: "empty", attr });
export const notEmpty = (attr: string): FilterCondition => ({ op: "notEmpty", attr });

// ---------------------------------------------------------------------------
// Server side
// ---------------------------------------------------------------------------

export type AttributeKind = "string" | "boolean" | "enum" | "datetime" | "number";

/** Maps an attribute name the client may filter on to a column the server owns. */
export type AttributeColumns = Record<string, { column: string; kind: AttributeKind }>;

export class FilterError extends Error {}

const sqlOperators: Record<ComparisonOperator, string> = {
    equals: "=",
    notEqual: "<>",
    greater: ">",
    greaterEqual: ">=",
    smaller: "<",
    smallerEqual: "<="
};

function escapeLike(text: string): string {
    return text.replace(/[\\%_]/g, ch => `\\${ch}`);
}

/**
 * Compiles a condition into a parameterised SQL expression. Only attributes
 * listed in `columns` are accepted, and every value is a bound parameter, so
 * the client never contributes SQL text.
 */
export function conditionToSql(
    condition: FilterCondition | undefined,
    columns: AttributeColumns,
    toParam: (kind: AttributeKind, value: FilterValue) => unknown = defaultParam
): { sql: string; params: unknown[] } {
    const params: unknown[] = [];
    const walk = (c: FilterCondition, depth: number): string => {
        if (depth > 16) throw new FilterError("Filter is nested too deeply");
        if (isGroup(c)) {
            if (!Array.isArray(c.args) || c.args.length === 0) throw new FilterError("Empty filter group");
            return `(${c.args.map(a => walk(a, depth + 1)).join(c.op === "and" ? " AND " : " OR ")})`;
        }
        const target = Object.prototype.hasOwnProperty.call(columns, c.attr) ? columns[c.attr] : undefined;
        if (!target) throw new FilterError(`Cannot filter on ${String(c.attr)}`);
        const col = target.column;
        if (isPresence(c)) {
            if (c.op === "empty") return target.kind === "string" ? `(${col} IS NULL OR ${col} = '')` : `${col} IS NULL`;
            return target.kind === "string" ? `(${col} IS NOT NULL AND ${col} <> '')` : `${col} IS NOT NULL`;
        }
        switch (c.op) {
            case "contains":
            case "startsWith":
            case "endsWith": {
                if (target.kind !== "string") throw new FilterError(`${c.op} needs a string attribute`);
                const text = escapeLike(String(c.value ?? ""));
                params.push(c.op === "contains" ? `%${text}%` : c.op === "startsWith" ? `${text}%` : `%${text}`);
                return `${col} LIKE ? ESCAPE '\\'`;
            }
            default: {
                const operator = sqlOperators[c.op as ComparisonOperator];
                if (!operator) throw new FilterError(`Unknown operator ${String(c.op)}`);
                if (c.value === null) return c.op === "notEqual" ? `${col} IS NOT NULL` : `${col} IS NULL`;
                params.push(toParam(target.kind, c.value));
                // Strings compare case-insensitively in Mendix.
                return target.kind === "string" ? `${col} ${operator} ? COLLATE NOCASE` : `${col} ${operator} ?`;
            }
        }
    };
    if (!condition) return { sql: "1 = 1", params };
    return { sql: walk(condition, 0), params };
}

function defaultParam(kind: AttributeKind, value: FilterValue): unknown {
    if (kind === "boolean") return value === true || value === "true" ? 1 : 0;
    if (kind === "datetime") {
        const time = typeof value === "number" ? value : Date.parse(String(value));
        if (Number.isNaN(time)) throw new FilterError("Not a date");
        return time;
    }
    if (kind === "number") {
        const n = Number(value);
        if (Number.isNaN(n)) throw new FilterError("Not a number");
        return n;
    }
    return String(value);
}
