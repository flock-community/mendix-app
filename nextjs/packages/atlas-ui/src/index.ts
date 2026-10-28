/**
 * @flock-community/atlas-ui: React components that render the markup of the
 * Mendix React client and its Atlas / Data Widgets, so a Mendix theme compiled
 * by `atlas-theme` styles them exactly like the original app.
 */

// Page structure
export { Page, Placeholder, ScrollContainer, LayoutGrid, Row, Column, Container, containerDesign } from "./core/layout";
export type { PageProps, ScrollContainerProps, RegionProps, LayoutGridProps, ColumnProps, ColumnWeight, ContainerProps } from "./core/layout";

// Basic widgets
export { ActionButton, DynamicText, Icon, MenuBar, atlasIcon } from "./core/basic";
export type { ActionButtonProps, ButtonStyle, DynamicTextProps, IconSpec, MenuBarProps, MenuItem } from "./core/basic";

// Forms
export { DataView, FormGroup, ValidationMessage, TextBox, TextArea, CheckBox, useDataView } from "./core/form";
export type { DataViewProps, FormGroupProps, TextBoxProps, TextAreaProps, CheckBoxProps } from "./core/form";
export { DatePicker, Calendar } from "./core/datepicker";
export type { DatePickerProps, CalendarProps } from "./core/datepicker";
export { PopupWindow } from "./core/popup";
export type { PopupWindowProps } from "./core/popup";

// Pluggable widgets
export { Datagrid } from "./widgets/datagrid/Datagrid";
export type { DatagridColumn, DatagridProps, DatagridLabels } from "./widgets/datagrid/Datagrid";
export { useColumnFilter } from "./widgets/datagrid/context";
export type { GridAttribute, AttributeType, ColumnFilterContextValue } from "./widgets/datagrid/context";
export { TextFilter, textCondition } from "./widgets/filters/TextFilter";
export type { TextFilterProps, TextFilterType } from "./widgets/filters/TextFilter";
export { DropdownFilter } from "./widgets/filters/DropdownFilter";
export type { DropdownFilterProps } from "./widgets/filters/DropdownFilter";
export { DateFilter, dateCondition } from "./widgets/filters/DateFilter";
export type { DateFilterProps, DateFilterType } from "./widgets/filters/DateFilter";
export { Combobox } from "./widgets/Combobox";
export type { ComboboxProps, ComboboxOption } from "./widgets/Combobox";
export { LanguageSelector } from "./widgets/LanguageSelector";
export type { LanguageSelectorProps, Language } from "./widgets/LanguageSelector";

// Data
export { useListValue } from "./data/list";
export type { ListValue, ListQuery, ListPage, SortInstruction, SortDirection, ListValueOptions } from "./data/list";
export type { FilterCondition, FilterValue } from "./data/filters";

/** The stylesheets atlas-theme writes, in the order Mendix loads them. */
export const atlasStylesheets = ["/theme.compiled.css", "/widgets/widgets.css", "/mxicons/icons.css"] as const;
