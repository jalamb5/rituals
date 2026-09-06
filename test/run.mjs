#!/usr/bin/env node
/* Rituals scaffold tests — Playwright-core against a local static server.
   Pure-function assertions run INSIDE the page (functions do not survive
   evaluate serialization); values returned to Node are plain data.
   Run: npm test */
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MIME = { ".html": "text/html", ".js": "text/javascript", ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json", ".json": "application/json", ".css": "text/css", ".md": "text/markdown" };

function findChrome() {
  if (process.env.RITUALS_CHROME) return process.env.RITUALS_CHROME;
  const base = join(homedir(), "Library/Caches/ms-playwright");
  const cands = [];
  for (const v of ["chromium-1223", "chromium-1208"]) {
    cands.push(join(base, v, "chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"));
    cands.push(join(base, v, "chrome-mac-arm64", "Chromium.app", "Contents", "MacOS", "Chromium"));
  }
  for (const p of cands) { try { require("node:fs").statSync(p); return p; } catch {} }
  return null;
}
import { createRequire } from "node:module"; const require = createRequire(import.meta.url);

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path === "/") path = "/index.html";
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(normalize(ROOT))) { res.writeHead(403); return res.end(); }
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end("not found"); }
});

const results = [];
function test(name, fn) { results.push({ name, fn }); }

