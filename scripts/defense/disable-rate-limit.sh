#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

remove_toggle "rate-limit.conf"
refresh_defense_status "Rate limiting disabled for victim route."
record_event "defense_disabled" "info" "Rate limiting disabled."
reload_nginx
echo "Rate limiting disabled."

