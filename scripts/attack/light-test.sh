#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

TARGET_URL="${1:-http://127.0.0.1/heavy}"
DURATION="${2:-15}"
CONCURRENCY="${3:-10}"

run_load "$TARGET_URL" "$DURATION" "$CONCURRENCY"

