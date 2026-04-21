const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envPath = process.env.DDOS_LAB_ENV_FILE || path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const rootDir = path.resolve(__dirname, "../..");
const rawDir = path.resolve(rootDir, "data/raw");
const summaryDir = path.resolve(rootDir, "data/summaries");

const sourceFiles = {
  nginxAccess: resolvePath(process.env.NGINX_ACCESS_LOG, "./data/raw/nginx-access.jsonl"),
  nginxError: resolvePath(process.env.NGINX_ERROR_LOG, "./data/raw/nginx-error.log"),
  victimMetrics: resolvePath(process.env.VICTIM_METRICS_FILE, "./data/raw/victim-metrics.jsonl"),
  opsEvents: resolvePath(process.env.OPS_EVENTS_LOG, "./data/raw/ops-events.jsonl"),
  defenseStatus: path.join(summaryDir, "defense-status.json")
};

function resolvePath(input, fallback) {
  const target = input || fallback;
  return path.isAbsolute(target) ? target : path.resolve(rootDir, target);
}

function ensureDirs() {
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(summaryDir, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function readJsonLines(filePath) {
  try {
    return fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    return [];
  }
}

function readTextLines(filePath) {
  try {
    return fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    return [];
  }
}

function toMinuteKey(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setSeconds(0, 0);
  return date.toISOString();
}

function normalizeRequest(entry) {
  if (!entry) {
    return null;
  }

  if (entry.time || entry.request_uri) {
    return {
      ts: entry.time,
      ip: entry.remote_addr || "unknown",
      path: entry.request_uri || "/",
      status: Number(entry.status || 0),
      durationMs: Number(entry.request_time || 0) * 1000
    };
  }

  if (entry.ts || entry.path) {
    return {
      ts: entry.ts,
      ip: entry.ip || "unknown",
      path: entry.route || entry.path || "/",
      status: Number(entry.status || 0),
      durationMs: Number(entry.durationMs || 0)
    };
  }

  return null;
}

function countBy(items, selector) {
  return items.reduce((accumulator, item) => {
    const key = selector(item);
    accumulator.set(key, (accumulator.get(key) || 0) + 1);
    return accumulator;
  }, new Map());
}

function getTopEntries(map, keyName) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([key, count]) => ({ [keyName]: key, count }));
}

function classifyStatus(status) {
  if (status === 429) {
    return "429";
  }

  if (status >= 500) {
    return "5xx";
  }

  if (status >= 400) {
    return "4xx";
  }

  if (status >= 300) {
    return "3xx";
  }

  return "2xx";
}

function buildTimeline(requests) {
  const buckets = new Map();

  for (const request of requests) {
    const minute = toMinuteKey(request.ts);
    if (!minute) {
      continue;
    }

    if (!buckets.has(minute)) {
      buckets.set(minute, {
        minute,
        requests: 0,
        errors: 0,
        blocked: 0,
        status5xx: 0,
        totalDurationMs: 0
      });
    }

    const bucket = buckets.get(minute);
    bucket.requests += 1;
    bucket.totalDurationMs += Number(request.durationMs || 0);

    if (request.status >= 400) {
      bucket.errors += 1;
    }

    if (request.status === 429) {
      bucket.blocked += 1;
    }

    if (request.status >= 500) {
      bucket.status5xx += 1;
    }
  }

  return [...buckets.values()]
    .sort((left, right) => left.minute.localeCompare(right.minute))
    .map((bucket) => ({
      minute: bucket.minute,
      requests: bucket.requests,
      errors: bucket.errors,
      blocked: bucket.blocked,
      status5xx: bucket.status5xx,
      avgRequestTimeMs: bucket.requests === 0 ? 0 : Number((bucket.totalDurationMs / bucket.requests).toFixed(2))
    }));
}

function pickSnapshots(timeline) {
  if (timeline.length === 0) {
    return {
      beforeAttack: { label: "Before attack", requestsPerMinute: 0, errorRate: 0, avgRequestTimeMs: 0 },
      duringAttack: { label: "During attack", requestsPerMinute: 0, errorRate: 0, avgRequestTimeMs: 0 },
      afterRestart: { label: "After restart", requestsPerMinute: 0, errorRate: 0, avgRequestTimeMs: 0 }
    };
  }

  const baseline = timeline[0];
  const peak = [...timeline].sort((left, right) => right.requests - left.requests)[0];
  const latest = timeline[timeline.length - 1];

  function toSnapshot(label, sample) {
    return {
      label,
      requestsPerMinute: sample.requests,
      errorRate: sample.requests === 0 ? 0 : Number(((sample.errors / sample.requests) * 100).toFixed(2)),
      avgRequestTimeMs: sample.avgRequestTimeMs
    };
  }

  return {
    beforeAttack: toSnapshot("Before attack", baseline),
    duringAttack: toSnapshot("During attack", peak),
    afterRestart: toSnapshot("After restart", latest)
  };
}

function deriveAppStatus(totals, defense) {
  if (defense.emergencyModeEnabled) {
    return "DEGRADED";
  }

  if (totals.requests === 0) {
    return "UP";
  }

  const errorRate = totals.requests === 0 ? 0 : totals.errors / totals.requests;
  if (totals.status5xx > 0 || totals.avgRequestTimeMs >= 1000 || errorRate >= 0.2) {
    return "DEGRADED";
  }

  return "UP";
}

