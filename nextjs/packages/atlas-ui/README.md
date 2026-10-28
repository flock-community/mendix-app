# @flock-community/atlas-ui

Building blocks for moving a Mendix app to React while keeping its looks:

- **`atlas-theme`** turns a Mendix project's theme into static CSS and assets.
- **React components** render the markup of the Mendix React client, Atlas
  Core and the Data Widgets, so that CSS styles them exactly like the original.
- **A list data source** (`useListValue`) and a filter model with a SQL
  compiler (`conditionToSql`) stand in for Mendix's data sources and XPath.

It was extracted from the TodoApp rebuild in `../..`; that app is the worked
example.

## 1. The theme

```bash
npx atlas-theme --project path/to/mendix-project --out public
```

It writes into `public/`:

| Output | From |
|--------|------|
| `theme.compiled.css` | `themesource/*/web/main.scss` and `theme/web/main.scss`, compiled with dart-sass in MxBuild's order: Atlas_Core, then the other theme modules, then the rest, `theme/web` last |
| `widgets/widgets.css` + `widgets/com/...` | The CSS and assets inside `widgets/*.mpk` |
| `mxicons/icons.css` + fonts | The project's icon collections, read from the `.mpr` (MPR v1 and v2): one font per collection, `.<collection-class>.<prefix>-<icon>::before` per icon |
| Web root files | `theme/web/*` (except SCSS and HTML) and `themesource/*/public/*`, as Mendix deploys them |
| `login.html`, `js/login.js`, `js/login_i18n.js` | `theme/web/login.html` with `{{themecss}}` and the other placeholders filled in. The two scripts stand in for the runtime's: they post `{ action: "login", params: { username, password } }` to `xas/` and go to `?cont=` or `./` |
| `atlas-theme.json` | What was found and in which order |

Load the three stylesheets in Mendix's order, e.g. in a Next.js root layout:

```tsx
import { atlasStylesheets } from "@flock-community/atlas-ui";

{atlasStylesheets.map(href => <link key={href} rel="stylesheet" href={href} />)}
```

Wrap the app in `<body dir="ltr"><div id="content">…</div></body>`: Atlas's
full-height page rules hang off `#content > .mx-page`.

## 2. Pages

A page reads like its Mendix model. `mx-name-*` classes come from the `name`
props, which also gives tests the selectors they use against Mendix.

```tsx
<Page page="Todo.TodoItem_Overview">
    <ScrollContainer
        name="layoutContainer"
        className="layout-atlas layout-atlas-responsive-topbar"
        top={{ className: "region-topbar", children: <MenuBar name="mainMenu" items={menu} /> }}
        center={{ className: "region-content", children: <Placeholder>{content}</Placeholder> }}
    />
</Page>
```

```tsx
<LayoutGrid name="mainGrid">
    <Row>
        <Column desktop={12}>
            <DynamicText name="heading" renderMode="h2">My todos</DynamicText>
            <ActionButton name="btnNew" caption="New todo" buttonStyle="primary" onClick={create} />
        </Column>
    </Row>
</LayoutGrid>
```

A popup page is a `PopupWindow` around the popup layout's content. Inputs inside
a `DataView` render as Mendix form groups, with the validation message under
the field:

```tsx
<PopupWindow caption="Edit todo" onClose={cancel}>
    <DataView name="dvTodoItem" footer={<ActionButton name="btnSave" caption="Save" buttonStyle="primary" onClick={save} />}>
        <TextBox name="txtTitle" label="Title" value={title} error={errors.Title} onChange={setTitle} />
        <DatePicker name="dpDueDate" label="Due date" value={due} onChange={setDue} />
        <Combobox name="cbPriority" label="Priority" value={priority} options={priorities} onChange={setPriority} />
    </DataView>
</PopupWindow>
```

`ActionButton.onClick` may return a promise. The button stays disabled until
it settles, like Mendix's "disabled during action".

## 3. Data grids

```tsx
const todos = useListValue(fetchPage, { limit: 20, defaultSortOrder: [["IsDone", "asc"], ["DueDate", "asc"]] });

<Datagrid
    name="dgTodos"
    className="table-hover table-striped"
    datasource={todos}
    columns={[
        { header: "Title", attribute: { id: "Title", type: "String" }, display: t => t.Title, filter: <TextFilter name="fTitle" /> },
        { header: "Priority", attribute: { id: "Priority", type: "Enum", universe: priorities }, display: t => t.Priority, filter: <DropdownFilter name="fPriority" emptySelectionCaption="Select" /> },
        { header: "Actions", sortable: false, width: "autoFit", content: t => <ActionButton name="btnEdit" caption="Edit" onClick={() => edit(t)} /> }
    ]}
/>
```

The grid does what Data grid 2 does: it sorts by a header (asc, then desc,
then back to the data source's sort), filters per column, pages with the four
buttons, and lets the user resize, reorder and hide columns. Columns take the
widget's own options (`width: autoFill | autoFit | manual`, `hidable`,
`alignment`, `wrapText`, …).

`fetchPage(query, signal)` gets `{ offset, limit, sort, filter }`. `filter` is a
plain JSON condition tree (`and`, `or`, `equals`, `contains`, `empty`, …).
Date filters resolve day comparisons in the browser's time zone, so the server
only compares instants. On the server, compile the tree against the columns
you allow:

```ts
import { conditionToSql } from "@flock-community/atlas-ui/filters";

const { sql, params } = conditionToSql(query.filter, {
    Title: { column: "title", kind: "string" },
    DueDate: { column: "due_date", kind: "datetime" }
});
```

Unlisted attributes and unknown operators throw, and every value is a bound
parameter.

## Formatting

`@flock-community/atlas-ui/format` formats and parses values with Mendix's
locale patterns (en_US: `M/d/yyyy` and `M/d/yyyy, h:mm a`; booleans Yes/No).
Use `setLocale` for another language.

## Fidelity

The pluggable widgets follow the markup of Data grid 2 3.4, Combo box 2.5 and
Language selector 1.1, read from their packages, and use the same libraries
(downshift, floating-ui, react-datepicker). The core client widgets follow the
Mendix 11 React client as far as Atlas's CSS describes it. Check a migrated app
against the original with screenshots (see the TodoApp's `e2e/`).
