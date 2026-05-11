#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

copy_toggle "rate-limit.conf"
copy_toggle "conn-limit.conf"
remove_toggle "emergency-mode.conf"
refresh_defense_status "Combined protection enabled: rate limiting + connection limiting."
record_event "defense_enabled" "info" "Combined protection enabled (rate limiting + connection limiting)."
reload_nginx
echo "Combined protection enabled."
