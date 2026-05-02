// Tsumu Tide — collective virtue → quarterly donation visualization.
//
// Read-only viewer site. The page shows the running on-chain pool, the
// candidates being voted on, and the past quarter's distribution. The
// USDC numbers are deterministic mocks derived from real World Pulse
// activity, so the page breathes with the rest of the demo without
// pretending to be a working donation system.
//
// OpenClaw deep-links here with /?ticket=<id> to acknowledge a Tsumu
// agent flow; the badge is purely cosmetic for now (the back-end
// doesn't validate or persist tickets — the source of truth stays on
// the agent side).

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getPulseAndPool,
  getRecentSuiEvents,
} from "./lib/sui.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- mock economic constants (centralized so they're easy to tune) ---
const TIDE_BASE_POOL_USDC = 187.42;
const TIDE_USDC_PER_BEAT = 0.073;
const TIDE_QUARTER_TARGET_USDC = 320;
const TIDE_VOTERS_TOTAL = 2177;

const TIDE_CITIES = [
  "京都", "札幌", "福岡", "台北", "金沢",
  "盛岡", "那覇", "松本", "高松", "大分",
];

const TIDE_CANDIDATES = [
  {
    id: "kodomo-shokudo",
    name: "子ども食堂ネットワーク",
    emoji: "🍱",
    blurb: "ひとり親家庭・困窮家庭の子に、温かい夕食を週2回。全国 4,000 拠点。",
    vote_share: 0.41,
  },
  {
    id: "kokoro-support",
    name: "心のサポート連絡会",
    emoji: "🌿",
    blurb: "よりそい電話・チャット相談を匿名で受ける、24時間体制のメンタルヘルス支援。",
    vote_share: 0.33,
  },
  {
    id: "yamadera-mori",
    name: "山寺と鎮守の森を守る",
    emoji: "⛩️",
    blurb: "里山・神社林の保全活動。三世代が手入れする、静かな森。",
    vote_share: 0.26,
  },
];

const TIDE_PAST = [
  {
    quarter: "2026 Q1",
    date: "2026-03-31",
    amount_usdc: 187.23,
    recipient: "静岡県のフードバンク連合",
    impact: "47 食の温かい夕食になりました。",
    photo_emoji: "🍙",
  },
  {
    quarter: "2025 Q4",
    date: "2025-12-31",
    amount_usdc: 142.08,
    recipient: "よりそいチャット相談センター",
    impact: "夜の相談員 3 人分の冬の人件費を支えました。",
    photo_emoji: "🕯️",
  },
];

function nextQuarterEnd(now = new Date()) {
  const y = now.getFullYear();
  const ends = [
    new Date(y, 2, 31),
    new Date(y, 5, 30),
    new Date(y, 8, 30),
    new Date(y, 11, 31),
  ];
  for (const d of ends) if (d > now) return d;
  return new Date(y + 1, 2, 31);
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < (s || "").length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

function pickCity(seed) {
  return TIDE_CITIES[Math.abs(hash(seed)) % TIDE_CITIES.length];
}

function eventToContribution(e) {
  const seed = e.tx || String(e.ts);
  const city = pickCity(seed);
  const perType = {
    LanternSubmitted: 0.12,
    SessionRecorded: 0.07,
    GiftCreated: 0.05,
    GiftClaimed: 0.05,
    Beat: 0.03,
    TokuMinted: 0.02,
  };
  const usdc = perType[e.type] ?? 0.03;
  const labels = {
    LanternSubmitted: "灯火を1枚流した",
    SessionRecorded: "3分の座を完了",
    GiftCreated: "ギフトを発行",
    GiftClaimed: "ギフトを受け取った",
    Beat: "世界の鼓動に加わった",
    TokuMinted: "徳がひとつ積まれた",
  };
  return {
    ts: e.ts,
    tx: e.tx,
    city,
    label: labels[e.type] || "祈り",
    usdc: Number(usdc.toFixed(2)),
    explorerUrl: e.tx ? `https://suiscan.xyz/testnet/tx/${e.tx}` : null,
  };
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/tide/state", async (req, res) => {
  const counters = await getPulseAndPool();
  const events = await getRecentSuiEvents();

  const beats = Number(counters.worldPulseTotal || 0);
  const poolUsdc = Number(
    (TIDE_BASE_POOL_USDC + beats * TIDE_USDC_PER_BEAT).toFixed(2)
  );
  const progressPct = Math.min(
    100,
    Math.round((poolUsdc / TIDE_QUARTER_TARGET_USDC) * 100)
  );

  const nextEnd = nextQuarterEnd();
  const daysLeft = Math.max(
    0,
    Math.ceil((nextEnd - new Date()) / 86400000)
  );

  const contributions = events.slice(0, 14).map(eventToContribution);

  const candidates = TIDE_CANDIDATES.map((c) => ({
    ...c,
    votes: Math.round(TIDE_VOTERS_TOTAL * c.vote_share),
    pct: Math.round(c.vote_share * 100),
  }));

  res.json({
    pool_usdc: poolUsdc,
    quarter_target_usdc: TIDE_QUARTER_TARGET_USDC,
    progress_pct: progressPct,
    next_distribution_at: nextEnd.toISOString().slice(0, 10),
    days_left: daysLeft,
    voters_total: TIDE_VOTERS_TOTAL,
    contributions,
    candidates,
    past_distributions: TIDE_PAST,
    ticket: req.query.ticket || null,
    note:
      "USDC 額はモック。集合徳プールの設計を見せるための可視化です。" +
      " on-chain 出来事から決定論的に生成されます。",
  });
});

app.get("/healthz", (_req, res) => res.json({ ok: true }));

export default app;

// Local dev only — not run under Vercel (api/index.js is the entry there).
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 3200;
  app.listen(PORT, () => {
    console.log(`tsumu tide listening on http://localhost:${PORT}`);
  });
}
