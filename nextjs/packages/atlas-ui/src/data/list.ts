"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FilterCondition } from "./filters";

export type SortDirection = "asc" | "desc";
export type SortInstruction = [attribute: string, direction: SortDirection];

export interface ListQuery {
    offset: number;
    limit: number;
    sort: SortInstruction[];
    filter?: FilterCondition;
}

export interface ListPage<T> {
    items: T[];
    totalCount: number;
}

/**
 * A list data source with the shape of Mendix's ListValue: the grid pages,
 * sorts and filters it, and it fetches the matching page from the server.
 */
export interface ListValue<T> {
    status: "loading" | "available";
    /** True until the first page has arrived. */
    isFirstLoad: boolean;
    items: T[];
    totalCount?: number;
    offset: number;
    limit: number;
    /** The sort the data is in: the grid's, or the data source's default. */
    sortOrder: SortInstruction[];
    filter?: FilterCondition;
    hasMoreItems: boolean;
    setOffset(offset: number): void;
    setLimit(limit: number): void;
    /** Undefined restores the data source's default sort order. */
    setSortOrder(order: SortInstruction[] | undefined): void;
    setFilter(filter: FilterCondition | undefined): void;
    reload(): Promise<void>;
}

export interface ListValueOptions {
    limit: number;
    defaultSortOrder: SortInstruction[];
}

export function useListValue<T>(fetchPage: (query: ListQuery, signal: AbortSignal) => Promise<ListPage<T>>, options: ListValueOptions): ListValue<T> {
    const [offset, setOffsetState] = useState(0);
    const [limit, setLimit] = useState(options.limit);
    const [sortOrder, setSortOrderState] = useState<SortInstruction[] | undefined>(undefined);
    const [filter, setFilterState] = useState<FilterCondition | undefined>(undefined);
    const [page, setPage] = useState<ListPage<T> | undefined>(undefined);
    const [status, setStatus] = useState<"loading" | "available">("loading");
    const [generation, setGeneration] = useState(0);
    const fetchRef = useRef(fetchPage);
    fetchRef.current = fetchPage;
    const waiters = useRef<Array<() => void>>([]);

    const effectiveSort = sortOrder ?? options.defaultSortOrder;
    const sortKey = JSON.stringify(effectiveSort);
    const filterKey = JSON.stringify(filter ?? null);

    useEffect(() => {
        const controller = new AbortController();
        setStatus("loading");
        fetchRef
            .current({ offset, limit, sort: JSON.parse(sortKey), filter: filterKey === "null" ? undefined : JSON.parse(filterKey) }, controller.signal)
            .then(result => {
                if (controller.signal.aborted) return;
                // A page past the end (its last item was deleted) moves back a page.
                if (result.items.length === 0 && offset > 0 && result.totalCount > 0) {
                    setOffsetState(Math.max(0, Math.floor((result.totalCount - 1) / limit) * limit));
                    return;
                }
                setPage(result);
                setStatus("available");
                const pending = waiters.current.splice(0);
                pending.forEach(resolve => resolve());
            })
            .catch(error => {
                if (controller.signal.aborted) return;
                console.error("Loading the list failed", error);
                setStatus("available");
            });
        return () => controller.abort();
    }, [offset, limit, sortKey, filterKey, generation]);

    const setOffset = useCallback((value: number) => setOffsetState(Math.max(0, value)), []);
    const setSortOrder = useCallback((order: SortInstruction[] | undefined) => {
        setSortOrderState(order);
        setOffsetState(0);
    }, []);
    const setFilter = useCallback((value: FilterCondition | undefined) => {
        setFilterState(value);
        setOffsetState(0);
    }, []);
    const reload = useCallback(
        () =>
            new Promise<void>(resolve => {
                waiters.current.push(resolve);
                setGeneration(g => g + 1);
            }),
        []
    );

    return useMemo(
        () => ({
            status,
            isFirstLoad: page === undefined,
            items: page?.items ?? [],
            totalCount: page?.totalCount,
            offset,
            limit,
            sortOrder: effectiveSort,
            filter,
            hasMoreItems: page ? offset + page.items.length < page.totalCount : false,
            setOffset,
            setLimit,
            setSortOrder,
            setFilter,
            reload
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [status, page, offset, limit, sortKey, filter, setOffset, setSortOrder, setFilter, reload]
    );
}
