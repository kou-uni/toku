// Vercel Serverless: /api/sui/stats
// Events feed + diaspora visualization for the Sui panel.

import { PACKAGE_V1, getRecentSuiEvents, summarizeEvent } from "../_lib/sui-rpc.js";

export default async function handler(_req, res) {
  const events = await getRecentSuiEvents();
  const diaspora = new Set();
  const tokuMinters = new Set();
  let totalToku = 0;
  let lastEventTs = 0;
  const eventCounts = {
    TokuMinted: 0, SessionRecorded: 0, LanternSubmitted: 0,
    GiftCreated: 0, GiftClaimed: 0, Beat: 0, SeedSealed: 0, SeedOpened: 0,
  };

  for (const e of events) {
    eventCounts[e.type] = (eventCounts[e.type] || 0) + 1;
    if (e.ts > lastEventTs) lastEventTs = e.ts;
    if (e.type === "GiftClaimed" && e.data.recipient) diaspora.add(e.data.recipient);
    if (e.type === "TokuMinted") {
      totalToku += Number(e.data.amount || 0) / 1e9;
      if (e.data.recipient) tokuMinters.add(e.data.recipient);
    }
  }

  const feed = events.slice(0, 12).map((e) => ({
    type: e.type,
    tx: e.tx,
    ts: e.ts,
    summary: summarizeEvent(e),
    explorerUrl: e.tx ? `https://suiscan.xyz/testnet/tx/${e.tx}` : null,
  }));

  res.status(200).json({
    networkSize: diaspora.size + tokuMinters.size,
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
}
