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
    const c = window.RitualsCore, S = { riseStart: "05:00", shutdownStart: "20:00" };
    const at = (day, h, m) => c.modeFor(new Date(2026, 8, day, h, m), S);
    return [at(7, 8, 0), at(7, 12, 30), at(7, 17, 0), at(7, 21, 0), at(7, 3, 30), at(7, 18, 0)];
  });
  // Close-the-loop was cut 2026-09-16: the old 16:00-20:00 window is the front door.
  assert.deepEqual(r, ["rise", "off", "off", "shutdown", "shutdown", "off"]);
});
test("core: modeFor weekend → no scheduled ritual (front door), Shutdown at night", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore, S = { riseStart: "05:00", spStart: "16:00", shutdownStart: "20:00" };
    return [c.modeFor(new Date(2026, 8, 6, 9, 0), S), c.modeFor(new Date(2026, 8, 5, 22, 0), S), c.modeFor(new Date(2026, 8, 6, 13, 0), S)];
  });
  // Weekends carry no review concept any more — reviews live in Obsidian (see DESIGN.md).
  assert.deepEqual(r, ["off", "shutdown", "off"]);
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

test("core: phrases are hard-coded constants; no phrase fields remain in settings", async (page) => {
  const d = await page.evaluate(() => {
    const c = window.RitualsCore;
    localStorage.removeItem("rituals:settings");
    return { rise: c.PHRASES.rise, shutdown: c.PHRASES.shutdown, scaries: c.PHRASES.scaries,
             hasPhraseField: "openPhrase" in c.settings() };
  });
  assert.deepEqual([d.rise, d.shutdown, d.scaries], ["Fabricati diem.", "All's well.", "CATS ARE NICE."]);
  assert.equal(d.hasPhraseField, false);
});
test("dom: stale saved phrase from the editable era is ignored (regression: cached-shell bug)", async (page) => {
  // Simulate a user whose localStorage still holds old phrase values from a cached shell
  await open(page, { onboarded: "1", vaultName: "Obsidian", folder: "Daily Notes", restBase: "https://127.0.0.1:27124", token: "",
    openPhrase: "STALE OPEN", closePhrase: "STALE CLOSE", scariesPhrase: "STALE RESCUE" });
  await page.click('nav.seg button[data-mode="rise"]');
  const rise = await page.evaluate(() => document.getElementById("rise-phrase").textContent);
  assert.equal(rise, "Fabricati diem.");
  await page.click('nav.seg button[data-mode="shutdown"]');
  const sh = await page.evaluate(() => document.getElementById("sh-phrase").textContent);
  assert.equal(sh, "All's well.");
  await page.click("#rescue-btn");
  const sc = await page.evaluate(() => document.getElementById("sc-phrase").textContent);
  assert.equal(sc, "CATS ARE NICE.");
  // Settings no longer exposes phrase inputs
  const ids = await page.evaluate(() => Array.from(document.querySelectorAll("#v-settings input")).map(i => i.id));
  assert.ok(!ids.some(id => id.includes("phrase")), "no phrase inputs in settings");
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

/* ============ evening menu (Dibbler's Eatery) ============ */
test("menu: blockFor evening omits empty ratings, carries chosen ones", async (page) => {
  const b = await page.evaluate(() => window.RitualsCore.blockFor("evening", { item: "Walk with Henry", energy: 0, engage: 4 }));
  assert.match(b, /^## Evening/);
  assert.match(b, /Evening:: Walk with Henry/);
  assert.ok(!b.includes("Energy:: 0"), "zero energy not written");
  assert.match(b, /Engage:: 4\/5/);
});
test("menu: same date + same ratings → same specials; different dates rotate; house + 4 sections", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore, none = {};
    const a = c.menuFor("2026-09-14", none);
    const b = c.menuFor("2026-09-14", none);
    const c2 = c.menuFor("2026-09-15", none);
    return {
      sameDateSame: a.specials.map(i => i.id).join(",") === b.specials.map(i => i.id).join(","),
      rotates: a.specials.map(i => i.id).join(",") !== c2.specials.map(i => i.id).join(","),
      twoSpecials: a.specials.length,
      house: a.house.id,
      sections: a.sections.length,
      freeItem: c.MENU.sections[3].items.some(i => i.id === "nothing" && i.cost === 0)
    };
  });
  assert.equal(r.sameDateSame, true);
  assert.equal(r.rotates, true);
  assert.equal(r.twoSpecials, 2);
  assert.equal(r.house, "walk-henry");
  assert.equal(r.sections, 4);
  assert.equal(r.freeItem, true);
});
test("menu: low-engagement dish gets 86'd off the specials rotation", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore;
    const ratings = { trivia: { n: 3, sum: 3 } };   // avg engagement 1.0 → 86'd (Tue: trivia eligible)
    const m = c.menuFor("2026-09-15", ratings);
    return { excluded: !m.specials.some(i => i.id === "trivia"), named: !!(m.eightySix && m.eightySix.id === "trivia") };
  });
  assert.equal(r.excluded, true);
  assert.equal(r.named, true);
});
test("menu: recordRating accumulates engagement for the learning loop", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore;
    c.store.del("rituals:menuRatings");
    c.recordRating("knit", 2, 4);
    c.recordRating("knit", 3, 5);
    const got = c.menuRatings()["knit"];
    return { n: got.n, avg: got.sum / got.n };
  });
  assert.deepEqual([r.n, r.avg], [2, 4.5]);
});
test("dom: menu view opens from nav with dusk theme and renders specials + sections", async (page) => {
  await open(page, { onboarded: "1", vaultName: "Obsidian", folder: "Daily Notes", restBase: "https://127.0.0.1:27124", token: "" });
  await page.click('nav.seg button[data-mode="menu"]');
  const theme = await page.evaluate(() => document.body.getAttribute("data-theme"));
  assert.equal(theme, "dusk");
  const info = await page.evaluate(() => ({
    active: document.getElementById("v-menu").classList.contains("active"),
    specials: document.querySelectorAll("#menu-specials-list .m-item").length,
    house: document.querySelectorAll("#menu-house .m-item").length,
    sections: document.querySelectorAll("#menu-sections .m-section").length,
    items: document.querySelectorAll("#menu-sections .m-item").length,
    orderBtns: document.querySelectorAll(".m-order").length
  }));
  assert.equal(info.active, true);
  assert.equal(info.specials, 2);
  assert.equal(info.house, 1);
  assert.equal(info.sections, 4);
  assert.ok(info.items >= 8);
  assert.equal(info.orderBtns, info.specials + info.house + info.items);
});
test("dom: ordering adds to the check without a modal; settle button counts", async (page) => {
  await open(page, { onboarded: "1", vaultName: "Obsidian", folder: "Daily Notes", restBase: "https://127.0.0.1:27124", token: "" });
  await page.click('nav.seg button[data-mode="menu"]');
  await page.click("#menu-sections .m-order");          // first section item
  const after1 = await page.evaluate(() => ({
    checkItems: document.querySelectorAll("#menu-check .check-item").length,
    settle: document.getElementById("menu-settle").textContent,
    onePanel: Array.from(document.querySelectorAll("#menu-stage .panel")).filter(p => p.classList.contains("on")).length,
    status: document.getElementById("menu-status").textContent
  }));
  assert.equal(after1.checkItems, 1);
  assert.match(after1.settle, /Settle the check \(1\)/);
  assert.equal(after1.onePanel, 1, "no modal on order");
  assert.match(after1.status, /Added the/);
  await page.click("#menu-house .m-order");              // the house classic
  const after2 = await page.evaluate(() => ({
    checkItems: document.querySelectorAll("#menu-check .check-item").length,
    settle: document.getElementById("menu-settle").textContent,
    first: document.querySelector("#menu-check .check-item span").textContent
  }));
  assert.equal(after2.checkItems, 2);
  assert.match(after2.settle, /Settle the check \(2\)/);
  assert.ok(after2.first.length > 0);
});
test("dom: settling the check rates items, writes ratings into one Evening block", async (page) => {
  await open(page, { onboarded: "1", vaultName: "Obsidian", folder: "Daily Notes", restBase: "https://127.0.0.1:27124", token: "" });
  await page.click('nav.seg button[data-mode="menu"]');
  await page.click("#menu-sections .m-order");
  await page.click("#menu-house .m-order");
  await page.click("#menu-settle");
  const settle = await page.evaluate(() => ({
    onePanel: Array.from(document.querySelectorAll("#menu-stage .panel")).filter(p => p.classList.contains("on")).length,
    items: document.querySelectorAll("#menu-settle-list .settle-item").length
  }));
  assert.equal(settle.onePanel, 1);
  assert.equal(settle.items, 2);
  await page.click('#menu-settle-list .settle-item:first-child .mood-btns[data-kind="g"] button[data-m="4"]');
  await page.click("#menu-settle-send");
  await page.waitForSelector("#menu-status-confirm .actions button", { state: "visible" });
  const block = await page.evaluate(() => {
    const c = window.RitualsCore, d = c.state()[c.iso(new Date())];
    return c.blockFor("evening", { orders: d.eveningOrders });
  });
  assert.equal(block.split("\n").filter(l => l.startsWith("Evening::")).length, 2);
  assert.match(block, /Engage:: 4\/5/);
  assert.ok(!block.includes("Energy::"), "unrated energy omitted");
  const settled = await page.evaluate(() => document.getElementById("menu-settle").textContent);
  assert.match(settled, /Check settled/);
  const ratings = await page.evaluate(() => window.RitualsCore.menuRatings());
  assert.ok(ratings["stretch"], "rated dish's engagement fed the learning loop");
});

