"use client";

import { useMemo, useState } from "react";
import "./mom.css";

type Tone = "up" | "down" | "watch";
type Asset = { symbol: string; name: string; market: string; price: string; change: string; tone: Tone; score: number; attention: number; state: string; thesis: string; bars: number[] };

const assets: Asset[] = [
  { symbol: "NVDA", name: "NVIDIA Corporation", market: "NASDAQ", price: "$182.41", change: "+4.82%", tone: "up", score: 87, attention: 96, state: "动量交易", thesis: "价格突破 20 日趋势，关注度同步加速；强势但拥挤风险上升。", bars: [48, 52, 47, 59, 56, 68, 71, 63, 78, 73, 85, 81, 91, 88, 96, 92, 100, 94, 98, 100] },
  { symbol: "BTC-USD", name: "Bitcoin / US Dollar", market: "CRYPTO", price: "$116,840", change: "+2.14%", tone: "up", score: 74, attention: 82, state: "关注升温", thesis: "零售讨论从核心资产向外扩散，价格结构仍偏建设性。", bars: [54, 49, 57, 61, 58, 65, 62, 69, 67, 73, 71, 76, 72, 78, 74, 82, 79, 84, 80, 86] },
  { symbol: "TSLA", name: "Tesla, Inc.", market: "NASDAQ", price: "$329.18", change: "-1.36%", tone: "down", score: 52, attention: 89, state: "信号分歧", thesis: "注意力仍高，但情绪与价格背离；市场正在等待交付数据催化。", bars: [72, 78, 75, 81, 77, 70, 74, 69, 63, 67, 60, 64, 57, 61, 55, 59, 51, 55, 48, 52] },
  { symbol: "AAPL", name: "Apple Inc.", market: "NASDAQ", price: "$218.67", change: "+0.62%", tone: "up", score: 61, attention: 57, state: "稳健趋势", thesis: "成熟的关注度结构和稳定趋势，使其处于低波动象限。", bars: [45, 47, 49, 48, 52, 54, 51, 55, 57, 56, 59, 58, 61, 60, 63, 62, 64, 63, 65, 66] },
];

const news = [
  ["08:42", "NVIDIA discussion velocity hits 30-day high", "Reddit · r/stocks", "高"],
  ["08:18", "Retail attention broadens beyond mega-cap AI", "MarketPulse RSS", "中"],
  ["07:56", "Tesla sentiment splits as delivery debate returns", "Stocktwits proxy", "高"],
  ["07:31", "BTC options activity points to event-driven week", "MarketPulse RSS", "中"],
] as const;

const momThemes = [
  ["CPO / 光通信", "515880", 68, 76, 19, "追涨升温"],
  ["半导体 / 存储", "512480", 64, 72, 15, "买入冲动"],
  ["AI 算力", "159363", 58, 61, 22, "讨论扩散"],
  ["黄金", "518880", 43, 18, 57, "恐慌卖出"],
] as const;

const socialHot = [
  ["01", "NVDA", "NVIDIA", "38.4K", "+248%", "82% 看涨", "Reddit · X · RSS"],
  ["02", "中际旭创", "CPO / 光模块", "21.7K", "+186%", "76% 看涨", "雪球 · 股吧"],
  ["03", "TSLA", "Tesla", "18.2K", "+94%", "44% 看涨", "X · Reddit"],
  ["04", "BTC", "Bitcoin", "16.9K", "+71%", "68% 看涨", "Reddit · RSS"],
] as const;

function toneClass(tone: Tone) { return tone === "up" ? "up" : tone === "down" ? "down" : "watch"; }

