function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function renderOverviewPage(state) {
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>DDoS Lab Dashboard</title>
      <style>
        :root {
          --bg: #07111f;
          --bg-accent: #10223e;
          --panel: rgba(10, 19, 35, 0.9);
          --panel-soft: rgba(20, 34, 58, 0.92);
          --panel-alert: rgba(64, 16, 20, 0.62);
          --line: rgba(116, 145, 198, 0.24);
          --line-strong: rgba(116, 145, 198, 0.4);
          --text: #edf3ff;
          --muted: #8ea3c7;
          --good: #22c55e;
          --warn: #f59e0b;
          --bad: #ef4444;
          --accent: #38bdf8;
          --accent-2: #0ea5e9;
          --ink: #d7e5ff;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          color: var(--text);
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          background:
            radial-gradient(circle at top left, rgba(56, 189, 248, 0.15), transparent 30%),
            radial-gradient(circle at top right, rgba(239, 68, 68, 0.16), transparent 26%),
            linear-gradient(180deg, var(--bg-accent), var(--bg) 42%);
        }
        main { max-width: 1480px; margin: 0 auto; padding: 24px; }
        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.8fr) minmax(320px, 0.85fr);
          gap: 18px;
          margin-bottom: 22px;
        }
        .panel,
        .hero-card {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 22px;
          padding: 20px;
          box-shadow: 0 22px 46px rgba(0, 0, 0, 0.24);
          backdrop-filter: blur(10px);
        }
        .hero-card h1,
        .hero-card h2,
        .panel h2 { margin-top: 0; }
        .hero-card h1 { margin-bottom: 12px; font-size: 36px; }
        .subtle { color: var(--muted); }
        .status-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 14px; }
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border-radius: 999px;
          font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .status-UP { color: var(--good); background: rgba(34, 197, 94, 0.12); }
        .status-DEGRADED { color: var(--warn); background: rgba(245, 158, 11, 0.14); }
        .status-DOWN { color: var(--bad); background: rgba(239, 68, 68, 0.14); }
        .live-banner {
          margin-top: 14px;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(239, 68, 68, 0.2);
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.14), rgba(239, 68, 68, 0.14));
        }
        .live-banner strong { display: block; margin-bottom: 6px; font-size: 18px; }
        .mini-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .mini-tile {
          background: var(--panel-soft);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 14px;
        }
        .mini-tile span { display: block; color: var(--muted); font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
        .mini-tile strong { font-size: 24px; }
        .grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 18px; }
        .span-3 { grid-column: span 3; }
        .span-4 { grid-column: span 4; }
        .span-5 { grid-column: span 5; }
        .span-6 { grid-column: span 6; }
        .span-7 { grid-column: span 7; }
        .span-8 { grid-column: span 8; }
        .span-12 { grid-column: span 12; }
        .metrics {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
        }
        .metric-card {
          background: var(--panel-soft);
          border-radius: 18px;
          padding: 14px 16px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .metric-card span {
          display: block;
          color: var(--muted);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }
        .metric-card strong { display: block; font-size: 30px; margin-bottom: 4px; }
        .metric-card small { color: var(--muted); }
        .panel-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }
        .panel-head h2 { margin-bottom: 6px; }
        .legend-note {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
        }
        .defense-list {
          display: grid;
          gap: 12px;
        }
        .defense-state {
          padding: 14px;
          border-radius: 16px;
          background: var(--panel-soft);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .defense-state strong { display: block; margin-bottom: 6px; font-size: 16px; }
        .defense-state.active { border-color: rgba(34, 197, 94, 0.36); background: rgba(34, 197, 94, 0.1); }
        .defense-state.idle { border-color: rgba(245, 158, 11, 0.24); }
        .snapshot-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .snapshot-card {
          padding: 14px;
          border-radius: 16px;
          background: var(--panel-soft);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .snapshot-card h3 { margin: 0 0 8px; font-size: 16px; }
        .snapshot-card p { margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td {
          padding: 11px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          text-align: left;
          font-size: 14px;
          vertical-align: top;
        }
        th {
          color: var(--muted);
          font-weight: 700;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .mono { font-family: Consolas, "Courier New", monospace; }
        .flag {
          display: inline-flex;
          align-items: center;
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .flag-alert { color: #ffd4d4; background: rgba(239, 68, 68, 0.18); }
        .flag-warn { color: #ffdfad; background: rgba(245, 158, 11, 0.18); }
        .flag-good { color: #d5ffe1; background: rgba(34, 197, 94, 0.16); }
        .flag-muted { color: #d6e6ff; background: rgba(56, 189, 248, 0.12); }
        .alert-panel {
          background: linear-gradient(180deg, rgba(64, 16, 20, 0.7), rgba(23, 24, 43, 0.92));
          border-color: rgba(239, 68, 68, 0.26);
        }
        .event-level {
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.05em;
          font-size: 12px;
        }
        .event-warning { color: var(--warn); }
        .event-error { color: var(--bad); }
        .event-info { color: var(--accent); }
        .empty {
          padding: 14px;
          border-radius: 14px;
          background: rgba(56, 189, 248, 0.08);
          color: var(--muted);
        }
        canvas { width: 100% !important; height: 300px !important; }
        @media (max-width: 1200px) {
          .hero { grid-template-columns: 1fr; }
          .metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .span-3, .span-4, .span-5, .span-6, .span-7, .span-8 { grid-column: span 12; }
        }
        @media (max-width: 768px) {
          main { padding: 16px; }
          .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .mini-grid, .snapshot-strip { grid-template-columns: 1fr; }
          .hero-card h1 { font-size: 28px; }
          canvas { height: 260px !important; }
        }
      </style>
    </head>
    <body>
      <main>
        <section class="hero">
          <article class="hero-card">
            <h1>DDoS Lab Dashboard</h1>
            <div class="status-row">
              <span id="appStatusPill" class="status-pill">App Status</span>
              <span id="feedFreshness" class="flag flag-muted">Waiting for live feed</span>
            </div>
            <p class="subtle">Dashboard is refreshed every second. Focus on the hot-source table and blocked-source table to see who is flooding and who is being throttled by Nginx.</p>
            <div class="live-banner">
              <strong id="liveHeadline">Waiting for traffic...</strong>
              <span id="liveSubheadline" class="subtle">No recent request window parsed yet.</span>
            </div>
          </article>

          <article class="hero-card">
            <h2>Live Health Check</h2>
            <p class="subtle">Victim probe status</p>
            <p><strong id="healthStatus">-</strong></p>
            <p class="subtle" id="healthReachability">Checking...</p>
            <p class="subtle">Summary generated at: <span id="summaryGeneratedAt">-</span></p>
          </article>

          <article class="hero-card">
            <h2>Defense Snapshot</h2>
            <div class="mini-grid">
              <div class="mini-tile"><span>Rate limit</span><strong id="defenseRate">OFF</strong></div>
              <div class="mini-tile"><span>Conn limit</span><strong id="defenseConn">OFF</strong></div>
              <div class="mini-tile"><span>Updated</span><strong id="defenseUpdatedAt">-</strong></div>
            </div>
            <p class="subtle" id="defenseNotes" style="margin-bottom:0;margin-top:14px;">No defense snapshot yet.</p>
          </article>
        </section>

        <section class="panel" style="margin-bottom:18px;">
          <div class="panel-head">
            <div>
              <h2>Key Metrics</h2>
              <p class="legend-note">All-time totals plus the current 60-second pressure window.</p>
            </div>
          </div>
          <div class="metrics">
            <div class="metric-card"><span>Total requests</span><strong id="metricRequests">0</strong><small>All parsed traffic</small></div>
            <div class="metric-card"><span>Total errors</span><strong id="metricErrors">0</strong><small>All 4xx/5xx responses</small></div>
            <div class="metric-card"><span>Blocked requests</span><strong id="metricBlocked">0</strong><small>Requests stopped by Nginx</small></div>
            <div class="metric-card"><span>429 responses</span><strong id="metric429">0</strong><small>Throttle visible in logs</small></div>
            <div class="metric-card"><span>Active IPs / 60s</span><strong id="metricActiveIps">0</strong><small>Distinct recent sources</small></div>
            <div class="metric-card"><span>Requests / 60s</span><strong id="metricRecentRequests">0</strong><small>Current pressure window</small></div>
          </div>
        </section>

        <section class="grid">
          <article class="panel span-8">
            <div class="panel-head">
              <div>
                <h2>Live Attack Pressure</h2>
                <p class="legend-note">Per-second activity over the last 60 seconds. Blue is incoming pressure, red is blocked traffic.</p>
              </div>
              <span id="liveWindowTag" class="flag flag-muted">60s window</span>
            </div>
            <canvas id="liveTrafficChart"></canvas>
          </article>

          <article id="defensePanel" class="panel span-4">
            <div class="panel-head">
              <div>
                <h2>Current Defense</h2>
                <p class="legend-note">This dashboard focuses only on rate limiting and connection limiting.</p>
              </div>
            </div>
            <div class="defense-list">
              <div id="rateDefenseState" class="defense-state idle">
                <strong>Nginx rate limiting</strong>
                <span id="rateDefenseText">Disabled. Bursts are passing through to the victim route.</span>
              </div>
              <div id="connDefenseState" class="defense-state idle">
                <strong>Nginx connection limiting</strong>
                <span id="connDefenseText">Disabled. Single IPs can hold more simultaneous victim connections.</span>
              </div>
              <div class="defense-state">
                <strong>What to watch now</strong>
                <span id="defenseWatchText">Enable both protections and this panel will start highlighting the blocked IP list.</span>
              </div>
            </div>
          </article>

          <article id="hotIpsPanel" class="panel span-6">
            <div class="panel-head">
              <div>
                <h2>Suspicious IP Activity</h2>
                <p class="legend-note">Top recent IPs with continuous hits in the current live window.</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>IP</th>
                  <th>Hits / 60s</th>
                  <th>Blocked</th>
                  <th>Last Seen</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody id="hotIpsBody"></tbody>
            </table>
          </article>

          <article id="blockedIpsPanel" class="panel span-6">
            <div class="panel-head">
              <div>
                <h2>Blocked by Nginx</h2>
                <p class="legend-note">IPs that are still trying to hit the victim route but are now receiving throttled responses.</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>IP</th>
                  <th>429s</th>
                  <th>Block Rate</th>
                  <th>Target</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody id="blockedIpsBody"></tbody>
            </table>
          </article>

          <article class="panel span-6">
            <div class="panel-head">
              <div>
                <h2>Status Code Distribution</h2>
                <p class="legend-note">Successful requests, app-side errors, and defense-side throttles.</p>
              </div>
            </div>
            <canvas id="statusCodesChart"></canvas>
          </article>

          <article class="panel span-6">
            <div class="panel-head">
              <div>
                <h2>Minute History</h2>
                <p class="legend-note">Longer view for traffic growth and blocked volume.</p>
              </div>
            </div>
            <canvas id="timelineChart"></canvas>
          </article>

          <article class="panel span-4">
            <div class="panel-head">
              <div>
                <h2>Top IPs</h2>
                <p class="legend-note">All parsed history.</p>
              </div>
            </div>
            <table>
              <thead><tr><th>IP</th><th>Requests</th></tr></thead>
              <tbody id="topIpsBody"></tbody>
            </table>
          </article>

          <article class="panel span-4">
            <div class="panel-head">
              <div>
                <h2>Top Endpoints</h2>
                <p class="legend-note">Most targeted routes so far.</p>
              </div>
            </div>
            <table>
              <thead><tr><th>Endpoint</th><th>Hits</th></tr></thead>
              <tbody id="topEndpointsBody"></tbody>
            </table>
          </article>

          <article class="panel span-4">
            <div class="panel-head">
              <div>
                <h2>Attack Snapshot</h2>
                <p class="legend-note">Before, peak, and latest minute.</p>
              </div>
            </div>
            <div id="snapshotStrip" class="snapshot-strip"></div>
            <p class="subtle" id="lastAttackSummary" style="margin-bottom:0;"></p>
          </article>

          <article class="panel span-12">
            <div class="panel-head">
              <div>
                <h2>Event Timeline</h2>
                <p class="legend-note">Defense flips, traffic spikes, and parser observations.</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Level</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody id="eventsBody"></tbody>
            </table>
          </article>
        </section>
      </main>

      <script>window.__DASHBOARD_STATE__ = ${safeJson(state)};</script>
      <script src="/dashboard/vendor/chart.umd.js"></script>
      <script>
        const stateStore = {
          current: window.__DASHBOARD_STATE__
        };

        const charts = {
          status: null,
          live: null,
          history: null
        };

        function formatNumber(value) {
          return new Intl.NumberFormat("en-US").format(Number(value || 0));
        }

        function formatPercent(value) {
          return \`\${Number(value || 0).toFixed(1)}%\`;
        }

        function escapeHtml(value) {
          return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
        }

        function formatTimestamp(value) {
          if (!value) {
            return "-";
          }

          const date = new Date(value);
          if (Number.isNaN(date.getTime())) {
            return value;
          }

          return date.toLocaleString("en-GB", {
            hour12: false,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          });
        }

        function formatClock(value) {
          if (!value) {
            return "-";
          }

          const date = new Date(value);
          if (Number.isNaN(date.getTime())) {
            return value;
          }

          return date.toLocaleTimeString("en-GB", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          });
        }

        function stateFlagClass(value) {
          if (value === "Blocked") {
            return "flag-alert";
          }

          if (value === "Flooding") {
            return "flag-warn";
          }

          if (value === "Low") {
            return "flag-good";
          }

          return "flag-muted";
        }

        function renderRows(items, columns, emptyMessage) {
          if (!items || items.length === 0) {
            return \`<tr><td colspan="\${columns.length}"><div class="empty">\${escapeHtml(emptyMessage)}</div></td></tr>\`;
          }

          return items.map((item) => {
            const cells = columns.map((column) => \`<td>\${column(item)}</td>\`).join("");
            return \`<tr>\${cells}</tr>\`;
          }).join("");
        }

        function renderSnapshots(snapshots) {
          const ordered = [
            snapshots?.beforeAttack || { label: "Before attack", requestsPerMinute: 0, errorRate: 0, avgRequestTimeMs: 0 },
            snapshots?.duringAttack || { label: "During attack", requestsPerMinute: 0, errorRate: 0, avgRequestTimeMs: 0 },
            snapshots?.afterRestart || { label: "After restart", requestsPerMinute: 0, errorRate: 0, avgRequestTimeMs: 0 }
          ];

          return ordered.map((snapshot) => \`
            <article class="snapshot-card">
              <h3>\${escapeHtml(snapshot.label)}</h3>
              <p><strong>\${formatNumber(snapshot.requestsPerMinute)}</strong> rpm</p>
              <p>Error rate: \${formatPercent(snapshot.errorRate)}</p>
              <p>Avg response: \${formatNumber(snapshot.avgRequestTimeMs)} ms</p>
            </article>
          \`).join("");
        }

        function renderState(state) {
          stateStore.current = state;
          const summary = state.summary || {};
          const defense = state.defense || {};
          const health = state.health || {};
          const live = summary.live || {};
          const recentTotals = live.recentTotals || {};
          const hotIps = live.hotIps || [];
          const blockedIps = live.blockedIps || [];
          const topEndpoints = summary.topEndpoints || [];
          const snapshots = summary.snapshots || {};
          const statusCodes = state.statusCodes || { "2xx": 0, "3xx": 0, "4xx": 0, "429": 0, "5xx": 0 };

          const appStatusPill = document.getElementById("appStatusPill");
          appStatusPill.textContent = \`App Status: \${summary.appStatus || "UP"}\`;
          appStatusPill.className = \`status-pill status-\${summary.appStatus || "UP"}\`;

          const generatedAt = summary.generatedAt ? new Date(summary.generatedAt) : null;
          const ageMs = generatedAt ? Date.now() - generatedAt.getTime() : Number.POSITIVE_INFINITY;
          const feedFreshness = document.getElementById("feedFreshness");
          if (!generatedAt) {
            feedFreshness.textContent = "No parsed summary yet";
            feedFreshness.className = "flag flag-warn";
          } else if (ageMs <= 3000) {
            feedFreshness.textContent = "Live feed: updating";
            feedFreshness.className = "flag flag-good";
          } else if (ageMs <= 15000) {
            feedFreshness.textContent = "Feed slightly delayed";
            feedFreshness.className = "flag flag-warn";
          } else {
            feedFreshness.textContent = "Feed stale";
            feedFreshness.className = "flag flag-alert";
          }

          document.getElementById("healthStatus").textContent = health.status || "DOWN";
          document.getElementById("healthReachability").textContent = \`Victim health probe is \${health.live ? "reachable" : "unreachable"}.\`;
          document.getElementById("summaryGeneratedAt").textContent = formatTimestamp(summary.generatedAt);

          document.getElementById("defenseRate").textContent = defense.rateLimitEnabled ? "ON" : "OFF";
          document.getElementById("defenseConn").textContent = defense.connLimitEnabled ? "ON" : "OFF";
          document.getElementById("defenseUpdatedAt").textContent = formatClock(defense.lastUpdatedAt);
          document.getElementById("defenseNotes").textContent = defense.notes || "No defense snapshot yet.";

          document.getElementById("metricRequests").textContent = formatNumber(summary.totals?.requests);
          document.getElementById("metricErrors").textContent = formatNumber(summary.totals?.errors);
          document.getElementById("metricBlocked").textContent = formatNumber(summary.totals?.blocked);
          document.getElementById("metric429").textContent = formatNumber(summary.totals?.status429);
          document.getElementById("metricActiveIps").textContent = formatNumber(recentTotals.activeIps);
          document.getElementById("metricRecentRequests").textContent = formatNumber(recentTotals.requests);

          const liveHeadline = document.getElementById("liveHeadline");
          const liveSubheadline = document.getElementById("liveSubheadline");
          const liveWindowTag = document.getElementById("liveWindowTag");
          const hotSource = hotIps[0];
          liveWindowTag.textContent = \`\${live.windowSeconds || 60}s window\`;

          if (blockedIps.length > 0) {
            liveHeadline.textContent = \`\${blockedIps.length} IP(s) are being blocked right now\`;
            liveSubheadline.textContent = \`\${formatNumber(recentTotals.blocked)} recent requests were throttled. Top blocked source: \${hotSource ? hotSource.ip : blockedIps[0].ip}.\`;
          } else if (hotSource && hotSource.requests >= 10) {
            liveHeadline.textContent = \`Suspicious continuous traffic from \${hotSource.ip}\`;
            liveSubheadline.textContent = \`\${hotSource.ip} generated \${formatNumber(hotSource.requests)} requests in the last \${live.windowSeconds || 60}s and is targeting \${hotSource.hottestPath || "/"}.\`;
          } else {
            liveHeadline.textContent = "Traffic is currently low or normal";
            liveSubheadline.textContent = \`Recent window shows \${formatNumber(recentTotals.requests)} requests from \${formatNumber(recentTotals.activeIps)} active IPs.\`;
          }

          const defensePanel = document.getElementById("defensePanel");
          const hotIpsPanel = document.getElementById("hotIpsPanel");
          const blockedIpsPanel = document.getElementById("blockedIpsPanel");
          defensePanel.classList.toggle("alert-panel", blockedIps.length > 0);
          hotIpsPanel.classList.toggle("alert-panel", hotSource && hotSource.requests >= 25);
          blockedIpsPanel.classList.toggle("alert-panel", blockedIps.length > 0);

          const rateDefenseState = document.getElementById("rateDefenseState");
          const connDefenseState = document.getElementById("connDefenseState");
          rateDefenseState.className = \`defense-state \${defense.rateLimitEnabled ? "active" : "idle"}\`;
          connDefenseState.className = \`defense-state \${defense.connLimitEnabled ? "active" : "idle"}\`;
          document.getElementById("rateDefenseText").textContent = defense.rateLimitEnabled
            ? "Enabled. Bursty IPs should begin receiving 429 responses when they exceed the request budget."
            : "Disabled. Bursts are passing through to the victim route.";
          document.getElementById("connDefenseText").textContent = defense.connLimitEnabled
            ? "Enabled. Source IPs opening too many simultaneous connections should now be throttled."
            : "Disabled. Single IPs can hold more simultaneous victim connections.";

          const enabledCount = [defense.rateLimitEnabled, defense.connLimitEnabled].filter(Boolean).length;
          document.getElementById("defenseWatchText").textContent =
            blockedIps.length > 0
              ? \`Nginx is actively throttling \${blockedIps.length} recent IP(s). Watch the blocked table for growing 429 counts.\`
              : enabledCount === 2
                ? "Both protections are armed. As pressure rises, blocked IPs will begin appearing in the red table."
                : "Enable both protections and this panel will start highlighting the blocked IP list.";

          document.getElementById("hotIpsBody").innerHTML = renderRows(
            hotIps,
            [
              (item) => \`<span class="mono">\${escapeHtml(item.ip)}</span>\`,
              (item) => formatNumber(item.requests),
              (item) => formatNumber(item.blocked),
              (item) => formatClock(item.lastSeen),
              (item) => \`<span class="flag \${stateFlagClass(item.state)}">\${escapeHtml(item.state)}</span>\`
            ],
            "No hot IPs in the current live window."
          );

          document.getElementById("blockedIpsBody").innerHTML = renderRows(
            blockedIps,
            [
              (item) => \`<span class="mono">\${escapeHtml(item.ip)}</span>\`,
              (item) => formatNumber(item.blocked),
              (item) => formatPercent(item.blockRate),
              (item) => \`<span class="mono">\${escapeHtml(item.hottestPath || "/")}</span>\`,
              (item) => formatClock(item.lastSeen)
            ],
            "No blocked IPs yet. Turn on the limits and generate pressure to populate this table."
          );

          document.getElementById("topIpsBody").innerHTML = renderRows(
            state.topIps || [],
            [
              (item) => \`<span class="mono">\${escapeHtml(item.ip)}</span>\`,
              (item) => formatNumber(item.count)
            ],
            "No IP history yet."
          );

          document.getElementById("topEndpointsBody").innerHTML = renderRows(
            topEndpoints,
            [
              (item) => \`<span class="mono">\${escapeHtml(item.path)}</span>\`,
              (item) => formatNumber(item.count)
            ],
            "No endpoint history yet."
          );

          document.getElementById("snapshotStrip").innerHTML = renderSnapshots(snapshots);
          document.getElementById("lastAttackSummary").textContent = summary.lastAttackSummary?.notes || "No attack summary yet.";

          document.getElementById("eventsBody").innerHTML = renderRows(
            (state.events || []).slice(0, 16),
            [
              (item) => escapeHtml(formatTimestamp(item.ts)),
              (item) => \`<span class="event-level event-\${escapeHtml(item.level || "info")}">\${escapeHtml(item.level || "info")}</span>\`,
              (item) => escapeHtml(item.message || item.type || "-")
            ],
            "No events yet."
          );

          updateCharts(summary, statusCodes);
        }

        function ensureCharts() {
          if (!window.Chart) {
            return;
          }

          const commonGrid = { color: "rgba(255, 255, 255, 0.08)" };
          const commonTicks = { color: "#8ea3c7" };

          if (!charts.status) {
            charts.status = new Chart(document.getElementById("statusCodesChart"), {
              type: "doughnut",
              data: {
                labels: ["2xx", "3xx", "4xx", "429", "5xx"],
                datasets: [{
                  data: [0, 0, 0, 0, 0],
                  backgroundColor: ["#22c55e", "#38bdf8", "#f59e0b", "#ef4444", "#f97316"],
                  borderColor: "#07111f",
                  borderWidth: 2
                }]
              },
              options: {
                plugins: {
                  legend: {
                    labels: { color: "#edf3ff" }
                  }
                }
              }
            });
          }

          if (!charts.live) {
            charts.live = new Chart(document.getElementById("liveTrafficChart"), {
              type: "line",
              data: {
                labels: [],
                datasets: [
                  {
                    label: "Requests/sec",
                    data: [],
                    borderColor: "#38bdf8",
                    backgroundColor: "rgba(56, 189, 248, 0.18)",
                    fill: true,
                    tension: 0.3,
                    pointRadius: 1.8
                  },
                  {
                    label: "Blocked/sec",
                    data: [],
                    borderColor: "#ef4444",
                    backgroundColor: "rgba(239, 68, 68, 0.12)",
                    fill: true,
                    tension: 0.3,
                    pointRadius: 1.8
                  }
                ]
              },
              options: {
                animation: false,
                scales: {
                  x: { ticks: commonTicks, grid: commonGrid },
                  y: { ticks: commonTicks, grid: commonGrid, beginAtZero: true }
                },
                plugins: {
                  legend: { labels: { color: "#edf3ff" } }
                }
              }
            });
          }

          if (!charts.history) {
            charts.history = new Chart(document.getElementById("timelineChart"), {
              type: "line",
              data: {
                labels: [],
                datasets: [
                  {
                    label: "Requests/min",
                    data: [],
                    borderColor: "#0ea5e9",
                    backgroundColor: "rgba(14, 165, 233, 0.16)",
                    fill: true,
                    tension: 0.25
                  },
                  {
                    label: "Blocked/min",
                    data: [],
                    borderColor: "#ef4444",
                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                    fill: true,
                    tension: 0.25
                  }
                ]
              },
              options: {
                animation: false,
                scales: {
                  x: { ticks: commonTicks, grid: commonGrid },
                  y: { ticks: commonTicks, grid: commonGrid, beginAtZero: true }
                },
                plugins: {
                  legend: { labels: { color: "#edf3ff" } }
                }
              }
            });
          }
        }

        function updateCharts(summary, statusCodes) {
          ensureCharts();
          if (!window.Chart) {
            return;
          }

          const liveSeries = summary.live?.series || [];
          const minuteTimeline = summary.timeline || [];

          charts.status.data.datasets[0].data = [
            statusCodes["2xx"] || 0,
            statusCodes["3xx"] || 0,
            statusCodes["4xx"] || 0,
            statusCodes["429"] || 0,
            statusCodes["5xx"] || 0
          ];
          charts.status.update("none");

          charts.live.data.labels = liveSeries.map((item) => formatClock(item.second));
          charts.live.data.datasets[0].data = liveSeries.map((item) => item.requests || 0);
          charts.live.data.datasets[1].data = liveSeries.map((item) => item.blocked || 0);
          charts.live.update("none");

          charts.history.data.labels = minuteTimeline.map((item) => formatClock(item.minute));
          charts.history.data.datasets[0].data = minuteTimeline.map((item) => item.requests || 0);
          charts.history.data.datasets[1].data = minuteTimeline.map((item) => item.blocked || 0);
          charts.history.update("none");
        }

        let refreshInFlight = false;

        async function refreshState() {
          if (refreshInFlight) {
            return;
          }

          refreshInFlight = true;

          try {
            const response = await fetch("/dashboard/api/state", { cache: "no-store" });
            if (!response.ok) {
              throw new Error(\`Dashboard state request failed with \${response.status}\`);
            }

            const nextState = await response.json();
            renderState(nextState);
          } catch (error) {
            const feedFreshness = document.getElementById("feedFreshness");
            feedFreshness.textContent = "Live refresh failed";
            feedFreshness.className = "flag flag-alert";
          } finally {
            refreshInFlight = false;
          }
        }

        renderState(stateStore.current);
        setInterval(refreshState, 1000);
      </script>
    </body>
  </html>`;
}

module.exports = {
  renderOverviewPage
};
