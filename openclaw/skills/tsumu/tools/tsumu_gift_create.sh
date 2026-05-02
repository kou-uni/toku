#!/usr/bin/env bash
# Create a pay-it-forward gift: mints fresh TOKU into a GiftEscrow with a
# hashed claim code, then composes the claim URL the recipient will open.
#
# Usage:
#   tsumu_gift_create.sh <amount_human> <note>
#
# Outputs JSON: gift_tx, escrow_id, claim_code (plain), claim_url.

# shellcheck source=_lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <amount_human> <note>" >&2
    exit 1
fi

AMOUNT_HUMAN="$1"
NOTE="$2"

AMOUNT_ATOMIC=$(to_atomic "$AMOUNT_HUMAN")
CLAIM_CODE=$(uuidgen | tr -d '-' | head -c 16)
CLAIM_CODE_HASH_HEX=$(printf '%s' "$CLAIM_CODE" | shasum -a 256 | cut -d' ' -f1)
CLAIM_BASE_URL="${CLAIM_BASE_URL:-http://localhost:3000}"

# 1) Mint fresh TOKU to agent (gives us a Coin<TOKU> object we can spend
#    in the next call without needing to split an existing balance).
MINT_OUT=$(sui client call \
    --package "$TSUMU_PACKAGE_ID" \
    --module toku --function mint_to \
    --args "$TSUMU_MINT_AUTHORITY_ID" "$AMOUNT_ATOMIC" "$TSUMU_AGENT_ADDR" "ギフト発行: ${NOTE}" "$SUI_CLOCK_ID" \
    --gas-budget "$GAS_BUDGET" --json)

COIN_ID=$(echo "$MINT_OUT" | python3 -c '
import sys, json
d = json.load(sys.stdin)
for c in d.get("objectChanges", []):
    if c.get("type") == "created" and "::toku::TOKU" in c.get("objectType", ""):
        print(c["objectId"])
        sys.exit(0)
print("")
')

if [ -z "$COIN_ID" ]; then
    echo "ERROR: could not parse minted coin id" >&2
    exit 1
fi

# 2) Create the gift escrow with the freshly minted coin.
GIFT_OUT=$(sui client call \
    --package "$TSUMU_PACKAGE_ID" \
    --module gift --function create \
    --args "$COIN_ID" "0x$CLAIM_CODE_HASH_HEX" "$NOTE" "$SUI_CLOCK_ID" \
    --gas-budget "$GAS_BUDGET" --json)

GIFT_TX=$(echo "$GIFT_OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("digest",""))')

ESCROW_ID=$(echo "$GIFT_OUT" | python3 -c '
import sys, json
d = json.load(sys.stdin)
for c in d.get("objectChanges", []):
    if c.get("type") == "created" and "::gift::GiftEscrow" in c.get("objectType", ""):
        print(c["objectId"])
        sys.exit(0)
print("")
')

CLAIM_URL="$CLAIM_BASE_URL/claim/$ESCROW_ID?code=$CLAIM_CODE"

ESCROW_ID="$ESCROW_ID" GIFT_TX="$GIFT_TX" CLAIM_URL="$CLAIM_URL" \
CLAIM_CODE="$CLAIM_CODE" AMOUNT_HUMAN="$AMOUNT_HUMAN" \
python3 <<'PYEOF'
import json, os
print(json.dumps({
  "gift_tx": os.environ["GIFT_TX"],
  "escrow_id": os.environ["ESCROW_ID"],
  "claim_code": os.environ["CLAIM_CODE"],
  "claim_url": os.environ["CLAIM_URL"],
  "amount_human": float(os.environ["AMOUNT_HUMAN"]),
  "message_for_agent": "リンクできました:\n" + os.environ["CLAIM_URL"] + "\nリンクを開いて、Google ログインだけで受け取れます。",
}, ensure_ascii=False))
PYEOF