export default function Home() {
  const [activeSymbol, setActiveSymbol] = useState("NVDA");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("24H");
  const [view, setView] = useState("总览");
  const [saved, setSaved] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentResult, setAgentResult] = useState("");
  const [toast, setToast] = useState("");
  const active = assets.find((asset) => asset.symbol === activeSymbol) ?? assets[0];
  const filtered = useMemo(() => assets.filter((asset) => `${asset.symbol} ${asset.name}`.toLowerCase().includes(query.toLowerCase())), [query]);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2200); };
  const runAgent = async () => {
    setAgentOpen(true); setAgentLoading(true); setAgentResult("");
    try {
      const response = await fetch("/api/lynch-analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol: active.symbol, name: active.name, news }) });
      const result = await response.json() as { analysis?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "分析服务不可用");
      setAgentResult(result.analysis ?? "未返回分析内容");
    } catch { setAgentResult("当前展示为部署时生成的研究结论。切换到实时服务后，可针对当前资产重新分析新闻。\n\n结论：关注度正在从大型 AI 资产向更多主题扩散，但新闻热度不能替代业务、增长和估值核查。\n\n下一步核查：收入增速、利润率、估值假设、催化剂兑现路径与下行情景。"); }
    finally { setAgentLoading(false); }
  };

  return <main className="research-shell">
    <header className="terminal-bar">
      <div className="wordmark"><span className="wordmark-mark">MP</span><span>MARKET<span className="accent">PULSE</span></span><span className="terminal-tag">RESEARCH</span></div>
      <div className="global-search"><span>⌕</span><input aria-label="全局搜索" placeholder="搜索资产、主题或新闻" /></div>
      <div className="session-meta"><span className="market-open" /> 美股盘中 <i /> 2026-08-07 09:42 ET <button className="language-button" onClick={() => notify("中文研究界面已启用")}>中文 / EN</button></div>
    </header>

    <div className="terminal-layout">
      <aside className="research-nav">
        <div className="nav-caption">研究工作台</div>
        {[["总览", "⌂"], ["资产监控", "▦"], ["舆情雷达", "◎"], ["新闻 Agent", "◇"], ["研究方法", "≡"]].map(([label, icon]) => <button key={label} className={`nav-item ${view === label ? "active" : ""}`} onClick={() => { setView(label); notify(`已切换至 ${label}`); }}><span>{icon}</span>{label}</button>)}
        <div className="nav-divider" />
        <div className="nav-caption">自选资产 <b>{assets.length}</b></div>
        <div className="watchlist-compact">{assets.map((asset) => <button key={asset.symbol} className={`watch-row ${asset.symbol === active.symbol ? "active" : ""}`} onClick={() => { setActiveSymbol(asset.symbol); notify(`已切换至 ${asset.symbol}`); }}><i className={`status-dot ${toneClass(asset.tone)}`} /><span><strong>{asset.symbol}</strong><small>{asset.name}</small></span><em className={toneClass(asset.tone)}>{asset.change}</em></button>)}</div>
        <div className="nav-foot"><span className="analyst-avatar">MP</span><span><strong>MarketPulse AI</strong><small>研究模式 · 演示数据</small></span></div>
      </aside>

      <section className="research-main">
        <div className="page-heading"><div><div className="breadcrumb">研究工作台 / {view} / {active.market}</div><h1>{active.symbol} <span>{active.name}</span></h1><p>跨市场情绪、价格行为与新闻证据的统一研究视图</p></div><div className="heading-actions"><button className={`secondary-button ${saved ? "selected" : ""}`} onClick={() => { setSaved(!saved); notify(saved ? "已移出自选" : "已加入自选"); }}>{saved ? "★ 已关注" : "☆ 关注"}</button><button className="secondary-button" onClick={() => notify("研究链接已复制")}>分享报告</button></div></div>

        <div className="quote-strip"><div className="quote-primary"><span>最新价</span><strong>{active.price}</strong><b className={toneClass(active.tone)}>{active.change}</b></div><div><span>短线评分</span><strong>{active.score}<small>/100</small></strong></div><div><span>关注度</span><strong>{active.attention}<small>/100</small></strong></div><div><span>成交异常</span><strong>3.0×</strong></div><div><span>研究状态</span><strong className="status-text">{active.state}</strong></div></div>

        <div className="module-tabs">{["总览", "价格行为", "舆情", "新闻"].map((tab) => <button key={tab} className={view === tab ? "active" : ""} onClick={() => setView(tab)}>{tab}</button>)}<span /><label>窗口</label>{["24H", "7D", "30D"].map((item) => <button key={item} className={`range-button ${range === item ? "active" : ""}`} onClick={() => setRange(item)}>{item}</button>)}</div>

        <div className="research-grid">
          <div className="research-column">
            <section className="research-card evidence-card"><div className="card-header"><div><span className="eyebrow">MARKET STATE / EVIDENCE MATRIX</span><h2>市场状态与证据</h2></div><span className="data-stamp">09:42 ET · DEMO</span></div><div className="evidence-grid"><div><span>趋势结构</span><strong className="up">偏多</strong><small>突破 20D 均线</small></div><div><span>资金行为</span><strong>72</strong><small>ETF / 期权流入</small></div><div><span>社交情绪</span><strong>88</strong><small>看涨偏向</small></div><div><span>拥挤度</span><strong className="watch">96</strong><small>追涨风险升高</small></div></div><div className="evidence-note">研究结论：{active.thesis}</div></section>

            <section className="research-card"><div className="card-header"><div><span className="eyebrow">RETAIL FOMO RADAR</span><h2>宝妈指数 · 新手行为温度</h2></div><span className="pill-warning">实验指标</span></div><p className="card-description">观察公开讨论中的上车、追涨与恐慌卖出信号，不代表真实持仓或投资建议。</p><div className="mom-table"><div className="table-head"><span>主题</span><span>热度</span><span>意向</span><span>状态</span></div>{momThemes.map(([theme, ticker, score, buy, sell, signal]) => <div className="mom-table-row" key={theme}><div><strong>{theme}</strong><small>ETF {ticker}</small></div><div className="mini-bar"><i style={{ width: `${score}%` }} /><b>{score}</b></div><div><b className="up">买 {buy}</b><b className="down">卖 {sell}</b></div><em className={score > 60 ? "watch" : "down"}>{signal}</em></div>)}</div><div className="table-foot">样本窗口 24H · 来源 股吧 / RSS / 社交讨论</div></section>

            <section className="research-card"><div className="card-header"><div><span className="eyebrow">SOCIAL PLATFORM HEAT</span><h2>社交平台热议股</h2></div><span className="live-status">LIVE DEMO</span></div><div className="social-table"><div className="table-head"><span>排名 / 资产</span><span>提及量</span><span>增长</span><span>情绪</span></div>{socialHot.map(([rank, symbol, name, mentions, growth, sentiment, sources]) => <div className="social-table-row" key={symbol}><span><b>{rank}</b><strong>{symbol}</strong><small>{name}</small></span><span><b>{mentions}</b><small>{sources}</small></span><strong className="up">{growth}</strong><span className="sentiment-chip">{sentiment}</span></div>)}</div><div className="table-foot">热议 ≠ 推荐 · 每条信号需回溯原文、作者与时间戳</div></section>
          </div>

          <div className="research-column">
            <section className="research-card chart-card"><div className="card-header"><div><span className="eyebrow">PRICE ACTION</span><h2>价格行为 · {range}</h2></div><span className="chart-legend"><i /> 价格 <i className="violet" /> 关注</span></div><div className="chart-stage"><div className="chart-y"><span>185</span><span>180</span><span>175</span><span>170</span></div><div className="chart-grid-lines"><i /><i /><i /><i /></div><div className="chart-bars">{active.bars.map((height, index) => <i key={`${active.symbol}-${index}`} style={{ height: `${height}%` }} className={index > active.bars.length - 5 ? "hot" : ""} />)}</div><div className="chart-polyline" /></div><div className="chart-stats"><span><i className="up-dot" />趋势 <b className="up">偏多</b></span><span><i className="blue-dot" />成交量 <b>异常</b></span><span><i className="amber-dot" />RSI <b>68.4</b></span><span>更新于 2 分钟前</span></div></section>

            <section className={`research-card agent-card ${agentOpen ? "open" : ""}`}><div className="card-header"><div><span className="eyebrow">PETER LYNCH NEWS AGENT</span><h2>彼得·林奇框架新闻分析</h2></div><span className="agent-chip">DEEPSEEK</span></div><p className="card-description">将新闻拆解为业务事实、增长来源、估值风险与待核查问题；不是彼得·林奇本人，不构成投资建议。</p><button className="agent-button" onClick={runAgent} disabled={agentLoading}>{agentLoading ? "正在读取新闻并分析…" : "分析当前资产新闻"}</button>{agentResult && <pre className="agent-result">{agentResult}</pre>}</section>

            <section className="research-card news-card"><div className="card-header"><div><span className="eyebrow">SIGNAL STREAM</span><h2>最新新闻证据</h2></div><button className="link-button" onClick={() => setView("新闻")}>查看全部</button></div>{news.map(([time, title, source, level]) => <button className="news-item" key={title} onClick={() => notify(`已选中新闻：${title}`)}><time>{time}</time><i className={level === "高" ? "high" : "medium"} /><span><strong>{title}</strong><small>{source}</small></span><b>›</b></button>)}</section>

            <section className="research-card risk-card"><div className="card-header"><div><span className="eyebrow">RISK REVIEW</span><h2>研究员核查清单</h2></div><span className="risk-score">3 项</span></div><div className="risk-row"><i className="high" /><span><strong>社交过热</strong><small>情绪速度快于价格速度</small></span><b>高</b></div><div className="risk-row"><i className="medium" /><span><strong>事件临近</strong><small>宏观催化窗口约 3 天</small></span><b>中</b></div><div className="risk-row"><i className="low" /><span><strong>趋势完整性</strong><small>价格结构仍具建设性</small></span><b>低</b></div></section>
          </div>
        </div>
        <footer className="research-footer"><span>MARKETPULSE AI · 研究终端</span><span>数据：行情 · RSS · Reddit · 演示数据</span><span>仅作研究，不构成投资建议</span></footer>
      </section>
    </div>
    {toast && <div className="toast" role="status">{toast}</div>}
  </main>;
}
