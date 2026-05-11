const { buildSummary } = require("./build-summaries");

const intervalMs = Number(process.env.PARSER_INTERVAL_MS || 1000);

function tick() {
  try {
    const summary = buildSummary();
    console.log(`[parser-watch] refreshed ${summary.generatedAt}`);
  } catch (error) {
    console.error("[parser-watch] refresh failed:", error.message);
  }
}

tick();
setInterval(tick, intervalMs);
