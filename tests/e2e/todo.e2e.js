// Browser walk through the Todo app as demo_user and demo_administrator:
// create (with the required-title check), toggle done, edit, delete, and that
// each user sees only their own todos.
//
// Run it through tests/verify-todo.test.sh, which signs both users in first.
// Directly: node tests/e2e/todo.e2e.js <project-dir> (app on BASE_URL, default
// http://localhost:8080). Set SCREENSHOT_DIR to keep screenshots.
const { chromium } = require('playwright');
const path = require('path');

const proj = process.argv[2] || '.';
const BASE = (process.env.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const shotDir = process.env.SCREENSHOT_DIR;

// Sessions saved by `mxcli playwright check --role <R>`, which knows the demo
// users' passwords (the model only shows them masked).
const host = new URL(BASE);
const session = user => path.join(proj, '.mxcli/playwright-check', `${host.hostname}_${host.port || 80}-${user}.json`);

// Unique titles, so a rerun against a database with data in it still works.
const tag = '#' + Date.now().toString(36);
const MILK = `Buy milk ${tag}`, DOG = `Walk the dog ${tag}`, DOG2 = `Walk the dog twice ${tag}`, ADMIN = `Admin task ${tag}`;

function ok(msg) { console.log('ok  ' + msg); }
function check(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  ok(msg);
}

const grid = page => page.locator('.widget-datagrid');
const rowWith = (page, text) => grid(page).locator('[role=row]').filter({ hasText: text });

let browser, ctx;
async function login(user) {
  if (ctx) await ctx.close();
  ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, storageState: session(user) });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror:', e.message));
  await page.goto(BASE + '/p/todos');
  await page.getByText('My todos').waitFor({ timeout: 30000 });
  await grid(page).waitFor();
  await page.waitForLoadState('networkidle');
  return page;
}

async function shot(page, name) {
  if (shotDir) await page.screenshot({ path: path.join(shotDir, name) });
}

async function fillPopup(page, { title, priority }) {
  const dlg = page.locator('.modal-dialog');
  await dlg.waitFor();
  if (title !== undefined) await dlg.getByLabel('Title').fill(title);
  if (priority) {
    // A blur on another field re-renders the form and can close a menu that
    // just opened, so open it until it says it is open.
    const cb = dlg.getByRole('combobox');
    for (let i = 0; i < 5 && await cb.getAttribute('aria-expanded') !== 'true'; i++) {
      await cb.click();
      await page.waitForTimeout(300);
    }
    await page.getByRole('option', { name: priority, exact: true }).click();
  }
  return dlg;
}

async function create(page, title, priority) {
  await page.getByRole('button', { name: 'New todo' }).click();
  const dlg = await fillPopup(page, { title, priority });
  await dlg.getByRole('button', { name: 'Save' }).click();
  await dlg.waitFor({ state: 'detached' });
  await rowWith(page, title).waitFor();
}

async function waitDone(page, title, done) {
  await page.waitForFunction(([t, d]) => {
    const row = [...document.querySelectorAll('.widget-datagrid [role=row]')].find(r => r.innerText.includes(t));
    return row && row.querySelector('input[type=checkbox]')?.checked === d;
  }, [title, done], { timeout: 10000 });
}

async function remove(page, title) {
  await rowWith(page, title).getByRole('button', { name: 'Delete' }).click();
  const confirm = page.locator('.modal-dialog').filter({ hasText: 'Are you sure you want to delete this?' });
  await confirm.getByRole('button', { name: 'OK', exact: true }).click();
  await rowWith(page, title).waitFor({ state: 'detached', timeout: 10000 });
}

(async () => {
  browser = await chromium.launch();

  // demo_user: create (with validation), toggle, edit
  let page = await login('demo_user');
  ok('demo_user lands on the overview: ' + page.url());

  await page.getByRole('button', { name: 'New todo' }).click();
  const dlg = await fillPopup(page, { title: '' });
  await dlg.getByRole('button', { name: 'Save' }).click();
  await dlg.getByText('Title is required').waitFor({ timeout: 10000 });
  ok('saving without a title shows "Title is required"');
  await fillPopup(page, { title: MILK, priority: 'High' });
  await shot(page, 'new-todo.png');
  await dlg.getByRole('button', { name: 'Save' }).click();
  await dlg.waitFor({ state: 'detached' });
  await rowWith(page, MILK).waitFor();
  check((await rowWith(page, MILK).innerText()).includes('High'), 'new todo is in the grid with priority High');

  await create(page, DOG);
  check((await rowWith(page, DOG).innerText()).includes('Medium'), 'priority defaults to Medium');

  await rowWith(page, MILK).getByRole('button', { name: 'Done / undo' }).click();
  await waitDone(page, MILK, true);
  ok('"Done / undo" marks a todo done');
  // The checkbox flips first; the grid re-queries (and re-sorts) a moment later.
  await page.waitForFunction(([milk, dog]) => {
    const rows = [...document.querySelectorAll('.widget-datagrid [role=row]')].map(r => r.innerText);
    const iMilk = rows.findIndex(t => t.includes(milk)), iDog = rows.findIndex(t => t.includes(dog));
    return iDog >= 0 && iMilk > iDog;
  }, [MILK, DOG], { timeout: 10000 });
  ok('done todos sort after open ones');

  await rowWith(page, DOG).getByRole('button', { name: 'Edit' }).click();
  const edit = await fillPopup(page, { title: DOG2 });
  await edit.getByRole('button', { name: 'Save' }).click();
  await edit.waitFor({ state: 'detached' });
  await rowWith(page, DOG2).waitFor();
  ok('Edit renames the todo');
  await shot(page, 'user-list.png');

  // demo_administrator: sees none of demo_user's todos, keeps their own
  page = await login('demo_administrator');
  check(await rowWith(page, MILK).count() === 0, 'demo_administrator does not see demo_user\'s todos');
  await create(page, ADMIN);
  ok('demo_administrator can create their own todo');

  // demo_user again: still only their own; reopen and delete
  page = await login('demo_user');
  await rowWith(page, MILK).waitFor();
  check(await rowWith(page, ADMIN).count() === 0, 'demo_user does not see the administrator\'s todo');
  await rowWith(page, MILK).getByRole('button', { name: 'Done / undo' }).click();
  await waitDone(page, MILK, false);
  ok('"Done / undo" reopens a done todo');
  await remove(page, DOG2);
  ok('Delete removes the todo');

  // Clean up what is left, so reruns do not pile up rows.
  await remove(page, MILK);
  page = await login('demo_administrator');
  await remove(page, ADMIN);

  await browser.close();
  console.log('ALL CHECKS PASSED');
})().catch(e => { console.error(e.message); process.exit(1); });