test("menu: blockFor evening renders multiple orders in one section", async (page) => {
  const b = await page.evaluate(() => window.RitualsCore.blockFor("evening", { orders: [
    { item: "Walk with Henry", energy: 2, engage: 5 },
    { item: "Reading, Properly", energy: 0, engage: 3 }
  ]}));
  const lines = b.split("\n");
  assert.equal(lines[0], "## Evening");
  assert.equal(lines.filter(l => l.startsWith("Evening::")).length, 2);
  assert.equal(lines.filter(l => l === "## " || l === "##").length, 0, "no nested headings");
  assert.ok(b.indexOf("Evening:: Walk with Henry") < b.indexOf("Evening:: Reading, Properly"));
  assert.match(b, /Energy:: 2\/5/);
  assert.match(b, /Engage:: 3\/5/);
});
test("menu: orders accumulate in state across the evening and can be removed", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore;
    c.store.del("rituals:state");
    c.addEveningOrder({ id: "walk-henry", name: "Walk with Henry" });
    c.addEveningOrder({ id: "early", name: "Early Night" });
    const k = c.iso(new Date());
    const orders = c.state()[k].eveningOrders;
    const block = c.blockFor("evening", { orders });
    const after = c.removeEveningOrder(k, 0);
    return { n: orders.length, stanzas: block.split("\n").filter(l => l.startsWith("Evening::")).length, remaining: after.length };
  });
  assert.deepEqual([r.n, r.stanzas, r.remaining], [2, 2, 1]);
});

