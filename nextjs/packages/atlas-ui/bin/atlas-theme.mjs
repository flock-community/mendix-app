#!/usr/bin/env node
// Turns a Mendix project's theme into the static files a non-Mendix app serves:
//
//   theme.compiled.css   the project's Atlas theme, compiled the way MxBuild does
//   widgets/widgets.css  the CSS (and assets) shipped inside the widgets/*.mpk packages
//   mxicons/icons.css    the icon fonts of the project's icon collections
//   theme/web/*, themesource/*/public/*   copied as Mendix deploys them, to the web root
//   login.html           theme/web/login.html with its {{placeholders}} filled in
//
// Usage: atlas-theme --project <mendix project dir> --out <dir>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as sass from "sass";
import { unzipSync } from "fflate";
import { decodeBson, guidFromBytes } from "../src/theme/bson.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
    const args = { project: undefined, out: undefined, quiet: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--project") args.project = argv[++i];
        else if (arg === "--out") args.out = argv[++i];
        else if (arg === "--quiet") args.quiet = true;
        else throw new Error(`Unknown argument ${arg}`);
    }
    if (!args.project || !args.out) {
        throw new Error("Usage: atlas-theme --project <mendix project dir> --out <dir>");
    }
    return { ...args, project: path.resolve(args.project), out: path.resolve(args.out) };
}

function copyTree(from, to, skip = () => false) {
    if (!fs.existsSync(from)) return 0;
    let count = 0;
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
        const source = path.join(from, entry.name);
        const target = path.join(to, entry.name);
        if (skip(source, entry)) continue;
        if (entry.isDirectory()) {
            count += copyTree(source, target, skip);
        } else {
            fs.mkdirSync(to, { recursive: true });
            fs.copyFileSync(source, target);
            count++;
        }
    }
    return count;
}

// ---------------------------------------------------------------------------
// The model: modules and icon collections, read from the .mpr (MPR v2: unit
// metadata in SQLite, unit contents in mprcontents/; v1: contents in SQLite).
// ---------------------------------------------------------------------------
async function readModel(projectDir) {
    const mpr = fs.readdirSync(projectDir).find(f => f.endsWith(".mpr"));
    if (!mpr) throw new Error(`No .mpr file in ${projectDir}`);

    // node:sqlite is still flagged experimental; keep its warning out of build logs.
    const emitWarning = process.emitWarning;
    process.emitWarning = (warning, ...rest) => {
        if (String(warning).includes("SQLite")) return;
        emitWarning.call(process, warning, ...rest);
    };
    const { DatabaseSync } = await import("node:sqlite");
    process.emitWarning = emitWarning;

    const db = new DatabaseSync(path.join(projectDir, mpr), { readOnly: true });
    const columns = db.prepare("PRAGMA table_info(Unit)").all().map(c => c.name);
    const hasContents = columns.includes("Contents");
    const rows = db.prepare(`SELECT UnitID, ContainerID, ContainmentName${hasContents ? ", Contents" : ""} FROM Unit`).all();
    db.close();

    const units = new Map();
    for (const row of rows) {
        const id = guidFromBytes(row.UnitID);
        units.set(id, {
            id,
            container: row.ContainerID ? guidFromBytes(row.ContainerID) : undefined,
            containment: row.ContainmentName,
            contents: row.Contents
        });
    }
    const load = unit => {
        if (unit.doc) return unit.doc;
        let bytes = unit.contents;
        if (!bytes) {
            const file = path.join(projectDir, "mprcontents", unit.id.slice(0, 2), unit.id.slice(2, 4), `${unit.id}.mxunit`);
            bytes = fs.readFileSync(file);
        }
        unit.doc = decodeBson(Buffer.from(bytes));
        return unit.doc;
    };
    const moduleOf = unit => {
        let current = unit;
        while (current && current.containment !== "Modules") current = units.get(current.container);
        return current ? load(current).Name : undefined;
    };

    const modules = [];
    const iconCollections = [];
    let themeModuleOrder = [];
    for (const unit of units.values()) {
        if (unit.containment === "Modules") {
            const doc = load(unit);
            modules.push({ name: doc.Name, isThemeModule: !!doc.IsThemeModule });
        }
    }
    for (const unit of units.values()) {
        if (unit.containment !== "Documents") continue;
        const doc = load(unit);
        if (doc.$Type === "CustomIcons$CustomIconCollection") {
            iconCollections.push({ module: moduleOf(unit), doc });
        }
    }
    for (const unit of units.values()) {
        if (unit.containment !== "ProjectDocuments") continue;
        const doc = load(unit);
        if (doc.$Type === "Settings$ProjectSettings") {
            const web = (doc.Settings ?? []).find(s => s?.$Type === "Forms$WebUIProjectSettingsPart");
            themeModuleOrder = (web?.ThemeModuleOrder ?? []).filter(x => typeof x === "string");
        }
    }
    return { modules, iconCollections, themeModuleOrder };
}

