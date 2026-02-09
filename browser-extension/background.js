const DEFAULT_COLLECTOR_URL = 'http://server.local:3100';

// Domains to ignore
const IGNORED_DOMAINS = [
  'localhost',
  'chrome://',
  'chrome-extension://',
  'brave://',
  'edge://',
  'about:',
  'newtab'
];

function shouldIgnore(url) {
  if (!url) return true;
  return IGNORED_DOMAINS.some(ignored => url.includes(ignored));
}

async function getCollectorUrl() {
  const result = await chrome.storage.local.get(['collectorUrl']);
  return result.collectorUrl || DEFAULT_COLLECTOR_URL;
}

async function trackVisit(url, title) {
  if (shouldIgnore(url)) return;

  const collectorUrl = await getCollectorUrl();

  try {
    await fetch(`${collectorUrl}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        title,
        timestamp: Date.now()
      })
    });
  } catch (err) {
    console.error('Failed to track visit:', err);
  }
}

// Track when a tab finishes loading
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    trackVisit(tab.url, tab.title);
  }
});
