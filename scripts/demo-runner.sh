#!/usr/bin/env bash
# demo-runner.sh — runs the entire Tsumu user journey end-to-end on chain.
#
# Useful for:
#   - smoke testing (verify all moving parts are alive)
#   - backup video recording (we screen-record this terminal)
#   - rehearsal warm-ups before going live
#
# Usage:
#   scripts/demo-runner.sh

set -euo pipefail

export PATH="$HOME/tools/node-v24.15.0-darwin-arm64/bin:$HOME/tools/sui-testnet-v1.71.0:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TOOLS="$ROOT/openclaw/skills/tsumu/tools"

# shellcheck source=../openclaw/skills/tsumu/config.env
source "$ROOT/openclaw/skills/tsumu/config.env"

USER_ADDR="${TSUMU_DEMO_USER_ADDR:-$TSUMU_AGENT_ADDR}"

cyan() { printf '\033[1;36m%s\033[0m\n' "$*"; }
gold() { printf '\033[1;33m%s\033[0m\n' "$*"; }
muted() { printf '\033[0;90m%s\033[0m\n' "$*"; }
divider() { printf '\n\033[0;90m'; printf '─%.0s' {1..72}; printf '\033[0m\n\n'; }

step() {
    divider
    cyan "▼ $1"
    muted "$2"
    echo
}

# --- 0. Preflight ---
step "Preflight" "Verify x402 server, claim app, and Sui wallet."

if ! curl -sf http://localhost:4402/ > /dev/null; then
    echo "ERROR: x402 server not running on :4402. Run: cd x402-server && node src/index.js" >&2
    exit 1
fi
if ! curl -sf http://localhost:3000/healthz > /dev/null; then
    echo "ERROR: claim app not running on :3000. Run: cd claim-app && node server.js" >&2
    exit 1
fi
muted "x402 ✓  claim app ✓  sui address: ${TSUMU_AGENT_ADDR:0:10}..."

# --- 1. Day 1: 朝の3分 ---
step "Day 1: 朝の3分" "session NFT + TOKU mint + world pulse beat"
RECORD_OUT=$("$TOOLS/tsumu_record_session.sh" "$USER_ADDR" 180 "重い" "薄い水色" "デモのテスト座")
echo "$RECORD_OUT" | python3 -m json.tool

# --- 2. Day 3: 灯火を受け取る (x402) ---
step "Day 3: 灯火を受け取る" "x402 / AP2 dance — 0.05 USDC で誰かの言葉が届く"
LANTERN_OUT=$("$TOOLS/tsumu_lantern_buy.sh" "$USER_ADDR")
echo "$LANTERN_OUT" | python3 -m json.tool

# --- 3. Day 7: 自分も灯火を流す ---
step "Day 7: 灯火を流す" "reflection を匿名でプールに投稿、+0.5 TOKU 還元"
SUBMIT_OUT=$("$TOOLS/tsumu_lantern_submit.sh" "$USER_ADDR" "描いてる時、私は呼吸している")
echo "$SUBMIT_OUT" | python3 -m json.tool

# --- 4. Day 7: 未来の自分への種 ---
step "Day 7: 未来の自分へ種を残す" "TimeLock object、60秒後に開封"
SEAL_OUT=$("$TOOLS/tsumu_seal_seed.sh" "$USER_ADDR" "今日の自分、完璧じゃなくていい" 60)
echo "$SEAL_OUT" | python3 -m json.tool
SEED_ID=$(echo "$SEAL_OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin)["seed_id"])')

# --- 5. Day 30: ペイフォワード ---
step "Day 30: 友達に 1 TOKU を渡す" "GiftEscrow + claim URL"
GIFT_OUT=$("$TOOLS/tsumu_gift_create.sh" 1 "あかりからの最初の徳")
echo "$GIFT_OUT" | python3 -m json.tool
ESCROW=$(echo "$GIFT_OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin)["escrow_id"])')
CODE=$(echo "$GIFT_OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin)["claim_code"])')
URL=$(echo "$GIFT_OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin)["claim_url"])')

gold "→ Open this URL in a browser:"
echo "  $URL"

# --- 6. Recipient claim (HTTP) ---
step "受け手が claim する(HTTP)" "claim webpage 経由で gift を受け取る"
CLAIM_RESP=$(curl -s -X POST http://localhost:3000/api/claim \
    -H "Content-Type: application/json" \
    -d "{\"escrow_id\":\"$ESCROW\",\"code\":\"$CODE\"}")
echo "$CLAIM_RESP" | python3 -m json.tool

# --- 7. Open the seed once ripe ---
step "60秒後: 種を開封" "TimeLock を解いて +2 TOKU"
muted "60秒待ちます…"
sleep 62
OPEN_OUT=$("$TOOLS/tsumu_open_seed.sh" "$USER_ADDR" "$SEED_ID")
echo "$OPEN_OUT" | python3 -m json.tool

divider
gold "✦ All flows complete. Tsumu Testnet on chain."
muted "Package: $TSUMU_PACKAGE_ID"
muted "Agent:   $TSUMU_AGENT_ADDR"
divider
