#!/usr/bin/env bash
# Buy a lantern card via the x402 / AP2 mockup endpoint.
# Performs the full HTTP 402 dance and returns the card text.
#
# Usage:
#   tsumu_lantern_buy.sh <user_addr>
#
# Outputs a single-line JSON object with: card text, paymentMandate, receipt.

# shellcheck source=_lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

USER_ADDR="${1:-anonymous}"
ENDPOINT="${X402_ENDPOINT:-http://localhost:4402/api/lantern}"

# Step 1: fetch without payment, expect 402 with payment requirements.
REQ_RESPONSE=$(curl -s -w '\n%{http_code}' "$ENDPOINT?for=$USER_ADDR")
HTTP_CODE=$(echo "$REQ_RESPONSE" | tail -n1)
BODY=$(echo "$REQ_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "402" ]; then
    emit_json "{\"error\": \"unexpected_status\", \"status\": \"$HTTP_CODE\"}"
    exit 1
fi

# Extract the cart_mandate id (we'll echo it back in the payment payload).
CART_ID=$(echo "$BODY" | python3 -c 'import sys,json
d=json.load(sys.stdin)
acc=d["accepts"][0]
print(acc["extra"]["ap2"]["cartMandate"]["id"])')

# Step 2: build a minimal payment payload (mock signature) and base64 encode.
PAYMENT_JSON=$(python3 -c "
import json,sys
print(json.dumps({
  'payer': '$USER_ADDR',
  'cart_mandate': '$CART_ID',
  'signature': 'mock-sig-from-tsumu-tool',
  'scheme': 'x402-compat',
  'network': 'sui-testnet',
}))
")
PAYMENT_B64=$(printf '%s' "$PAYMENT_JSON" | base64 | tr -d '\n')

# Step 3: retry with X-PAYMENT header.
SUCCESS_BODY=$(curl -s -H "X-PAYMENT: $PAYMENT_B64" "$ENDPOINT?for=$USER_ADDR")

# Forward the body as the agent's output, plus a friendly preformatted line.
SUCCESS_BODY="$SUCCESS_BODY" python3 <<'PYEOF'
import json, os
body = json.loads(os.environ['SUCCESS_BODY'])
text = body['lantern']['text']
print(json.dumps({
  "lantern_text": text,
  "submitted_days_ago": body['lantern']['submitted_days_ago'],
  "paid_usdc": body['receipt']['paid_usdc'],
  "tide_pool_credit_usdc": body['receipt']['tide_pool_credit_usdc'],
  "author_will_receive_toku": body['receipt']['author_will_receive_toku'],
  "tx_digest": body['receipt']['tx_digest'],
  "message_for_agent": "ある人からの言葉です:\n        ──────\n        「{}」\n        ──────\n        書いた人にも +1.5 TOKU 還元されます。".format(text),
}, ensure_ascii=False))
PYEOF
