#!/usr/bin/env bash
# Common helpers sourced by every Tsumu shell tool.
# Sets up PATH, sources config.env, defines `call_move` wrapper.

set -euo pipefail

export PATH="$HOME/tools/node-v24.15.0-darwin-arm64/bin:$HOME/tools/sui-testnet-v1.71.0:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
# shellcheck source=/dev/null
source "$SKILL_DIR/config.env"

# Default gas budget for a single move call.
GAS_BUDGET=${GAS_BUDGET:-30000000}

# Print a JSON one-liner, terminating with newline. Used to make output
# readable by the agent.
emit_json() {
    printf '%s\n' "$1"
}

# Required helper: convert SUI amount string to atomic (1 TOKU = 1e9).
to_atomic() {
    awk -v n="$1" 'BEGIN { printf "%d", n * 1e9 }'
}
