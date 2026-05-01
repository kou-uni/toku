#!/usr/bin/env bash
# Record a completed meditation session: creates Session NFT, mints TOKU,
# beats world pulse. Designed to be called by the Tsumu agent after a 3+
# minute session has been confirmed.
#
# Usage:
#   tsumu_record_session.sh <user_addr> <duration_secs> <color_before> <color_after> <reflection>
#
# Outputs a single-line JSON object with: tx digests, minted toku, pulse total.

# shellcheck source=_lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

if [ "$#" -lt 5 ]; then
    echo "Usage: $0 <user_addr> <duration_secs> <color_before> <color_after> <reflection>" >&2
    exit 1
fi

USER_ADDR="$1"
DURATION="$2"
COLOR_BEFORE="$3"
COLOR_AFTER="$4"
REFLECTION="$5"

# Compute TOKU amount based on duration.
if [ "$DURATION" -ge 600 ]; then
    TOKU_AMOUNT=$(to_atomic 3)
elif [ "$DURATION" -ge 300 ]; then
    TOKU_AMOUNT=$(to_atomic 1.5)
else
    TOKU_AMOUNT=$(to_atomic 1)
fi

REASON="session_${DURATION}s"

# 1) record session
SESSION_TX=$(sui client call \
    --package "$TSUMU_PACKAGE_ID" \
    --module session --function record \
    --args "$USER_ADDR" "$DURATION" "$COLOR_BEFORE" "$COLOR_AFTER" "$REFLECTION" "$SUI_CLOCK_ID" \
    --gas-budget "$GAS_BUDGET" --json | python3 -c 'import sys,json; print(json.load(sys.stdin).get("digest",""))')

# 2) mint TOKU to user
MINT_TX=$(sui client call \
    --package "$TSUMU_PACKAGE_ID" \
    --module toku --function mint_to \
    --args "$TSUMU_MINT_AUTHORITY_ID" "$TOKU_AMOUNT" "$USER_ADDR" "$REASON" "$SUI_CLOCK_ID" \
    --gas-budget "$GAS_BUDGET" --json | python3 -c 'import sys,json; print(json.load(sys.stdin).get("digest",""))')

# 3) beat the world pulse
PULSE_OUT=$(sui client call \
    --package "$TSUMU_PACKAGE_ID" \
    --module pulse --function beat \
    --args "$TSUMU_WORLD_PULSE_ID" "$SUI_CLOCK_ID" \
    --gas-budget "$GAS_BUDGET" --json)

PULSE_TX=$(echo "$PULSE_OUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("digest",""))')

# Read the resulting WorldPulse total and recent count from the emitted event.
PULSE_TOTAL=$(echo "$PULSE_OUT" | python3 -c 'import sys,json
d=json.load(sys.stdin)
events=d.get("events",[])
for e in events:
    pj=e.get("parsedJson",{})
    if "total" in pj:
        print(pj["total"])
        sys.exit(0)
print(0)')

PULSE_RECENT=$(echo "$PULSE_OUT" | python3 -c 'import sys,json
d=json.load(sys.stdin)
events=d.get("events",[])
for e in events:
    pj=e.get("parsedJson",{})
    if "recent_in_window" in pj:
        print(pj["recent_in_window"])
        sys.exit(0)
print(0)')

SESSION_TX="$SESSION_TX" MINT_TX="$MINT_TX" PULSE_TX="$PULSE_TX" \
TOKU_AMOUNT="$TOKU_AMOUNT" PULSE_TOTAL="$PULSE_TOTAL" PULSE_RECENT="$PULSE_RECENT" \
python3 <<'PYEOF'
import json, os
total = int(os.environ['PULSE_TOTAL'])
amount = int(os.environ['TOKU_AMOUNT'])
print(json.dumps({
  "session_tx": os.environ['SESSION_TX'],
  "mint_tx": os.environ['MINT_TX'],
  "pulse_tx": os.environ['PULSE_TX'],
  "toku_minted_atomic": amount,
  "toku_minted_human": amount / 1e9,
  "world_pulse_total": total,
  "recent_in_window": int(os.environ['PULSE_RECENT']),
  "message_for_agent": "今、世界で {} 人が立ちました。あなたは、その一人です。".format(total),
}, ensure_ascii=False))
PYEOF
