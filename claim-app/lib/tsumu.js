// Tsumu on-chain operations — pure SDK calls, no shell tools.
//
// Each function corresponds to one of the openclaw/skills/tsumu/tools/*.sh
// scripts but uses @mysten/sui directly so it works under Vercel's Node
// serverless runtime (no `sui` CLI binary, no shell access).

import crypto from "node:crypto";
import { Transaction } from "@mysten/sui/transactions";
import {
  getClient,
  getKeypair,
  PACKAGE_ID,
  MINT_AUTHORITY_ID,
  CLOCK_ID,
  tokuAtomic,
} from "./sui.js";

// --- read: gift escrow detail ---------------------------------------------

export async function getEscrow(escrowId) {
  const obj = await getClient().getObject({
    id: escrowId,
    options: { showContent: true, showType: true },
  });
  // Sui SDK returns content.fields for Move structs.
  const fields = obj?.data?.content?.fields ?? obj?.data?.content ?? {};
  return {
    sender: fields.sender ?? "",
    note: fields.note ?? "",
    claimed: !!fields.claimed,
    amount_atomic: Number(fields.amount ?? 0),
    created_at_ms: Number(fields.created_at_ms ?? 0),
  };
}

// --- write: claim gift escrow + bonuses -----------------------------------

function sha256Bytes(s) {
  return Array.from(crypto.createHash("sha256").update(s).digest());
}

async function signAndExec(tx) {
  return getClient().signAndExecuteTransaction({
    signer: getKeypair(),
    transaction: tx,
    options: { showEvents: true, showObjectChanges: true, showEffects: true },
  });
}

// Fetch the current ObjectRef for an owned object. We pass these into the
// PTB explicitly via tx.objectRef() because tx.object(id) defers resolution
// to the SDK's input resolver, which sometimes hands back a stale cached
// reference (causing "object version unavailable for consumption" errors
// against rapidly mutated objects like MintAuthority).
async function freshOwnedRef(client, id) {
  const r = await client.getObject({ id, options: { showOwner: true } });
  if (!r?.data) throw new Error(`object ${id} not found`);
  return {
    objectId: r.data.objectId,
    version: r.data.version,
    digest: r.data.digest,
  };
}

export async function claimGift(escrowId, claimCode, recipient) {
  const client = getClient();

  // Pre-fetch escrow + freshest MintAuthority ref. Resolving these
  // ourselves and passing tx.objectRef() avoids the SDK's own resolver,
  // which can hand back stale versions for rapidly mutated objects.
  const [escrow, mintAuthRef] = await Promise.all([
    getEscrow(escrowId),
    freshOwnedRef(client, MINT_AUTHORITY_ID),
  ]);
  const sender = escrow.sender;
  const includeSenderBonus = sender && sender !== recipient;

  const codeHashBytes = sha256Bytes(claimCode);
  const tx = new Transaction();

  // 1) gift::claim_to — releases escrow TOKU to recipient.
  // GiftEscrow is a shared object; tx.object(id) will resolve it as such.
  tx.moveCall({
    target: `${PACKAGE_ID}::gift::claim_to`,
    arguments: [
      tx.object(escrowId),
      tx.pure.vector("u8", codeHashBytes),
      tx.pure.address(recipient),
      tx.object(CLOCK_ID),
    ],
  });

  // 2) Pay-forward bonus to sender (+1 TOKU), only if distinct.
  if (includeSenderBonus) {
    tx.moveCall({
      target: `${PACKAGE_ID}::toku::mint_to`,
      arguments: [
        tx.objectRef(mintAuthRef),
        tx.pure.u64(tokuAtomic(1)),
        tx.pure.address(sender),
        tx.pure.vector("u8", Array.from(Buffer.from("pay_forward_bonus"))),
        tx.object(CLOCK_ID),
      ],
    });
  }

  // 3) First-receive bonus to recipient (+1 TOKU).
  tx.moveCall({
    target: `${PACKAGE_ID}::toku::mint_to`,
    arguments: [
      tx.objectRef(mintAuthRef),
      tx.pure.u64(tokuAtomic(1)),
      tx.pure.address(recipient),
      tx.pure.vector("u8", Array.from(Buffer.from("first_receive_bonus"))),
      tx.object(CLOCK_ID),
    ],
  });

  const result = await signAndExec(tx);

  if (result.effects?.status?.status !== "success") {
    throw new Error(
      "claim ptb failed: " + (result.effects?.status?.error || "unknown")
    );
  }

  // Confirm amount from the actual event (authoritative).
  const ev = (result.events || []).find((e) =>
    e.type.includes("::gift::GiftClaimed")
  );
  const amount = Number(ev?.parsedJson?.amount ?? escrow.amount_atomic);

  return {
    claim_tx: result.digest,
    sender,
    recipient,
    amount_atomic: amount,
    amount_human: amount / 1e9,
  };
}
