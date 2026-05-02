#!/usr/bin/env bash
# tsumu_tide_share.sh — Issue a Tsumu Tide share link.
#
# Generates a one-shot ticket ID and the public Tide URL with that ticket
# baked in. The URL is meant to be passed to a friend via the user's own
# channel (DM, Discord, etc.) so they land on tsumu-tide.vercel.app and
# see where the collective virtue is heading this quarter.
#
# This tool ONLY generates the link. The decision of when to offer it
# and how to phrase the offer lives in:
#   lectures/tide-sharing.md
# Read that before invoking.
#
# Usage:
#   tsumu_tide_share.sh [friend_hint] [context]
#
# Args (both optional, free text — used only for the issuer-side log):
#   $1 — friend_hint  e.g. "サークルの先輩"  / "けんじ"
#   $2 — context      e.g. "あかりが Day 30 のあと、健司を思い出した"
#
# Stdout: single-line JSON with tide_url, ticket_id, issued_at, and the
# inputs echoed back. No on-chain side effects, no secrets needed.

# shellcheck source=_lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

FRIEND="${1:-}"
CONTEXT="${2:-}"

TIDE_BASE_URL="${TIDE_BASE_URL:-https://tsumu-tide.vercel.app}"

# 8-char lowercase hex ticket. Unique enough within a demo timeline; we
# don't need crypto-strength here because the URL is shareable by design
# and the receiving site doesn't gate on the ticket value.
TICKET=$(uuidgen | tr -d '-' | head -c 8 | tr 'A-Z' 'a-z')
URL="${TIDE_BASE_URL}/?ticket=${TICKET}"
NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Optional local log — append to a tickets file so the issuer side has
# a record of what was sent and to whom (best effort, ignore failures).
LOG_DIR="${TSUMU_TICKET_LOG_DIR:-${HOME}/.tsumu}"
mkdir -p "$LOG_DIR" 2>/dev/null || true
LOG_FILE="${LOG_DIR}/tide-tickets.log"
printf '%s\t%s\t%s\t%s\n' "$NOW_ISO" "$TICKET" "${FRIEND//$'\t'/ }" "${CONTEXT//$'\t'/ }" >> "$LOG_FILE" 2>/dev/null || true

URL="$URL" TICKET="$TICKET" FRIEND="$FRIEND" CONTEXT="$CONTEXT" NOW_ISO="$NOW_ISO" \
python3 <<'PYEOF'
import json, os
print(json.dumps({
  "tide_url":     os.environ["URL"],
  "ticket_id":    os.environ["TICKET"],
  "friend_hint":  os.environ["FRIEND"],
  "context":      os.environ["CONTEXT"],
  "issued_at":    os.environ["NOW_ISO"],
  "hint_for_agent": (
    "渡す瞬間の言葉は SOUL.md の声で組んでください。"
    "命令形・誇張・感嘆符を避け、選択肢として置く。"
    "詳しい判断基準は lectures/tide-sharing.md。"
  ),
}, ensure_ascii=False))
PYEOF
