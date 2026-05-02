// Vercel Serverless: /api/claim
// Performs the on-chain claim if the agent's private key is provisioned
// as a Vercel env var (TSUMU_AGENT_PRIVATE_KEY_HEX).
//
// 方針A 既定: 鍵がない時は 503 を返し「ライブデモ専用」を伝える。
// ライブ判定でも公開URLでclaimさせたい場合は、Vercel 設定で env var を設定するだけで有効化される。

import crypto from "node:crypto";
import { claimGift } from "../lib/tsumu.js";

const DISCORD_BOT_DM = process.env.DISCORD_BOT_DM || "https://discord.com/users/1499905975220568186";
const DISCORD_SERVER_INVITE = process.env.DISCORD_SERVER_INVITE || "https://discord.gg/tsumu-coming-soon";
const TSUMU_CHAT_API = process.env.TSUMU_CHAT_API || "";

function mockZkLoginAddress() {
  return "0x" + crypto.randomBytes(32).toString("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  if (!process.env.TSUMU_AGENT_PRIVATE_KEY_HEX) {
    return res.status(503).json({
      error: "claim_unavailable_on_serverless",
      message: "公開URLからの受領は、エージェント鍵が設定されたデモ環境でのみ動作します。ライブデモ会場でお試しください。",
    });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const { escrow_id, code } = body;
  if (!escrow_id || !code) {
    return res.status(400).json({ error: "missing escrow_id or code" });
  }

  const recipient = mockZkLoginAddress();

  try {
    const result = await claimGift(escrow_id, code, recipient);

    let onboard_token = null;
    if (TSUMU_CHAT_API) {
      try {
        const r = await fetch(`${TSUMU_CHAT_API}/api/identity/onboard-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sui_addr: recipient, claim_id: escrow_id }),
          signal: AbortSignal.timeout(2000),
        });
        if (r.ok) onboard_token = (await r.json()).onboard_token;
      } catch {
        // non-fatal
      }
    }

    res.status(200).json({
      ...result,
      recipient,
      explorer_recipient_url: `https://suiscan.xyz/testnet/account/${recipient}`,
      explorer_tx_url: `https://suiscan.xyz/testnet/tx/${result.claim_tx}`,
      discord_invite: DISCORD_BOT_DM,
      server_invite: DISCORD_SERVER_INVITE,
      onboard_token,
    });
  } catch (e) {
    res.status(500).json({ error: "claim_failed", detail: e.message });
  }
}
