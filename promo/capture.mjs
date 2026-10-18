// Renders a promo HTML page frame-by-frame to JPGs (deterministic: every frame = render(t)).
// Usage: node capture.mjs <playwright-core dir> <out dir> [fps] [seconds] [html] [width] [height] [scale]
import { createRequire } from 'module';
import { pathToFileURL, fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { spawn } from 'child_process';
import path from 'path';

const [, , pwDir, outDir, fpsArg = '30', secArg = '23', htmlArg = 'video.html', wArg = '1080', hArg = '1920', sArg = '1'] = process.argv;
const { chromium } = createRequire(path.join(pwDir, 'x.js'))('playwright-core');
const fps = +fpsArg, seconds = +secArg;
const html = pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), htmlArg)).href;

// If <out> ends in .mp4, frames are piped straight into ffmpeg (no JPG files on disk); set AUDIO=/path/to.wav to mux sound.
const pipeMode = outDir.endsWith('.mp4');
let ff;
if (pipeMode) {
  const a = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-'];
  if (process.env.AUDIO) a.push('-i', process.env.AUDIO);
  a.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p');
  if (process.env.AUDIO) a.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  a.push('-movflags', '+faststart', outDir);
  ff = spawn('ffmpeg', a, { stdio: ['pipe', 'inherit', 'inherit'] });
} else mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: +wArg, height: +hArg }, deviceScaleFactor: +sArg });
await page.goto(html);
await page.evaluate(() => document.fonts.ready);
const total = Math.round(fps * seconds);
for (let i = 0; i < total; i++) {
  await page.evaluate(t => window.render(t), i / fps);
  if (pipeMode) {
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 90 === 0) console.log('frame', i, '/', total);
  } else await page.screenshot({ path: path.join(outDir, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 93 });
}
if (pipeMode) { ff.stdin.end(); await new Promise(r => ff.on('close', r)); }
await browser.close();
console.log('frames', total);
