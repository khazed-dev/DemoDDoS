function createMetricsStore() {
  return {
    inflightRequests: 0,
    totalRequests: 0,
    completedRequests: 0,
    slowRequests: 0,
    overloadResponses: 0,
    lastRequestAt: null
  };
}

module.exports = {
  createMetricsStore
};

