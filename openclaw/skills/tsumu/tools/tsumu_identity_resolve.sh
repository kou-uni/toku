#!/usr/bin/env bash
# Resolve a Discord user ID to its registered Sui address. Called before
# record_session, so we know whose virtue to mint to. If the Discord user
# is not registered, returns { registered: false, sui_addr: null }, which
# the LLM should detect and ask the user to register first.
#
# Usage:
#   tsumu_identity_resolve.sh <discord_id>

set -euo pipefail

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <discord_id>" >&2
    exit 1
fi

DISCORD_ID="$1"
CHAT_API="${TSUMU_CHAT_API:-http://localhost:3100}"

curl -sS "$CHAT_API/api/identity/by-discord/$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$DISCORD_ID")"
echo
