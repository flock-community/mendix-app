"use client";

import { createContext, useContext, useState, type CSSProperties, type ReactNode } from "react";
import { cx, mxName } from "../util/cx";
import { useWidgetId } from "../util/useId";

/**
 * Data view and input widgets. A labelled input renders the way Mendix does.
 * In a data view with a horizontal form (Mendix's default, label width 3):
 *
 *   <div class="mx-name-x mx-textbox form-group [has-error]">
 *     <label class="control-label col-sm-3" for="…">Label</label>
 *     <div class="col-sm-9">
 *       <input class="form-control" …>
 *       <div class="alert alert-danger mx-validation-message">…</div>
 *     </div>
 *   </div>
 *
 * Elsewhere (a grid cell, a vertical form) the label sits above the input and
 * the group is "form-group no-columns", without the column wrapper. Without
 * a label the form-group classes are dropped, except on check boxes.
 */

// ---------------------------------------------------------------------------
// Data view
// ---------------------------------------------------------------------------

interface DataViewContextValue {
    editable: boolean;
    /** The data view's form layout; undefined outside a data view. */
    form?: { orientation: "horizontal" | "vertical"; labelWidth: number };
}

const DataViewContext = createContext<DataViewContextValue>({ editable: true });

export function useDataView(): DataViewContextValue {
    return useContext(DataViewContext);
}

export interface DataViewProps {
    name: string;
    className?: string;
    editable?: boolean;
    /** Mendix's default is a horizontal form with labels 3 of 12 columns wide. */
    formOrientation?: "horizontal" | "vertical";
    labelWidth?: number;
    footer?: ReactNode;
    children: ReactNode;
}

export function DataView({ name, className, editable = true, formOrientation = "horizontal", labelWidth = 3, footer, children }: DataViewProps) {
    return (
        <DataViewContext.Provider value={{ editable, form: { orientation: formOrientation, labelWidth } }}>
            <div className={cx("mx-dataview", mxName(name), formOrientation === "horizontal" ? "form-horizontal" : "form-vertical", className)}>
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
    /** Render as a form group even without a label, as Mendix does for check boxes. */
    group?: boolean;
    /** The label follows the input (check boxes): in a horizontal form both sit in the offset input column. */
    labelAfter?: boolean;
    children: ReactNode;
}

export function FormGroup({ name, widgetClass, className, label, labelFor, labelId, error, errorId, group, labelAfter, children }: FormGroupProps) {
    const { form } = useDataView();
    const horizontal = form?.orientation === "horizontal";
    const labelWidth = form?.labelWidth ?? 3;
    const hasLabel = label !== undefined && label !== null && label !== "";
    const grouped = group || hasLabel;
    const labelElement = hasLabel ? (
        <label className={cx("control-label", { [`col-sm-${labelWidth}`]: horizontal && !labelAfter })} id={labelAfter ? undefined : labelId} htmlFor={labelFor}>
            {label}
        </label>
    ) : null;
    const errorElement = error ? <ValidationMessage id={errorId}>{error}</ValidationMessage> : null;
    const body = labelAfter ? (
        <>
            {children}
            {labelElement}
            {errorElement}
        </>
    ) : (
        <>
            {children}
            {errorElement}
        </>
    );
    return (
        <div className={cx(mxName(name), widgetClass, className, { "form-group": grouped, "no-columns": grouped && !horizontal, "has-error": !!error })}>
            {!labelAfter && labelElement}
            {horizontal && grouped ? (
                <div className={cx(`col-sm-${12 - labelWidth}`, { [`col-sm-offset-${labelWidth}`]: labelAfter || !hasLabel })}>{body}</div>
            ) : (
                body
            )}
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

/**
 * The text being typed into an input. Like Mendix's text box and text area
 * ("apply changes when the user leaves the field"), the value is passed on
 * when the input loses focus, not on every key stroke.
 */
function useDraft(value: string, onChange: ((value: string) => void) | undefined) {
    const [draft, setDraft] = useState<string | null>(null);
    return {
        value: draft ?? value,
        onChange: (next: string) => setDraft(next),
        onBlur: () => {
            if (draft !== null && draft !== value) onChange?.(draft);
            setDraft(null);
        }
    };
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
    const draft = useDraft(props.value, props.onChange);
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
                value={draft.value}
                maxLength={props.maxLength}
                placeholder={props.placeholder}
                autoComplete={props.autoComplete ?? "on"}
                autoFocus={props.autoFocus}
                readOnly={!editable}
                aria-readonly={!editable || undefined}
                aria-invalid={props.error ? true : undefined}
                aria-describedby={props.error ? `${id}-error` : undefined}
                onChange={event => draft.onChange(event.target.value)}
                onBlur={draft.onBlur}
            />
        </FormGroup>
    );
}

export interface TextAreaProps extends InputBaseProps<string> {
    /** Mendix sets no rows attribute; the browser shows two lines. */
    rows?: number;
    maxLength?: number;
    /** The model's "number of lines", passed on as --suggested-height (Mendix: 70px). */
    suggestedHeight?: number;
}

export function TextArea(props: TextAreaProps) {
    const id = useWidgetId("textArea");
    const editable = useEditable(props.editable);
    const draft = useDraft(props.value, props.onChange);
    return (
        <FormGroup name={props.name} widgetClass="mx-textarea" className={props.className} label={props.label} labelFor={id} labelId={`${id}-label`} error={props.error} errorId={`${id}-error`}>
            {!editable && props.readOnlyStyle === "text" ? (
                <p className="form-control-static">{props.value}</p>
            ) : (
                <textarea
                    id={id}
                    className="form-control mx-textarea-input mx-textarea-noresize"
                    style={{ "--suggested-height": `${props.suggestedHeight ?? 70}px` } as CSSProperties}
                    rows={props.rows}
                    value={draft.value}
                    maxLength={props.maxLength}
                    placeholder={props.placeholder}
                    readOnly={!editable}
                    autoFocus={props.autoFocus}
                    aria-invalid={props.error ? true : undefined}
                    aria-describedby={props.error ? `${id}-error` : undefined}
                    onChange={event => draft.onChange(event.target.value)}
                    onBlur={draft.onBlur}
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
    // Mendix puts a check box's label after the box unless told otherwise.
    const labelPosition = props.labelPosition ?? "after";
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
            className={cx({ "label-after": labelPosition === "after" }, props.className)}
            label={props.label}
            labelFor={id}
            error={props.error}
            group
            labelAfter={labelPosition === "after"}
        >
            {input}
        </FormGroup>
    );
}
