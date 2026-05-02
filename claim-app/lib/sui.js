// Sui SDK client + agent keypair (singletons).
//
// Replaces the shell-out to `sui client ...` so this can run on Vercel
// where the Sui CLI binary isn't available. The agent's Ed25519 secret
// key is loaded from an env var (TSUMU_AGENT_PRIVATE_KEY_HEX, 32 bytes
// in hex) which Vercel stores as an encrypted environment variable.

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromHex } from "@mysten/sui/utils";

export const PACKAGE_ID =
  process.env.TSUMU_PACKAGE_ID ||
  "0xe82b4a3665e6e9aa9c3067366b801f7e4a56e3f2bd1f314bc8d138a5e0582f43";

export const PACKAGE_V1_ID =
  process.env.TSUMU_PACKAGE_V1_ID ||
  "0xbb218662a9d57c7098974bd1b687767a5d2dd57fc1cc2599d8dcf71e2e2a7f02";

export const MINT_AUTHORITY_ID =
  process.env.TSUMU_MINT_AUTHORITY_ID ||
  "0xee237372e355dfc1508d2e96107c149e0385cf2bb1387a3a2ce7eb4869a4611e";

export const WORLD_PULSE_ID =
  process.env.TSUMU_WORLD_PULSE_ID ||
  "0x5fed66c7f90aa9856e25da762f3851eae65ee9ef3fd516b7658d2d4bf73defc2";

export const LANTERN_POOL_ID =
  process.env.TSUMU_LANTERN_POOL_ID ||
  "0x7719d9085533b02bd98177154ba8fd11031a08b3050b59aed6fa6ea3ef5b6ba5";

export const CLOCK_ID = "0x6";

export const AGENT_ADDR =
  process.env.TSUMU_AGENT_ADDR ||
  "0x4b18aaafa7b8c8e60bdd9e97ca79a86b93a947c0dbb30e79e66a7105c6f75bac";

const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl("testnet");

// Fresh client per call. The SDK's built-in object cache holds stale
// versions across requests (causes "object version unavailable for
// consumption" errors when the agent's MintAuthority is mutated by
// previous transactions), so we sidestep it entirely.
export function getClient() {
  return new SuiClient({ url: RPC_URL });
}

let _keypair = null;
export function getKeypair() {
  if (_keypair) return _keypair;
  const hex = process.env.TSUMU_AGENT_PRIVATE_KEY_HEX;
  if (!hex) {
    throw new Error(
      "TSUMU_AGENT_PRIVATE_KEY_HEX env var not set — cannot sign Sui transactions"
    );
  }
  const bytes = fromHex(hex.startsWith("0x") ? hex.slice(2) : hex);
  if (bytes.length !== 32) {
    throw new Error(
      `expected 32-byte secret key, got ${bytes.length} bytes`
    );
  }
  _keypair = Ed25519Keypair.fromSecretKey(bytes);
  return _keypair;
}

export const tokuAtomic = (human) => BigInt(Math.round(human * 1e9));
