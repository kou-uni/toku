#!/usr/bin/env bash
# Claim a gift escrow on behalf of a recipient address.
# Called by the claim webpage's backend after the recipient signs in
# (or, in MVP, after a Google login that derives a deterministic address).
#
# Usage:
#   tsumu_gift_claim_to.sh <escrow_id> <claim_code> <recipient_addr>

# shellcheck source=_lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

if [ "$#" -lt 3 ]; then
    echo "Usage: $0 <escrow_id> <claim_code> <recipient_addr>" >&2
    exit 1
fi

ESCROW_ID="$1"
CLAIM_CODE="$2"
RECIPIENT="$3"

CODE_HASH_HEX=$(printf '%s' "$CLAIM_CODE" | shasum -a 256 | cut -d' ' -f1)

OUT=$(sui client call \
    --package "$TSUMU_PACKAGE_ID" \
    --module gift --function claim_to \
    --args "$ESCROW_ID" "0x$CODE_HASH_HEX" "$RECIPIENT" "$SUI_CLOCK_ID" \
    --gas-budget "$GAS_BUDGET" --json)

CLAIM_TX=$(echo "$OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("digest",""))')

# Extract amount from event
AMOUNT=$(echo "$OUT" | python3 -c '
import sys, json
d = json.load(sys.stdin)
for e in d.get("events", []):
    pj = e.get("parsedJson", {})
    if "amount" in pj and pj.get("recipient") is not None:
        print(pj["amount"])
        sys.exit(0)
print(0)
')

# Reward the SENDER with +1 TOKU pay-forward bonus.
SENDER=$(echo "$OUT" | python3 -c '
import sys, json
d = json.load(sys.stdin)
for e in d.get("events", []):
    pj = e.get("parsedJson", {})
    if "sender" in pj and pj.get("recipient") is not None:
        print(pj["sender"])
        sys.exit(0)
print("")
')

if [ -n "$SENDER" ] && [ "$SENDER" != "$RECIPIENT" ]; then
    sui client call \
        --package "$TSUMU_PACKAGE_ID" \
        --module toku --function mint_to \
        --args "$TSUMU_MINT_AUTHORITY_ID" "$(to_atomic 1)" "$SENDER" "pay_forward_bonus" "$SUI_CLOCK_ID" \
        --gas-budget "$GAS_BUDGET" --json > /dev/null
fi

# Reward the RECIPIENT with +1 TOKU "first receive" bonus.
sui client call \
    --package "$TSUMU_PACKAGE_ID" \
    --module toku --function mint_to \
    --args "$TSUMU_MINT_AUTHORITY_ID" "$(to_atomic 1)" "$RECIPIENT" "first_receive_bonus" "$SUI_CLOCK_ID" \
    --gas-budget "$GAS_BUDGET" --json > /dev/null

CLAIM_TX="$CLAIM_TX" RECIPIENT="$RECIPIENT" AMOUNT="$AMOUNT" SENDER="$SENDER" \
python3 <<'PYEOF'
import json, os
amount_atomic = int(os.environ['AMOUNT'])
print(json.dumps({
  "claim_tx": os.environ["CLAIM_TX"],
  "recipient": os.environ["RECIPIENT"],
  "sender": os.environ["SENDER"],
  "amount_human": amount_atomic / 1e9,
  "sender_pay_forward_bonus_toku": 1,
  "recipient_first_receive_bonus_toku": 1,
  "message_for_recipient": "受け取りました。+{:.1f} TOKU。\n\nこれが、あなたの最初の徳です。".format(amount_atomic / 1e9 + 1),
}, ensure_ascii=False))
PYEOF