test("menu: chef note rotates deterministically; dish lookup finds costs", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore;
    const a = c.chefNoteFor("2026-09-14");
    const b = c.chefNoteFor("2026-09-14");
    const c2 = c.chefNoteFor("2026-09-15");
    return {
      deterministic: a === b,
      rotates: a !== c2,
      inRange: c.CHEF_NOTES.includes(a),
      walkCost: c.dishById("walk-henry").cost,
      nothingCost: c.dishById("nothing").cost,
      unknown: c.dishById("nope") === null
    };
  });
  assert.equal(r.deterministic, true);
  assert.equal(r.rotates, true);
  assert.equal(r.inRange, true);
  assert.equal(r.walkCost, 1);
  assert.equal(r.nothingCost, 0);
  assert.equal(r.unknown, true);
});
test("dom: menu shows the chef's note; settling renders a receipt with totals", async (page) => {
  await open(page, { onboarded: "1", vaultName: "Obsidian", folder: "Daily Notes", restBase: "https://127.0.0.1:27124", token: "" });
  await page.click('nav.seg button[data-mode="menu"]');
  const info = await page.evaluate(() => ({
    note: document.getElementById("menu-chef-note").textContent,
    cat: document.querySelector(".check-box .cat") !== null
  }));
  assert.ok(info.note.length > 10, "chef's note rendered");
  assert.equal(info.cat, true, "eatery cat present");
  // order two items, settle, render receipt via the exposed hook (panel 2 is off-view without a successful REST log)
  await page.click("#menu-sections .m-order");
  await page.click("#menu-house .m-order");
  await page.click("#menu-settle");
  await page.click("#menu-settle-send");
  await page.waitForSelector("#menu-status-confirm .actions button", { state: "visible" });
  const receipt = await page.evaluate(() => {
    window.RitualsCore.renderReceipt();
    return document.getElementById("menu-receipt").textContent;
  });
  assert.match(receipt, /Dibbler's Eatery/);
  assert.match(receipt, /Total/);
  assert.ok(receipt.includes("⚡"), "priced lines on the receipt");
  assert.ok(receipt.includes("genuinely genuine"), "house motto on the receipt");
});

test("trivia: only suggested when a Peckham-area pub is actually running it", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore;
    const isoOf = d => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    const mon = c.triviaTonight("2026-09-14");   // Monday
    const tue = c.triviaTonight("2026-09-15");   // Tuesday
    let neverMon = true, someTue = false;
    for (let i = 0; i < 42; i++) {
      const d = new Date(2026, 8, 1 + i);
      const iso = isoOf(d);
      const picks = c.menuFor(iso, {}).specials.map(x => x.id);
      if (d.getDay() === 1 && picks.includes("trivia")) neverMon = false;
      if (d.getDay() === 2 && picks.includes("trivia")) someTue = true;
    }
    return { mon: mon.length, tue: tue.length, tueVenues: tue.map(v => v.pub), neverMon, someTue };
  });
  assert.equal(r.mon, 0, "no trivia Monday");
  assert.equal(r.tue, 4, "four venues Tuesday");
  assert.ok(r.tueVenues.includes("The Prince of Peckham"));
  assert.equal(r.neverMon, true, "trivia never rotates in on Mondays");
  assert.equal(r.someTue, true, "trivia does rotate in on Tuesdays");
});
test("dom: trivia row names the night's venues when it appears", async (page) => {
  await open(page, { onboarded: "1", vaultName: "Obsidian", folder: "Daily Notes", restBase: "https://127.0.0.1:27124", token: "" });
  await page.click('nav.seg button[data-mode="menu"]');
  const triviaDesc = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("#menu-specials-list .m-item"));
    const t = rows.find(r => r.querySelector(".m-name").textContent === "Trivia Night");
    return t ? t.querySelector(".m-desc").textContent : null;
  });
  if (triviaDesc !== null) assert.match(triviaDesc, /On tonight at/);
  // else: gate correctly kept trivia off the board on whatever day this ran
});

