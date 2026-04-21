const path = require("path");
const dotenv = require("dotenv");

const envPath = process.env.DDOS_LAB_ENV_FILE || path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });

const rootDir = path.resolve(__dirname, "../../..");

function resolveFromRoot(targetPath, fallbackPath) {
  const input = targetPath || fallbackPath;
  return path.isAbsolute(input) ? input : path.resolve(rootDir, input);
}

module.exports = {
  rootDir,
  port: Number(process.env.DASHBOARD_PORT || 3002),
  summaryDir: resolveFromRoot(process.env.DASHBOARD_SUMMARY_DIR, "./data/summaries"),
  victimHealthUrl: process.env.DASHBOARD_VICTIM_HEALTH_URL || "http://127.0.0.1:3001/health",
  retentionEvents: Number(process.env.SUMMARY_RETENTION_EVENTS || 400)
};

