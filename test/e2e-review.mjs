#!/usr/bin/env node
/* Live E2E for the weekly review: real vault, real REST, real AI suggestion.
   Runs the app from a file:// origin (the local-first path).
   Writes ONLY to a scratch folder inside the vault and cleans up after. */
import { chromium } from "playwright-core";
import { readFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const VAULT = join(homedir(), "Obsidian");
const SCRATCH = "_rituals-e2e";
const WEEK = process.argv[2] || "2026-W36";

const pluginData = JSON.parse(await readFile(
  join(VAULT, ".obsidian/plugins/obsidian-local-rest-api/data.json"), "utf8"));
const TOKEN = pluginData.apiKey;

const exe = join(homedir(), "Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const APP = pathToFileURL(join(homedir(), "repos/rituals/index.html")).href;

const browser = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await browser.newContext({ serviceWorkers: "block" });
const page = await ctx.newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message));

await page.goto(APP, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!window.RitualsCore);

await page.evaluate((s) => localStorage.setItem("rituals:settings", JSON.stringify(s)), {
  onboarded: "1", vaultName: "Obsidian", folder: "Daily Notes",
  restBase: "https://127.0.0.1:27124", token: TOKEN,
  reviewsFolder: SCRATCH + "/Reviews", reviewTemplate: "Templates/WeeklyTemplate.md",
  aiBase: "http://127.0.0.1:8645/v1", aiModel: "deepseek/deepseek-v4-flash",
  riseStart: "05:00", spStart: "16:00", shutdownStart: "20:00",
  openPhrase: "Fabricati diem.", closePhrase: "All's well.", scariesPhrase: "CATS ARE NICE."
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!window.RitualsCore);

// --- 1. build the digest from the real daily notes -------------------------
await page.evaluate((w) => window.RitualsCore.setReviewWeek(w), WEEK);
await page.click('nav.seg button[data-mode="review"]');
await page.click("#rv-build");
await page.waitForFunction(() => document.getElementById("rv-body").style.display !== "none", { timeout: 30000 });

const built = await page.evaluate(() => ({
  status: document.getElementById("rv-status").textContent,
  days: Array.from(document.querySelectorAll("#rv-digest .dg-day")).map(d => ({
    date: d.querySelector(".dg-date").textContent,
    summary: (d.querySelector(".dg-sum") || {}).textContent || ""
  })),
  prefill: { title: document.getElementById("rv-title").value,
             summary: document.getElementById("rv-summary").value }
}));
console.log("BUILD:", built.status);
console.log("DAYS :", built.days.map(d => d.date + " = " + d.summary.slice(0, 60)).join("\n       "));
assert.ok(built.days.length >= 4, "expected several days read, got " + built.days.length);
assert.ok(/read/.test(built.status), "status should report days read: " + built.status);

// --- 2. AI suggestion through the live hermes proxy ------------------------
await page.click("#rv-suggest");
await page.waitForFunction(() => {
  const t = document.getElementById("rv-ai-status").textContent;
  return t && !/Thinking/.test(t);
}, { timeout: 120000 });
const ai = await page.evaluate(() => ({
  status: document.getElementById("rv-ai-status").textContent,
  title: document.getElementById("rv-title").value,
  summary: document.getElementById("rv-summary").value }));
console.log("AI   :", ai.status, "| title:", JSON.stringify(ai.title), "| summary:", JSON.stringify(ai.summary));
assert.ok(!/No AI endpoint/.test(ai.status), "AI endpoint unreachable: " + ai.status);
assert.ok(ai.title.length > 0, "expected an AI title");

// --- 3. save the review note ----------------------------------------------
await page.click("#rv-save");
await page.waitForFunction(() => /Saved|Couldn/.test(document.getElementById("rv-save-status").textContent), { timeout: 30000 });
const saved = await page.evaluate(() => document.getElementById("rv-save-status").textContent);
console.log("SAVE :", saved);
assert.ok(/^Saved to /.test(saved), "save failed: " + saved);

// --- 4. verify what actually landed in the vault ---------------------------
const written = await readFile(join(VAULT, SCRATCH, "Reviews", WEEK + ".md"), "utf8");
console.log("----- written file -----\n" + written + "\n------------------------");
assert.match(written, /^---\nTitle: /);
assert.match(written, new RegExp("^# " + WEEK + "$", "m"));
assert.match(written, /^Summary:: .+/m);
assert.match(written, /## What do I want to remember from this week\?/);
assert.match(written, /## Next week:/);
assert.ok(!/<% tp\./.test(written), "unsubstituted Templater token left behind");

// --- cleanup ---------------------------------------------------------------
await rm(join(VAULT, SCRATCH), { recursive: true, force: true });
console.log("cleaned up scratch folder:", SCRATCH);
if (errs.length) { console.error("PAGE ERRORS:", errs.join(" | ")); process.exit(1); }
console.log("\nE2E REVIEW: PASS");
await browser.close();
