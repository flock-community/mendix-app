import { useId } from "react";

/** A DOM-safe id, prefixed the way Mendix prefixes its widget ids. */
export function useWidgetId(prefix: string): string {
    return `${prefix}${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
