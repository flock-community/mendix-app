"use client";

import { autoUpdate, FloatingFocusManager, size as sizeMiddleware, useClick, useDismiss, useFloating, useInteractions } from "@floating-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { and, type FilterCondition } from "../../data/filters";
import type { ListValue, SortDirection, SortInstruction } from "../../data/list";
import { cx, mxName } from "../../util/cx";
import { useWidgetId } from "../../util/useId";
import { ColumnFilterProvider, type GridAttribute } from "./context";
import { EyeIcon, PagingIcon, SortAscIcon, SortDescIcon, SortNoneIcon } from "./icons";

/**
 * Data grid 2 (com.mendix.widget.web.datagrid.Datagrid 3.x), rebuilt: same
 * markup and classes, so the DataWidgets theme styles it, and the same
 * behaviour for sorting, filtering, paging, resizing, reordering and hiding
 * columns. Data comes from a ListValue (see useListValue).
 */

export interface DatagridColumn<T> {
    header: string;
    /** The attribute the column shows, sorts and filters on. */
    attribute?: GridAttribute;
    /** The attribute's display value ("Show: Attribute"). */
    display?: (item: T) => string;
    tooltip?: (item: T) => string | undefined;
    /** Widgets to show instead of the attribute ("Show: Custom content"). */
    content?: (item: T) => ReactNode;
    /** The column's filter widget. */
    filter?: ReactNode;
    sortable?: boolean;
    resizable?: boolean;
    draggable?: boolean;
    hidable?: "yes" | "hidden" | "no";
    width?: "autoFill" | "autoFit" | "manual";
    /** The weight of a manual-width column. */
    size?: number;
    minWidth?: "auto" | "minContent" | "manual";
    minWidthLimit?: number;
    alignment?: "left" | "center" | "right";
    wrapText?: boolean;
    columnClass?: (item: T) => string | undefined;
}

export interface DatagridLabels {
    firstPage: string;
    previousPage: string;
    nextPage: string;
    lastPage: string;
    pagingStatus: string;
    pagination: string;
    columnSelector: string;
}

const defaultLabels: DatagridLabels = {
    firstPage: "Go to first page",
    previousPage: "Go to previous page",
    nextPage: "Go to next page",
    lastPage: "Go to last page",
    pagingStatus: "Currently showing",
    pagination: "Pagination",
    columnSelector: "Column selector"
};

export interface DatagridProps<T extends { id: string }> {
    name: string;
    /** Extra classes, e.g. the design properties: table-hover, table-striped, table-compact, table-bordered-*. */
    className?: string;
    style?: CSSProperties;
    datasource: ListValue<T>;
    columns: Array<DatagridColumn<T>>;
    pageSize?: number;
    pagination?: "buttons" | "loadMore";
    showPagingButtons?: "always" | "auto";
    pagingPosition?: "bottom" | "top" | "both";
    loadMoreButtonCaption?: string;
    columnsSortable?: boolean;
    columnsResizable?: boolean;
    columnsDraggable?: boolean;
    columnsHidable?: boolean;
    columnsFilterable?: boolean;
    loadingType?: "spinner" | "skeleton";
    /** Shown in a full-width row when there are no items. */
    emptyPlaceholder?: ReactNode;
    rowClass?: (item: T) => string | undefined;
    labels?: Partial<DatagridLabels>;
}

interface ColumnState {
    id: string;
    index: number;
    order: number;
    hidden: boolean;
    size?: number;
}

type SortRule = [columnId: string, direction: SortDirection];
type DropTarget = [columnId: string, side: "before" | "after"];

function baseWidth<T>(column: DatagridColumn<T>): string {
    switch (column.width ?? "autoFill") {
        case "autoFit": {
            const min = column.minWidth === "manual" ? `${column.minWidthLimit ?? 100}px` : column.minWidth === "minContent" ? "min-content" : "auto";
            return `minmax(${min}, auto)`;
        }
        case "manual":
            return `${column.size ?? 1}fr`;
        default:
            return "1fr";
    }
}