// MxBuild compiles theme modules first (Atlas_Core leading, then the project's
// "theme module order"), then every other module, and theme/web/main.scss last.
function themeSourceOrder(projectDir, model) {
    const dirs = fs.existsSync(path.join(projectDir, "themesource")) ? fs.readdirSync(path.join(projectDir, "themesource")) : [];
    const byDir = new Map(model.modules.map(m => [m.name.toLowerCase(), m]));
    const entries = dirs
        .filter(dir => fs.existsSync(path.join(projectDir, "themesource", dir, "web", "main.scss")))
        .map(dir => ({ dir, module: byDir.get(dir) ?? { name: dir, isThemeModule: false } }));
    const rank = entry => {
        if (entry.module.name === "Atlas_Core") return -1;
        const ordered = model.themeModuleOrder.indexOf(entry.module.name);
        return ordered >= 0 ? ordered : 1000;
    };
    const theme = entries.filter(e => e.module.isThemeModule).sort((a, b) => rank(a) - rank(b) || a.dir.localeCompare(b.dir));
    const rest = entries.filter(e => !e.module.isThemeModule).sort((a, b) => a.dir.localeCompare(b.dir));
    return [...theme, ...rest].map(e => e.dir);
}

function compileTheme(projectDir, order) {
    const imports = order.map(dir => `@import "themesource/${dir}/web/main";`);
    if (fs.existsSync(path.join(projectDir, "theme", "web", "main.scss"))) imports.push(`@import "theme/web/main";`);
    const result = sass.compileString(imports.join("\n"), {
        url: pathToFileURL(path.join(projectDir, "__atlas_theme_entry.scss")),
        loadPaths: [projectDir],
        style: "expanded",
        quietDeps: true,
        logger: sass.Logger.silent
    });
    return result.css;
}

// ---------------------------------------------------------------------------
// Pluggable widgets: their CSS and its assets, as Mendix serves them under widgets/.
// ---------------------------------------------------------------------------
function extractWidgets(projectDir, outDir) {
    const widgetsDir = path.join(projectDir, "widgets");
    if (!fs.existsSync(widgetsDir)) return [];
    const found = [];
    const css = [];
    for (const file of fs.readdirSync(widgetsDir).filter(f => f.endsWith(".mpk")).sort()) {
        const files = unzipSync(fs.readFileSync(path.join(widgetsDir, file)));
        const pkg = new TextDecoder().decode(files["package.xml"] ?? new Uint8Array());
        const version = /clientModule[^>]*version="([^"]+)"/.exec(pkg)?.[1];
        found.push({ package: file, version });
        for (const [name, bytes] of Object.entries(files)) {
            if (name.endsWith("/") || (!name.startsWith("com/") && !name.startsWith("assets/"))) continue;
            if (/\.(m?js|map|xml)$/.test(name)) continue;
            if (name.endsWith(".css")) {
                css.push(`/* ${file}: ${name} */\n${new TextDecoder().decode(bytes)}`);
                continue;
            }
            const target = path.join(outDir, "widgets", name);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, bytes);
        }
    }
    fs.mkdirSync(path.join(outDir, "widgets"), { recursive: true });
    fs.writeFileSync(path.join(outDir, "widgets", "widgets.css"), css.join("\n"));
    return found;
}

