// Read-only Sui RPC helpers for Tide.
//
// Pure fetch() — no SDK, no signer, no secret keys. The Tide page is a
// public visualization that anyone can view; on-chain reads are enough.

const SUI_RPC = process.env.SUI_RPC_URL || "https://fullnode.testnet.sui.io:443";

const PACKAGE_V1 =
  process.env.TSUMU_PACKAGE_V1_ID ||
  "0xbb218662a9d57c7098974bd1b687767a5d2dd57fc1cc2599d8dcf71e2e2a7f02";

const WORLD_PULSE_ID =
  process.env.TSUMU_WORLD_PULSE_ID ||
  "0x5fed66c7f90aa9856e25da762f3851eae65ee9ef3fd516b7658d2d4bf73defc2";

const LANTERN_POOL_ID =
  process.env.TSUMU_LANTERN_POOL_ID ||
  "0x7719d9085533b02bd98177154ba8fd11031a08b3050b59aed6fa6ea3ef5b6ba5";

export { PACKAGE_V1, WORLD_PULSE_ID, LANTERN_POOL_ID };

async function suiRpc(method, params) {
  const r = await fetch(SUI_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await r.json();
  return j.result;
}

export async function getPulseAndPool() {
  try {
    const [pulse, pool] = await Promise.all([
      suiRpc("sui_getObject", [WORLD_PULSE_ID, { showContent: true }]),
      suiRpc("sui_getObject", [LANTERN_POOL_ID, { showContent: true }]),
    ]);
    const pulseFields =
      pulse?.data?.content?.fields ?? pulse?.data?.content ?? {};
    const poolFields =
      pool?.data?.content?.fields ?? pool?.data?.content ?? {};
    return {
      worldPulseTotal: Number(pulseFields.total_beats || 0),
      lanternPoolSize: Array.isArray(poolFields.cards)
        ? poolFields.cards.length
        : Number(poolFields.total_submitted || 0),
    };
  } catch (e) {
    return { worldPulseTotal: null, lanternPoolSize: null };
  }
}

// --- per-address summary ---------------------------------------------------

const SUI_ADDR_RE = /^0x[0-9a-f]{1,64}$/i;
export function isValidSuiAddr(s) {
  if (typeof s !== "string") return false;
  // Accept either canonical 0x + 64 hex or shorter (we normalise below).
  return SUI_ADDR_RE.test(s.trim()) && s.length <= 66;
}
function normaliseAddr(s) {
  const t = s.trim().toLowerCase();
  if (!t.startsWith("0x")) return null;
  const body = t.slice(2);
  return "0x" + body.padStart(64, "0");
}

export async function getActorSummary(rawAddr) {
  if (!isValidSuiAddr(rawAddr)) return null;
  const addr = normaliseAddr(rawAddr);

  const events = await getRecentSuiEvents();

  // An event "involves" addr if any actor field equals addr. Different
  // event types use different field names; we check all of them.
  const involves = (e) => {
    const d = e.data || {};
    return [d.owner, d.author, d.recipient, d.sender, d.original_author]
      .some((v) => typeof v === "string" && v.toLowerCase() === addr);
  };
  const mine = events.filter(involves);

  const countsBy = (t) => mine.filter((e) => e.type === t).length;
  const counts = {
    sessions: countsBy("SessionRecorded"),
    lanterns: countsBy("LanternSubmitted"),
    gifts_sent: countsBy("GiftCreated"),
    gifts_received: countsBy("GiftClaimed"),
    seeds: countsBy("SeedSealed"),
    minted_to_me: countsBy("TokuMinted"),
  };

  let balance_human = null;
  try {
    const r = await suiRpc("suix_getBalance", [
      addr,
      `${PACKAGE_V1}::toku::TOKU`,
    ]);
    balance_human = Number(r?.totalBalance || 0) / 1e9;
  } catch (_e) {
    // Address unknown to the chain just leaves balance null.
  }

  return {
    addr,
    short: addr.slice(0, 6) + "…" + addr.slice(-4),
    balance_human,
    counts,
    total_contributions: counts.sessions + counts.lanterns + counts.gifts_sent,
    seen_in_recent_window: mine.length,
    explorerUrl: `https://suiscan.xyz/testnet/account/${addr}`,
  };
}

// ---------------------------------------------------------------------------

const _eventCache = { ts: 0, data: null };

export async function getRecentSuiEvents() {
  if (Date.now() - _eventCache.ts < 5000 && _eventCache.data) {
    return _eventCache.data;
  }
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
        null,
        30,
        true,
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
    } catch (_e) {
      // skip — best effort
    }
  }
  all.sort((a, b) => b.ts - a.ts);
  const data = all.slice(0, 30);
  _eventCache.ts = Date.now();
  _eventCache.data = data;
  return data;
}
