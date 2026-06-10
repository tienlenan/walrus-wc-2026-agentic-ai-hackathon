#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (error) {
  console.error("Playwright is required. Run with Codex NODE_PATH or install it in the workspace.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const ROOT = path.resolve(__dirname, "..");
const BASE_URL = process.env.SCREENSHOT_BASE_URL || "https://roast2026wc.wal.app/";
const OUT_DIR = path.join(ROOT, "submission-pack/assets/screenshots");
const PUBLIC_OUT_DIR = path.join(ROOT, "apps/web/public/submission/screenshots");
const VIEWPORT = { width: 1440, height: 900 };

const SHOTS = [
  { file: "screenshot-home.png", hash: "", waitFor: ".newsroom", scrollTo: "body" },
  { file: "screenshot-predictions.png", hash: "#predictions", waitFor: ".predictions-desk", scrollTo: "#predictions" },
  { file: "screenshot-leaderboard.png", hash: "#leaderboard", waitFor: ".leaderboard-section", scrollTo: "#leaderboard" },
  { file: "screenshot-roasts.png", hash: "#roasts", waitFor: ".roast-wall", scrollTo: "#roasts", fullPage: true },
  { file: "screenshot-team-profiles.png", hash: "#team-profiles", waitFor: ".team-profiles", scrollTo: ".team-profiles", fullPage: true },
  { file: "screenshot-gallery.png", hash: "#gallery", waitFor: ".gallery-wall", scrollTo: ".gallery-wall" },
  { file: "screenshot-notebook.png", hash: "#notebook", waitFor: ".memory-notebook", scrollTo: ".memory-notebook", fullPage: true },
  { file: "screenshot-tracking.png", hash: "#tracking", waitFor: ".runtime-tracking", scrollTo: ".runtime-tracking" },
  { file: "screenshot-tracking-briefing-proof.png", hash: "#tracking", waitFor: ".runtime-tracking", scrollTo: ".runtime-tracking", fullPage: true },
  { file: "screenshot-briefings.png", hash: "#briefings", waitFor: ".daily-briefings", scrollTo: ".daily-briefings" },
  { file: "screenshot-daily-briefings.png", hash: "#briefings", waitFor: ".daily-briefings", scrollTo: ".daily-briefings", fullPage: true },
  { file: "screenshot-guide.png", hash: "#guide", waitFor: ".guide-page", scrollTo: ".guide-page" },
  { file: "screenshot-guide-dr-gil-settings.png", hash: "#guide", waitFor: ".guide-page", action: "openSettings", waitAfterAction: ".settings-modal" },
  { file: "screenshot-app-logo-masthead.png", hash: "", waitFor: ".masthead", clipSelector: ".masthead" },
  { file: "screenshot-renamed-app-masthead.png", hash: "", waitFor: ".masthead-brand-row", clipSelector: ".masthead" },
  {
    file: "screenshot-gift-reveal-roast-box.png",
    hash: "#leaderboard",
    waitFor: ".gift-reveal-strip",
    clipSelector: ".gift-reveal-strip",
    optional: true,
  },
];

const ONLY = new Set(
  (process.env.SCREENSHOT_ONLY || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
);

function targetUrl(hash) {
  const base = new URL(BASE_URL);
  base.searchParams.set("capture", String(Date.now()));
  base.hash = hash.replace(/^#/, "");
  return base.toString();
}

async function preparePage(page) {
  await page.setViewportSize(VIEWPORT);
  await page.addInitScript(() => {
    localStorage.setItem("dw.lang", "en");
    localStorage.setItem("gil.cookie-consent.v1", "accepted");
    localStorage.setItem("dw.ai-settings", JSON.stringify({ aiLang: "en", roastSeverity: 4, instructions: "" }));
  });
}

async function waitForApp(page, selector, timeout = 90000) {
  await page.waitForFunction(() => document.documentElement.classList.contains("app-ready"), null, { timeout: 90000 });
  await page.waitForFunction(() => !document.querySelector(".boot-splash-stage"), null, { timeout: 90000 });
  await page.waitForSelector(selector, { state: "visible", timeout });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(1200);
}

async function scrollTo(page, selector) {
  await page.evaluate((target) => {
    const node = target === "body" ? document.body : document.querySelector(target);
    node?.scrollIntoView({ block: "start", inline: "nearest" });
  }, selector);
  await page.waitForTimeout(800);
}

async function screenshotElement(page, selector, filePath) {
  const element = await page.$(selector);
  if (!element) throw new Error(`Missing clip selector: ${selector}`);
  await element.screenshot({ path: filePath });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await preparePage(page);

  const shots = ONLY.size > 0 ? SHOTS.filter((shot) => ONLY.has(shot.file)) : SHOTS;
  for (const shot of shots) {
    const url = targetUrl(shot.hash);
    const outPath = path.join(OUT_DIR, shot.file);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
    try {
      await waitForApp(page, shot.waitFor, shot.optional ? 15000 : 90000);
    } catch (error) {
      if (shot.optional) {
        console.log(`skipped ${shot.file}: required signed-in data was not visible`);
        continue;
      }
      throw error;
    }
    if (shot.scrollTo) await scrollTo(page, shot.scrollTo);
    if (shot.action === "openSettings") {
      await page.evaluate(() => {
        document.querySelector(".settings-btn")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      await page.waitForSelector(shot.waitAfterAction, { state: "visible", timeout: 30000 });
      await page.waitForTimeout(800);
    }
    if (shot.clipSelector) {
      await screenshotElement(page, shot.clipSelector, outPath);
    } else {
      await page.screenshot({ path: outPath, fullPage: Boolean(shot.fullPage) });
    }
    fs.copyFileSync(outPath, path.join(PUBLIC_OUT_DIR, shot.file));
    console.log(`captured ${shot.file}`);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
