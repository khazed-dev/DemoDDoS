const express = require("express");
const path = require("path");
const config = require("./config");
const { loadDashboardState } = require("./data-loader");
const { renderOverviewPage } = require("./view");

const app = express();
const chartJsPath = path.dirname(require.resolve("chart.js"));

app.set("trust proxy", true);
app.use("/dashboard/vendor", express.static(chartJsPath));

app.get("/dashboard", async (req, res, next) => {
  try {
    const state = await loadDashboardState();
    res.status(200).send(renderOverviewPage(state));
  } catch (error) {
    next(error);
  }
});

app.get("/dashboard/api/summary", async (req, res, next) => {
  try {
    const state = await loadDashboardState();
    res.json(state.summary);
  } catch (error) {
    next(error);
  }
});

app.get("/dashboard/api/events", async (req, res, next) => {
  try {
    const state = await loadDashboardState();
    res.json(state.events);
  } catch (error) {
    next(error);
  }
});

app.get("/dashboard/api/top-ips", async (req, res, next) => {
  try {
    const state = await loadDashboardState();
    res.json(state.topIps);
  } catch (error) {
    next(error);
  }
});

app.get("/dashboard/api/status-codes", async (req, res, next) => {
  try {
    const state = await loadDashboardState();
    res.json(state.statusCodes);
  } catch (error) {
    next(error);
  }
});

app.get("/dashboard/api/defense", async (req, res, next) => {
  try {
    const state = await loadDashboardState();
    res.json(state.defense);
  } catch (error) {
    next(error);
  }
});

app.get("/", (req, res) => {
  res.redirect("/dashboard");
});

app.use((error, req, res, next) => {
  console.error("[dashboard-app] Unhandled error:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    status: "ERROR",
    message: "Dashboard failed to render."
  });
});

app.listen(config.port, () => {
  console.log(`[dashboard-app] listening on port ${config.port}`);
});