async function withPage(fn) {
  const exe = findChrome();
  if (!exe) throw new Error("No Playwright chromium found — set RITUALS_CHROME or run: npx playwright-core install chromium");
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  const ctx = await browser.newContext({ serviceWorkers: "block" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(e.message));
  try {
    await page.goto(URL_(), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.RitualsCore);
    await fn(page);
    if (errs.length) throw new Error("page error(s): " + errs.join(" | "));
  }
  finally { await browser.close(); }
}

const URL_ = () => `http://127.0.0.1:${PORT}/index.html?test=1`;
async function open(page, settings) {
  await page.goto(URL_(), { waitUntil: "domcontentloaded" });
  if (settings) {
    await page.evaluate((s) => localStorage.setItem("rituals:settings", JSON.stringify(s)), settings);
    await page.reload({ waitUntil: "domcontentloaded" });
  }
  await page.waitForFunction(() => !!window.RitualsCore);
}

/* ============ core pure functions ============ */
test("core: modeFor weekday boundaries", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore, S = { riseStart: "05:00", spStart: "16:00", shutdownStart: "20:00" };
    const at = (day, h, m) => c.modeFor(new Date(2026, 8, day, h, m), S);
    return [at(7, 8, 0), at(7, 12, 30), at(7, 17, 0), at(7, 21, 0), at(7, 3, 30), at(7, 18, 0)];
  });
  assert.deepEqual(r, ["rise", "off", "spgate", "shutdown", "shutdown", "spgate"]);
});
test("core: modeFor weekend → review in the morning", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore, S = { riseStart: "05:00", spStart: "16:00", shutdownStart: "20:00" };
    return [c.modeFor(new Date(2026, 8, 6, 9, 0), S), c.modeFor(new Date(2026, 8, 5, 22, 0), S), c.modeFor(new Date(2026, 8, 6, 13, 0), S)];
  });
  assert.deepEqual(r, ["review", "shutdown", "review"]);
});
test("core: dailyNotePath", async (page) => {
  const r = await page.evaluate(() => [window.RitualsCore.dailyNotePath("2026-09-07", "Daily Notes"), window.RitualsCore.dailyNotePath("2026-09-07")]);
  assert.deepEqual(r, ["Daily Notes/2026-09-07.md", "Daily Notes/2026-09-07.md"]);
});
test("core: blockFor rise collapses multi-line + fields", async (page) => {
  const b = await page.evaluate(() => window.RitualsCore.blockFor("rise", { head: "A\nB", oneThing: "Ship it", lookingForward: "Rain", mood: 4, phrase: "Open the day." }));
  assert.match(b, /^## Rise/);
  assert.match(b, /InHead:: A B/);
  assert.match(b, /OneThing:: Ship it/);
  assert.match(b, /Mood:: 4/);
  assert.match(b, /Phrase:: "Open the day\."/);
});
test("core: blockFor shutdown carries comma list", async (page) => {
  const b = await page.evaluate(() => window.RitualsCore.blockFor("shutdown", { open: "The launch thing", wentRight: "Walk", carryover: ["Reply Dan", "Book train"], mood: 3, phrase: "Close." }));
  assert.match(b, /^## Shutdown/);
  assert.match(b, /Carryover:: Reply Dan, Book train/);
  assert.match(b, /OpenLoop:: The launch thing/);
});
test("core: upsert appends, replaces same-day section, never clobbers siblings", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore;
    const base = "# Summary:: x\n\n## Work\nstuff\n";
    const once = c.upsertInContent(base, "Rise", "## Rise\n\nInHead:: h\n");
    const twice = c.upsertInContent(once, "Rise", "## Rise\n\nInHead:: h\n");
    const withShutdown = c.upsertInContent(once, "Shutdown", "## Shutdown\n\nWentRight:: w\n");
    const replaced = c.upsertInContent(withShutdown, "Rise", "## Rise\n\nInHead:: h2\n");
    return {
      idempotent: once === twice,
      workKept: withShutdown.includes("## Work\nstuff"),
      hasRise: withShutdown.includes("## Rise"), hasShutdown: withShutdown.includes("## Shutdown"),
      shutdownKept: replaced.includes("## Shutdown"), riseUpdated: replaced.includes("InHead:: h2"),
      endNewline: /$/.test(replaced)
    };
  });
  assert.equal(r.idempotent, true);
  assert.equal(r.workKept, true);
  assert.equal(r.hasRise && r.hasShutdown, true);
  assert.equal(r.shutdownKept, true);
  assert.equal(r.riseUpdated, true);
});
test("core: parseOpenLoops extracts carryover from yesterday note", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore;
    const content = "## Work\nstuff\n\n## Shutdown\n\nOpenLoop:: launch nerves\nWentRight:: walk\nCarryover:: Reply Dan, Book train\nMood:: 3\n";
    return c.parseOpenLoops(content);
  });
  assert.deepEqual(r.carry, ["Reply Dan", "Book train"]);
  assert.equal(r.open, "launch nerves");
});
test("core: template preview handles core + tp.date.now", async (page) => {
  const out = await page.evaluate(() => {
    const c = window.RitualsCore;
    const tpl = "[[<% tp.date.now(\"YYYY-MM-DD\", -1) %>]] | [[<% tp.date.now(\"YYYY-MM-DD\", 1) %>]]\n\n# {{date:dddd, MMMM Do YYYY}}\nSummary::";
    return c.renderTemplateForPreview(tpl, "2026-09-07");
  });
  assert.match(out, /\[\[2026-09-06\]\]/);
  assert.match(out, /\[\[2026-09-08\]\]/);
  assert.match(out, /# Monday, September 7th 2026/);
  assert.ok(!out.includes("<%"));
});

/* ============ DOM ============ */
test("dom: onboarding shows on first run", async (page) => {
  await open(page, null);
  const vis = await page.evaluate(() => {
    const el = document.getElementById("v-onboard");
    return el.classList.contains("active") && el.offsetParent !== null;
  });
  assert.equal(vis, true);
  assert.match(await page.title(), /Rituals/);
});
test("dom: onboarding begin → nav present; segments switch views", async (page) => {
  await open(page, null);
  await page.evaluate(() => {
    document.getElementById("on-vault").value = "Obsidian";
    document.getElementById("on-folder").value = "Daily Notes";
    document.getElementById("on-restbase").value = "https://127.0.0.1:27124";
    document.getElementById("on-token").value = "";
    document.getElementById("on-save").click();
  });
  await page.waitForSelector("nav.seg");
  const ok = await page.evaluate(() => window.RitualsCore.settings().onboarded === "1");
  assert.equal(ok, true);
});
test("dom: rise flow is startable from the segment and advances", async (page) => {
  await open(page, { onboarded: "1", vaultName: "Obsidian", folder: "Daily Notes", restBase: "https://127.0.0.1:27124", token: "" });
  await page.click('nav.seg button[data-mode="rise"]');
  const intro = await page.evaluate(() => {
    const on = Array.from(document.querySelectorAll("#rise-flow .panel")).filter(p => p.classList.contains("on"));
    return { count: on.length, hasBegin: !!document.getElementById("rise-begin") };
  });
  assert.equal(intro.count, 1);          // exactly one panel at a time
  assert.equal(intro.hasBegin, true);    // starts at the intro
  await page.click("#rise-begin");
  const advanced = await page.evaluate(() => {
    // after Begin we should have left the intro (intro step-0 panel now off)
    const introPanel = document.querySelector('#rise-flow .panel[data-step="0"]');
    const on = Array.from(document.querySelectorAll("#rise-flow .panel")).filter(p => p.classList.contains("on"));
    return { introOff: !introPanel.classList.contains("on"), count: on.length };
  });
  assert.equal(advanced.introOff, true);
  assert.equal(advanced.count, 1);       // still one panel at a time
});
test("dom: full rise run marks today logged (no REST → copy fallback offered)", async (page) => {
  await open(page, { onboarded: "1", vaultName: "Obsidian", folder: "Daily Notes", restBase: "https://127.0.0.1:27124", token: "tok" });
  await page.click('nav.seg button[data-mode="rise"]');
  await page.click("#rise-begin");
  // step 1 = carry-in (clean slate) → Continue
  await page.click("#rise-carry-next");
  await page.fill("#rise-head", "noise noise");
  await page.click("#rise-head-next");
  await page.fill("#rise-thing", "Ship the scaffold");
  await page.click("#rise-thing-next");
  await page.fill("#rise-forward", "Rain on the window");
  await page.click("#rise-forward-next");
  await page.click("#rise-log");
  await page.waitForFunction(() => {
    const st = document.getElementById("rise-status");
    return st && st.classList.contains("err") && document.querySelector("#rise-status button");
  });
  const got = await page.evaluate(() => {
    const d = window.RitualsCore.state()[window.RitualsCore.iso(new Date())] || {};
    return { oneThing: d.oneThing, fallbackShown: !!document.querySelector("#rise-status button") };
  });
  assert.equal(got.oneThing, "Ship the scaffold");
  assert.equal(got.fallbackShown, true);
});

test("dom: mode-driven daylight/night theme follows the view", async (page) => {
  await open(page, { onboarded: "1", vaultName: "Obsidian", folder: "Daily Notes", restBase: "https://127.0.0.1:27124", token: "" });
  // rise → dawn, sun visible
  await page.click('nav.seg button[data-mode="rise"]');
  let theme = await page.evaluate(() => document.body.getAttribute("data-theme"));
  assert.equal(theme, "rise");
  let sun = await page.evaluate(() => { const s = document.querySelector(".lamp .sun"); return getComputedStyle(s).display; });
  assert.notEqual(sun, "none");
  // shutdown → night, sun gone
  await page.click('nav.seg button[data-mode="shutdown"]');
  theme = await page.evaluate(() => document.body.getAttribute("data-theme"));
  assert.equal(theme, "shutdown");
  sun = await page.evaluate(() => { const s = document.querySelector(".lamp .sun"); return getComputedStyle(s).display; });
  assert.equal(sun, "none");
  // dusk palette is still defined for the end-of-work cadence
  const dusk = await page.evaluate(() => { for (const s of document.styleSheets) { for (const r of s.cssRules||[]) { if (r.selectorText && r.selectorText.includes('data-theme="dusk"')) return true; } } return false; });
  assert.equal(dusk, true);
});

test("core: defaults carry over Rise/Shutdown phrases", async (page) => {
  const d = await page.evaluate(() => {
    const c = window.RitualsCore;
    localStorage.removeItem("rituals:settings");
    return { open: c.settings().openPhrase, close: c.settings().closePhrase };
  });
  assert.equal(d.open, "Here we go.");
  assert.equal(d.close, "All's well.");
});
test("dom: log fallback offers an Obsidian deep-link", async (page) => {
  await open(page, { onboarded: "1", vaultName: "Obsidian", folder: "Daily Notes", restBase: "https://127.0.0.1:27124", token: "" });
  // no token → log buttons (Open in Obsidian + Copy) appear
  await page.click('nav.seg button[data-mode="rise"]');
  await page.click("#rise-begin");
  await page.click("#rise-carry-next");
  await page.fill("#rise-head", "noise");
  await page.click("#rise-head-next");
  await page.fill("#rise-thing", "The thing");
  await page.click("#rise-thing-next");
  await page.fill("#rise-forward", "sun");
  await page.click("#rise-forward-next");
  await page.click("#rise-log");
  await page.waitForSelector("#rise-status .actions button", { state: "visible" });
  const hasOpen = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#rise-status button")).some(b => b.textContent.includes("Open in Obsidian")));
  assert.equal(hasOpen, true);
});

test("dom: sunday scaries rescue opens, walks, and logs", async (page) => {
  await open(page, { onboarded: "1", vaultName: "Obsidian", folder: "Daily Notes", restBase: "https://127.0.0.1:27124", token: "" });
  // rescue button present
  const btn = await page.$("#rescue-btn");
  assert.ok(btn, "rescue button exists");
  await page.click("#rescue-btn");
  const theme = await page.evaluate(() => document.body.getAttribute("data-theme"));
  assert.equal(theme, "scaries");
  const viewOn = await page.evaluate(() => document.getElementById("v-scaries").classList.contains("active"));
  assert.equal(viewOn, true);
  // walk through: begin → dread → likely → cope → first → park → phrase
  await page.click("#scaries-begin");
  await page.fill("#sc-dread", "the 10am with Dan");
  await page.click("#sc-dread-next");
  await page.click('#sc-likely button[data-v="Possible"]');
  await page.fill("#sc-cope", "I'd prep a few talking points");
  await page.click("#sc-cope-next");
  await page.fill("#sc-first", "draft the talking points");
  await page.click("#sc-first-next");
  await page.fill("#sc-park", "the rest");
  await page.click("#sc-park-next");
  const phraseOn = await page.evaluate(() => {
    const el = document.getElementById("sc-phrase");
    const on = Array.from(document.querySelectorAll("#scaries-flow .panel")).filter(p => p.classList.contains("on"));
    return { phrase: el.textContent, onePanel: on.length === 1 };
  });
  assert.equal(phraseOn.onePanel, true);
  assert.match(phraseOn.phrase, /okay/i);
  // no token → log fallback buttons appear
  await page.click("#sc-log");
  await page.waitForSelector("#sc-status .actions button", { state: "visible" });
  const hasOpen = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#sc-status button")).some(b => b.textContent.includes("Open in Obsidian")));
  assert.equal(hasOpen, true);
});

/* ---------- run ---------- */
const PORT = 8734;
await new Promise(res => server.listen(PORT, "127.0.0.1", res));

let pass = 0, fail = 0; const failures = [];
try {
  for (const t of results) {
    try {
      await withPage(fn => t.fn(fn));
      console.log("  ok  " + t.name); pass++;
    } catch (e) {
      fail++; failures.push({ name: t.name, err: e });
      console.error("FAIL  " + t.name + "\n      " + String(e && e.message).split("\n")[0]);
    }
  }
} finally { server.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) { for (const f of failures) console.error("\n--- " + f.name + " ---\n" + f.err.stack); process.exit(1); }