function extractErrorEvents(lines) {
  return lines.slice(-20).map((line) => ({
    ts: new Date().toISOString(),
    level: "warning",
    type: "nginx_error_tail",
    message: line.slice(0, 220)
  }));
}

function synthesizeEvents(timeline, totals, defense, opsEvents, errorLines) {
  const events = [...opsEvents];

  if (timeline.length > 0) {
    const peak = [...timeline].sort((left, right) => right.requests - left.requests)[0];
    const peakErrorRate = peak.requests === 0 ? 0 : peak.errors / peak.requests;

    if (peak.requests >= 30) {
      events.push({
        ts: peak.minute,
        level: "warning",
        type: "traffic_spike",
        message: `Traffic spike detected with ${peak.requests} requests/min.`
      });
    }

    if (peak.status5xx > 0 || peakErrorRate >= 0.2) {
      events.push({
        ts: peak.minute,
        level: "error",
        type: "service_degraded",
        message: `Victim app showed elevated failures during the peak minute (${peak.status5xx} server errors, ${(peakErrorRate * 100).toFixed(1)}% error rate).`
      });
    }
  }

  if (totals.status429 > 0) {
    events.push({
      ts: new Date().toISOString(),
      level: "info",
      type: "rate_limit_observed",
      message: `Observed ${totals.status429} HTTP 429 responses in parsed logs.`
    });
  }

  if (defense.emergencyModeEnabled) {
    events.push({
      ts: defense.lastUpdatedAt || new Date().toISOString(),
      level: "warning",
      type: "emergency_mode",
      message: "Emergency mode is currently enabled."
    });
  }

  return [...events, ...extractErrorEvents(errorLines)]
    .filter((event) => event && event.ts)
    .sort((left, right) => new Date(left.ts) - new Date(right.ts));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function writeJsonLines(filePath, items) {
  const content = items.map((item) => JSON.stringify(item)).join("\n");
  fs.writeFileSync(filePath, content ? `${content}\n` : "", "utf8");
}

function buildSummary() {
  ensureDirs();

  const nginxRequests = readJsonLines(sourceFiles.nginxAccess).map(normalizeRequest).filter(Boolean);
  const victimRequests = readJsonLines(sourceFiles.victimMetrics).map(normalizeRequest).filter(Boolean);
  const requests = nginxRequests.length > 0 ? nginxRequests : victimRequests;
  const errorLines = readTextLines(sourceFiles.nginxError);
  const opsEvents = readJsonLines(sourceFiles.opsEvents);
  const defense = readJson(sourceFiles.defenseStatus, {
    rateLimitEnabled: false,
    connLimitEnabled: false,
    emergencyModeEnabled: false,
    lastUpdatedAt: null,
    notes: "No defense snapshot yet."
  });

  const statusCodes = requests.reduce(
    (accumulator, request) => {
      const bucket = classifyStatus(request.status);
      accumulator[bucket] += 1;
      return accumulator;
    },
    { "2xx": 0, "3xx": 0, "4xx": 0, "429": 0, "5xx": 0 }
  );

  const topIps = getTopEntries(countBy(requests, (request) => request.ip || "unknown"), "ip");
  const topEndpoints = getTopEntries(countBy(requests, (request) => request.path || "/"), "path");
  const timeline = buildTimeline(requests);
  const totalDuration = requests.reduce((sum, request) => sum + Number(request.durationMs || 0), 0);

  const totals = {
    requests: requests.length,
    errors: requests.filter((request) => request.status >= 400).length,
    blocked: statusCodes["429"],
    status429: statusCodes["429"],
    status5xx: statusCodes["5xx"],
    avgRequestTimeMs: requests.length === 0 ? 0 : Number((totalDuration / requests.length).toFixed(2))
  };

  const lastAttackMinute = [...timeline].sort((left, right) => right.requests - left.requests)[0];
  const lastAttackSummary = lastAttackMinute
    ? {
        peakMinute: lastAttackMinute.minute,
        peakRequestsPerMinute: lastAttackMinute.requests,
        peakErrorRate: lastAttackMinute.requests === 0 ? 0 : Number(((lastAttackMinute.errors / lastAttackMinute.requests) * 100).toFixed(2)),
        notes:
          lastAttackMinute.requests >= 30
            ? "Peak minute suggests a flood or concentrated load spike."
            : "Traffic stayed within low to moderate volume during the parsed window."
      }
    : {
        peakMinute: null,
        peakRequestsPerMinute: 0,
        peakErrorRate: 0,
        notes: "No request data parsed yet."
      };

  const summary = {
    generatedAt: new Date().toISOString(),
    appStatus: deriveAppStatus(totals, defense),
    totals,
    topIps,
    topEndpoints,
    timeline,
    snapshots: pickSnapshots(timeline),
    lastAttackSummary,
    defense,
    sources: sourceFiles
  };

  const events = synthesizeEvents(timeline, totals, defense, opsEvents, errorLines);

  writeJson(path.join(summaryDir, "latest-summary.json"), summary);
  writeJson(path.join(summaryDir, "top-ips.json"), topIps);
  writeJson(path.join(summaryDir, "status-codes.json"), statusCodes);
  writeJsonLines(path.join(summaryDir, "events.jsonl"), events);

  return summary;
}

if (require.main === module) {
  try {
    const summary = buildSummary();
    console.log(`[parser] Summary built at ${summary.generatedAt} with ${summary.totals.requests} requests.`);
  } catch (error) {
    console.error("[parser] Failed to build summaries:", error);
    process.exitCode = 1;
  }
}

module.exports = {
  buildSummary
};

