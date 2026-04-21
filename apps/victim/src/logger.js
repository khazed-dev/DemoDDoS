const fs = require("fs");

function appendJsonLine(filePath, payload) {
  const line = `${JSON.stringify(payload)}\n`;
  fs.appendFile(filePath, line, (error) => {
    if (error) {
      console.error(`[victim-app] Failed to append ${filePath}:`, error.message);
    }
  });
}

module.exports = {
  appendJsonLine
};

