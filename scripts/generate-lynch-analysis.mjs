import { mkdir, writeFile } from "node:fs/promises";

const output = "public/lynch-analysis.json";
const fallback = {
  generatedAt: new Date().toISOString(),
  analysis: "当前为静态演示。配置 GitHub Secret DEEPSEEK_API_KEY 后，下一次部署会生成彼得·林奇框架的新闻分析。",
};

if (!process.env.DEEPSEEK_API_KEY) {
  await mkdir("public", { recursive: true });
  await writeFile(output, JSON.stringify(fallback, null, 2));
  console.log("DEEPSEEK_API_KEY is not set; wrote a safe fallback analysis.");
  process.exit(0);
}

const response = await fetch("https://api.deepseek.com/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  body: JSON.stringify({
    model: "deepseek-v4-pro",
    thinking: { type: "disabled" },
    max_tokens: 900,
    messages: [
      { role: "system", content: "你是一个基于彼得·林奇投资框架的新闻分析 Agent。你不是彼得·林奇本人，也不提供个性化投资建议。用中文输出结构化分析，区分新闻事实、推断和未知信息，包含结论、关键证据、主要风险、下一步核查清单。" },
      { role: "user", content: "请分析以下市场新闻样本：\n08:42 | NVIDIA discussion velocity hits 30-day high | Reddit · r/stocks\n08:18 | Retail attention broadens beyond mega-cap AI | MarketPulse RSS\n07:56 | Tesla sentiment splits as delivery debate returns | Stocktwits proxy\n07:31 | BTC options activity points to event-driven week | MarketPulse RSS" },
    ],
  }),
});
const result = await response.json();
if (!response.ok) throw new Error(result.error?.message ?? "DeepSeek request failed");
await mkdir("public", { recursive: true });
await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), analysis: result.choices?.[0]?.message?.content ?? "未返回分析内容" }, null, 2));
console.log("Generated static Peter Lynch news analysis.");
