// Shared Sui RPC helpers for chat-app Vercel functions.
// Uses raw JSON-RPC instead of @mysten/sui SDK to keep dependencies minimal.

export const SUI_RPC = process.env.SUI_RPC_URL || "https://fullnode.testnet.sui.io:443";
export const PACKAGE_V1 = process.env.TSUMU_PACKAGE_V1_ID || "0xbb218662a9d57c7098974bd1b687767a5d2dd57fc1cc2599d8dcf71e2e2a7f02";
export const WORLD_PULSE_ID = process.env.TSUMU_WORLD_PULSE_ID || "0x5fed66c7f90aa9856e25da762f3851eae65ee9ef3fd516b7658d2d4bf73defc2";
export const LANTERN_POOL_ID = process.env.TSUMU_LANTERN_POOL_ID || "0x7719d9085533b02bd98177154ba8fd11031a08b3050b59aed6fa6ea3ef5b6ba5";
export const AGENT_ADDR = process.env.TSUMU_AGENT_ADDR || "0x4b18aaafa7b8c8e60bdd9e97ca79a86b93a947c0dbb30e79e66a7105c6f75bac";

export async function suiRpc(method, params) {
  const r = await fetch(SUI_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await r.json();
  return j.result;
}

export async function getTokuBalance(addr) {
  try {
    const r = await suiRpc("suix_getBalance", [addr, `${PACKAGE_V1}::toku::TOKU`]);
    return Number(r?.totalBalance || 0) / 1e9;
  } catch {
    return null;
  }
}

export async function getPulseAndPool() {
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
  } catch {
    return { worldPulseTotal: null, lanternPoolSize: null };
  }
}

const _eventCache = { ts: 0, data: null };

export async function getRecentSuiEvents() {
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
    } catch {
      // skip
    }
  }
  all.sort((a, b) => b.ts - a.ts);
  const data = all.slice(0, 30);
  _eventCache.ts = Date.now();
  _eventCache.data = data;
  return data;
}

export function decodeReason(reason) {
  if (!reason) return "";
  if (typeof reason === "string") return reason;
  if (Array.isArray(reason)) {
    try { return Buffer.from(reason).toString("utf8"); } catch { return ""; }
  }
  return String(reason);
}

export function summarizeEvent(e) {
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
