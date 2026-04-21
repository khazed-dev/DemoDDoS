#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

deploy_maintenance_page
copy_toggle "emergency-mode.conf"
refresh_defense_status "Emergency maintenance fallback enabled."
record_event "emergency_mode_enabled" "warning" "Emergency mode enabled."
reload_nginx
echo "Emergency mode enabled."

