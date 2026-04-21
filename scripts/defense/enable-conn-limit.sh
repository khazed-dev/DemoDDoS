#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

copy_toggle "conn-limit.conf"
refresh_defense_status "Connection limiting enabled for victim route."
record_event "defense_enabled" "info" "Connection limiting enabled."
reload_nginx
echo "Connection limiting enabled."

