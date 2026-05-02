// Tsumu chat server — replaces OpenClaw with a thin self-built bridge.
//
// - Browser UI sends user messages; we forward to OpenAI with SOUL.md
//   as the system prompt to give Tsumu its voice.
// - Sidebar buttons trigger real on-chain shell tools (the same ones
//   the OpenClaw skill would have called). Their JSON results are
//   pushed into the conversation as agent messages.

import express from "express";
import OpenAI from "openai";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const exec = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3100;
const ROOT = path.join(__dirname, "..");
const TOOLS_DIR = path.join(ROOT, "openclaw", "skills", "tsumu", "tools");
const SOUL_PATH = path.join(ROOT, "openclaw", "skills", "tsumu", "SOUL.md");
const AGENT_ADDR = "0x4b18aaafa7b8c8e60bdd9e97ca79a86b93a947c0dbb30e79e66a7105c6f75bac";

if (!process.env.OPENAI_API_KEY) {
  console.error("[fatal] OPENAI_API_KEY missing. Run: source ~/.tsumu/env");
  process.exit(1);
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let SOUL = "You are Tsumu, a quiet meditation companion. Reply briefly in Japanese.";
try {
  SOUL = await readFile(SOUL_PATH, "utf-8");
} catch (e) {
  console.warn("[warn] could not read SOUL.md:", e.message);
}

const SYSTEM_PROMPT = `${SOUL}

# 重要なルール
- 出力は必ず日本語、60文字以内が目標。
- ユーザーは Tsumu と対話している人。技術用語(blockchain/NFT/wallet/token)は禁止。
- 「徳」「灯火」「種」「庭」「ひとこと」と呼ぶ。
- ボタンによってオンチェーン操作が走る場合、その結果が会話に挿入される。
  自然に受け止めて、評価せず短く韻を返す。`;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// In-memory session — single user, perfect for demo
const conversation = [];

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "chat.html"));
});

// Sui RPC helpers for live counters
const SUI_RPC = "https://fullnode.testnet.sui.io:443";
const PACKAGE_V1 = "0xbb218662a9d57c7098974bd1b687767a5d2dd57fc1cc2599d8dcf71e2e2a7f02";
const WORLD_PULSE_ID = "0x5fed66c7f90aa9856e25da762f3851eae65ee9ef3fd516b7658d2d4bf73defc2";
const LANTERN_POOL_ID = "0x7719d9085533b02bd98177154ba8fd11031a08b3050b59aed6fa6ea3ef5b6ba5";

