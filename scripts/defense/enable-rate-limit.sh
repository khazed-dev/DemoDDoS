#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

copy_toggle "rate-limit.conf"
refresh_defense_status "Rate limiting enabled for victim route."
record_event "defense_enabled" "info" "Rate limiting enabled."
reload_nginx
echo "Rate limiting enabled."