test("menu: off-menu entries aggregate into patterns for future menu items", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore;
    c.store.del("rituals:offmenu");
    c.logOffmenuOrder("walk to the library", 1, 4);
    c.logOffmenuOrder("Walk to the library!", 2, 5);
    c.logOffmenuOrder("one-off thing", 0, 0);      // unrated → doesn't teach
    return c.offmenuPatterns();
  });
  assert.equal(r.length, 1);
  assert.deepEqual([r[0].n, Math.round(r[0].avg * 10) / 10], [2, 4.5]);
  assert.match(r[0].text, /Walk to the library/i);
});
test("dom: off-menu order joins the check and its rating feeds the off-menu log only", async (page) => {
  await open(page, { onboarded: "1", vaultName: "Obsidian", folder: "Daily Notes", restBase: "https://127.0.0.1:27124", token: "" });
  await page.click('nav.seg button[data-mode="menu"]');
  await page.click("#menu-offmenu");
  const panel = await page.evaluate(() => {
    const on = Array.from(document.querySelectorAll("#menu-stage .panel")).filter(p => p.classList.contains("on"));
    return { one: on.length === 1, hasInput: !!document.getElementById("menu-off-text") };
  });
  assert.equal(panel.one, true);
  assert.equal(panel.hasInput, true);
  await page.fill("#menu-off-text", "repot the fig");
  await page.click("#menu-off-add");
  const added = await page.evaluate(() => ({
    checkItems: document.querySelectorAll("#menu-check .check-item").length,
    first: document.querySelector("#menu-check .check-item span").textContent,
    status: document.getElementById("menu-status").textContent
  }));
  assert.equal(added.checkItems, 1);
  assert.equal(added.first, "repot the fig");
  assert.match(added.status, /Added/);
  // settle with an engagement rating → off-menu log gets it, rotation store doesn't
  await page.click("#menu-settle");
  await page.click('#menu-settle-list .settle-item:first-child .mood-btns[data-kind="g"] button[data-m="5"]');
  await page.click("#menu-settle-send");
  await page.waitForSelector("#menu-status-confirm .actions button", { state: "visible" });
  const res = await page.evaluate(() => {
    const c = window.RitualsCore;
    const d = c.state()[c.iso(new Date())];
    return {
      block: c.blockFor("evening", { orders: d.eveningOrders }),
      patterns: c.offmenuPatterns(),
      rotationKeys: Object.keys(c.menuRatings())
    };
  });
  assert.match(res.block, /Evening:: repot the fig/);
  assert.match(res.block, /Engage:: 5\/5/);
  assert.equal(res.patterns.length, 1);
  assert.equal(res.patterns[0].n, 1);
  assert.equal(res.rotationKeys.length, 0, "off-menu ratings never touch the rotation store");
});

