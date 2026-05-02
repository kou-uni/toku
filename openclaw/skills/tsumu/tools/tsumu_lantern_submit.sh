#!/usr/bin/env bash
# Submit a reflection to the global Lantern pool. The agent calls this when
# the user agrees to share their evening reflection anonymously.
#
# Usage:
#   tsumu_lantern_submit.sh <user_addr> <reflection_text>

# shellcheck source=_lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <user_addr> <reflection_text>" >&2
    exit 1
fi

USER_ADDR="$1"
TEXT="$2"

OUT=$(sui client call \
    --package "$TSUMU_PACKAGE_ID" \
    --module lantern --function submit \
    --args "$TSUMU_LANTERN_POOL_ID" "$TEXT" "$SUI_CLOCK_ID" \
    --gas-budget "$GAS_BUDGET" --json)

TX=$(echo "$OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("digest",""))')
POOL_SIZE=$(echo "$OUT" | python3 -c 'import sys,json
d=json.load(sys.stdin)
for e in d.get("events",[]):
    if e.get("parsedJson",{}).get("pool_size") is not None:
        print(e["parsedJson"]["pool_size"])
        sys.exit(0)
print(0)')

# Reward the submitter with 0.5 TOKU.
TOKU_AMOUNT=$(to_atomic 0.5)
MINT_TX=$(sui client call \
    --package "$TSUMU_PACKAGE_ID" \
    --module toku --function mint_to \
    --args "$TSUMU_MINT_AUTHORITY_ID" "$TOKU_AMOUNT" "$USER_ADDR" "灯火を流した: $(echo "$TEXT" | head -c 30)" "$SUI_CLOCK_ID" \
    --gas-budget "$GAS_BUDGET" --json | python3 -c 'import sys,json; print(json.load(sys.stdin).get("digest",""))')

SUBMIT_TX="$TX" MINT_TX="$MINT_TX" POOL_SIZE="$POOL_SIZE" \
python3 <<'PYEOF'
import json, os
print(json.dumps({
  "submit_tx": os.environ['SUBMIT_TX'],
  "mint_tx": os.environ['MINT_TX'],
  "lantern_pool_size": int(os.environ['POOL_SIZE']),
  "toku_minted_human": 0.5,
  "message_for_agent": "ありがとう。誰かの朝に届きます。+0.5 TOKU。",
}, ensure_ascii=False))
PYEOF
