#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SUMMARY_DIR="${SUMMARY_DIR:-$REPO_ROOT/data/summaries}"
RAW_DIR="${RAW_DIR:-$REPO_ROOT/data/raw}"
OPS_EVENTS_LOG="${OPS_EVENTS_LOG:-$RAW_DIR/ops-events.jsonl}"
NGINX_DDOS_LAB_ROOT="${NGINX_DDOS_LAB_ROOT:-/etc/nginx/ddos-lab}"
ACTIVE_DIR="$NGINX_DDOS_LAB_ROOT/defense/victim"
TOGGLE_SOURCE_DIR="$REPO_ROOT/infra/nginx/toggles"
MAINTENANCE_TARGET_DIR="${MAINTENANCE_TARGET_DIR:-/var/www/ddos-lab}"
MAINTENANCE_TARGET_FILE="$MAINTENANCE_TARGET_DIR/maintenance.html"

mkdir -p "$SUMMARY_DIR" "$RAW_DIR"

record_event() {
  local type="$1"
  local level="$2"
  local message="$3"
  printf '{"ts":"%s","type":"%s","level":"%s","message":"%s"}\n' \
    "$(date -Iseconds)" \
    "$type" \
    "$level" \
    "${message//\"/\\\"}" >> "$OPS_EVENTS_LOG"
}

ensure_paths() {
  sudo mkdir -p "$ACTIVE_DIR" "$MAINTENANCE_TARGET_DIR"
}

copy_toggle() {
  local file_name="$1"
  ensure_paths
  sudo cp "$TOGGLE_SOURCE_DIR/$file_name" "$ACTIVE_DIR/$file_name"
}

remove_toggle() {
  local file_name="$1"
  ensure_paths
  sudo rm -f "$ACTIVE_DIR/$file_name"
}

deploy_maintenance_page() {
  ensure_paths
  sudo cp "$REPO_ROOT/infra/nginx/maintenance.html" "$MAINTENANCE_TARGET_FILE"
}

refresh_defense_status() {
  local note="$1"
  local rate_limit_enabled=false
  local conn_limit_enabled=false
  local emergency_enabled=false

  [[ -f "$ACTIVE_DIR/rate-limit.conf" ]] && rate_limit_enabled=true
  [[ -f "$ACTIVE_DIR/conn-limit.conf" ]] && conn_limit_enabled=true
  [[ -f "$ACTIVE_DIR/emergency-mode.conf" ]] && emergency_enabled=true

  cat > "$SUMMARY_DIR/defense-status.json" <<EOF
{
  "rateLimitEnabled": $rate_limit_enabled,
  "connLimitEnabled": $conn_limit_enabled,
  "emergencyModeEnabled": $emergency_enabled,
  "lastUpdatedAt": "$(date -Iseconds)",
  "notes": "$note"
}
EOF
}

reload_nginx() {
  sudo nginx -t
  if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl reload nginx
  else
    sudo service nginx reload
  fi
}

