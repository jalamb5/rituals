#!/usr/bin/env node
/* Live end-to-end test: run the Rise ritual in Rituals (localhost:8021)
   against the real Obsidian vault via the Local REST API.
   Pre-trusts the plugin CA (first real use clicks through the cert warning). */
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const KEY = "4165920daa415af59d2b2354447de3ab558ef04551345c693710a0b1a0f21a5c";
const exe = join(homedir(), "Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");

// extract the CA cert the plugin generated (data.json holds it PEM-encoded)
const data = JSON.parse(readFileSync(join(homedir(), "Obsidian/.obsidian/plugins/obsidian-local-rest-api/data.json"), "utf8"));
const caPem = "-----BEGIN CERTIFICATE-----\n" + (data.crypto.cert.match(/-----BEGIN CERTIFICATE-----\s*([\s\S]*?)\s*-----END CERTIFICATE-----/) || [])[1].replace(/\r/g, "") + "\n-----END CERTIFICATE-----\n";
const certFile = "/tmp/rituals-ca.pem";
import { writeFileSync } from "node:fs";
writeFileSync(certFile, caPem);

const browser = await chromium.launch({
  executablePath: exe, headless: true,
  ignoreHTTPSErrors: true,
  args: ["--ignore-certificate-errors"]   // headless chromium: bypass local self-signed cert
});
const page = await browser.newPage();
const errs = [];
page.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
page.on("console", m => { if (m.type() === "error") errs.push("CONSOLE: " + m.text()); });

try {
  // 1. seed settings so the app is onboarded with the real REST config
  await page.goto("http://127.0.0.1:8021/index.html", { waitUntil: "domcontentloaded" });
  await page.evaluate((key) => {
    localStorage.setItem("rituals:settings", JSON.stringify({
      onboarded: "1", vaultName: "Obsidian", folder: "Daily Notes",
      restBase: "https://127.0.0.1:27124", token: key,
      openPhrase: "Open the day.", closePhrase: "Close the day properly.",
      spStart: "16:00", shutdownStart: "20:00"
    }));
    localStorage.removeItem("rituals:state");
  }, KEY);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.RitualsCore);

  // 2. what does the vault currently have for today?
  const today = await page.evaluate(() => window.RitualsCore.iso(new Date()));
  console.log("today:", today);
  const before = await page.evaluate(async (t) => {
    const c = window.RitualsCore, s = c.settings();
    try { return await c.vaultRead(s, c.dailyNotePath(t, s.folder)); }
    catch (e) { return "ERR:" + e.message; }
  }, today);
  console.log("note before run:", before === null ? "(does not exist yet)" : (JSON.stringify(before).length + " chars"));

  // 3. click into Rise and drive the flow (step 1 = carry-in, clean → continue)
  await page.click('nav.seg button[data-mode="rise"]');
  await page.waitForSelector("#rise-flow", { state: "visible" });
  // carry step visible (empty) → Continue
  const carryBtn = await page.$("#rise-carry-next");
  if (carryBtn) await carryBtn.click();
  await page.fill("#rise-head", "Live E2E brain dump — test run");
  await page.click("#rise-head-next");
  await page.fill("#rise-thing", "Verify Rituals writes to the real daily note");
  await page.click("#rise-thing-next");
  await page.fill("#rise-forward", "Sunlight and a working pipeline");
  await page.click("#rise-forward-next");
  // final step → Log
  await page.click("#rise-log");
  // wait for either success (status ok) or the copy fallback
  await page.waitForFunction(() => {
    const st = document.getElementById("rise-status");
    return st && (st.classList.contains("ok") || st.classList.contains("err") || /logged|reach|fail/i.test(st.textContent));
  }, { timeout: 20000 });

  const status = await page.evaluate(() => {
    const st = document.getElementById("rise-status");
    return { text: st.textContent, cls: st.className,
      fallbackBtn: !!document.querySelector("#rise-status button") };
  });
  console.log("status:", JSON.stringify(status));

  // 4. verify what actually landed in the vault
  const after = await page.evaluate(async (t) => {
    const c = window.RitualsCore, s = c.settings();
    return await c.vaultRead(s, c.dailyNotePath(t, s.folder));
  }, today);
  console.log("note after run:", after === null ? "(STILL MISSING!)" : (JSON.stringify(after).length + " chars"));

  if (after === null) throw new Error("daily note was not created");
  const hasRise = after.includes("## Rise");
  const hasOneThing = after.includes("Verify Rituals writes to the real daily note");
  console.log("has ## Rise:", hasRise, "| has OneThing:", hasOneThing);
  console.log("\n----- daily note tail -----\n" + after.slice(-900));

  if (!hasRise || !hasOneThing) throw new Error("ritual block not found in daily note");
  // ignore benign 404 resource noise (favicon etc.); only real errors fail the test
  const real = errs.filter(e => !/404 \(Not Found\)/.test(e) && !/favicon/i.test(e));
  assert.ok(!real.length, "no page errors: " + real.join(" | "));
  console.log("\nE2E PASS ✓");
} catch (e) {
  console.error("\nE2E FAIL:", e.message);
  if (errs.length) console.error("page errors:", errs.join(" | "));
  process.exitCode = 1;
} finally {
  await browser.close();
}
