const path = require("path");

const rootDir = path.resolve(__dirname, "../..");

module.exports = {
  apps: [
    {
      name: "ddos-lab-victim",
      cwd: rootDir,
      script: "apps/victim/src/server.js",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "ddos-lab-dashboard",
      cwd: rootDir,
      script: "apps/dashboard/src/server.js",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "ddos-lab-parser",
      cwd: rootDir,
      script: "scripts/parse/watch.js",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
        PARSER_INTERVAL_MS: process.env.PARSER_INTERVAL_MS || 15000
      }
    }
  ]
};
