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
    return st && document.querySelector("#rise-status button");
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
  assert.equal(d.open, "Fabricati diem.");
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
  assert.match(phraseOn.phrase, /CATS ARE NICE/i);
  // logged section header should be the rebranded name
  const header = await page.evaluate(() => {
    const c = window.RitualsCore;
    return c.blockFor("scaries", { scDread: "x", scLikely: "Possible", scCope: "", scFirst: "", scPark: "", phrase: "CATS ARE NICE." }).split("\n")[0];
  });
  assert.equal(header, "## Don't Panic");
  // no token → log fallback buttons appear
  await page.click("#sc-log");
  await page.waitForSelector("#sc-status .actions button", { state: "visible" });
  const hasOpen = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#sc-status button")).some(b => b.textContent.includes("Open in Obsidian")));
  assert.equal(hasOpen, true);
});

/* ---------- weekly review ---------- */
test("review: isoWeekId/weekDates match ISO-8601, weeks run Mon–Sun", async (page) => {
  const r = await page.evaluate(() => {
    const C = window.RitualsCore;
    const cases = { "2026-09-10": "2026-W37", "2026-09-06": "2026-W36", "2026-01-01": "2026-W01",
                    "2027-01-01": "2026-W53", "2026-12-31": "2026-W53" };
    const out = { bad: [], monday: [], sunday: [] };
    for (const [d, want] of Object.entries(cases)) {
      const got = C.isoWeekId(d);
      if (got !== want) out.bad.push(d + " -> " + got + " (want " + want + ")");
    }
    for (let i = 0; i < 400; i++) {
      const d = new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().slice(0, 10);
      const ds = C.weekDates(C.isoWeekId(d));
      if (!ds || ds.indexOf(d) === -1) out.bad.push("roundtrip " + d);
      if (new Date(ds[0] + "T00:00:00Z").getUTCDay() !== 1) out.monday.push(d);
      if (new Date(ds[6] + "T00:00:00Z").getUTCDay() !== 0) out.sunday.push(d);
    }
    out.w36 = C.weekDates("2026-W36");
    return out;
  });
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.monday, []);
  assert.deepEqual(r.sunday, []);
  assert.equal(r.w36[0], "2026-08-31");
  assert.equal(r.w36[6], "2026-09-06");
});

test("review: digest pulls Summary::/## Work/## Notes without bleeding ritual blocks", async (page) => {
  const e = await page.evaluate(() => {
    const note = [
      "---", "Title: Thursday", "---", "# Thursday, September 10th 2026",
      "Summary:: Fire drill build out of all hands deck.",
      "", "## Work", "", "### 🧭 Today", "Some plan text.", "- [x] a task", "",
      "## Notes", "", "Some notes here.", "",
      "## Rise", "", "OneThing:: ship the thing", ""
    ].join("\n");
    return window.RitualsCore.parseDigestEntry(note, "2026-09-10");
  });
  assert.equal(e.date, "2026-09-10");
  assert.match(e.summary, /Fire drill build out/);
  assert.match(e.work, /Some plan text/);
  assert.match(e.work, /a task/);
  assert.match(e.notes, /Some notes here/);
  assert.doesNotMatch(e.notes, /OneThing/);
});

test("review: template fill substitutes and round-trips through the parser", async (page) => {
  const r = await page.evaluate(() => {
    const C = window.RitualsCore;
    const tpl = "---\nTitle:\n---\n| 🗒️ [[00 Daily Notes Hub|Daily Notes Hub]] |\n\n# <% tp.file.title %>\nSummary::\n\n## What do I want to remember from this week?\n\n\n## Next week:\n\n";
    const out = C.fillWeeklyTemplate(tpl, "2026-W36", "Hot Week", "A summary.", "- remembered thing", "- next thing");
    return { out, parsed: C.parseWeeklyReview(out) };
  });
  assert.match(r.out, /^---\nTitle: Hot Week\n---/);
  assert.match(r.out, /^# 2026-W36$/m);
  assert.match(r.out, /^Summary:: A summary\.$/m);
  assert.match(r.out, /- remembered thing/);
  assert.match(r.out, /- next thing/);
  assert.equal(r.parsed.title, "Hot Week");
  assert.equal(r.parsed.summary, "A summary.");
  assert.match(r.parsed.remember, /remembered thing/);
  assert.match(r.parsed.nextWeek, /next thing/);
});

test("review: jsonFromText tolerates fences and surrounding prose", async (page) => {
  const r = await page.evaluate(() => {
    const C = window.RitualsCore;
    return [C.jsonFromText('```json\n{"title":"X","summary":"Y"}\n```'),
            C.jsonFromText('Sure!\n{"title":"A"}\nHope that helps.'),
            C.jsonFromText("no json here")];
  });
  assert.equal(r[0].title, "X");
  assert.equal(r[1].title, "A");
  assert.equal(r[2], null);
});

test("review: nav opens the view and defaults to a real ISO week", async (page) => {
  const r = await page.evaluate(() => {
    document.querySelector('nav.seg button[data-mode="review"]').click();
    return { active: document.getElementById("v-review").classList.contains("active"),
             week: document.getElementById("rv-week").textContent,
             build: !!document.getElementById("rv-build"),
             theme: document.body.getAttribute("data-theme") };
  });
  assert.equal(r.active, true);
  assert.equal(r.build, true);
  assert.match(r.week, /^\d{4}-W\d{1,2}$/);
  assert.equal(r.theme, "rise");
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
