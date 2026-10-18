// Renders promo/video.html frame-by-frame, then encodes MP4 with ffmpeg.
// Usage: node capture.mjs <playwright-core dir> <out dir> [fps] [seconds]
import { createRequire } from 'module';
import { pathToFileURL, fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import path from 'path';

const [, , pwDir, outDir, fpsArg = '30', secArg = '23'] = process.argv;
const { chromium } = createRequire(path.join(pwDir, 'x.js'))('playwright-core');
const fps = +fpsArg, seconds = +secArg;
const html = pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), 'video.html')).href;

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(html);
await page.evaluate(() => document.fonts.ready);
const total = Math.round(fps * seconds);
for (let i = 0; i < total; i++) {
  await page.evaluate(t => window.render(t), i / fps);
  await page.screenshot({ path: path.join(outDir, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
}
await browser.close();
console.log('frames', total);
