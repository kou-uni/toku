// Vercel Serverless: /api/escrow/:id
// Read-only — uses @mysten/sui SDK (lib/tsumu.js) instead of sui CLI shell-out
// so this works on Vercel without the binary.

import { getEscrow } from "../../lib/tsumu.js";

export default async function handler(req, res) {
  const id = req.query?.id || req.url?.split("/").pop()?.split("?")[0];
  if (!id) return res.status(400).json({ error: "missing escrow id" });

  try {
    const fields = await getEscrow(id);
    const senderAddr = fields.sender ?? "";
    res.status(200).json({
      escrow_id: id,
      sender: senderAddr,
      sender_short: senderAddr ? `${senderAddr.slice(0, 6)}…${senderAddr.slice(-4)}` : "",
      note: fields.note ?? "",
      amount_human: fields.amount_atomic / 1e9,
      claimed: fields.claimed,
      created_at_ms: fields.created_at_ms,
      explorer_url: `https://suiscan.xyz/testnet/object/${id}`,
    });
  } catch (e) {
    res.status(404).json({ error: "escrow_not_found", detail: e.message });
  }
}