async function suiRpc(method, params) {
  const r = await fetch(SUI_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await r.json();
  return j.result;
}

async function getTokuBalance(addr) {
  try {
    const r = await suiRpc("suix_getBalance", [addr, `${PACKAGE_V1}::toku::TOKU`]);
    return Number(r?.totalBalance || 0) / 1e9;
  } catch (e) {
    return null;
  }
}

async function getPulseAndPool() {
  try {
    const [pulse, pool] = await Promise.all([
      suiRpc("sui_getObject", [WORLD_PULSE_ID, { showContent: true }]),
      suiRpc("sui_getObject", [LANTERN_POOL_ID, { showContent: true }]),
    ]);
    const pulseFields = pulse?.data?.content?.fields ?? pulse?.data?.content ?? {};
    const poolFields = pool?.data?.content?.fields ?? pool?.data?.content ?? {};
    return {
      worldPulseTotal: Number(pulseFields.total_beats || 0),
      lanternPoolSize: Array.isArray(poolFields.cards) ? poolFields.cards.length : Number(poolFields.total_submitted || 0),
    };
  } catch (e) {
    return { worldPulseTotal: null, lanternPoolSize: null };
  }
}

app.get("/api/state", async (_req, res) => {
  const [toku, counters] = await Promise.all([
    getTokuBalance(AGENT_ADDR),
    getPulseAndPool(),
  ]);
  res.json({
    conversation,
    agentAddr: AGENT_ADDR,
    tokuBalance: toku,
    worldPulseTotal: counters.worldPulseTotal,
    lanternPoolSize: counters.lanternPoolSize,
    explorerUrl: `https://suiscan.xyz/testnet/account/${AGENT_ADDR}`,
  });
});

// ===== Sui viz: events feed + diaspora (recipient set) =====
//
// "ちゃんと Sui を使ってる" を審査員に見せ、
// "だんだん広がっていく" を体感させるためのデータ。
// チャット backend がのちに OpenClaw に切り替わっても、この panel はそのまま動く。

// Cache to avoid hammering RPC
let _eventCache = { ts: 0, data: null };

async function getRecentSuiEvents() {
  if (Date.now() - _eventCache.ts < 5000 && _eventCache.data) return _eventCache.data;
  const eventTypes = [
    `${PACKAGE_V1}::toku::TokuMinted`,
    `${PACKAGE_V1}::session::SessionRecorded`,
    `${PACKAGE_V1}::lantern::LanternSubmitted`,
    `${PACKAGE_V1}::gift::GiftCreated`,
    `${PACKAGE_V1}::gift::GiftClaimed`,
    `${PACKAGE_V1}::pulse::Beat`,
    `${PACKAGE_V1}::timelock::SeedSealed`,
    `${PACKAGE_V1}::timelock::SeedOpened`,
  ];
  const all = [];
  for (const t of eventTypes) {
    try {
      const r = await suiRpc("suix_queryEvents", [
        { MoveEventType: t },
        null, 30, true,
      ]);
      const items = r?.data || [];
      for (const e of items) {
        all.push({
          type: t.split("::").slice(-1)[0],
          ts: Number(e.timestampMs || 0),
          tx: e.id?.txDigest,
          data: e.parsedJson || {},
        });
      }
    } catch (e) {
      // skip
    }
  }
  all.sort((a, b) => b.ts - a.ts);
  const data = all.slice(0, 30);
  _eventCache = { ts: Date.now(), data };
  return data;
}

app.get("/api/sui/stats", async (_req, res) => {
  const events = await getRecentSuiEvents();
  // Build diaspora: unique recipient addresses from GiftClaimed
  const diaspora = new Set();
  const tokuMinters = new Set();
  let totalToku = 0;
  let lastEventTs = 0;
  const eventCounts = { TokuMinted: 0, SessionRecorded: 0, LanternSubmitted: 0, GiftCreated: 0, GiftClaimed: 0, Beat: 0, SeedSealed: 0, SeedOpened: 0 };

  for (const e of events) {
    eventCounts[e.type] = (eventCounts[e.type] || 0) + 1;
    if (e.ts > lastEventTs) lastEventTs = e.ts;
    if (e.type === "GiftClaimed" && e.data.recipient) {
      diaspora.add(e.data.recipient);
    }
    if (e.type === "TokuMinted") {
      const amt = Number(e.data.amount || 0);
      totalToku += amt / 1e9;
      if (e.data.recipient) tokuMinters.add(e.data.recipient);
    }
  }

  // Format recent feed for UI (top 12)
  const feed = events.slice(0, 12).map((e) => ({
    type: e.type,
    tx: e.tx,
    ts: e.ts,
    summary: summarizeEvent(e),
    explorerUrl: e.tx ? `https://suiscan.xyz/testnet/tx/${e.tx}` : null,
  }));

  res.json({
    networkSize: diaspora.size + tokuMinters.size, // approx unique participants
    diaspora: Array.from(diaspora).map((addr) => ({
      addr,
      short: addr.slice(0, 8) + "…" + addr.slice(-4),
      explorerUrl: `https://suiscan.xyz/testnet/account/${addr}`,
    })),
    eventCounts,
    totalTokuMintedRecent: totalToku,
    lastEventTs,
    feed,
    package: PACKAGE_V1,
    explorerPackageUrl: `https://suiscan.xyz/testnet/object/${PACKAGE_V1}`,
  });
});

function decodeReason(reason) {
  if (!reason) return "";
  if (typeof reason === "string") return reason;
  if (Array.isArray(reason)) {
    try { return Buffer.from(reason).toString("utf8"); } catch { return ""; }
  }
  return String(reason);
}

function summarizeEvent(e) {
  switch (e.type) {
    case "TokuMinted": {
      const amt = Number(e.data.amount || 0) / 1e9;
      const reason = decodeReason(e.data.reason);
      return reason ? `+${amt} TOKU ─ ${reason}` : `+${amt} TOKU mint`;
    }
    case "SessionRecorded":
      return `座 ${e.data.duration_secs || "?"}s 完走`;
    case "LanternSubmitted":
      return `灯火が流れた(プール ${e.data.pool_size || "?"} 枚)`;
    case "GiftCreated":
      return `ギフト ${(Number(e.data.amount || 0) / 1e9).toFixed(1)} TOKU 封入`;
    case "GiftClaimed":
      return `${(e.data.recipient || "").slice(0, 10)}… が受領`;
    case "Beat":
      return `世界の鼓動 = ${e.data.total || "?"}`;
    case "SeedSealed":
      return `未来の種、封印`;
    case "SeedOpened":
      return `種、解封 (${e.data.days_elapsed || 0} 日経過)`;
    default:
      return e.type;
  }
}

app.post("/api/reset", (_req, res) => {
  conversation.length = 0;
  res.json({ ok: true });
});

app.post("/api/chat", async (req, res) => {
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: "message required" });

  conversation.push({ role: "user", content: String(message) });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...conversation,
      ],
      max_tokens: 200,
      temperature: 0.7,
    });
    const reply = completion.choices[0]?.message?.content || "(沈黙)";
    conversation.push({ role: "assistant", content: reply });
    res.json({ reply });
  } catch (e) {
    console.error("[chat error]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Tool triggers — each runs the corresponding shell script and pushes
// a system-narrated result into the conversation.

async function runTool(scriptName, args) {
  const script = path.join(TOOLS_DIR, scriptName);
  const { stdout } = await exec(script, args, {
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, PATH: process.env.PATH + ":" + path.join(process.env.HOME, "tools/sui-testnet-v1.71.0") },
  });
  // Scripts emit a single JSON line on the last line.
  const lastLine = stdout.trim().split("\n").pop();
  return JSON.parse(lastLine);
}

app.post("/api/tool/record-session", async (req, res) => {
  const { duration = 180, colorBefore = "重い", colorAfter = "薄い水色", reflection = "" } = req.body || {};
  try {
    const result = await runTool("tsumu_record_session.sh", [
      AGENT_ADDR, String(duration), colorBefore, colorAfter, reflection || "今日の3分",
    ]);
    const narrative = `受け取りました。+${result.toku_minted_human} TOKU。\n${result.message_for_agent}\nTX: ${result.mint_tx.slice(0, 12)}…`;
    conversation.push({ role: "assistant", content: narrative });
    res.json({ ...result, narrative });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/tool/lantern-submit", async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: "text required" });
  try {
    const result = await runTool("tsumu_lantern_submit.sh", [AGENT_ADDR, text]);
    const narrative = `${result.message_for_agent}\nプールサイズ: ${result.lantern_pool_size} 枚`;
    conversation.push({ role: "assistant", content: narrative });
    res.json({ ...result, narrative });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/tool/seal-seed", async (req, res) => {
  const { message, seconds = 60 } = req.body || {};
  if (!message) return res.status(400).json({ error: "message required" });
  try {
    const result = await runTool("tsumu_seal_seed.sh", [AGENT_ADDR, message, String(seconds)]);
    const narrative = `${result.message_for_agent}\nseed: ${result.seed_id.slice(0, 16)}…`;
    conversation.push({ role: "assistant", content: narrative });
    res.json({ ...result, narrative });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/tool/gift-create", async (req, res) => {
  const { amount = 1, note = "あかりからの最初の徳" } = req.body || {};
  try {
    const result = await runTool("tsumu_gift_create.sh", [String(amount), note]);
    const narrative = `リンクできました:\n${result.claim_url}\nリンクを開いて、Google ログインだけで受け取れます。`;
    conversation.push({ role: "assistant", content: narrative });
    res.json({ ...result, narrative });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== Storyline beats (あかりの30日) =====
//
// Each beat narrates a moment, optionally runs an on-chain tool, and
// advances the conversation. The frontend calls /api/story/:beat.

const STORY_BEATS = {
  "tsumu-self": {
    label: "① 自分の中に、徳を積む(3分の座)",
    narrate: [
      { role: "system", body: "(朝 6:55、布団の中) Tsumu の朝の声がけ" },
      { role: "assistant", body: "おはよう。今、心は何色?" },
      { role: "user", body: "重い" },
      { role: "assistant", body: "重い、を抱えたまま、3分だけ座ってみますか?\n起きなくていいです。布団の中で、目を開けたままでも。" },
      { role: "user", body: "やる" },
    ],
    tool: "record-session",
    args: { duration: 180, colorBefore: "重い", colorAfter: "薄い水色", reflection: "布団の中、3分" },
    afterPrompt: "3分の座が終わり、心の色が動いた。あなたの中に、最初の徳がひとつ積まれた——とだけ、静かに伝えてください。一言。",
  },
  "tsumu-share": {
    label: "② 友達に紹介する(連鎖が始まる)",
    narrate: [
      { role: "system", body: "(数日後) 友達がしんどそうにしている。受け取った徳のひとつぶを、渡したい" },
      { role: "user", body: "友達がしんどそう。何か渡せる?" },
    ],
    tool: "gift-create",
    args: { amount: 1, note: "しんどい時、座れる。1 TOKU 渡しとくね" },
    afterPrompt: "claim URL ができた。リンクを静かに渡すように促してください。「配布の連鎖が始まる」と一言だけ添えて。",
  },
};

app.get("/api/story/list", (_req, res) => {
  res.json(Object.entries(STORY_BEATS).map(([id, b]) => ({ id, label: b.label, hasTool: !!b.tool })));
});

app.post("/api/story/:beat", async (req, res) => {
  const beat = STORY_BEATS[req.params.beat];
  if (!beat) return res.status(404).json({ error: "unknown beat" });

  // Push narration into conversation
  for (const n of beat.narrate) {
    if (n.role === "system") {
      conversation.push({ role: "assistant", content: `[ナレーション] ${n.body}`, _meta: "system" });
    } else {
      conversation.push({ role: n.role, content: n.body });
    }
  }

  let toolResult = null;
  if (beat.tool) {
    try {
      const url = `http://localhost:${PORT}/api/tool/${beat.tool}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(beat.args || {}),
      });
      toolResult = await r.json();
    } catch (e) {
      toolResult = { error: e.message };
    }
  }

  // Ask LLM to follow-up in Tsumu's voice
  let followUp = "";
  if (beat.afterPrompt) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...conversation,
          { role: "system", content: `次の指示に従って Tsumu として一言返してください: ${beat.afterPrompt}` },
        ],
        max_tokens: 150,
        temperature: 0.7,
      });
      followUp = completion.choices[0]?.message?.content || "";
      if (followUp) conversation.push({ role: "assistant", content: followUp });
    } catch (e) {
      console.error("[story followUp]", e.message);
    }
  }

  res.json({ beat: req.params.beat, toolResult, followUp });
});

// ===== Identity registry: Discord ↔ Sui =====
//
// Bridges the claim-app onboarding moment ("招き入れる") with the
// OpenClaw Discord agent: when a user claims TOKU on the web and then
// joins the Tsumu bot in Discord, OpenClaw resolves their Discord ID
// to the Sui address that holds their virtue.
//
// Storage: data/identity.json (file-backed, survives restart).
// Onboard tokens are one-time, expire after 1h.

const DATA_DIR = path.join(__dirname, "data");
const IDENTITY_PATH = path.join(DATA_DIR, "identity.json");

await mkdir(DATA_DIR, { recursive: true });

async function loadIdentity() {
  try {
    return JSON.parse(await readFile(IDENTITY_PATH, "utf-8"));
  } catch {
    return { by_discord: {}, by_sui: {}, onboard_tokens: {} };
  }
}

async function saveIdentity(state) {
  await writeFile(IDENTITY_PATH, JSON.stringify(state, null, 2));
}

// Migrate legacy `{}` shape on first read
async function getIdentity() {
  const s = await loadIdentity();
  if (!s.by_discord) Object.assign(s, { by_discord: {}, by_sui: {}, onboard_tokens: {} });
  return s;
}

// Issue a one-time onboard token (called by claim-app on successful claim)
app.post("/api/identity/onboard-token", async (req, res) => {
  const { sui_addr, claim_id } = req.body || {};
  if (!sui_addr) return res.status(400).json({ error: "sui_addr required" });
  const state = await getIdentity();
  const token = crypto.randomBytes(16).toString("hex");
  state.onboard_tokens[token] = {
    sui_addr,
    claim_id: claim_id || null,
    issued_at: Date.now(),
    expires_at: Date.now() + 60 * 60 * 1000,
  };
  await saveIdentity(state);
  res.json({ onboard_token: token, expires_in: 3600 });
});

// Bind a Discord ID to a Sui address. If onboard_token is present, validate
// it matches the sui_addr and burn it.
app.post("/api/identity/bind", async (req, res) => {
  const { discord_id, sui_addr, onboard_token, display_name } = req.body || {};
  if (!discord_id || !sui_addr) {
    return res.status(400).json({ error: "discord_id and sui_addr required" });
  }
  const state = await getIdentity();

  if (onboard_token) {
    const t = state.onboard_tokens[onboard_token];
    if (!t) return res.status(403).json({ error: "invalid onboard_token" });
    if (Date.now() > t.expires_at) return res.status(403).json({ error: "onboard_token expired" });
    if (t.sui_addr !== sui_addr) return res.status(403).json({ error: "sui_addr mismatch" });
    delete state.onboard_tokens[onboard_token];
  }

  state.by_discord[discord_id] = { sui_addr, display_name: display_name || null, bound_at: Date.now() };
  state.by_sui[sui_addr] = { discord_id, display_name: display_name || null };
  await saveIdentity(state);
  res.json({ bound: true, discord_id, sui_addr, message_for_agent: "Discord と Sui を結びました。これからは、あなたの徳として積まれます。" });
});

// Resolve Discord ID -> Sui address (called by record_session preflight)
app.get("/api/identity/by-discord/:id", async (req, res) => {
  const state = await getIdentity();
  const entry = state.by_discord[req.params.id];
  res.json({ registered: !!entry, sui_addr: entry?.sui_addr || null, display_name: entry?.display_name || null });
});

// Reverse lookup
app.get("/api/identity/by-sui/:addr", async (req, res) => {
  const state = await getIdentity();
  const entry = state.by_sui[req.params.addr];
  res.json({ registered: !!entry, discord_id: entry?.discord_id || null });
});

// Healthz
app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Tsumu chat at http://localhost:${PORT}/`);
  console.log(`SOUL.md loaded: ${SOUL.length} chars`);
});
