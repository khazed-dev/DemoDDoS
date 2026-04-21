# Demo Script

## 1. Start in normal mode

1. Start PM2 services and confirm Nginx is proxying both apps.
2. Open `/` and `/dashboard`.
3. Show that the victim app is healthy and the dashboard status is `UP`.
4. Run the parser once so the dashboard has a baseline summary.

## 2. Begin the attack

1. Run `scripts/attack/light-test.sh` against `/heavy`.
2. Move to `scripts/attack/medium-test.sh` or `scripts/attack/http-flood.sh` with higher concurrency.
3. Point out rising request volume, slower response time, and increasing error rates.

## 3. Observe degradation

1. Refresh `/dashboard`.
2. Highlight:
   - app status changes toward `DEGRADED`
   - top endpoint becomes `/heavy`
   - peak minute and timeline charts rise
   - 5xx or timeout symptoms start appearing

## 4. Enable defense

1. Run `scripts/defense/enable-rate-limit.sh`.
2. Optionally run `scripts/defense/enable-conn-limit.sh`.
3. Refresh the dashboard and show:
   - `429` counts increasing
   - blocked requests increasing
   - defense status switches to `ON`

## 5. Emergency fallback

1. If the victim route is still unstable, run `scripts/defense/enable-emergency-mode.sh`.
2. Show that `/` returns the degraded static fallback page.
3. Show that `/dashboard` still works.

## 6. Recovery and restart

1. Stop the attack.
2. Disable emergency mode if needed.
3. Restart only the victim app with PM2.
4. Show that the dashboard still renders historical summary files.
5. Run the parser again and show the updated last-attack summary.

## 7. Wrap-up points for class

1. A DDoS-style HTTP flood can degrade an app without crashing the whole EC2 host.
2. Reverse-proxy defenses reduce request pressure before traffic reaches the app.
3. Persisted summaries let operators keep visibility after a backend restart.
