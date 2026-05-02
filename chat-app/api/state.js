// Vercel Serverless: /api/state
// Read-only Sui state for the chat sidebar.

import { AGENT_ADDR, getTokuBalance, getPulseAndPool } from "./_lib/sui-rpc.js";

export default async function handler(_req, res) {
  const [toku, counters] = await Promise.all([
    getTokuBalance(AGENT_ADDR),
    getPulseAndPool(),
  ]);
  res.status(200).json({
    conversation: [],
    agentAddr: AGENT_ADDR,
    tokuBalance: toku,
    worldPulseTotal: counters.worldPulseTotal,
    lanternPoolSize: counters.lanternPoolSize,
    explorerUrl: `https://suiscan.xyz/testnet/account/${AGENT_ADDR}`,
  });
}