// ---------------------------------------------------------------------------
// Icon collections: one font per collection, one class per icon.
// ---------------------------------------------------------------------------
function writeIcons(model, outDir) {
    const dir = path.join(outDir, "mxicons");
    fs.mkdirSync(dir, { recursive: true });
    const css = [];
    for (const { module, doc } of model.iconCollections) {
        const family = `${module}$${doc.Name}`;
        const file = `${module}-${doc.Name}.ttf`;
        fs.writeFileSync(path.join(dir, file), Buffer.from(doc.FontData, "base64"));
        const cls = doc.CollectionClass;
        css.push(
            `@font-face {\n    font-family: "${family}";\n    src: url("./${file}") format("truetype");\n    font-weight: normal;\n    font-style: normal;\n    font-display: block;\n}`,
            `.${cls} {\n    font-family: "${family}";\n    font-style: normal;\n    font-weight: normal;\n    font-variant: normal;\n    text-transform: none;\n    line-height: 1;\n    display: inline-block;\n    -webkit-font-smoothing: antialiased;\n    -moz-osx-font-smoothing: grayscale;\n}`
        );
        for (const icon of doc.Icons ?? []) {
            if (!icon || typeof icon !== "object") continue;
            css.push(`.${cls}.${doc.Prefix}-${icon.Name}::before {\n    content: "\\${icon.CharacterCode.toString(16)}";\n}`);
        }
    }
    fs.writeFileSync(path.join(dir, "icons.css"), css.join("\n"));
    return model.iconCollections.map(c => `${c.module}.${c.doc.Name}`);
}

// ---------------------------------------------------------------------------
// The login page. Mendix fills in these placeholders when it serves login.html;
// login.js and login_i18n.js are runtime files, so default ones are supplied.
// ---------------------------------------------------------------------------
function writeLoginPage(projectDir, outDir, cachebust) {
    const source = path.join(projectDir, "theme", "web", "login.html");
    if (!fs.existsSync(source)) return false;
    const html = fs
        .readFileSync(source, "utf8")
        .replace("{{themecss}}", `<link rel="stylesheet" href="theme.compiled.css?${cachebust}" />`)
        .replace(/\{\{(appicons|manifest|startupimages)\}\}\s*/g, "")
        .replace(/\{\{cachebust\}\}/g, String(cachebust));
    fs.writeFileSync(path.join(outDir, "login.html"), html);
    for (const runtime of ["login.js", "login_i18n.js"]) {
        const target = path.join(outDir, "js", runtime);
        if (!fs.existsSync(path.join(projectDir, "theme", "web", "js", runtime))) {
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.copyFileSync(path.join(here, "..", "src", "theme", "runtime", runtime), target);
        }
    }
    return true;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const started = Date.now();
    const model = await readModel(args.project);
    const order = themeSourceOrder(args.project, model);

    fs.mkdirSync(args.out, { recursive: true });
    // Static files first, so the generated ones below win over any stale copies.
    const copied =
        copyTree(path.join(args.project, "theme", "web"), args.out, (file, entry) => entry.isFile() && (file.endsWith(".scss") || file.endsWith(".html"))) +
        order.reduce((n, dir) => n + copyTree(path.join(args.project, "themesource", dir, "public"), args.out), 0);

    fs.writeFileSync(path.join(args.out, "theme.compiled.css"), compileTheme(args.project, order));
    const widgets = extractWidgets(args.project, args.out);
    const icons = writeIcons(model, args.out);
    const login = writeLoginPage(args.project, args.out, started);

    const manifest = { generatedBy: "atlas-theme", project: path.basename(args.project), themeSourceOrder: order, widgets, iconCollections: icons, loginPage: login, copiedFiles: copied };
    fs.writeFileSync(path.join(args.out, "atlas-theme.json"), JSON.stringify(manifest, null, 2) + "\n");
    if (!args.quiet) {
        console.log(`atlas-theme: ${order.length} theme sources, ${widgets.length} widget packages, ${icons.length} icon collections -> ${path.relative(process.cwd(), args.out) || "."} (${Date.now() - started} ms)`);
    }
}

main().catch(error => {
    console.error(`atlas-theme: ${error.message}`);
    process.exit(1);
});
