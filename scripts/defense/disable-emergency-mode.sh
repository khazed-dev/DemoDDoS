#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

remove_toggle "emergency-mode.conf"
refresh_defense_status "Emergency maintenance fallback disabled."
record_event "emergency_mode_disabled" "info" "Emergency mode disabled."
reload_nginx
echo "Emergency mode disabled."
