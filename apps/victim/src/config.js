const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envPath = process.env.DDOS_LAB_ENV_FILE || path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });

const rootDir = path.resolve(__dirname, "../../..");

function resolveFromRoot(targetPath, fallbackPath) {
  const input = targetPath || fallbackPath;
  return path.isAbsolute(input) ? input : path.resolve(rootDir, input);
}

const config = {
  rootDir,
  port: Number(process.env.VICTIM_PORT || 3001),
  publicName: process.env.VICTIM_PUBLIC_NAME || "Victim Website",
  heavyDefaultMs: Number(process.env.VICTIM_HEAVY_DEFAULT_MS || 80),
  heavyMaxMs: Number(process.env.VICTIM_HEAVY_MAX_MS || 220),
  reportDelayMs: Number(process.env.VICTIM_REPORT_DELAY_MS || 650),
  overloadInflight: Number(process.env.VICTIM_OVERLOAD_INFLIGHT || 24),
  metricsFile: resolveFromRoot(process.env.VICTIM_METRICS_FILE, "./data/raw/victim-metrics.jsonl"),
  accessFile: resolveFromRoot(process.env.VICTIM_ACCESS_FILE, "./data/raw/victim-access.jsonl"),
  logDir: resolveFromRoot(process.env.VICTIM_LOG_DIR, "./data/raw")
};

fs.mkdirSync(config.logDir, { recursive: true });

module.exports = config;

