#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OPS_EVENTS_LOG="${OPS_EVENTS_LOG:-$REPO_ROOT/data/raw/ops-events.jsonl}"

log_event() {
  local type="$1"
  local level="$2"
  local message="$3"
  mkdir -p "$(dirname "$OPS_EVENTS_LOG")"
  printf '{"ts":"%s","type":"%s","level":"%s","message":"%s"}\n' \
    "$(date -Iseconds)" \
    "$type" \
    "$level" \
    "${message//\"/\\\"}" >> "$OPS_EVENTS_LOG"
}

ensure_safe_target() {
  local url="$1"
  local host
  host="$(printf '%s' "$url" | sed -E 's#^[a-z]+://([^/:]+).*#\1#')"

  if [[ "$host" =~ ^(localhost|127\.0\.0\.1)$ ]]; then
    return 0
  fi

  if [[ "$host" =~ ^10\. ]] || [[ "$host" =~ ^192\.168\. ]] || [[ "$host" =~ ^172\.(1[6-9]|2[0-9]|3[0-1])\. ]]; then
    return 0
  fi

  if [[ "${DDOS_LAB_ALLOW_PUBLIC_TARGET:-0}" == "1" ]]; then
    return 0
  fi

  echo "Refusing to run against a public target by default. Set DDOS_LAB_ALLOW_PUBLIC_TARGET=1 only for your own controlled EC2 lab." >&2
  exit 1
}

run_load() {
  local url="$1"
  local duration="$2"
  local concurrency="$3"

  ensure_safe_target "$url"
  log_event "attack_started" "warning" "Load test started against $url for ${duration}s at concurrency $concurrency."

  if command -v hey >/dev/null 2>&1; then
    hey -z "${duration}s" -c "$concurrency" "$url"
  elif command -v ab >/dev/null 2>&1; then
    ab -k -t "$duration" -c "$concurrency" "$url"
  else
    echo "Neither hey nor ab is installed. Install one of them before running the attack scripts." >&2
    echo "Ubuntu example: sudo apt-get update && sudo apt-get install -y apache2-utils" >&2
    exit 1
  fi

  log_event "attack_finished" "info" "Load test finished against $url."
}

