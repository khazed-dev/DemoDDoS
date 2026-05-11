# ddos-lab

`ddos-lab` is a single-repo DDoS lab for a security networking course. It runs on one Linux EC2 instance and focuses on an intentionally vulnerable victim service plus a lightweight dashboard that remains useful before, during, and after an HTTP flood demo.

## Architecture

```text
Internet / browser
        |
        v
      Nginx
   /         \
  /           \
victim      dashboard
:3001       :3002
  |             |
  |             +--> reads data/summaries/*.json
  |
  +--> writes app metrics JSONL

Nginx access/error logs + victim metrics + ops events
                    |
                    v
            scripts/parse/build-summaries.js
                    |
                    v
             data/summaries/*.json
```

## Repository Layout

```text
ddos-lab/
  apps/
    victim/
    dashboard/
  infra/
    nginx/
    pm2/
  scripts/
    attack/
    parse/
    defense/
  data/
    raw/
    summaries/
  docs/
  README.md
```

## What Is Ready Now

Runnable MVP files:

- `apps/victim/src/server.js`
- `apps/dashboard/src/server.js`
- `scripts/parse/build-summaries.js`
- `scripts/parse/watch.js`
- `infra/pm2/ecosystem.config.js`
- `infra/nginx/ddos-lab.conf`
- all attack and defense scripts under `scripts/`

Placeholders or files you still need to deploy into real EC2 locations:

- `data/summaries/*.json`: safe default starter data for first boot
- `infra/nginx/ddos-lab.conf`: copy this into `/etc/nginx/conf.d/`
- `infra/nginx/maintenance.html`: copy or let the emergency script deploy it to `/var/www/ddos-lab/`

TODOs you must adjust on EC2:

- point Nginx logs to the exact paths you will use on the instance
- create `/etc/nginx/ddos-lab/defense/victim/`
- copy the repo and run scripts with an account that can `sudo nginx -t` and reload Nginx
- set `.env` values if your ports or log paths differ

## Stack

- Node.js + Express for both apps
- server-rendered dashboard with local Chart.js
- PM2 for process supervision
- Nginx for reverse proxy and first-line defenses
- JSON / JSONL files for logging and summaries

## Local Setup

1. Install Node.js 18+.
2. Copy `.env.example` to `.env`.
3. Run `npm install`.
4. Start the apps in separate terminals:
   - `npm run start:victim`
   - `npm run start:dashboard`
5. Build starter summaries:
   - `npm run parse:once`
6. Open:
   - victim: `http://127.0.0.1:3001/`
   - dashboard: `http://127.0.0.1:3002/dashboard`

## EC2 Deployment

Example for Ubuntu:

```bash
sudo apt-get update
sudo apt-get install -y nginx apache2-utils
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
git clone <your-repo-url> ddos-lab
cd ddos-lab
cp .env.example .env
npm install
```

Start the Node services:

```bash
npx pm2 start infra/pm2/ecosystem.config.js
npx pm2 save
```

## Nginx Setup

1. Copy `infra/nginx/ddos-lab.conf` to `/etc/nginx/conf.d/ddos-lab.conf`.
2. Create the active defense directory:

```bash
sudo mkdir -p /etc/nginx/ddos-lab/defense/victim
sudo mkdir -p /var/www/ddos-lab
chmod +x scripts/attack/*.sh scripts/defense/*.sh
```

3. Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Routing result:

- `/` -> victim app on port `3001`
- `/dashboard` -> dashboard app on port `3002`

## PM2 Commands

```bash
npx pm2 status
npx pm2 logs ddos-lab-victim
npx pm2 logs ddos-lab-dashboard
npx pm2 logs ddos-lab-parser
npx pm2 restart ddos-lab-victim
```

## Log Files and Parsing

Expected raw sources:

- Nginx access log: JSON lines
- Nginx error log: text
- victim app metrics: `data/raw/victim-metrics.jsonl`
- operator events: `data/raw/ops-events.jsonl`

Generate summaries manually:

```bash
npm run parse:once
```

Run the parser continuously:

```bash
npm run parse:watch
```

Generated outputs:

- `data/summaries/latest-summary.json`
- `data/summaries/events.jsonl`
- `data/summaries/top-ips.json`
- `data/summaries/status-codes.json`
- `data/summaries/defense-status.json`

The dashboard reads these files so it can still show the last attack summary after the victim app restarts.

## Defense Controls

Available scripts:

- `scripts/defense/enable-protection.sh`
- `scripts/defense/enable-rate-limit.sh`
- `scripts/defense/disable-rate-limit.sh`
- `scripts/defense/enable-conn-limit.sh`
- `scripts/defense/disable-conn-limit.sh`
- `scripts/defense/enable-emergency-mode.sh`
- `scripts/defense/disable-emergency-mode.sh`

Example:

```bash
./scripts/defense/enable-protection.sh
```

Each script:

- updates `data/summaries/defense-status.json`
- writes an operator event to `data/raw/ops-events.jsonl`
- reloads Nginx after `nginx -t`

## Safe Lab Attack Scripts

Available scripts:

- `scripts/attack/light-test.sh`
- `scripts/attack/medium-test.sh`
- `scripts/attack/http-flood.sh`

Examples:

```bash
./scripts/attack/light-test.sh http://127.0.0.1/heavy 15 10
./scripts/attack/medium-test.sh http://127.0.0.1/heavy 30 30
./scripts/attack/http-flood.sh http://127.0.0.1/heavy 45 60
```

Behavior:

- prefers `hey` when available
- falls back to `ab`
- refuses public targets by default unless `DDOS_LAB_ALLOW_PUBLIC_TARGET=1`

For your own EC2 lab only:

```bash
DDOS_LAB_ALLOW_PUBLIC_TARGET=1 ./scripts/attack/http-flood.sh http://your-ec2-public-dns/heavy 30 50
```

## Watching the Demo

Useful commands:

```bash
curl http://127.0.0.1:3001/health
tail -f data/raw/victim-metrics.jsonl
tail -f data/raw/ops-events.jsonl
sudo tail -f /var/log/nginx/ddos-lab-access.jsonl
sudo tail -f /var/log/nginx/ddos-lab-error.log
```

## Suggested Classroom Demo Flow

1. Show the victim homepage and dashboard in healthy state.
2. Run `npm run parse:once` for a baseline summary.
3. Start `light-test.sh`, then escalate to `medium-test.sh` or `http-flood.sh`.
4. Show slower responses, timeouts, or 5xx activity.
5. Enable the combined protection script for rate limiting and connection limiting.
6. Show `429` and blocked-request counts growing.
7. Enable emergency mode only if you still want to demonstrate graceful degradation separately.
8. Restart only the victim app.
9. Show the dashboard still rendering historical summaries.

## Important Scope Limits

This project is only for controlled lab demos on infrastructure you own. It does not include any real distributed attack capability, botnet behavior, or techniques meant for systems outside your own environment.
