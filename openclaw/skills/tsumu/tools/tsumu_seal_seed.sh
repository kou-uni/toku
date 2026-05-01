#!/usr/bin/env bash
# Seal a future-self letter (TimeLock seed) on Sui.
#
# Usage:
#   tsumu_seal_seed.sh <user_addr> <message> [unlock_seconds_from_now]
#
# Default unlock window: 60 seconds (DEMO MODE).
# Production: 7 * 24 * 60 * 60 = 604800

# shellcheck source=_lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <user_addr> <message> [unlock_seconds_from_now]" >&2
    exit 1
fi

USER_ADDR="$1"
MESSAGE="$2"
UNLOCK_SEC="${3:-60}"          # default 60 seconds for demo

NOW_MS=$(python3 -c 'import time; print(int(time.time()*1000))')
UNLOCK_MS=$(( NOW_MS + UNLOCK_SEC * 1000 ))

BONUS_AMOUNT=$(to_atomic 2)    # 2 TOKU bonus on open

# Note: tsumu::seal sends the seed to ctx.sender(), which is the agent's
# wallet here. For the demo we keep the seed agent-owned and surface the
# message via the agent. In a future revision we'd transfer to the user
# (zkLogin address), but that requires the user-as-signer flow.
OUT=$(sui client call \
    --package "$TSUMU_PACKAGE_ID" \
    --module timelock --function seal \
    --args "$MESSAGE" "$UNLOCK_MS" "$BONUS_AMOUNT" "$SUI_CLOCK_ID" \
    --gas-budget "$GAS_BUDGET" --json)

TX=$(echo "$OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("digest",""))')
SEED_ID=$(echo "$OUT" | python3 -c 'import sys,json
d=json.load(sys.stdin)
for c in d.get("objectChanges",[]):
    if c.get("type")=="created" and "Seed" in c.get("objectType",""):
        print(c["objectId"])
        sys.exit(0)
print("")')

SEAL_TX="$TX" SEED_ID="$SEED_ID" UNLOCK_MS="$UNLOCK_MS" UNLOCK_SEC="$UNLOCK_SEC" \
python3 <<'PYEOF'
import json, os
sec = int(os.environ['UNLOCK_SEC'])
print(json.dumps({
  "seal_tx": os.environ['SEAL_TX'],
  "seed_id": os.environ['SEED_ID'],
  "unlock_at_ms": int(os.environ['UNLOCK_MS']),
  "unlock_in_seconds": sec,
  "bonus_toku_human": 2,
  "message_for_agent": "この言葉は {} 秒間、Sui の中で眠ります。時が来たら、私が届けます。".format(sec),
}, ensure_ascii=False))
PYEOF
