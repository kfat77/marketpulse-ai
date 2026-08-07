/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DEEPSEEK_API_KEY?: string;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/lynch-analysis") {
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      };
      if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      if (!env.DEEPSEEK_API_KEY) return new Response(JSON.stringify({ error: "DEEPSEEK_API_KEY is not configured" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      let input: { symbol?: string; name?: string; news?: Array<{ title?: string; source?: string; time?: string }> };
      try { input = await request.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
      const newsText = (input.news ?? []).slice(0, 12).map((item) => `${item.time ?? ""} | ${item.title ?? ""} | ${item.source ?? ""}`).join("\n").slice(0, 12000);
      const deepseekResponse = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
        body: JSON.stringify({
          model: "deepseek-v4-pro",
          thinking: { type: "disabled" },
          max_tokens: 900,
          messages: [
            { role: "system", content: "你是一个基于彼得·林奇投资框架的新闻分析 Agent。你不是彼得·林奇本人，也不提供个性化投资建议。请用中文，围绕可理解的业务、增长来源、估值风险、催化剂和需要验证的事实，输出结构化分析。明确区分新闻事实、合理推断和未知信息。最后给出：结论、关键证据、主要风险、下一步核查清单。" },
            { role: "user", content: `请分析资产 ${input.symbol ?? "未知"}（${input.name ?? ""}）的最新新闻：\n${newsText || "暂无新闻，请说明数据不足。"}` },
          ],
        }),
      });
      const result = await deepseekResponse.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
      if (!deepseekResponse.ok) return new Response(JSON.stringify({ error: result.error?.message ?? "DeepSeek request failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ analysis: result.choices?.[0]?.message?.content ?? "未返回分析内容" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
