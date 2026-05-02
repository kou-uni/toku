// Tsumu claim webpage server.
//
// Pure-SDK rewrite of the previous shell-out version, so this runs both
// locally (node server.js, port 3000) and on Vercel's Node serverless
// runtime (via api/index.js wrapping this app).
//
// Flow unchanged: a recipient opens /claim/:id?code=... in their browser,
// the page reads the escrow via /api/escrow/:id, and posting /api/claim
// performs the on-chain release using the agent's keypair.

import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { getEscrow, claimGift } from "./lib/tsumu.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Discord onboarding URLs — set via env when OpenClaw + bot are live.
const DISCORD_BOT_DM =
  process.env.DISCORD_BOT_DM ||
  "https://discord.com/users/1499905975220568186";
const DISCORD_SERVER_INVITE =
  process.env.DISCORD_SERVER_INVITE || "https://discord.gg/tsumu-coming-soon";

// Public-facing chat-app URL (the post-claim Tide CTA links here).
const CHAT_APP_URL = process.env.CHAT_APP_URL || "http://localhost:3100";

// Server-to-server onboard-token endpoint on the chat-app.
const TSUMU_CHAT_API = process.env.TSUMU_CHAT_API || CHAT_APP_URL;

const app = express();
app.use(express.json());

// Static assets (style.css, etc.) — claim.html is served via the
// /claim/:id handler so we can do a CHAT_APP_URL substitution.
app.use(
  express.static(path.join(__dirname, "public"), {
    index: false,
    extensions: ["html"],
  })
);

// Cache the claim.html in memory after the first read so repeated claims
// don't hit disk under serverless cold starts.
let _claimHtmlCache = null;
async function loadClaimHtml() {
  if (_claimHtmlCache) return _claimHtmlCache;
  const raw = await fs.readFile(
    path.join(__dirname, "public", "claim.html"),
    "utf-8"
  );
  _claimHtmlCache = raw.replace(/http:\/\/localhost:3100/g, CHAT_APP_URL);
  return _claimHtmlCache;
}

app.get("/claim/:id", async (_req, res) => {
  try {
    res.type("html").send(await loadClaimHtml());
  } catch (err) {
    console.error("loadClaimHtml failed:", err.message);
    res.status(500).send("claim page unavailable");
  }
});

// Read escrow detail via SDK (was: `sui client object ... --json`).
app.get("/api/escrow/:id", async (req, res) => {
  try {
    const e = await getEscrow(req.params.id);
    res.json({
      escrow_id: req.params.id,
      sender: e.sender,
      sender_short: e.sender
        ? `${e.sender.slice(0, 6)}…${e.sender.slice(-4)}`
        : "",
      note: e.note,
      amount_human: e.amount_atomic / 1e9,
      claimed: e.claimed,
      created_at_ms: e.created_at_ms,
      explorer_url: `https://suiscan.xyz/testnet/object/${req.params.id}`,
    });
  } catch (err) {
    console.error("escrow fetch failed:", err.message);
    res.status(404).json({ error: "escrow_not_found", detail: err.message });
  }
});

// Mock zkLogin: synthesize a fresh, valid-looking 32-byte hex address per
// claim. In production this comes from a Google JWT + zkLogin proof.
function mockZkLoginAddress() {
  return "0x" + crypto.randomBytes(32).toString("hex");
}

// Perform the on-chain claim via SDK (was: tsumu_gift_claim_to.sh).
app.post("/api/claim", async (req, res) => {
  const { escrow_id, code } = req.body || {};
  if (!escrow_id || !code) {
    return res.status(400).json({ error: "missing escrow_id or code" });
  }

  const recipient = mockZkLoginAddress();

  try {
    const result = await claimGift(escrow_id, code, recipient);
    const totalToku = result.amount_human + 1; // +1 first-receive bonus

    // Best-effort: ask chat-app for an onboard token so the recipient can
    // prove ownership of `recipient` to the Tsumu Discord bot. Non-fatal.
    let onboard_token = null;
    try {
      const r = await fetch(`${TSUMU_CHAT_API}/api/identity/onboard-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sui_addr: recipient, claim_id: escrow_id }),
        signal: AbortSignal.timeout(2000),
      });
      if (r.ok) onboard_token = (await r.json()).onboard_token;
    } catch (e) {
      console.warn("onboard token issue failed (non-fatal):", e.message);
    }

    res.json({
      claim_tx: result.claim_tx,
      recipient,
      sender: result.sender,
      amount_human: result.amount_human,
      sender_pay_forward_bonus_toku: 1,
      recipient_first_receive_bonus_toku: 1,
      message_for_recipient: `受け取りました。+${totalToku.toFixed(
        1
      )} TOKU。\n\nこれが、あなたの最初の徳です。`,
      explorer_recipient_url: `https://suiscan.xyz/testnet/account/${recipient}`,
      explorer_tx_url: `https://suiscan.xyz/testnet/tx/${result.claim_tx}`,
      discord_invite: DISCORD_BOT_DM,
      server_invite: DISCORD_SERVER_INVITE,
      onboard_token,
    });
  } catch (err) {
    console.error("claim failed:", err.message);
    res.status(500).json({ error: "claim_failed", detail: err.message });
  }
});

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.get("/", (_req, res) => {
  res.send(`<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>Tsumu</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:80px auto;padding:24px;color:#333;line-height:1.7}h1{font-weight:300;font-size:48px;letter-spacing:0.2em}p{color:#666}</style>
</head><body>
<h1>積</h1>
<p>このページは、誰かから届いた徳(TOKU)を受け取るためのものです。</p>
<p>ギフトリンクを受け取った場合、そのリンクを開いてください。</p>
</body></html>`);
});

export default app;

// Local dev: only listen when this file is the entry point (not when
// imported by api/index.js under Vercel).
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`tsumu claim app listening on http://localhost:${PORT}`);
  });
}
