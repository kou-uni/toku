// AP2 (Agent Payments Protocol) Mandate construction helpers.
//
// AP2 is Google × Mysten Labs' agentic payment standard, with Sui as a
// launch partner. Every payment is anchored by three signed Mandates:
//
//   IntentMandate  : "I, the user, authorize my agent to make this kind
//                     of purchase under these conditions."
//   CartMandate    : "Here is the specific item, quantity, and price."
//   PaymentMandate : "Here is the chosen payment instrument and route."
//
// x402 is AP2's HTTP-native crypto payment scheme. In this mockup we
// produce AP2-shaped mandates and embed them in the x402 402 response,
// so that future Sui Payment Kit facilitators can drop in unchanged.

import crypto from "node:crypto";

function id() {
  return "ap2_" + crypto.randomBytes(8).toString("hex");
}

export function buildIntentMandate({ user, intent }) {
  return {
    type: "IntentMandate",
    id: id(),
    user,
    intent,
    constraints: {
      max_total_usdc: "1.00",
      window_seconds: 3600,
    },
    issued_at: new Date().toISOString(),
    signature: "mock-sig-" + crypto.randomBytes(8).toString("hex"),
  };
}

export function buildCartMandate({ intentMandateId, item, priceUsdc }) {
  return {
    type: "CartMandate",
    id: id(),
    intent_mandate: intentMandateId,
    items: [item],
    price: { amount: priceUsdc, currency: "USDC" },
    issued_at: new Date().toISOString(),
    signature: "mock-sig-" + crypto.randomBytes(8).toString("hex"),
  };
}

export function buildPaymentMandate({ cartMandateId, payer, payee, scheme, network }) {
  return {
    type: "PaymentMandate",
    id: id(),
    cart_mandate: cartMandateId,
    payer,
    payee,
    scheme,         // "x402-compat"
    network,        // "sui-testnet" (target) — currently mocked
    issued_at: new Date().toISOString(),
    signature: "mock-sig-" + crypto.randomBytes(8).toString("hex"),
  };
}
