import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? "/mnt/documents/arena-combat-01.webm";
const stillFrame = process.argv[3] ? Number(process.argv[3]) : null;

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (c) => c,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({ serveUrl: bundled, id: "main", puppeteerInstance: browser });

if (stillFrame !== null) {
  await renderStill({
    composition,
    serveUrl: bundled,
    output: out,
    frame: stillFrame,
    puppeteerInstance: browser,
  });
} else {
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "vp8",
    outputLocation: out,
    puppeteerInstance: browser,
    muted: true,
    concurrency: 1,
  });
}
await browser.close({ silent: false });
console.log("done", out);
