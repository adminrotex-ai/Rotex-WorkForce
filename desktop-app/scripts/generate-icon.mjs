// Run this script to generate build/icon.png from build/icon.svg
// Usage: node scripts/generate-icon.mjs
// Requires: playwright (npm install playwright)
// Uses pre-installed Chromium at /opt/pw-browsers/chromium-1194/chrome-linux/chrome
// If that path doesn't exist, it will use the default playwright browser.

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '../build/icon.svg');

if (!existsSync(svgPath)) {
  console.error('build/icon.svg not found. Place the SVG icon there first.');
  process.exit(1);
}

const svgContent = readFileSync(svgPath, 'utf-8');

const html = `<!DOCTYPE html>
<html><head><style>
  body { margin: 0; padding: 0; background: transparent; display: flex; align-items: center; justify-content: center; width: 512px; height: 512px; }
  svg { width: 512px; height: 512px; }
</style></head><body>${svgContent}</body></html>`;

const chromePath = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const launchOptions = { headless: true };
if (existsSync(chromePath)) {
  launchOptions.executablePath = chromePath;
}

const browser = await chromium.launch(launchOptions);
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
await page.setContent(html);
const screenshot = await page.screenshot({ type: 'png', omitBackground: true });

const outPath = resolve(__dirname, '../build/icon.png');
writeFileSync(outPath, screenshot);
await browser.close();
console.log(`Icon generated: ${outPath} (512x512 PNG)`);
