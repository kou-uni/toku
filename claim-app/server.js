// Tsumu claim webpage server.
//
// Serves a static page at /claim/:id that lets a recipient claim a gift
// escrow on Sui. The page calls /api/escrow/:id to display gift details,
// then /api/claim to perform the on-chain claim via the agent's keypair.
//
// Mock zkLogin: in MVP we generate a fresh fake recipient address per
// session. In production this address comes from a Google JWT + zkLogin
// proof. The Move contract's claim_to function accepts an arbitrary
// recipient, gated by the claim code, so the demo flow is faithful.

import express from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exec = promisify(execFile);

const PORT = process.env.PORT || 3000;
const SUI_BIN = process.env.SUI_BIN || `${process.env.HOME}/tools/sui-testnet-v1.71.0/sui`;
const TOOLS_DIR = process.env.TOOLS_DIR ||
  path.join(__dirname, "..", "openclaw", "skills", "tsumu", "tools");

// Discord onboarding URLs — set via env when OpenClaw + bot are live.
// These mock URLs let us validate the post-claim CTA story end-to-end.
const DISCORD_BOT_DM = process.env.DISCORD_BOT_DM || "https://discord.com/users/1499905975220568186";
const DISCORD_SERVER_INVITE = process.env.DISCORD_SERVER_INVITE || "https://discord.gg/tsumu-coming-soon";

// Where the OpenClaw-side identity registry lives (chat-app for now).
// On claim success we ask it for a one-time onboard_token; the user shows
// it to the Tsumu bot in their first DM, which calls identity_bind.
const TSUMU_CHAT_API = process.env.TSUMU_CHAT_API || "http://localhost:3100";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Serve the claim page (HTML) for any /claim/:id?code=...
app.get("/claim/:id", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "claim.html"));
});

// Fetch escrow details from Sui via the CLI.
app.get("/api/escrow/:id", async (req, res) => {
  try {
    const { stdout } = await exec(SUI_BIN, [
      "client", "object", req.params.id, "--json"
    ], { maxBuffer: 4 * 1024 * 1024 });
    const obj = JSON.parse(stdout);

    // Sui CLI returns fields directly under `content` (not `content.fields`).
    const fields = obj?.content ?? {};
    const senderAddr = fields.sender ?? "";
    const note = fields.note ?? "";
    const claimed = !!fields.claimed;
    const amountAtomic = Number(fields.amount ?? 0);
    const createdAt = Number(fields.created_at_ms ?? 0);

    res.json({
      escrow_id: req.params.id,
      sender: senderAddr,
      sender_short: senderAddr ? `${senderAddr.slice(0, 6)}…${senderAddr.slice(-4)}` : "",
      note,
      amount_human: amountAtomic / 1e9,
      claimed,
      created_at_ms: createdAt,
      explorer_url: `https://suiscan.xyz/testnet/object/${req.params.id}`,
    });
  } catch (e) {
    console.error("escrow fetch failed:", e.message);
    res.status(404).json({ error: "escrow_not_found", detail: e.message });
  }
});

// Generate a deterministic-ish "user wallet" address. In production this
// comes from the user's Google JWT via zkLogin. For demo we synthesize a
// fresh, valid-looking 32-byte hex address per session.
function mockZkLoginAddress() {
  return "0x" + crypto.randomBytes(32).toString("hex");
}

// Perform the on-chain claim. The agent (our Sui CLI keypair) signs the
// transaction; the TOKU lands at the recipient address.
app.post("/api/claim", async (req, res) => {
  const { escrow_id, code } = req.body || {};
  if (!escrow_id || !code) {
    return res.status(400).json({ error: "missing escrow_id or code" });
  }

  const recipient = mockZkLoginAddress();
  const tool = path.join(TOOLS_DIR, "tsumu_gift_claim_to.sh");

  try {
    const { stdout } = await exec(tool, [escrow_id, code, recipient], {
      maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, PATH: process.env.PATH + ":" + path.dirname(SUI_BIN) },
    });
    // Tool emits a single JSON line at the end (last line of stdout).
    const lastLine = stdout.trim().split("\n").pop();
    const result = JSON.parse(lastLine);

    // Best-effort: fetch a one-time onboard token so the user can prove
    // ownership of `recipient` to the Tsumu bot in their first DM. If the
    // chat-app isn't running we just skip — the UI degrades to coming-soon.
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
      ...result,
      recipient,
      explorer_recipient_url: `https://suiscan.xyz/testnet/account/${recipient}`,
      explorer_tx_url: `https://suiscan.xyz/testnet/tx/${result.claim_tx}`,
      discord_invite: DISCORD_BOT_DM,
      server_invite: DISCORD_SERVER_INVITE,
      onboard_token,
    });
  } catch (e) {
    console.error("claim failed:", e.message);
    res.status(500).json({ error: "claim_failed", detail: e.message });
  }
});

// Health
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Home
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

app.listen(PORT, () => {
  console.log(`tsumu claim app listening on http://localhost:${PORT}`);
});
