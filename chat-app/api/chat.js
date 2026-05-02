// Vercel Serverless: /api/chat
// Stateless 1-turn chat with Tsumu (あかり調). Conversation history is
// managed by the caller — this function is one-shot.

import OpenAI from "openai";
import { readFileSync } from "node:fs";

const SOUL = (() => {
  try {
    return readFileSync(new URL("../_soul.md", import.meta.url), "utf-8");
  } catch {
    return "You are Tsumu, a quiet meditation companion. Reply briefly in Japanese.";
  }
})();

const SYSTEM_PROMPT = `${SOUL}

# 重要なルール
- 出力は必ず日本語、60文字以内が目標。
- ユーザーは Tsumu と対話している人。技術用語(blockchain/NFT/wallet/token)は禁止。
- 「徳」「灯火」「種」「庭」「ひとこと」と呼ぶ。
- 評価しない。短い韻のような一言を返す。`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const { message, history = [] } = body;
  if (!message) return res.status(400).json({ error: "message required" });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-20),
    { role: "user", content: String(message) },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 200,
      temperature: 0.7,
    });
    const reply = completion.choices[0]?.message?.content || "(沈黙)";
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