export function Datagrid<T extends { id: string }>(props: DatagridProps<T>) {
    const {
        datasource,
        columns,
        pageSize = 20,
        pagination = "buttons",
        showPagingButtons = "always",
        pagingPosition = "bottom",
        columnsSortable = true,
        columnsResizable = true,
        columnsDraggable = true,
        columnsHidable = true,
        columnsFilterable = true,
        loadingType = "spinner"
    } = props;
    const labels = { ...defaultLabels, ...props.labels };
    const gridId = useWidgetId("DataGrid");

    // ---- column personalisation ------------------------------------------------
    const [columnState, setColumnState] = useState<ColumnState[]>(() =>
        columns.map((c, index) => ({ id: String(index), index, order: index * 10, hidden: c.hidable === "hidden" }))
    );
    const [isResizing, setIsResizing] = useState(false);
    const headerRefs = useRef(new Map<string, HTMLDivElement>());

    const ordered = useMemo(() => [...columnState].sort((a, b) => a.order - b.order), [columnState]);
    const visible = ordered.filter(c => !c.hidden);
    const lastVisibleId = visible.at(-1)?.id;

    const cssWidth = (state: ColumnState): string => {
        if (state.size) return state.id === lastVisibleId ? "minmax(min-content, auto)" : `${state.size}px`;
        return baseWidth(columns[state.index]);
    };

    const setSize = useCallback((id: string, size: number) => setColumnState(cols => cols.map(c => (c.id === id ? { ...c, size } : c))), []);

    const startResize = useCallback(() => {
        // Freeze every column at its current width, so only the dragged one moves.
        setColumnState(cols => cols.map(c => ({ ...c, size: headerRefs.current.get(c.id)?.offsetWidth ?? c.size })));
        setIsResizing(true);
    }, []);

    const toggleHidden = (id: string) => setColumnState(cols => cols.map(c => (c.id === id ? { ...c, hidden: !c.hidden } : c)));

    const moveColumn = (sourceId: string, [targetId, side]: DropTarget) => {
        setColumnState(cols => {
            const sequence = [...cols].sort((a, b) => a.order - b.order).filter(c => c.id !== sourceId);
            const at = sequence.findIndex(c => c.id === targetId);
            const source = cols.find(c => c.id === sourceId);
            if (!source || at < 0) return cols;
            sequence.splice(side === "after" ? at + 1 : at, 0, source);
            const orders = new Map(sequence.map((c, i) => [c.id, i * 10]));
            return cols.map(c => ({ ...c, order: orders.get(c.id) ?? c.order }));
        });
    };

    // ---- sorting ----------------------------------------------------------------
    const [rules, setRules] = useState<SortRule[]>(() =>
        datasource.sortOrder
            .map(([attr, dir]): SortRule | undefined => {
                const index = columns.findIndex(c => c.attribute?.id === attr);
                return index >= 0 ? [String(index), dir] : undefined;
            })
            .filter((r): r is SortRule => r !== undefined)
    );
    const columnsRef = useRef(columns);
    columnsRef.current = columns;

    const toggleSort = (columnId: string) => {
        const [first] = rules;
        const next: SortRule[] = first && first[0] === columnId ? (first[1] !== "asc" ? [] : [[columnId, "desc"]]) : [[columnId, "asc"]];
        setRules(next);
        const instructions = next
            .map(([id, dir]): SortInstruction | undefined => {
                const attr = columnsRef.current[Number(id)]?.attribute?.id;
                return attr ? [attr, dir] : undefined;
            })
            .filter((i): i is SortInstruction => i !== undefined);
        // No rules left: back to the data source's own sort order.
        datasource.setSortOrder(instructions.length ? instructions : undefined);
    };

    // ---- filtering --------------------------------------------------------------
    const [conditions, setConditions] = useState<Array<FilterCondition | undefined>>(() => columns.map(() => undefined));
    const attributeKey = columns.map(c => c.attribute?.id ?? "").join("|");
    const filterContexts = useMemo(
        () =>
            columnsRef.current.map((column, index) => ({
                attribute: column.attribute,
                setCondition: (condition: FilterCondition | undefined) =>
                    setConditions(current => {
                        if (JSON.stringify(current[index]) === JSON.stringify(condition)) return current;
                        const next = [...current];
                        next[index] = condition;
                        return next;
                    })
            })),
        [attributeKey]
    );
    const filterKey = JSON.stringify(conditions);
    const { setFilter } = datasource;
    const filterApplied = useRef(false);
    useEffect(() => {
        const combined = and(...conditions);
        if (!filterApplied.current && combined === undefined) return;
        filterApplied.current = true;
        setFilter(combined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterKey, setFilter]);

    // ---- paging -----------------------------------------------------------------
    const { setLimit, setOffset } = datasource;
    useEffect(() => {
        if (datasource.limit !== pageSize) setLimit(pageSize);
    }, [datasource.limit, pageSize, setLimit]);
    const page = Math.floor(datasource.offset / pageSize);
    const setPage = (next: number) => setOffset(Math.max(0, next) * pageSize);

    // ---- keyboard navigation ------------------------------------------------------
    const [focusTarget, setFocusTarget] = useState("0,0");
    const gridRef = useRef<HTMLDivElement>(null);
    const onCellKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const position = (event.currentTarget.dataset.position ?? "0,0").split(",").map(Number);
        const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        const move = moves[event.key];
        if (!move || event.target !== event.currentTarget) return;
        const target = `${position[0] + move[0]},${position[1] + move[1]}`;
        const cell = gridRef.current?.querySelector<HTMLElement>(`[data-position="${target}"]`);
        if (cell) {
            event.preventDefault();
            setFocusTarget(target);
            cell.focus();
        }
    };

    // ---- rendering ----------------------------------------------------------------
    const items = datasource.items;
    const gridTemplateColumns = [...visible.map(cssWidth), ...(columnsHidable ? ["54px"] : [])].join(" ");
    const pagingBar =
        pagination === "buttons" ? (
            <Pagination
                page={page}
                pageSize={pageSize}
                numberOfItems={datasource.totalCount}
                canNextPage={datasource.hasMoreItems}
                showPagingButtons={showPagingButtons}
                labels={labels}
                gotoPage={setPage}
            />
        ) : null;

    return (
        <div className={cx(mxName(props.name), props.className, "widget-datagrid")} style={props.style}>
            {(pagingPosition === "top" || pagingPosition === "both") && pagingBar && <div className="widget-datagrid-top-bar table-header">{pagingBar}</div>}
            <div className="widget-datagrid-content">
                <div ref={gridRef} className="widget-datagrid-grid table" role="grid" style={{ gridTemplateColumns }}>
                    <HeaderRow
                        gridId={gridId}
                        columns={columns}
                        visible={visible}
                        available={ordered}
                        rules={rules}
                        filterContexts={filterContexts}
                        lastVisibleId={lastVisibleId}
                        columnsSortable={columnsSortable}
                        columnsResizable={columnsResizable}
                        columnsDraggable={columnsDraggable}
                        columnsHidable={columnsHidable}
                        columnsFilterable={columnsFilterable}
                        labels={labels}
                        headerRefs={headerRefs.current}
                        onSort={toggleSort}
                        onResizeStart={startResize}
                        onResizeEnd={() => setIsResizing(false)}
                        onResize={setSize}
                        onToggleHidden={toggleHidden}
                        onMove={moveColumn}
                        isResizing={isResizing}
                    />
                    <div className="widget-datagrid-grid-body table-content" role="rowgroup">
                        {datasource.isFirstLoad ? (
                            loadingType === "spinner" ? (
                                <div className="widget-datagrid-loader-container">
                                    <div className="widget-datagrid-spinner widget-datagrid-spinner-margin" aria-busy={true} aria-live="polite">
                                        <div className="widget-datagrid-spinner-loader widget-datagrid-spinner-loader-large" />
                                    </div>
                                </div>
                            ) : (
                                <SkeletonRows rows={pageSize} columns={visible.length} columnsHidable={columnsHidable} />
                            )
                        ) : (
                            <>
                                {items.map((item, rowIndex) => (
                                    <div key={item.id} className={cx("tr", props.rowClass?.(item))} role="row">
                                        {visible.map((state, colIndex) => {
                                            const column = columns[state.index];
                                            const position = `${colIndex},${rowIndex}`;
                                            return (
                                                <div
                                                    key={state.id}
                                                    className={cx(
                                                        "td",
                                                        { "td-borders": rowIndex === 0, "wrap-text": column.wrapText },
                                                        `align-column-${column.alignment ?? "left"}`,
                                                        column.columnClass?.(item)
                                                    )}
                                                    role="gridcell"
                                                    tabIndex={focusTarget === position ? 0 : -1}
                                                    data-position={position}
                                                    onFocus={() => setFocusTarget(position)}
                                                    onKeyDown={onCellKeyDown}
                                                >
                                                    {column.content ? (
                                                        <div className="td-custom-content">{column.content(item)}</div>
                                                    ) : (
                                                        <span className="td-text" title={column.tooltip?.(item)}>
                                                            {column.display?.(item) ?? ""}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {columnsHidable && <div className={cx("td", { "td-borders": rowIndex === 0 }, "column-selector")} role="gridcell" tabIndex={-1} />}
                                    </div>
                                ))}
                                {items.length === 0 && (
                                    <div className="td td-borders" style={{ gridColumn: `span ${visible.length + (columnsHidable ? 1 : 0)}` }}>
                                        <div className="empty-placeholder">{props.emptyPlaceholder ?? <div />}</div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="widget-datagrid-footer table-footer">
                <div className="widget-datagrid-paging-bottom">
                    <div className="widget-datagrid-pb-start" />
                    {pagination === "loadMore" && datasource.hasMoreItems && (
                        <div className="widget-datagrid-pb-middle">
                            <button className="btn btn-primary widget-datagrid-load-more" tabIndex={0} onClick={() => datasource.setLimit(datasource.limit + pageSize)}>
                                {props.loadMoreButtonCaption ?? "Load more"}
                            </button>
                        </div>
                    )}
                    <div className="widget-datagrid-pb-end">{(pagingPosition === "bottom" || pagingPosition === "both") && pagingBar}</div>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

interface HeaderRowProps<T> {
    gridId: string;
    columns: Array<DatagridColumn<T>>;
    visible: ColumnState[];
    available: ColumnState[];
    rules: SortRule[];
    filterContexts: Array<{ attribute?: GridAttribute; setCondition(c: FilterCondition | undefined): void }>;
    lastVisibleId?: string;
    columnsSortable: boolean;
    columnsResizable: boolean;
    columnsDraggable: boolean;
    columnsHidable: boolean;
    columnsFilterable: boolean;
    labels: DatagridLabels;
    headerRefs: Map<string, HTMLDivElement>;
    isResizing: boolean;
    onSort(id: string): void;
    onResizeStart(): void;
    onResizeEnd(): void;
    onResize(id: string, size: number): void;
    onToggleHidden(id: string): void;
    onMove(sourceId: string, target: DropTarget): void;
}

function HeaderRow<T>(props: HeaderRowProps<T>) {
    const [dropTarget, setDropTarget] = useState<DropTarget | undefined>();
    const [dragging, setDragging] = useState<[string | undefined, string, string | undefined] | undefined>();

    return (
        <div className="widget-datagrid-grid-head" role="rowgroup">
            <div className="tr" role="row">
                {props.visible.map((state, i) => {
                    const column = props.columns[state.index];
                    const header = column.header.trim();
                    const sortable = props.columnsSortable && !!column.attribute && column.sortable !== false;
                    const ruleIndex = props.rules.findIndex(r => r[0] === state.id);
                    const direction = ruleIndex >= 0 ? props.rules[ruleIndex][1] : undefined;
                    const draggable = props.columnsDraggable && column.draggable !== false;
                    const resizable = props.columnsResizable && state.id !== props.lastVisibleId && column.resizable !== false;
                    const previous = props.visible[i - 1]?.id;
                    const next = props.visible[i + 1]?.id;

                    const dragHandlers = draggable
                        ? {
                              onDragStart: () => setDragging([previous, state.id, next]),
                              onDragEnd: () => {
                                  setDragging(undefined);
                                  setDropTarget(undefined);
                              }
                          }
                        : {};
                    const dropHandlers = draggable
                        ? {
                              onDragEnter: (e: React.DragEvent) => e.preventDefault(),
                              onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
                                  if (!dragging) return;
                                  e.preventDefault();
                                  const [before, self, after] = dragging;
                                  if (state.id === self) {
                                      if (dropTarget) setDropTarget(undefined);
                                      return;
                                  }
                                  let side: "before" | "after";
                                  if (state.id === before) side = "before";
                                  else if (state.id === after) side = "after";
                                  else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      side = rect.width / 2 + (dropTarget?.[1] === "after" ? -10 : 10) < e.clientX - rect.left ? "after" : "before";
                                  }
                                  if (dropTarget?.[0] !== state.id || dropTarget[1] !== side) setDropTarget([state.id, side]);
                              },
                              onDrop: (e: React.DragEvent) => {
                                  e.preventDefault();
                                  if (dragging && dropTarget) props.onMove(dragging[1], dropTarget);
                                  setDragging(undefined);
                                  setDropTarget(undefined);
                              }
                          }
                        : {};

                    return (
                        <div
                            key={state.id}
                            ref={node => {
                                if (node) props.headerRefs.set(state.id, node);
                                else props.headerRefs.delete(state.id);
                            }}
                            aria-sort={sortable ? (direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none") : undefined}
                            className={cx("th", {
                                [`drop-${dropTarget?.[1]}`]: dropTarget?.[0] === state.id,
                                dragging: dragging?.[1] === state.id,
                                "dragging-over-self": dragging?.[1] === state.id && !dropTarget
                            })}
                            role="columnheader"
                            style={sortable ? undefined : { cursor: "unset" }}
                            title={header}
                            data-column-id={state.id}
                            {...dropHandlers}
                        >
                            <div className="column-container" id={`${props.gridId}-column${state.id}`} draggable={draggable || undefined} {...dragHandlers}>
                                <div
                                    className={cx("column-header", { clickable: sortable }, `align-column-${column.alignment ?? "left"}`)}
                                    style={{ pointerEvents: dragging ? "none" : undefined }}
                                    {...(sortable
                                        ? {
                                              role: "button",
                                              tabIndex: 0,
                                              onClick: () => props.onSort(state.id),
                                              onKeyDown: (e: KeyboardEvent) => {
                                                  if (e.key === "Enter" || e.key === " ") {
                                                      e.preventDefault();
                                                      props.onSort(state.id);
                                                  }
                                              }
                                          }
                                        : {})}
                                    aria-label={sortable ? `sort ${header}` : header}
                                >
                                    <span>{header.length > 0 ? header : " "}</span>
                                    {sortable && (direction === "asc" ? <SortAscIcon /> : direction === "desc" ? <SortDescIcon /> : <SortNoneIcon />)}
                                </div>
                                {props.columnsFilterable && (
                                    <div className="filter" style={{ pointerEvents: dragging ? "none" : undefined }}>
                                        <ColumnFilterProvider value={props.filterContexts[state.index]}>{column.filter}</ColumnFilterProvider>
                                    </div>
                                )}
                            </div>
                            {resizable && <ColumnResizer onResizeStart={props.onResizeStart} onResizeEnd={props.onResizeEnd} setColumnWidth={w => props.onResize(state.id, w)} />}
                        </div>
                    );
                })}
                {props.columnsHidable && (
                    <ColumnSelector
                        id={props.gridId}
                        label={props.labels.columnSelector}
                        columns={props.available.map(s => ({ id: s.id, header: props.columns[s.index].header, hidden: s.hidden, canHide: props.columns[s.index].hidable !== "no" }))}
                        visibleCount={props.visible.length}
                        onToggle={props.onToggleHidden}
                    />
                )}
            </div>
        </div>
    );
}

function ColumnResizer({ minWidth = 50, setColumnWidth, onResizeStart, onResizeEnd }: { minWidth?: number; setColumnWidth(width: number): void; onResizeStart(): void; onResizeEnd(): void }) {
    const ref = useRef<HTMLDivElement>(null);
    const start = (screenX: number) => {
        const startWidth = ref.current?.parentElement?.offsetWidth ?? 0;
        onResizeStart();
        const move = (e: MouseEvent | TouchEvent) => {
            const x = "touches" in e ? e.touches[0].screenX : e.screenX;
            setColumnWidth(Math.max(minWidth, startWidth - (screenX - x)));
        };
        const end = () => {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", end);
            document.removeEventListener("touchmove", move);
            document.removeEventListener("touchend", end);
            onResizeEnd();
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", end);
        document.addEventListener("touchmove", move);
        document.addEventListener("touchend", end);
    };
    return (
        <div aria-hidden={true} ref={ref} className="column-resizer" onMouseDown={e => start(e.screenX)} onTouchStart={e => start(e.touches[0].screenX)}>
            <div className="column-resizer-bar" />
        </div>
    );
}

function ColumnSelector({
    id,
    label,
    columns,
    visibleCount,
    onToggle
}: {
    id: string;
    label: string;
    columns: Array<{ id: string; header: string; hidden: boolean; canHide: boolean }>;
    visibleCount: number;
    onToggle(id: string): void;
}) {
    const [open, setOpen] = useState(false);
    const [maxHeight, setMaxHeight] = useState<number | undefined>();
    const { refs, floatingStyles, context } = useFloating({
        open,
        onOpenChange: setOpen,
        placement: "bottom-end",
        strategy: "fixed",
        middleware: [sizeMiddleware({ apply: ({ availableHeight }) => setMaxHeight(availableHeight) })],
        whileElementsMounted: autoUpdate,
        transform: false
    });
    const { getReferenceProps, getFloatingProps } = useInteractions([useClick(context), useDismiss(context)]);
    const hidable = columns.filter(c => c.canHide);
    const firstIndex = columns.findIndex(c => c.canHide);
    const lastIndex = columns.map(c => c.canHide).lastIndexOf(true);

    return (
        <div aria-label={label} className="th column-selector" role="columnheader" title={label}>
            <div className="column-selector-content">
                <button
                    aria-label={label}
                    ref={refs.setReference}
                    className="btn btn-default column-selector-button"
                    {...getReferenceProps({
                        onKeyDown: (e: KeyboardEvent) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpen(o => !o);
                            }
                        }
                    })}
                    aria-haspopup={true}
                    aria-expanded={open}
                    aria-controls={`${id}-column-selectors`}
                >
                    <EyeIcon />
                </button>
            </div>
            {open && hidable.length > 0 && (
                <FloatingFocusManager context={context} modal={false}>
                    <ul
                        ref={refs.setFloating}
                        id={`${id}-column-selectors`}
                        className="column-selectors"
                        data-focusindex={0}
                        role="menu"
                        style={{ ...floatingStyles, maxHeight }}
                        {...getFloatingProps()}
                    >
                        {columns.map((column, index) => {
                            if (!column.canHide) return null;
                            const isVisible = !column.hidden;
                            const locked = isVisible && visibleCount === 1;
                            const toggle = () => {
                                if (!locked) onToggle(column.id);
                            };
                            return (
                                <li
                                    key={column.id}
                                    role="menuitem"
                                    tabIndex={0}
                                    onClick={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggle();
                                    }}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggle();
                                        } else if ((e.key === "Tab" && (index === lastIndex || (e.shiftKey && index === firstIndex))) || e.key === "Escape") {
                                            e.preventDefault();
                                            setOpen(false);
                                        }
                                    }}
                                >
                                    <input checked={isVisible} disabled={locked} id={`${id}_checkbox_toggle_${index}`} style={{ pointerEvents: "none" }} type="checkbox" tabIndex={-1} onChange={() => undefined} />
                                    <label htmlFor={`${id}_checkbox_toggle_${index}`} style={{ pointerEvents: "none" }}>
                                        {column.header.trim() || "<...>"}
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                </FloatingFocusManager>
            )}
        </div>
    );
}

function SkeletonRows({ rows, columns, columnsHidable }: { rows: number; columns: number; columnsHidable: boolean }) {
    return (
        <>
            {Array.from({ length: rows }, (_, r) => (
                <div className="tr" role="row" key={r}>
                    {Array.from({ length: columns }, (_, c) => (
                        <div key={c} className={cx("td", { "td-borders": r === 0 }, "align-column-left")} role="gridcell">
                            <div className="widget-datagrid-skeleton" aria-busy={true} aria-live="polite">
                                <span className="widget-datagrid-skeleton-loader" />
                            </div>
                        </div>
                    ))}
                    {columnsHidable && <div className={cx("td", { "td-borders": r === 0 }, "column-selector")} role="gridcell" tabIndex={-1} />}
                </div>
            ))}
        </>
    );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination(props: {
    page: number;
    pageSize: number;
    numberOfItems?: number;
    canNextPage: boolean;
    showPagingButtons: "always" | "auto";
    labels: DatagridLabels;
    gotoPage(page: number): void;
}) {
    const { page, pageSize, numberOfItems, canNextPage, labels } = props;
    const pageCount = numberOfItems !== undefined ? Math.ceil(numberOfItems / pageSize) : undefined;
    const lastPage = pageCount !== undefined ? pageCount - 1 : 0;
    const known = pageCount !== undefined;
    const from = numberOfItems === 0 ? 0 : page * pageSize + 1;
    const to = canNextPage || !numberOfItems ? (numberOfItems === 0 ? numberOfItems : (page + 1) * pageSize) : numberOfItems;
    if (numberOfItems === 0 && props.showPagingButtons !== "always") return null;
    const status = `${from} to ${to} ${known ? `of ${numberOfItems ?? (pageCount ?? 1) * pageSize}` : ""}`;
    const press = (action: () => void) => ({
        onClick: action,
        onKeyDown: (e: KeyboardEvent) => {
            if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                action();
            }
        }
    });

    return (
        <div aria-label={labels.pagination} className="pagination-bar">
            <button className="btn pagination-button" disabled={page === 0} {...press(() => props.gotoPage(0))} aria-label={labels.firstPage}>
                <PagingIcon direction="step-backward" />
            </button>
            <button className="btn pagination-button" disabled={page === 0} {...press(() => props.gotoPage(page - 1))} aria-label={labels.previousPage}>
                <PagingIcon direction="backward" />
            </button>
            <span className="sr-only sr-only-focusable">
                {`${labels.pagingStatus} ${status}`}
            </span>
            <div aria-hidden={true} className="paging-status">
                {status}
            </div>
            <button aria-label={labels.nextPage} className="btn pagination-button" disabled={!canNextPage} {...press(() => props.gotoPage(page + 1))}>
                <PagingIcon direction="forward" />
            </button>
            {known && (
                <button aria-label={labels.lastPage} className="btn pagination-button" disabled={page === lastPage || numberOfItems === 0} {...press(() => props.gotoPage(lastPage))}>
                    <PagingIcon direction="step-forward" />
                </button>
            )}
        </div>
    );
}
