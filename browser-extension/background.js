const DEFAULT_COLLECTOR_URL = 'http://server.local:3100';

// Heartbeat interval: 5 minutes (300000ms)
const HEARTBEAT_INTERVAL = 5 * 60 * 1000;

// Idle detection: if no activity for 2 minutes, stop heartbeat
const IDLE_THRESHOLD = 2 * 60; // 2 minutes in seconds (for chrome.idle API)

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

// Track active tab state
let activeTabId = null;
let heartbeatTimer = null;
let currentUrl = null;
let currentTitle = null;
let isUserActive = true;

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

// Start heartbeat for active tab
function startHeartbeat(url, title) {
  // Stop any existing heartbeat
  stopHeartbeat();
  
  if (shouldIgnore(url)) return;
  
  currentUrl = url;
  currentTitle = title;
  
  // Send initial visit
  trackVisit(url, title);
  
  // Set up periodic heartbeat (only sends if user is active)
  heartbeatTimer = setInterval(() => {
    if (currentUrl && isUserActive) {
      trackVisit(currentUrl, currentTitle);
    }
  }, HEARTBEAT_INTERVAL);
}

// Stop heartbeat
function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  currentUrl = null;
  currentTitle = null;
}

// Track when a tab finishes loading
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // If this is the active tab, start heartbeat
    if (tabId === activeTabId) {
      startHeartbeat(tab.url, tab.title);
    }
  }
});

// Track when user switches tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  activeTabId = activeInfo.tabId;
  
  try {
    const tab = await chrome.tabs.get(activeTabId);
    if (tab.url && tab.status === 'complete') {
      startHeartbeat(tab.url, tab.title);
    }
  } catch (err) {
    console.error('Failed to get active tab:', err);
  }
});

// Track when window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus (user switched to another app)
    stopHeartbeat();
  } else {
    // Browser gained focus, resume tracking active tab
    try {
      const [tab] = await chrome.tabs.query({ active: true, windowId });
      if (tab) {
        activeTabId = tab.id;
        if (tab.url && tab.status === 'complete') {
          startHeartbeat(tab.url, tab.title);
        }
      }
    } catch (err) {
      console.error('Failed to resume tracking:', err);
    }
  }
});

// Track user idle state
chrome.idle.setDetectionInterval(IDLE_THRESHOLD);

chrome.idle.onStateChanged.addListener((newState) => {
  if (newState === 'active') {
    // User came back, resume tracking
    isUserActive = true;
    
    // Restart heartbeat for current tab if we have one
    if (currentUrl && currentTitle) {
      trackVisit(currentUrl, currentTitle);
    }
  } else {
    // User is idle (away from computer) or locked screen
    isUserActive = false;
  }
});

// Initialize with current active tab on extension load
chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
  if (tab) {
    activeTabId = tab.id;
    if (tab.url && tab.status === 'complete') {
      startHeartbeat(tab.url, tab.title);
    }
  }
}).catch(err => {
  console.error('Failed to initialize active tab:', err);
});
