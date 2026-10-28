"use client";

import {
    ActionButton,
    CheckBox,
    Column,
    Datagrid,
    DateFilter,
    DropdownFilter,
    DynamicText,
    LayoutGrid,
    Page,
    Row,
    TextFilter,
    useListValue,
    type DatagridColumn
} from "@flock-community/atlas-ui";
import { formatBoolean, formatDate } from "@flock-community/atlas-ui/format";
import { useMemo, useState } from "react";
import { newTodoItem, PRIORITIES, type TodoItem, type TodoItemInput } from "../model/todo";
import { AppDefaultLayout } from "./AppDefaultLayout";
import { deleteTodo, fetchTodos, toggleDone } from "./api";
import { TodoItemNewEdit } from "./TodoItemNewEdit";

type Popup = { id?: string; initial: TodoItemInput } | null;

/** Page Todo.TodoItem_Overview (URL /p/todos): the signed-in user's todos, open ones first. */
export function TodoItemOverview() {
    // Data source: database Todo.TodoItem sort by IsDone asc, DueDate asc.
    const todos = useListValue<TodoItem>(fetchTodos, { limit: 20, defaultSortOrder: [["IsDone", "asc"], ["DueDate", "asc"]] });
    const [popup, setPopup] = useState<Popup>(null);
    const { reload } = todos;

    const columns = useMemo<Array<DatagridColumn<TodoItem>>>(
        () => [
            {
                header: "Done",
                attribute: { id: "IsDone", type: "Boolean", universe: [true, false].map(value => ({ value, caption: formatBoolean(value) })) },
                width: "autoFit",
                content: item => <CheckBox name="cbDone" value={item.IsDone} editable={false} readOnlyStyle="control" />,
                filter: <DropdownFilter name="fDone" emptySelectionCaption="Select" />
            },
            {
                header: "Title",
                attribute: { id: "Title", type: "String" },
                display: item => item.Title,
                filter: <TextFilter name="fTitle" />
            },
            {
                header: "Priority",
                attribute: { id: "Priority", type: "Enum", universe: PRIORITIES.map(p => ({ value: p.value, caption: p.caption })) },
                display: item => PRIORITIES.find(p => p.value === item.Priority)?.caption ?? "",
                filter: <DropdownFilter name="fPriority" emptySelectionCaption="Select" />
            },
            {
                header: "Due date",
                attribute: { id: "DueDate", type: "DateTime" },
                display: item => formatDate(item.DueDate, "datetime"),
                filter: <DateFilter name="fDueDate" />
            },
            {
                header: "Actions",
                sortable: false,
                width: "autoFit",
                content: item => (
                    <>
                        <ActionButton name="btnToggle" caption="Done / undo" onClick={() => toggleDone(item.id).then(reload)} />
                        <ActionButton name="btnEdit" caption="Edit" onClick={() => setPopup({ id: item.id, initial: { ...item } })} />
                        <ActionButton name="btnDelete" caption="Delete" buttonStyle="danger" onClick={() => deleteTodo(item.id).then(reload)} />
                    </>
                )
            }
        ],
        [reload]
    );

    return (
        <Page page="Todo.TodoItem_Overview">
            <AppDefaultLayout>
                <LayoutGrid name="mainGrid">
                    <Row>
                        <Column desktop={12}>
                            <DynamicText name="heading" renderMode="h2">
                                My todos
                            </DynamicText>
                            <ActionButton name="btnNew" caption="New todo" buttonStyle="primary" onClick={() => setPopup({ initial: newTodoItem() })} />
                            <Datagrid name="dgTodos" className="table-hover table-striped" datasource={todos} columns={columns} pageSize={20} />
                        </Column>
                    </Row>
                </LayoutGrid>
            </AppDefaultLayout>
            {popup && (
                <TodoItemNewEdit
                    key={popup.id ?? "new"}
                    id={popup.id}
                    initial={popup.initial}
                    onCancel={() => setPopup(null)}
                    onSaved={() => {
                        setPopup(null);
                        void reload();
                    }}
                />
            )}
        </Page>
    );
}
