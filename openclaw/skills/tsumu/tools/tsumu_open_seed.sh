#!/usr/bin/env bash
# Open a ripe TimeLock seed and mint the bonus TOKU.
#
# Usage:
#   tsumu_open_seed.sh <user_addr> <seed_object_id>

# shellcheck source=_lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <user_addr> <seed_object_id>" >&2
    exit 1
fi

USER_ADDR="$1"
SEED_ID="$2"

# tsumu::open consumes the Seed object and returns (message, bonus, author).
# Because Move CLI returns return values via dev-inspect or ptb only, we
# simulate this by reading the SeedOpened event after the call.
# For MVP we use a dev-inspect to read the message before consumption is
# needed. Simpler: do the call, parse the event for message + bonus.
OUT=$(sui client call \
    --package "$TSUMU_PACKAGE_ID" \
    --module timelock --function open \
    --args "$SEED_ID" "$SUI_CLOCK_ID" \
    --gas-budget "$GAS_BUDGET" --json)

TX=$(echo "$OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("digest",""))')
DAYS=$(echo "$OUT" | python3 -c 'import sys,json
d=json.load(sys.stdin)
for e in d.get("events",[]):
    pj=e.get("parsedJson",{})
    if "days_elapsed" in pj:
        print(pj["days_elapsed"])
        sys.exit(0)
print(0)')

# Bonus mint.
TOKU_AMOUNT=$(to_atomic 2)
MINT_TX=$(sui client call \
    --package "$TSUMU_PACKAGE_ID" \
    --module toku --function mint_to \
    --args "$TSUMU_MINT_AUTHORITY_ID" "$TOKU_AMOUNT" "$USER_ADDR" "seed_opened" "$SUI_CLOCK_ID" \
    --gas-budget "$GAS_BUDGET" --json | python3 -c 'import sys,json; print(json.load(sys.stdin).get("digest",""))')

OPEN_TX="$TX" MINT_TX="$MINT_TX" DAYS_ELAPSED="$DAYS" \
python3 <<'PYEOF'
import json, os
days = int(os.environ['DAYS_ELAPSED'])
print(json.dumps({
  "open_tx": os.environ['OPEN_TX'],
  "mint_tx": os.environ['MINT_TX'],
  "days_elapsed": days,
  "bonus_toku_human": 2,
  "message_for_agent": "{} 日間、確かに守られていました。+2 TOKU。".format(days),
}, ensure_ascii=False))
PYEOF
