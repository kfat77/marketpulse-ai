import { cp, mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.PAGES_BASE_URL ?? "http://127.0.0.1:3000/";
const outputDir = process.env.PAGES_OUTPUT ?? "site";
const versionedDir = `${outputDir}/v2`;

await mkdir(outputDir, { recursive: true });
await mkdir(versionedDir, { recursive: true });
const response = await fetch(baseUrl);
if (!response.ok) throw new Error(`Could not render ${baseUrl}: ${response.status}`);

let html = await response.text();
// GitHub Pages serves this repository below /marketpulse-ai/. Relative URLs
// keep the same artifact usable on local preview and project Pages URLs.
html = html.replaceAll('="/', '="./').replaceAll("='/", "='./");
// Vinext also serializes asset URLs inside the inline RSC payload. Those
// strings are not HTML attributes, so rewrite them separately for Pages.
html = html.replaceAll('"/_next/', '"./_next/').replaceAll("'/_next/", "'./_next/");
html = html.replaceAll('"/favicon.svg', '"./favicon.svg').replaceAll("'/favicon.svg", "'./favicon.svg");
html = html.replace("<head>", '<head><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"/><meta http-equiv="Pragma" content="no-cache"/>');
// Keep the app under a fresh path so browsers holding the previous broken
// index.html cannot keep resolving its stale absolute /_next URLs.
await writeFile(`${versionedDir}/index.html`, html);
await cp("dist/client/_next", `${outputDir}/_next`, { recursive: true });
await cp("dist/client/favicon.svg", `${outputDir}/favicon.svg`);
await cp("dist/client/_next", `${versionedDir}/_next`, { recursive: true });
await cp("dist/client/favicon.svg", `${versionedDir}/favicon.svg`);

await writeFile(
  `${outputDir}/index.html`,
  `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./v2/"><script>location.replace('./v2/')</script></head><body>Opening MarketPulse AI…</body></html>\n`,
);

console.log(`Exported ${versionedDir}/index.html (${html.length} bytes)`);
