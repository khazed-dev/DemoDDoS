#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

remove_toggle "conn-limit.conf"
refresh_defense_status "Connection limiting disabled for victim route."
record_event "defense_disabled" "info" "Connection limiting disabled."
reload_nginx
echo "Connection limiting disabled."