test("write-safety: the 2026-09-14 overwrite can never happen again", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore;
    const note = "# Summary:: good day\n\n## Work\nstuff\n\n## Shutdown\n\nOpenLoop:: x\n";
    const block = c.blockFor("evening", { orders: [{ item: "Walk with Henry", engage: 4 }] });
    // the bug: an empty read produced a merged content of just the block
    const emptyReadRisk = c.assertNoteSafe("", block, "Evening");
    // the bug: a merge that drops the original headings must refuse
    const merged = c.upsertInContent(note, "Evening", block);
    const mergedRisk = c.assertNoteSafe(note, merged, "Evening");
    // the append path is safe and passes the guard
    return {
      emptyReadRisk: !!emptyReadRisk,
      mergedKeepsAll: merged.includes("## Work") && merged.includes("## Shutdown") && merged.includes("Evening:: Walk with Henry"),
      mergedRisk
    };
  });
  assert.equal(r.emptyReadRisk, true, "empty read refuses");
  assert.equal(r.mergedKeepsAll, true, "upsert preserves siblings");
  assert.equal(r.mergedRisk, null, "legit append passes the guard");
});
test("write-safety: heading loss is refused, replacement of one section passes", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore;
    const note = "# Summary:: x\n\n## Rise\n\nOneThing:: A\n\n## Work\nkept\n";
    const replaced = c.upsertInContent(note, "Rise", "## Rise\n\nOneThing:: B\n\n");
    const dropped = c.assertNoteSafe(note, "## Evening\n\nEvening:: x\n", "Evening");   // only the block — the bug shape
    return {
      replaceOK: c.assertNoteSafe(note, replaced, "Rise"),
      keepWork: replaced.includes("## Work") && replaced.includes("kept"),
      droppedRefused: !!dropped
    };
  });
  assert.equal(r.replaceOK, null, "single-section replacement is safe");
  assert.equal(r.keepWork, true);
  assert.equal(r.droppedRefused, true, "note replaced by a single block refuses");
});
test("write-safety: H1 '# Evening' is replaced (normalised) not duplicated — Monday's note shape", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore;
    const note = "# Summary:: x\n\n## Work\nstuff\n\n# Evening\n\nEvening:: Walk with Henry\nEnergy:: 2/5\n";
    const block = c.blockFor("evening", { orders: [{ item: "Walk with Henry", energy: 2, engage: 5 }] });
    const merged = c.upsertInContent(note, "Evening", block);
    const risk = c.assertNoteSafe(note, merged, "Evening");
    return {
      replaced: !/^# Evening$/m.test(merged),
      hasH2: merged.includes("## Evening"),
      count: (merged.match(/^#{1,3} Evening$/m) || []).length,
      workKept: merged.includes("## Work"),
      risk
    };
  });
  assert.equal(r.replaced, true, "H1 section replaced");
  assert.equal(r.hasH2, true, "normalised to H2");
  assert.equal(r.count, 1, "exactly one Evening section");
  assert.equal(r.workKept, true, "siblings untouched");
  assert.equal(r.risk, null, "H1->H2 replacement passes the guard");
});
test("write-safety: parseOpenLoops terminates Shutdown at an H1 boundary", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore;
    const note = "# Summary:: x\n\n## Shutdown\n\nOpenLoop:: one, two\nCarryover:: one, two\n\n# Evening\n\nEvening:: Sofa + Show\n";
    const res = c.parseOpenLoops(note);
    return { open: res.open, carry: res.carry };
  });
  assert.equal(r.open, "one, two");
  assert.deepEqual(r.carry, ["one", "two"]);
});
test("save-integrity: pending block survives until confirmed; markLogged clears it", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore;
    c.store.del("rituals:pending"); c.store.del("rituals:state");
    const block = c.blockFor("evening", { orders: [{ item: "Walk with Henry", engage: 4 }] });
    c.pendingSave("evening", "2026-09-15", block);
    const saved = c.pendingGet();
    c.markLogged("evening", "2026-09-15");
    const cleared = c.pendingGet();
    const logged = c.state()["2026-09-15"] && c.state()["2026-09-15"].eveningLogged;
    return { kind: saved.kind, date: saved.dateISO, hasBlock: saved.block === block, cleared, logged };
  });
  assert.equal(r.kind, "evening");
  assert.equal(r.date, "2026-09-15");
  assert.equal(r.hasBlock, true);
  assert.equal(r.cleared, null, "confirm clears the pending block");
  assert.equal(r.logged, "1", "confirm marks the day logged");
});
test("save-integrity: deepLinkURI appends to the rescued date, not today", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore;
    const uri = c.deepLinkURI({ vaultName: "Obsidian" }, "evening", "## Evening\n\nEvening:: x\n", "2026-09-15");
    return uri;
  });
  assert.ok(r.startsWith("obsidian://new?vault=Obsidian&file=Daily%20Notes%2F2026-09-15&append=true&content="));
  assert.ok(!r.includes("2026-09-16"), "not today's date");
});
test("save-integrity: hasSection matches any heading level", async (page) => {
  const r = await page.evaluate(() => {
    const c = window.RitualsCore;
    return {
      h1: c.hasSection("# Evening\n\nEvening:: x\n", "Evening"),
      h2: c.hasSection("## Evening\n\nEvening:: x\n", "Evening"),
      h3: c.hasSection("### Evening\n", "Evening"),
      none: c.hasSection("## Work\n", "Evening"),
      special: c.hasSection("## Don't Panic\n", "Don't Panic")
    };
  });
  assert.deepEqual(r, { h1: true, h2: true, h3: true, none: false, special: true });
});
test("save-integrity: settle button shows honest pending state, not a false ✓", async (page) => {
  await open(page, { onboarded: "1", vaultName: "Obsidian", folder: "Daily Notes", restBase: "https://127.0.0.1:27124", token: "" });
  await page.click('nav.seg button[data-mode="menu"]');
  await page.click("#menu-sections .m-order");
  await page.click("#menu-house .m-order");
  await page.click("#menu-settle");
  await page.click("#menu-settle-send");
  await page.waitForSelector("#menu-status-confirm .actions button", { state: "visible" });
  const state = await page.evaluate(() => {
    const c = window.RitualsCore, d = c.state()[c.iso(new Date())];
    const btn = document.getElementById("menu-settle");
    return {
      btnText: btn.textContent,
      pending: !!(c.pendingGet() && c.pendingGet().block),
      settled: d.eveningSettled === "1",
      logged: d.eveningLogged
    };
  });
  assert.match(state.btnText, /save pending/i, "button admits the save is pending");
  assert.equal(state.pending, true, "block kept in pending after failed REST (no token)");
  assert.equal(state.settled, true, "check settled locally");
  assert.equal(state.logged, undefined, "NOT marked logged — no false ✓");
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
