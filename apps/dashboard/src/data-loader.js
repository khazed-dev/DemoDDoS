const fs = require("fs/promises");
const path = require("path");
const config = require("./config");

async function readJson(fileName, fallback) {
  try {
    const raw = await fs.readFile(path.join(config.summaryDir, fileName), "utf8");
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

async function readJsonLines(fileName, fallback = []) {
  try {
    const raw = await fs.readFile(path.join(config.summaryDir, fileName), "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    return fallback;
  }
}

async function fetchVictimHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(config.victimHealthUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return { live: false, status: "DOWN", detail: `Health responded ${response.status}` };
    }

    const payload = await response.json();
    return { live: true, status: payload.mode || "UP", detail: payload, checkedAt: new Date().toISOString() };
  } catch (error) {
    clearTimeout(timeout);
    return { live: false, status: "DOWN", detail: error.message, checkedAt: new Date().toISOString() };
  }
}

function deriveAppStatus(summary, defense, health) {
  if (defense.emergencyModeEnabled) {
    return "DEGRADED";
  }

  if (!health.live) {
    return "DOWN";
  }

  if ((summary.totals.status5xx || 0) > 0 || (summary.totals.avgRequestTimeMs || 0) >= 1000) {
    return "DEGRADED";
  }

  return "UP";
}

async function loadDashboardState() {
  const [summary, events, topIps, statusCodes, defense, health] = await Promise.all([
    readJson("latest-summary.json", null),
    readJsonLines("events.jsonl", []),
    readJson("top-ips.json", []),
    readJson("status-codes.json", { "2xx": 0, "3xx": 0, "4xx": 0, "429": 0, "5xx": 0 }),
    readJson("defense-status.json", {
      rateLimitEnabled: false,
      connLimitEnabled: false,
      emergencyModeEnabled: false,
      lastUpdatedAt: null,
      notes: "No defense snapshot yet."
    }),
    fetchVictimHealth()
  ]);

  const safeSummary = summary || {
    generatedAt: null,
    totals: {
      requests: 0,
      errors: 0,
      blocked: 0,
      status429: 0,
      status5xx: 0,
      avgRequestTimeMs: 0
    },
    topIps: [],
    topEndpoints: [],
    timeline: [],
    snapshots: {
      beforeAttack: { label: "Before attack", requestsPerMinute: 0, errorRate: 0, avgRequestTimeMs: 0 },
      duringAttack: { label: "During attack", requestsPerMinute: 0, errorRate: 0, avgRequestTimeMs: 0 },
      afterRestart: { label: "After restart", requestsPerMinute: 0, errorRate: 0, avgRequestTimeMs: 0 }
    },
    lastAttackSummary: {
      peakMinute: null,
      peakRequestsPerMinute: 0,
      peakErrorRate: 0,
      notes: "Dashboard is waiting for parsed summaries."
    }
  };

  safeSummary.appStatus = deriveAppStatus(safeSummary, defense, health);

  return {
    summary: safeSummary,
    events: events.slice(-config.retentionEvents).reverse(),
    topIps,
    statusCodes,
    defense,
    health
  };
}

module.exports = {
  loadDashboardState
};

