#!/usr/bin/env bash
# Bind a Discord user ID to a Sui address. Used by OpenClaw on first DM
# from a user who just claimed TOKU on the web — they arrive carrying an
# onboard_token in the URL/clipboard which proves the Sui address is theirs.
#
# Usage:
#   tsumu_identity_bind.sh <discord_id> <sui_addr> [onboard_token] [display_name]
#
# Outputs JSON: bound, sui_addr, message_for_agent.

set -euo pipefail

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <discord_id> <sui_addr> [onboard_token] [display_name]" >&2
    exit 1
fi

DISCORD_ID="$1"
SUI_ADDR="$2"
ONBOARD_TOKEN="${3:-}"
DISPLAY_NAME="${4:-}"

CHAT_API="${TSUMU_CHAT_API:-http://localhost:3100}"

# Build JSON body without bash-quoting hazards
PAYLOAD=$(DISCORD_ID="$DISCORD_ID" SUI_ADDR="$SUI_ADDR" \
          ONBOARD_TOKEN="$ONBOARD_TOKEN" DISPLAY_NAME="$DISPLAY_NAME" \
          python3 -c '
import json, os
out = { "discord_id": os.environ["DISCORD_ID"], "sui_addr": os.environ["SUI_ADDR"] }
if os.environ.get("ONBOARD_TOKEN"): out["onboard_token"] = os.environ["ONBOARD_TOKEN"]
if os.environ.get("DISPLAY_NAME"): out["display_name"] = os.environ["DISPLAY_NAME"]
print(json.dumps(out, ensure_ascii=False))
')

curl -sS -X POST "$CHAT_API/api/identity/bind" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD"
echo
