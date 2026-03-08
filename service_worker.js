// service_worker.js
// Background service worker for Chrome Extension Manifest V3.
// Receives metrics from content scripts and stores them.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'metrics' && msg.payload) {
    const metrics = msg.payload;

    // Store the metrics in local storage with history
    chrome.storage.local.get({ llmMetricsHistory: [] }, (result) => {
      const history = result.llmMetricsHistory || [];
      history.unshift(metrics);
      // Keep last 50 metrics
      if (history.length > 50) history.length = 50;

      chrome.storage.local.set({
        llmMetricsHistory: history,
        lastLlmMetric: metrics
      });
    });

    // Accumulate per-tab conversation totals in session storage (clears on browser close)
    const tabId = sender.tab && sender.tab.id;
    if (tabId != null) {
      const key = `tabTotals_${tabId}`;
      const defaults = { [key]: { queryCount: 0, energyWh: 0, carbonGrams: 0 } };
      chrome.storage.session.get(defaults, (res) => {
        const prev = res[key];
        chrome.storage.session.set({
          [key]: {
            queryCount: prev.queryCount + 1,
            energyWh: prev.energyWh + (metrics.energyWh || 0),
            carbonGrams: prev.carbonGrams + (metrics.carbonGrams || 0)
          }
        });
      });
    }

    sendResponse({ ok: true });
  }
  return true;
});
