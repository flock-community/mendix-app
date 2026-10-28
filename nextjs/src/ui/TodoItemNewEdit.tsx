"use client";

import { ActionButton, CheckBox, Column, Combobox, DataView, DatePicker, LayoutGrid, PopupWindow, Row, TextArea, TextBox } from "@flock-community/atlas-ui";
import { useRef, useState } from "react";
import { DESCRIPTION_LENGTH, PRIORITIES, TITLE_LENGTH, type Priority, type TodoItemInput, type ValidationErrors } from "../model/todo";
import { PopupLayout } from "./AppDefaultLayout";
import { saveTodo } from "./api";

export interface TodoItemNewEditProps {
    /** The todo being edited; undefined for a new one. */
    id?: string;
    initial: TodoItemInput;
    /** Called after Save committed the todo. */
    onSaved: () => void;
    /** Called on Cancel and on closing the popup: the changes are discarded. */
    onCancel: () => void;
}

/** Page Todo.TodoItem_NewEdit: a popup (Atlas_Core.PopupLayout) with a data view on $TodoItem. */
export function TodoItemNewEdit({ id, initial, onSaved, onCancel }: TodoItemNewEditProps) {
    const [values, setValues] = useState<TodoItemInput>(initial);
    const [errors, setErrors] = useState<ValidationErrors>({});
    // The latest values, for Save: a change and a click can land in the same tick.
    const latest = useRef(values);

    const change = <K extends keyof TodoItemInput>(key: K, value: TodoItemInput[K]) => {
        latest.current = { ...latest.current, [key]: value };
        setValues(latest.current);
        // A changed attribute drops its validation feedback, as in Mendix. Text
        // inputs change their attribute when the user leaves them.
        if (errors[key]) {
            setErrors(current => {
                const next = { ...current };
                delete next[key];
                return next;
            });
        }
    };

    const save = async () => {
        const outcome = await saveTodo(id, latest.current);
        if (outcome.ok) onSaved();
        else setErrors(outcome.errors);
    };

    return (
        <PopupWindow page="Todo.TodoItem_NewEdit" caption="Edit todo" onClose={onCancel}>
            <PopupLayout>
                <LayoutGrid name="formGrid">
                    <Row>
                        <Column desktop="autofill">
                            <DataView
                                name="dvTodoItem"
                                footer={
                                    <>
                                        <ActionButton name="btnSave" caption="Save" buttonStyle="primary" onClick={save} />
                                        <ActionButton name="btnCancel" caption="Cancel" onClick={onCancel} />
                                    </>
                                }
                            >
                                <TextBox name="txtTitle" label="Title" value={values.Title} maxLength={TITLE_LENGTH} error={errors.Title} onChange={v => change("Title", v)} />
                                <TextArea name="txtDescription" label="Description" value={values.Description} maxLength={DESCRIPTION_LENGTH} error={errors.Description} onChange={v => change("Description", v)} />
                                <DatePicker
                                    name="dpDueDate"
                                    label="Due date"
                                    value={values.DueDate ? new Date(values.DueDate) : null}
                                    error={errors.DueDate}
                                    onChange={d => change("DueDate", d ? d.toISOString() : null)}
                                />
                                <Combobox
                                    name="cbPriority"
                                    label="Priority"
                                    value={values.Priority}
                                    options={PRIORITIES.map(p => ({ value: p.value, caption: p.caption }))}
                                    ariaLabel="Combo box"
                                    clearButtonAriaLabel="Clear selection"
                                    error={errors.Priority}
                                    onChange={v => change("Priority", v as Priority | null)}
                                />
                                <CheckBox name="cbIsDone" label="Done" value={values.IsDone} onChange={v => change("IsDone", v)} />
                            </DataView>
                        </Column>
                    </Row>
                </LayoutGrid>
            </PopupLayout>
        </PopupWindow>
    );
}
