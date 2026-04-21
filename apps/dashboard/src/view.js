function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function renderTableRows(items, keyName, valueName, emptyMessage) {
  if (!items || items.length === 0) {
    return `<tr><td colspan="2">${emptyMessage}</td></tr>`;
  }

  return items
    .map((item) => `<tr><td>${item[keyName]}</td><td>${formatNumber(item[valueName])}</td></tr>`)
    .join("");
}

function renderTimelineRows(events) {
  if (!events || events.length === 0) {
    return `<tr><td colspan="3">No events yet. Run the parser or defense scripts to build the timeline.</td></tr>`;
  }

  return events
    .slice(0, 16)
    .map((event) => `<tr><td>${event.ts || "-"}</td><td>${event.level || "info"}</td><td>${event.message || event.type || "-"}</td></tr>`)
    .join("");
}

function renderSnapshotCard(snapshot) {
  return `
    <article class="snapshot-card">
      <h3>${snapshot.label}</h3>
      <p><strong>${formatNumber(snapshot.requestsPerMinute)}</strong> rpm</p>
      <p>Error rate: ${formatPercent(snapshot.errorRate)}</p>
      <p>Avg response: ${formatNumber(snapshot.avgRequestTimeMs)} ms</p>
    </article>
  `;
}

function renderOverviewPage(state) {
  const { summary, topIps, statusCodes, defense, events, health } = state;
  const topEndpoints = summary.topEndpoints || [];
  const chartPayload = {
    statusCodes,
    timeline: summary.timeline || []
  };

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>DDoS Lab Dashboard</title>
      <style>
        :root {
          --bg: #0b1020;
          --panel: #131a2e;
          --panel-soft: #1a2440;
          --line: #2d3d67;
          --text: #e8eefc;
          --muted: #93a4cc;
          --good: #22c55e;
          --warn: #f59e0b;
          --bad: #ef4444;
          --accent: #38bdf8;
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, sans-serif; background: radial-gradient(circle at top, #17213f, var(--bg) 60%); color: var(--text); }
        a { color: #7dd3fc; }
        main { max-width: 1320px; margin: 0 auto; padding: 24px; }
        .hero { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
        .hero-card, .panel { background: rgba(19, 26, 46, 0.94); border: 1px solid var(--line); border-radius: 18px; padding: 18px; box-shadow: 0 18px 44px rgba(0, 0, 0, 0.24); }
        .hero-card { flex: 1 1 320px; }
        .status-pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 999px; font-weight: 700; background: rgba(56, 189, 248, 0.12); }
        .status-UP { color: var(--good); }
        .status-DEGRADED { color: var(--warn); }
        .status-DOWN { color: var(--bad); }
        .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 18px; }
        .span-3 { grid-column: span 3; }
        .span-4 { grid-column: span 4; }
        .span-5 { grid-column: span 5; }
        .span-6 { grid-column: span 6; }
        .span-7 { grid-column: span 7; }
        .span-8 { grid-column: span 8; }
        .span-12 { grid-column: span 12; }
        .metrics { display: grid; grid-template-columns: repeat(5, minmax(120px, 1fr)); gap: 12px; }
        .metric-card { background: var(--panel-soft); border-radius: 14px; padding: 14px; border: 1px solid rgba(148, 163, 184, 0.12); }
        .metric-card span { display: block; color: var(--muted); font-size: 13px; margin-bottom: 8px; }
        .metric-card strong { font-size: 26px; }
        .mini-grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 10px; }
        .mini-tile { background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.16); border-radius: 14px; padding: 12px; }
        .snapshot-strip { display: grid; grid-template-columns: repeat(3, minmax(180px, 1fr)); gap: 12px; }
        .snapshot-card { background: var(--panel-soft); border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.12); padding: 14px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px 8px; border-bottom: 1px solid rgba(148, 163, 184, 0.12); text-align: left; font-size: 14px; }
        th { color: var(--muted); font-weight: 700; }
        .subtle { color: var(--muted); }
        .defense-list { display: grid; gap: 10px; }
        .defense-state { padding: 12px; border-radius: 14px; background: var(--panel-soft); border: 1px solid rgba(148, 163, 184, 0.12); }
        .defense-state strong { display: block; margin-bottom: 6px; }
        canvas { width: 100% !important; max-height: 280px; }
        @media (max-width: 1024px) {
          .span-3, .span-4, .span-5, .span-6, .span-7, .span-8 { grid-column: span 12; }
          .metrics { grid-template-columns: repeat(2, minmax(140px, 1fr)); }
          .mini-grid { grid-template-columns: repeat(2, minmax(140px, 1fr)); }
          .snapshot-strip { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <main>
        <section class="hero">
          <article class="hero-card">
            <h1>DDoS Lab Dashboard</h1>
            <p class="subtle">Overview of request load, response failures, defense switches, and persisted attack summaries from Nginx and app logs.</p>
            <p class="status-pill status-${summary.appStatus}">App Status: ${summary.appStatus}</p>
          </article>
          <article class="hero-card">
            <h2>Live Health Check</h2>
            <p class="subtle">Victim health probe: ${health.live ? "reachable" : "unreachable"}.</p>
            <p><strong>${health.status}</strong></p>
            <p class="subtle">Last summary: ${summary.generatedAt || "not generated yet"}</p>
          </article>
          <article class="hero-card">
            <h2>Defense Snapshot</h2>
            <div class="mini-grid">
              <div class="mini-tile"><span>Rate limit</span><strong>${defense.rateLimitEnabled ? "ON" : "OFF"}</strong></div>
              <div class="mini-tile"><span>Conn limit</span><strong>${defense.connLimitEnabled ? "ON" : "OFF"}</strong></div>
              <div class="mini-tile"><span>Emergency</span><strong>${defense.emergencyModeEnabled ? "ON" : "OFF"}</strong></div>
              <div class="mini-tile"><span>Updated</span><strong>${defense.lastUpdatedAt || "-"}</strong></div>
            </div>
          </article>
        </section>

        <section class="panel">
          <h2>Key Metrics</h2>
          <div class="metrics">
            <div class="metric-card"><span>Total requests</span><strong>${formatNumber(summary.totals.requests)}</strong></div>
            <div class="metric-card"><span>Total errors</span><strong>${formatNumber(summary.totals.errors)}</strong></div>
            <div class="metric-card"><span>Blocked requests</span><strong>${formatNumber(summary.totals.blocked)}</strong></div>
            <div class="metric-card"><span>429 responses</span><strong>${formatNumber(summary.totals.status429)}</strong></div>
            <div class="metric-card"><span>5xx responses</span><strong>${formatNumber(summary.totals.status5xx)}</strong></div>
          </div>
        </section>

        <section class="grid">
          <article class="panel span-7">
            <h2>Status Code Distribution</h2>
            <canvas id="statusCodesChart"></canvas>
          </article>
          <article class="panel span-5">
            <h2>Before / During / After Restart</h2>
            <div class="snapshot-strip">
              ${renderSnapshotCard(summary.snapshots.beforeAttack)}
              ${renderSnapshotCard(summary.snapshots.duringAttack)}
              ${renderSnapshotCard(summary.snapshots.afterRestart)}
            </div>
            <p class="subtle">Last attack summary: ${summary.lastAttackSummary.notes || "No notes yet."}</p>
          </article>

          <article class="panel span-7">
            <h2>Timeline</h2>
            <canvas id="timelineChart"></canvas>
          </article>
          <article class="panel span-5">
            <h2>Defense Enabled</h2>
            <div class="defense-list">
              <div class="defense-state"><strong>Nginx rate limiting</strong>${defense.rateLimitEnabled ? "Enabled and expected to return 429 when burst is exceeded." : "Disabled. Victim route is accepting bursts without Nginx throttling."}</div>
              <div class="defense-state"><strong>Nginx connection limiting</strong>${defense.connLimitEnabled ? "Enabled to cap concurrent connections per source IP." : "Disabled. A single source IP can open more simultaneous victim connections."}</div>
              <div class="defense-state"><strong>Emergency mode</strong>${defense.emergencyModeEnabled ? "Enabled. Victim route should fall back to maintenance or degraded content while dashboard stays accessible." : "Disabled. Victim route proxies requests to the backend service."}</div>
            </div>
          </article>

          <article class="panel span-4">
            <h2>Top IPs</h2>
            <table>
              <thead><tr><th>IP</th><th>Requests</th></tr></thead>
              <tbody>${renderTableRows(topIps, "ip", "count", "No IP data yet.")}</tbody>
            </table>
          </article>
          <article class="panel span-4">
            <h2>Top Endpoints</h2>
            <table>
              <thead><tr><th>Endpoint</th><th>Hits</th></tr></thead>
              <tbody>${renderTableRows(topEndpoints, "path", "count", "No endpoint data yet.")}</tbody>
            </table>
          </article>
          <article class="panel span-4">
            <h2>Status Codes</h2>
            <table>
              <thead><tr><th>Code bucket</th><th>Count</th></tr></thead>
              <tbody>
                <tr><td>2xx</td><td>${formatNumber(statusCodes["2xx"])}</td></tr>
                <tr><td>3xx</td><td>${formatNumber(statusCodes["3xx"])}</td></tr>
                <tr><td>4xx</td><td>${formatNumber(statusCodes["4xx"])}</td></tr>
                <tr><td>429</td><td>${formatNumber(statusCodes["429"])}</td></tr>
                <tr><td>5xx</td><td>${formatNumber(statusCodes["5xx"])}</td></tr>
              </tbody>
            </table>
          </article>

          <article class="panel span-12">
            <h2>Event Timeline</h2>
            <table>
              <thead><tr><th>Time</th><th>Level</th><th>Message</th></tr></thead>
              <tbody>${renderTimelineRows(events)}</tbody>
            </table>
          </article>
        </section>
      </main>
      <script>window.__DASHBOARD_DATA__ = ${safeJson(chartPayload)};</script>
      <script src="/dashboard/vendor/chart.umd.js"></script>
      <script>
        const chartData = window.__DASHBOARD_DATA__;
        const statusCtx = document.getElementById("statusCodesChart");
        const timelineCtx = document.getElementById("timelineChart");

        if (statusCtx && window.Chart) {
          new Chart(statusCtx, {
            type: "doughnut",
            data: {
              labels: ["2xx", "3xx", "4xx", "429", "5xx"],
              datasets: [{
                data: [
                  chartData.statusCodes["2xx"] || 0,
                  chartData.statusCodes["3xx"] || 0,
                  chartData.statusCodes["4xx"] || 0,
                  chartData.statusCodes["429"] || 0,
                  chartData.statusCodes["5xx"] || 0
                ],
                backgroundColor: ["#22c55e", "#38bdf8", "#f59e0b", "#f97316", "#ef4444"]
              }]
            },
            options: { plugins: { legend: { labels: { color: "#e8eefc" } } } }
          });
        }

        if (timelineCtx && window.Chart) {
          new Chart(timelineCtx, {
            type: "line",
            data: {
              labels: (chartData.timeline || []).map((item) => item.minute),
              datasets: [
                {
                  label: "Requests/min",
                  data: (chartData.timeline || []).map((item) => item.requests),
                  borderColor: "#38bdf8",
                  backgroundColor: "rgba(56, 189, 248, 0.16)",
                  tension: 0.25
                },
                {
                  label: "Errors/min",
                  data: (chartData.timeline || []).map((item) => item.errors),
                  borderColor: "#ef4444",
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  tension: 0.25
                }
              ]
            },
            options: {
              scales: {
                x: { ticks: { color: "#93a4cc" }, grid: { color: "rgba(148, 163, 184, 0.08)" } },
                y: { ticks: { color: "#93a4cc" }, grid: { color: "rgba(148, 163, 184, 0.08)" } }
              },
              plugins: { legend: { labels: { color: "#e8eefc" } } }
            }
          });
        }
      </script>
    </body>
  </html>`;
}

module.exports = {
  renderOverviewPage
};

