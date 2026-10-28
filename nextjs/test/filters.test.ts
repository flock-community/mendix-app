import assert from "node:assert/strict";
import { test } from "node:test";
import { and, compare, conditionToSql, empty, FilterError, or, type AttributeColumns } from "../packages/atlas-ui/src/data/filters";

const columns: AttributeColumns = {
    Title: { column: "title", kind: "string" },
    IsDone: { column: "is_done", kind: "boolean" },
    DueDate: { column: "due_date", kind: "datetime" }
};

test("no condition matches everything", () => {
    assert.deepEqual(conditionToSql(undefined, columns), { sql: "1 = 1", params: [] });
});

test("contains is a LIKE with the text escaped and bound", () => {
    const { sql, params } = conditionToSql(compare("Title", "contains", "50%_off\\"), columns);
    assert.equal(sql, "title LIKE ? ESCAPE '\\'");
    assert.deepEqual(params, ["%50\\%\\_off\\\\%"]);
});

test("groups nest and keep their parameters in order", () => {
    const condition = and(compare("IsDone", "equals", true), or(compare("Title", "startsWith", "a"), empty("Title")));
    const { sql, params } = conditionToSql(condition, columns);
    assert.equal(sql, "(is_done = ? AND (title LIKE ? ESCAPE '\\' OR (title IS NULL OR title = '')))");
    assert.deepEqual(params, [1, "a%"]);
});

test("dates are compared as instants", () => {
    const { sql, params } = conditionToSql(compare("DueDate", "greaterEqual", "2031-03-10T00:00:00.000Z"), columns);
    assert.equal(sql, "due_date >= ?");
    assert.deepEqual(params, [Date.parse("2031-03-10T00:00:00.000Z")]);
});

test("an attribute the server does not list is refused", () => {
    assert.throws(() => conditionToSql(compare("owner_id", "equals", 1), columns), FilterError);
    assert.throws(() => conditionToSql(compare("__proto__", "equals", 1), columns), FilterError);
});

test("an unknown operator is refused", () => {
    assert.throws(() => conditionToSql({ op: "like; DROP TABLE x" as never, attr: "Title", value: "x" }, columns), FilterError);
});

test("text operators need a string attribute", () => {
    assert.throws(() => conditionToSql(compare("IsDone", "contains", "1"), columns), FilterError);
});
