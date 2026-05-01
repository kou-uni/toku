// Tsumu x402 / AP2 mockup server
//
// Serves a single resource: GET /api/lantern. Without payment, it returns
// HTTP 402 with payment requirements. With a valid X-PAYMENT header, it
// returns a stranger's anonymous reflection.
//
// The server is intentionally minimal. It demonstrates:
//   1. The HTTP 402 dance (real protocol shape)
//   2. AP2 Mandate triplet (Intent / Cart / Payment) embedded in x402
//   3. Sui-aligned payee/network fields, ready for Sui Payment Kit
//
// In production:
//   - Payment verification would go through a real x402 facilitator
//   - The Lantern card would come from the Sui LanternPool shared object
//   - The 80% donation share would actually settle into the Tide pool
//
// For the hackathon demo, all of these are mocked but the protocol shape
// is real, so the front-end (OpenClaw tool) sees an authentic 402 dance.

import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import { pickRandom } from "./lantern-cards.js";
import {
  buildIntentMandate,
  buildCartMandate,
  buildPaymentMandate,
} from "./ap2.js";

const PORT = process.env.PORT || 4402;
const AGENT_PAYEE = process.env.AGENT_PAYEE_ADDR || "0x4b18aaafa7b8c8e60bdd9e97ca79a86b93a947c0dbb30e79e66a7105c6f75bac";
const PRICE_USDC = "0.05";
const PRICE_ATOMIC = "50000";  // 0.05 USDC at 6 decimals

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    name: "Tsumu x402 / AP2 mockup",
    endpoints: ["GET /api/lantern"],
    note: "Mockup. Real verification disabled. AP2-aligned response shape.",
  });
});

app.get("/api/lantern", (req, res) => {
  const xPayment = req.header("X-PAYMENT");
  const drawnFor = req.query.for || "anonymous";

  if (!xPayment) {
    // First call — return 402 with payment requirements.
    const intent = buildIntentMandate({
      user: drawnFor,
      intent: "buy_lantern",
    });
    const cart = buildCartMandate({
      intentMandateId: intent.id,
      item: { kind: "lantern_card", count: 1, description: "A stranger's reflection (灯火)" },
      priceUsdc: PRICE_USDC,
    });

    return res.status(402).json({
      x402Version: 1,
      error: "Payment Required",
      accepts: [
        {
          scheme: "exact",
          network: "sui-testnet",
          maxAmountRequired: PRICE_ATOMIC,
          asset: "USDC",
          payTo: AGENT_PAYEE,
          description: "Lantern card: a stranger's anonymous reflection",
          extra: {
            ap2: { intentMandate: intent, cartMandate: cart },
            tsumu_split: {
              author_reward_toku: 1.5,
              tide_pool_share: 0.8,
              infra_share: 0.2,
            },
          },
        },
      ],
    });
  }

  // Mock verification: in production this calls an x402 facilitator
  // which verifies the on-chain payment. Here we just check the header
  // is non-empty and structurally plausible.
  let parsedPayment;
  try {
    parsedPayment = JSON.parse(Buffer.from(xPayment, "base64").toString("utf-8"));
  } catch {
    return res.status(400).json({ error: "X-PAYMENT must be base64-encoded JSON" });
  }
  if (!parsedPayment.payer || !parsedPayment.signature) {
    return res.status(400).json({ error: "Payment payload missing payer/signature" });
  }

  const paymentMandate = buildPaymentMandate({
    cartMandateId: parsedPayment.cart_mandate || "unknown",
    payer: parsedPayment.payer,
    payee: AGENT_PAYEE,
    scheme: "x402-compat",
    network: "sui-testnet",
  });

  // Draw a card.
  const card = pickRandom();
  const txDigest = "0x" + crypto.randomBytes(32).toString("hex");

  return res.status(200).json({
    lantern: {
      text: card.text,
      author_pseudo: card.author_pseudo,
      submitted_days_ago: card.submitted_days_ago,
    },
    receipt: {
      tx_digest: txDigest,
      paid_usdc: PRICE_USDC,
      paymentMandate,
      author_will_receive_toku: 1.5,
      tide_pool_credit_usdc: (Number(PRICE_USDC) * 0.8).toFixed(4),
    },
  });
});

app.listen(PORT, () => {
  console.log(`tsumu x402 mockup listening on http://localhost:${PORT}`);
  console.log(`  GET / — info`);
  console.log(`  GET /api/lantern?for=<addr> — 402 dance, returns lantern card on payment`);
});
