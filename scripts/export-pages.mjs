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
  const lynchButton = [...document.querySelectorAll('button')].find((button) => button.textContent.includes('分析当前资产新闻'));
  lynchButton?.addEventListener('click', async () => {
    lynchButton.disabled = true;
    lynchButton.textContent = '正在分析新闻…';
    let result = document.querySelector('.lynch-result');
    if (!result) { result = document.createElement('pre'); result.className = 'lynch-result'; lynchButton.parentElement?.appendChild(result); }
    const heading = document.querySelector('h1')?.textContent.trim() ?? '当前资产';
    try {
      const response = await fetch((window.MP_LYNCH_API_BASE || location.origin) + '/api/lynch-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol: heading.split(' ')[0], name: heading.slice(heading.indexOf(' ') + 1), news: [{ time: '08:42', title: 'NVIDIA discussion velocity hits 30-day high', source: 'Reddit · r/stocks' }, { time: '08:18', title: 'Retail attention broadens beyond mega-cap AI', source: 'MarketPulse RSS' }, { time: '07:56', title: 'Tesla sentiment splits as delivery debate returns', source: 'Stocktwits proxy' }] }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '分析服务暂不可用');
      result.textContent = data.analysis || '未返回分析内容';
    } catch (error) {
      try {
        const cached = await fetch('./lynch-analysis.json');
        const data = await cached.json();
        result.textContent = data.analysis + '\n\n（本次为部署时生成的 DeepSeek 分析）';
      } catch { result.textContent = '分析服务暂不可用：' + (error.message || '请配置服务端 DEEPSEEK_API_KEY'); }
    }
    finally { lynchButton.disabled = false; lynchButton.textContent = '分析当前资产新闻'; }
  });

  const translations = {
    'LIVE DEMO DATA REFRESHED 2M AGO': '实时演示 · 2 分钟前更新',
    WATCHLIST: '自选列表',
    'US EQUITIES 4': '美股 4',
    'MARKET PULSE 3': '市场脉搏 3',
    'AI infrastructure': 'AI 基础设施',
    'Hotspot · 92': '热点 · 92',
    'Crypto majors': '主流加密资产',
    'Building · 74': '升温 · 74',
    'EV / mobility': '电动车 / 出行',
    'Cooling · 48': '降温 · 48',
    'Signal desk': '信号工作台',
    'ASSET INTELLIGENCE / NASDAQ': '资产情报 / 纳斯达克',
    '☆ Watch': '☆ 关注',
    '★ Watched': '★ 已关注',
    'Share ↗': '分享 ↗',
    Overview: '概览',
    Signals: '信号',
    Discussion: '讨论',
    'News flow': '新闻流',
    WINDOW: '窗口',
    'RETAIL FOMO RADAR / EXPERIMENTAL': '散户 FOMO 雷达 / 实验性',
    'DEMO DATA': '演示数据',
    'SOCIAL PLATFORM HEAT': '社交平台热度',
    'LIVE DEMO': '实时演示',
    RANK: '排名',
    ASSET: '资产',
    MENTIONS: '提及量',
    '24H GROWTH': '24 小时增长',
    SENTIMENT: '情绪',
    'PRICE ACTION': '价格行为',
    'price attention': '价格与关注度',
    Trend: '趋势',
    Bullish: '看涨',
    Volume: '成交量',
    Abnormal: '异常',
    Updated: '更新时间',
    'SHORT-TERM MARKET SCORE': '短线市场评分',
    'Signal composite': '综合信号',
    'Momentum trade': '动量交易',
    'Price action': '价格行为',
    'Capital flow': '资金流',
    'Social sentiment': '社交情绪',
    Attention: '关注度',
    'RETAIL FOMO INDEX': '散户 FOMO 指数',
    'Attention is accelerating': '关注度正在加速',
    'ICE COLD': '冰点',
    NORMAL: '正常',
    'HEATING UP': '升温',
    'FOMO ZONE': 'FOMO 区域',
    'DISCUSSION GROWTH': '讨论增长',
    'SENTIMENT ACCELERATION': '情绪加速度',
    'VOLUME ANOMALY': '成交异常',
    'RISK RADAR': '风险雷达',
    'What could change?': '什么可能改变行情？',
    HIGH: '高',
    MED: '中',
    LOW: '低',
    'SIGNAL STREAM': '信号流',
    'Latest market intelligence': '最新市场情报',
    'View all ↗': '查看全部 ↗',
    'ABOUT THE SCORE': '评分说明',
    'Evidence over prediction.': '证据优先于预测。',
    Transparent: '透明',
    Timestamped: '带时间戳',
    'Source-aware': '来源可追溯',
    'Educational research tool · Not investment advice': '教育研究工具 · 不构成投资建议',
    'DATA SOURCES Market data · RSS · Reddit': '数据来源 行情 · RSS · Reddit',
  };
  const reverseTranslations = Object.fromEntries(Object.entries(translations).map(([en, zh]) => [zh, en]));
  const languageButton = document.createElement('button');
  languageButton.className = 'icon-button';
  languageButton.type = 'button';
  languageButton.setAttribute('aria-label', '切换语言');
  document.querySelector('.topbar')?.append(languageButton);
  const translatePage = (toChinese) => {
    const dictionary = toChinese ? translations : reverseTranslations;
    document.documentElement.lang = toChinese ? 'zh-CN' : 'en';
    document.querySelectorAll('body *').forEach((element) => {
      if (element.children.length === 0) {
        const key = element.textContent.trim();
        if (dictionary[key]) element.textContent = dictionary[key];
      }
    });
    const input = document.querySelector('input[placeholder]');
    if (input) input.placeholder = toChinese ? '搜索资产' : 'Search assets';
    document.title = toChinese ? 'MarketPulse AI — 市场情报，不是预测' : 'MarketPulse AI — Market intelligence, not prediction';
    languageButton.textContent = toChinese ? 'EN' : '中文';
  };
  let chineseMode = true;
  languageButton.addEventListener('click', () => { chineseMode = !chineseMode; translatePage(chineseMode); toast(chineseMode ? '已切换为中文' : 'Switched to English'); });
  translatePage(chineseMode);
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
await cp("public/lynch-analysis.json", `${versionedDir}/lynch-analysis.json`);

await writeFile(
  `${outputDir}/index.html`,
  `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./v2/"><script>location.replace('./v2/')</script></head><body>Opening MarketPulse AI…</body></html>\n`,
);

console.log(`Exported ${versionedDir}/index.html (${html.length} bytes)`);
