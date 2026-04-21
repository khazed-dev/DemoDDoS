# DDoS Lab Architecture

## Overview

This monorepo runs a complete HTTP-flood demo on one EC2 Linux host:

- `apps/victim`: the intentionally vulnerable Express service
- `apps/dashboard`: the observation dashboard and JSON APIs
- `infra/nginx/ddos-lab.conf`: reverse proxy, logging, and defense entry point
- `scripts/parse`: log parser that creates reusable summary files
- `scripts/defense`: operational toggles for Nginx defenses
- `scripts/attack`: safe lab-only traffic generators using `hey` or `ab`

The public flow on EC2 is:

1. Client request hits Nginx on port `80`.
2. Nginx routes `/dashboard` to the dashboard app on internal port `3002`.
3. Nginx routes `/` to the victim app on internal port `3001`.
4. Nginx writes JSON access logs and normal error logs.
5. The victim app also writes internal JSONL metrics.
6. The parser builds summary JSON/JSONL files for the dashboard.

## Victim App

The victim app has four demo routes:

- `GET /`: simple home page for the victim website
- `GET /health`: lightweight health probe
- `GET /heavy`: intentionally CPU-heavy route with bounded work
- `GET /api/report`: intentionally slow report route

The `/heavy` route uses a short, controlled busy loop rather than unbounded work. This makes it easy to demonstrate queueing, slower responses, timeouts, and degraded service without crashing the EC2 instance instantly on the first request.

The app also records internal request metrics to `data/raw/victim-metrics.jsonl`.

## Dashboard App

The dashboard is a lightweight Express app with server-rendered HTML and Chart.js:

- `GET /dashboard`: main overview page
- `GET /dashboard/api/summary`
- `GET /dashboard/api/events`
- `GET /dashboard/api/top-ips`
- `GET /dashboard/api/status-codes`
- `GET /dashboard/api/defense`

It is designed to stay useful even when the victim app is slow or has restarted. The dashboard reads summary files from `data/summaries` first, then adds a live health probe when possible.

## Nginx

Nginx is the only public entry point:

- `/` proxies to `127.0.0.1:3001`
- `/dashboard` proxies to `127.0.0.1:3002`
- JSON access logs are written to `/var/log/nginx/ddos-lab-access.jsonl`
- Error logs are written to `/var/log/nginx/ddos-lab-error.log`

Defense snippets are separate files so they can be enabled and disabled without rewriting the main server block:

- `rate-limit.conf`
- `conn-limit.conf`
- `emergency-mode.conf`

## Log Pipeline

The parser reads:

- Nginx access log
- Nginx error log
- victim internal metrics
- operator events from attack and defense scripts

It generates:

- `data/summaries/latest-summary.json`
- `data/summaries/events.jsonl`
- `data/summaries/top-ips.json`
- `data/summaries/status-codes.json`
- `data/summaries/defense-status.json`

This summary layer is the key reason the dashboard can still present useful historical data after the victim process restarts.

## Before / During / After Attack

The dashboard keeps a simple three-phase view:

- `Before attack`: earliest parsed minute in the current summary window
- `During attack`: peak requests-per-minute minute
- `After restart`: latest parsed minute or post-restart recovered view

This is intentionally simple so the lab story is easy to explain live.

## Defense Behavior

### Rate limiting

Nginx `limit_req` throttles bursts and produces visible `429` responses in logs and charts.

### Connection limiting

Nginx `limit_conn` caps concurrent victim connections per source IP so a single source cannot monopolize the service as easily.

### Emergency mode

Emergency mode returns HTTP `503` with a static maintenance page for the victim route while leaving `/dashboard` available. This is useful to show graceful degradation and service survivability.

