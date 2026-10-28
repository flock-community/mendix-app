type ClassValue = string | false | null | undefined | Record<string, boolean | undefined | null>;

/** Joins class names, skipping falsy ones; objects contribute their truthy keys. */
export function cx(...values: ClassValue[]): string {
    const out: string[] = [];
    for (const value of values) {
        if (!value) continue;
        if (typeof value === "string") {
            out.push(value);
        } else {
            for (const [name, on] of Object.entries(value)) if (on) out.push(name);
        }
    }
    return out.join(" ");
}

/** The class Mendix puts on every named widget: `mx-name-<name>`. */
export function mxName(name: string | undefined): string | undefined {
    return name ? `mx-name-${name}` : undefined;
}
