import { cp, mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.PAGES_BASE_URL ?? "http://127.0.0.1:3000/";
const outputDir = process.env.PAGES_OUTPUT ?? "site";

await mkdir(outputDir, { recursive: true });
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
await writeFile(`${outputDir}/index.html`, html);
await cp("dist/client/_next", `${outputDir}/_next`, { recursive: true });
await cp("dist/client/favicon.svg", `${outputDir}/favicon.svg`);

console.log(`Exported ${outputDir}/index.html (${html.length} bytes)`);
