#!/usr/bin/env bash
# tsumu_tide_guard.sh — Pre-flight check before offering a Tide share.
#
# This is the "矯正機構" — the procedural gate the agent must pass through
# BEFORE invoking tsumu_tide_share.sh. The agent's job is to gather the
# signals (current message, distress flag, push count, hour); this script
# applies the rules from lectures/tide-sharing.md as deterministic bash
# conditionals so the verdict doesn't drift with model temperament.
#
# Usage:
#   tsumu_tide_guard.sh \
#     --user-msg "<last user message>" \
#     [--just-done <true|false>]            # session completed within ~5min
#     [--distress-24h <true|false>]         # distress topic in last 24h
#     [--user-disengage-24h <true|false>]   # said やめる/うるさい/黙って
#     [--pushes-today <N>]                  # proactive pushes already today
#     [--last-offer-min-ago <N>]            # min since previous tide offer
#     [--hour <0-23>]                       # current hour JST
#
# Stdout: single-line JSON
#   { "should_offer": bool,
#     "decision": "offer" | "skip" | "block",
#     "reasons": [..],            # positive triggers found
#     "blockers": [..],           # hard-stop reasons (highest priority)
#     "soft_skips": [..]          # soft "not now" reasons
#   }
#
# Decision precedence:
#   1. Any blocker → decision=block, should_offer=false
#   2. No reasons but no blockers → decision=skip
#   3. At least one reason and no blockers → decision=offer

set -euo pipefail

USER_MSG=""
JUST_DONE="false"
DISTRESS_24H="false"
DISENGAGE_24H="false"
PUSHES_TODAY=0
LAST_OFFER_MIN_AGO=99999
HOUR=$(date +%H)
HOUR=${HOUR#0}                         # strip leading zero so arithmetic works

while [ $# -gt 0 ]; do
    case "$1" in
        --user-msg)             USER_MSG="$2"; shift 2;;
        --just-done)            JUST_DONE="$2"; shift 2;;
        --distress-24h)         DISTRESS_24H="$2"; shift 2;;
        --user-disengage-24h)   DISENGAGE_24H="$2"; shift 2;;
        --pushes-today)         PUSHES_TODAY="$2"; shift 2;;
        --last-offer-min-ago)   LAST_OFFER_MIN_AGO="$2"; shift 2;;
        --hour)                 HOUR="$2"; shift 2;;
        -h|--help)
            sed -n '1,30p' "$0" | sed 's/^# \{0,1\}//'; exit 0;;
        *)
            echo "unknown arg: $1" >&2; exit 64;;
    esac
done

REASONS=()
BLOCKERS=()
SOFT_SKIPS=()

# ── BLOCKERS ──────────────────────────────────────────────────────────
# Distress in the current message — highest priority block.
DISTRESS_KW='無理|しんどい|つらい|疲れた|死|自殺|自傷|暴力|消えたい|もうやだ'
if printf '%s' "$USER_MSG" | grep -qE "$DISTRESS_KW"; then
    BLOCKERS+=("user is in distress (current message)")
fi

# Disengage signals in the current message.
DISENGAGE_KW='やめる|もういい|終わる|うるさい|黙'
if printf '%s' "$USER_MSG" | grep -qE "$DISENGAGE_KW"; then
    BLOCKERS+=("user signaled disengagement (current message)")
fi

if [ "$DISTRESS_24H" = "true" ]; then
    BLOCKERS+=("distress topic within last 24h")
fi
if [ "$DISENGAGE_24H" = "true" ]; then
    BLOCKERS+=("user disengaged within last 24h")
fi

# Time-of-day quiet hours (23:00–04:59 JST).
if [ "$HOUR" -ge 23 ] || [ "$HOUR" -lt 5 ]; then
    BLOCKERS+=("quiet hours ($HOUR:00; window 23–05)")
fi

# Daily proactive push limit.
if [ "$PUSHES_TODAY" -ge 3 ]; then
    BLOCKERS+=("daily proactive push limit reached ($PUSHES_TODAY/3)")
fi

# Recent same-topic offer (cool-down).
if [ "$LAST_OFFER_MIN_AGO" -lt 60 ]; then
    BLOCKERS+=("offered tide $LAST_OFFER_MIN_AGO min ago (need ≥60)")
fi

# ── REASONS (positive triggers) ───────────────────────────────────────
# Friend mention — names by relationship word, kana, or quoted name.
FRIEND_KW='先輩|後輩|友達|友人|同期|彼|彼女|親|お母|お父|姉|兄|妹|弟'
if printf '%s' "$USER_MSG" | grep -qE "$FRIEND_KW"; then
    REASONS+=("friend mention (relationship word)")
fi

# Direct desire to give.
GIVE_KW='渡したい|役に立ちたい|何かしてあげ|教えたい|紹介したい|シェアしたい|送りたい'
if printf '%s' "$USER_MSG" | grep -qE "$GIVE_KW"; then
    REASONS+=("user expressed intent to give")
fi

# Gratitude / settled state right after a session.
GRATITUDE_KW='ありがてぇ|ありがとう|助かった|落ち着いた|よかった'
if [ "$JUST_DONE" = "true" ] && printf '%s' "$USER_MSG" | grep -qE "$GRATITUDE_KW"; then
    REASONS+=("gratitude immediately after session (open mind)")
fi

# Bare "session just done" alone is a soft skip — open moment, but not
# a strong-enough reason to surface tide unsolicited.
if [ "$JUST_DONE" = "true" ] && [ ${#REASONS[@]} -eq 0 ]; then
    SOFT_SKIPS+=("session just completed but no friend/give signal")
fi

# ── DECISION ──────────────────────────────────────────────────────────
DECISION="skip"
SHOULD_OFFER="false"

if [ ${#BLOCKERS[@]} -gt 0 ]; then
    DECISION="block"
    SHOULD_OFFER="false"
elif [ ${#REASONS[@]} -gt 0 ]; then
    DECISION="offer"
    SHOULD_OFFER="true"
else
    DECISION="skip"
    SHOULD_OFFER="false"
fi

# ── EMIT JSON ─────────────────────────────────────────────────────────
arr_to_json_strs() {
    if [ "$#" -eq 0 ]; then printf '[]'; return; fi
    printf '['
    local first=1
    for s in "$@"; do
        [ $first -eq 1 ] || printf ','
        printf '%s' "$s" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()), end="")'
        first=0
    done
    printf ']'
}

REASONS_JSON=$(arr_to_json_strs "${REASONS[@]+"${REASONS[@]}"}")
BLOCKERS_JSON=$(arr_to_json_strs "${BLOCKERS[@]+"${BLOCKERS[@]}"}")
SOFT_JSON=$(arr_to_json_strs "${SOFT_SKIPS[@]+"${SOFT_SKIPS[@]}"}")

printf '{"should_offer":%s,"decision":"%s","reasons":%s,"blockers":%s,"soft_skips":%s}\n' \
  "$SHOULD_OFFER" "$DECISION" "$REASONS_JSON" "$BLOCKERS_JSON" "$SOFT_JSON"
