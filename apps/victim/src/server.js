const express = require("express");
const os = require("os");
const config = require("./config");
const { appendJsonLine } = require("./logger");
const { createMetricsStore } = require("./metrics");

const app = express();
const metrics = createMetricsStore();

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function busyLoopForMs(durationMs) {
  const deadline = Date.now() + durationMs;
  let accumulator = 0;

  while (Date.now() < deadline) {
    for (let i = 0; i < 2000; i += 1) {
      accumulator += Math.sqrt((i + 1) * Math.random());
    }
  }

  return Number(accumulator.toFixed(2));
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.socket.remoteAddress || "unknown";
}

app.set("trust proxy", true);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const startNs = process.hrtime.bigint();
  const startedAt = new Date().toISOString();
  const clientIp = getClientIp(req);

  metrics.inflightRequests += 1;
  metrics.totalRequests += 1;
  metrics.lastRequestAt = startedAt;

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;
    metrics.inflightRequests = Math.max(0, metrics.inflightRequests - 1);
    metrics.completedRequests += 1;

    if (durationMs >= 1000) {
      metrics.slowRequests += 1;
    }

    if (res.statusCode >= 500) {
      metrics.overloadResponses += 1;
    }

    const payload = {
      ts: startedAt,
      method: req.method,
      path: req.originalUrl,
      route: req.path,
      ip: clientIp,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      inflightAtFinish: metrics.inflightRequests,
      userAgent: req.headers["user-agent"] || "unknown"
    };

    appendJsonLine(config.metricsFile, payload);
    appendJsonLine(config.accessFile, payload);
  });

  next();
});

app.get("/", (req, res) => {
  const html = `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${config.publicName}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; }
        main { max-width: 860px; margin: 0 auto; padding: 48px 24px; }
        .panel { background: rgba(15, 23, 42, 0.8); border: 1px solid #334155; border-radius: 18px; padding: 24px; margin-bottom: 16px; }
        a { color: #7dd3fc; }
        code { background: rgba(148, 163, 184, 0.18); padding: 2px 6px; border-radius: 6px; }
      </style>
    </head>
    <body>
      <main>
        <section class="panel">
          <h1>${config.publicName}</h1>
          <p>This is the intentionally vulnerable victim website for the DDoS lab demo.</p>
          <p>Useful routes: <code>/health</code>, <code>/heavy</code>, <code>/api/report</code>, <a href="/dashboard">dashboard</a>.</p>
        </section>
        <section class="panel">
          <h2>Why this endpoint exists</h2>
          <p>The app includes CPU-heavy and slow-report routes so higher concurrency can push the service into a degraded state without freezing the whole EC2 instance immediately.</p>
        </section>
      </main>
    </body>
  </html>`;

  res.status(200).send(html);
});

app.get("/health", (req, res) => {
  const degraded = metrics.inflightRequests >= config.overloadInflight;
  res.status(200).json({
    status: "OK",
    mode: degraded ? "DEGRADED" : "UP",
    uptimeSeconds: Math.round(process.uptime()),
    hostname: os.hostname(),
    inflightRequests: metrics.inflightRequests,
    totalRequests: metrics.totalRequests,
    completedRequests: metrics.completedRequests,
    slowRequests: metrics.slowRequests,
    overloadResponses: metrics.overloadResponses,
    timestamp: new Date().toISOString()
  });
});

app.get("/heavy", (req, res) => {
  if (metrics.inflightRequests > config.overloadInflight * 1.5) {
    return res.status(503).json({
      status: "OVERLOADED",
      message: "Victim app rejected the request because the inflight queue is too large.",
      inflightRequests: metrics.inflightRequests
    });
  }

  const requestedMs = Number(req.query.workMs || req.query.ms || config.heavyDefaultMs);
  const workMs = clamp(Number.isFinite(requestedMs) ? requestedMs : config.heavyDefaultMs, 20, config.heavyMaxMs);
  const checksum = busyLoopForMs(workMs);

  return res.status(200).json({
    status: "OK",
    endpoint: "/heavy",
    workMs,
    checksum,
    inflightRequests: metrics.inflightRequests,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/report", async (req, res) => {
  const extraDelay = clamp(Number(req.query.delayMs || 0) || 0, 0, 3000);
  const delayMs = config.reportDelayMs + extraDelay;

  if (metrics.inflightRequests >= config.overloadInflight) {
    return res.status(503).json({
      status: "OVERLOADED",
      message: "Background reporting is temporarily unavailable while the victim app is overloaded.",
      retryAfterMs: 2000
    });
  }

  await wait(delayMs);

  return res.status(200).json({
    status: "OK",
    message: "Synthetic report generated.",
    delayMs,
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({
    status: "NOT_FOUND",
    message: "Route not found on victim app."
  });
});

app.use((error, req, res, next) => {
  console.error("[victim-app] Unhandled error:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    status: "ERROR",
    message: "Victim app internal error."
  });
});

app.listen(config.port, () => {
  console.log(`[victim-app] listening on port ${config.port}`);
});

