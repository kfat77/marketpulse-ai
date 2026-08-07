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
// GitHub Pages serves this project below /marketpulse-ai/. Vinext's client
// runtime assumes a domain-root /_next path and breaks there, while the
// server-rendered dashboard is already complete and needs no hydration for
// the public showcase. Keep the rendered UI and styles, but remove runtime
// module loading that would request assets from kfat77.github.io/_next.
html = html.replaceAll(/<script[\s\S]*?<\/script>/gi, "");
html = html.replaceAll(/<link[^>]+rel="modulepreload"[^>]*>/gi, "");
html = html.replaceAll(/<link[^>]+rel="preload"[^>]*>/gi, "");
html = html.replaceAll("url(/_next/", "url(./_next/");
html = html.replace("<head>", '<head><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"/><meta http-equiv="Pragma" content="no-cache"/>');
const interactionScript = String.raw`<script>
(() => {
  const toast = (message) => {
    let node = document.querySelector('[data-mp-toast]');
    if (!node) {
      node = document.createElement('div');
      node.dataset.mpToast = 'true';
      Object.assign(node.style, { position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: '50', padding: '10px 14px', border: '1px solid #3b82f6', borderRadius: '8px', background: '#0b1220', color: '#dbeafe', font: '12px ui-monospace, SFMono-Regular, Menlo, monospace', boxShadow: '0 8px 30px #0008' });
      document.body.appendChild(node);
    }
    node.textContent = message;
    clearTimeout(node._timer);
    node._timer = setTimeout(() => node.remove(), 2200);
  };
  const buttons = [...document.querySelectorAll('button')];
  const buttonByText = (text) => buttons.find((button) => button.textContent.trim() === text);
  const search = document.querySelector('input[placeholder="Search assets"]');
  const assets = [...document.querySelectorAll('.asset-row')];
  search?.addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase();
    assets.forEach((asset) => { asset.hidden = query && !asset.textContent.toLowerCase().includes(query); });
  });
  assets.forEach((asset) => asset.addEventListener('click', () => {
    assets.forEach((item) => item.classList.remove('selected'));
    asset.classList.add('selected');
    const ticker = asset.querySelector('strong')?.textContent.trim() ?? 'asset';
    const name = asset.querySelector('small')?.textContent.trim() ?? '';
    const heading = document.querySelector('h1');
    if (heading) heading.textContent = ticker + ' ' + name;
    toast('已切换至 ' + ticker);
  }));
  ['Overview', 'Signals', 'Discussion', 'News flow', '24H', '7D', '30D'].forEach((label) => {
    const button = buttonByText(label);
    button?.addEventListener('click', () => {
      const group = ['Overview', 'Signals', 'Discussion', 'News flow'].includes(label) ? ['Overview', 'Signals', 'Discussion', 'News flow'] : ['24H', '7D', '30D'];
      group.forEach((item) => buttonByText(item)?.classList.remove('active'));
      button.classList.add('active');
      toast(label + ' window selected');
    });
  });
  const watch = buttonByText('☆ Watch');
  watch?.addEventListener('click', () => { watch.textContent = watch.textContent.includes('Watched') ? '☆ Watch' : '★ Watched'; toast(watch.textContent.includes('Watched') ? '已加入自选' : '已移出自选'); });
  buttonByText('Share ↗')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); toast('链接已复制'); } catch { toast('当前浏览器不允许复制链接'); } });
  buttonByText('Open settings')?.addEventListener('click', () => toast('Settings panel · demo mode'));
  buttonByText('Add asset')?.addEventListener('click', () => toast('Add asset · demo mode'));
  buttonByText('View all ↗')?.addEventListener('click', () => toast('Signal stream expanded · demo mode'));
})();
</script>`;
html = html.replace('</body>', `${interactionScript}</body>`);
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
