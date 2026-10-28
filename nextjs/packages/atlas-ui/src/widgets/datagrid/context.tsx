"use client";

import { createContext, useContext } from "react";
import type { FilterCondition } from "../../data/filters";

export type AttributeType = "String" | "Boolean" | "Enum" | "DateTime" | "Integer" | "Decimal";

/** What a column knows about its attribute: enough to sort, filter and format it. */
export interface GridAttribute {
    /** The name the data source sorts and filters on. */
    id: string;
    type: AttributeType;
    /** The possible values of a Boolean or Enum attribute, in model order, with their captions. */
    universe?: Array<{ value: string | boolean; caption: string }>;
}

export interface ColumnFilterContextValue {
    attribute?: GridAttribute;
    /** The filter widget's condition; undefined means it does not filter. */
    setCondition(condition: FilterCondition | undefined): void;
}

const ColumnFilterContext = createContext<ColumnFilterContextValue | null>(null);

export const ColumnFilterProvider = ColumnFilterContext.Provider;

/** For filter widgets: the column (and attribute) they sit in. */
export function useColumnFilter(widget: string): ColumnFilterContextValue {
    const value = useContext(ColumnFilterContext);
    if (!value) throw new Error(`${widget} must be placed inside a Data grid column`);
    return value;
}
