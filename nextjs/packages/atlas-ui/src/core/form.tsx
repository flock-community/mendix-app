"use client";

import { createContext, useContext, type ReactNode } from "react";
import { cx, mxName } from "../util/cx";
import { useWidgetId } from "../util/useId";

/**
 * Data view and input widgets. A labelled input renders the way Mendix does:
 *
 *   <div class="mx-name-x mx-textbox form-group no-columns [has-error]">
 *     <label class="control-label" for="…">Label</label>
 *     <input class="form-control" …>
 *     <div class="alert alert-danger mx-validation-message">…</div>
 *   </div>
 *
 * Without a label the form-group classes are dropped.
 */

// ---------------------------------------------------------------------------
// Data view
// ---------------------------------------------------------------------------

interface DataViewContextValue {
    editable: boolean;
}

const DataViewContext = createContext<DataViewContextValue>({ editable: true });

export function useDataView(): DataViewContextValue {
    return useContext(DataViewContext);
}

export interface DataViewProps {
    name: string;
    className?: string;
    editable?: boolean;
    footer?: ReactNode;
    children: ReactNode;
}

export function DataView({ name, className, editable = true, footer, children }: DataViewProps) {
    return (
        <DataViewContext.Provider value={{ editable }}>
            <div className={cx("mx-dataview", mxName(name), className)}>
                <div className="mx-dataview-content">{children}</div>
                {footer !== undefined && <div className="mx-dataview-controls">{footer}</div>}
            </div>
        </DataViewContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// Form group and validation
// ---------------------------------------------------------------------------

export function ValidationMessage({ id, children }: { id?: string; children: ReactNode }) {
    return (
        <div id={id} className="alert alert-danger mx-validation-message" role="alert">
            {children}
        </div>
    );
}

export interface FormGroupProps {
    name: string;
    /** The widget's own class, e.g. "mx-textbox". */
    widgetClass: string;
    className?: string;
    label?: ReactNode;
    labelFor?: string;
    labelId?: string;
    error?: ReactNode;
    errorId?: string;
    children: ReactNode;
}

export function FormGroup({ name, widgetClass, className, label, labelFor, labelId, error, errorId, children }: FormGroupProps) {
    const hasLabel = label !== undefined && label !== null && label !== "";
    return (
        <div className={cx(mxName(name), widgetClass, { "form-group": hasLabel, "no-columns": hasLabel, "has-error": !!error }, className)}>
            {hasLabel && (
                <label className="control-label" id={labelId} htmlFor={labelFor}>
                    {label}
                </label>
            )}
            {children}
            {error ? <ValidationMessage id={errorId}>{error}</ValidationMessage> : null}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

interface InputBaseProps<T> {
    name: string;
    label?: ReactNode;
    className?: string;
    value: T;
    onChange?: (value: T) => void;
    /** Mendix "Editable": false renders the read-only style. */
    editable?: boolean;
    readOnlyStyle?: "control" | "text";
    error?: ReactNode;
    autoFocus?: boolean;
    placeholder?: string;
}

function useEditable(editable: boolean | undefined): boolean {
    const dataView = useDataView();
    return editable ?? dataView.editable;
}

export interface TextBoxProps extends InputBaseProps<string> {
    maxLength?: number;
    password?: boolean;
    autoComplete?: string;
}

export function TextBox(props: TextBoxProps) {
    const id = useWidgetId("textBox");
    const editable = useEditable(props.editable);
    if (!editable && props.readOnlyStyle === "text") {
        return (
            <FormGroup name={props.name} widgetClass="mx-textbox" className={props.className} label={props.label} labelFor={id}>
                <div className="form-control-static" id={id}>
                    {props.value}
                </div>
            </FormGroup>
        );
    }
    return (
        <FormGroup name={props.name} widgetClass="mx-textbox" className={props.className} label={props.label} labelFor={id} labelId={`${id}-label`} error={props.error} errorId={`${id}-error`}>
            <input
                id={id}
                type={props.password ? "password" : "text"}
                className="form-control"
                value={props.value}
                maxLength={props.maxLength}
                placeholder={props.placeholder}
                autoComplete={props.autoComplete ?? "on"}
                autoFocus={props.autoFocus}
                readOnly={!editable}
                aria-readonly={!editable || undefined}
                aria-invalid={props.error ? true : undefined}
                aria-describedby={props.error ? `${id}-error` : undefined}
                onChange={event => props.onChange?.(event.target.value)}
            />
        </FormGroup>
    );
}

export interface TextAreaProps extends InputBaseProps<string> {
    rows?: number;
    maxLength?: number;
}

export function TextArea(props: TextAreaProps) {
    const id = useWidgetId("textArea");
    const editable = useEditable(props.editable);
    return (
        <FormGroup name={props.name} widgetClass="mx-textarea" className={props.className} label={props.label} labelFor={id} labelId={`${id}-label`} error={props.error} errorId={`${id}-error`}>
            {!editable && props.readOnlyStyle === "text" ? (
                <p className="form-control-static">{props.value}</p>
            ) : (
                <textarea
                    id={id}
                    className="form-control mx-textarea-noresize"
                    rows={props.rows ?? 5}
                    value={props.value}
                    maxLength={props.maxLength}
                    placeholder={props.placeholder}
                    readOnly={!editable}
                    autoFocus={props.autoFocus}
                    aria-invalid={props.error ? true : undefined}
                    aria-describedby={props.error ? `${id}-error` : undefined}
                    onChange={event => props.onChange?.(event.target.value)}
                />
            )}
        </FormGroup>
    );
}

export interface CheckBoxProps extends Omit<InputBaseProps<boolean>, "placeholder"> {
    labelPosition?: "before" | "after";
}

export function CheckBox(props: CheckBoxProps) {
    const id = useWidgetId("checkBox");
    const editable = useEditable(props.editable);
    if (!editable && props.readOnlyStyle === "text") {
        return (
            <FormGroup name={props.name} widgetClass="mx-checkbox" className={props.className} label={props.label}>
                <div className="form-control-static">{props.value ? "Yes" : "No"}</div>
            </FormGroup>
        );
    }
    const input = (
        <input
            id={id}
            type="checkbox"
            checked={props.value}
            disabled={!editable}
            autoFocus={props.autoFocus}
            aria-invalid={props.error ? true : undefined}
            onChange={event => props.onChange?.(event.target.checked)}
        />
    );
    return (
        <FormGroup
            name={props.name}
            widgetClass="mx-checkbox"
            className={cx({ "label-after": props.labelPosition === "after" }, props.className)}
            label={props.labelPosition === "after" ? undefined : props.label}
            labelFor={id}
            error={props.error}
        >
            {input}
            {props.labelPosition === "after" && props.label ? (
                <label className="control-label" htmlFor={id}>
                    {props.label}
                </label>
            ) : null}
        </FormGroup>
    );
}
