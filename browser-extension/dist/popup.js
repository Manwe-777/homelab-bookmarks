const DEFAULT_URL = 'http://server.local:3100';
const DEFAULT_BACKUP_URL = '';

const serverUrlInput = document.getElementById('serverUrl');
const backupUrlInput = document.getElementById('backupUrl');
const saveBtn = document.getElementById('saveBtn');
const checkBtn = document.getElementById('checkBtn');
const primaryDot = document.getElementById('primaryDot');
const primaryText = document.getElementById('primaryText');
const backupDot = document.getElementById('backupDot');
const backupText = document.getElementById('backupText');

// Load saved URLs on popup open
async function loadSettings() {
  const result = await chrome.storage.local.get(['collectorUrl', 'backupCollectorUrl']);
  const url = result.collectorUrl || DEFAULT_URL;
  const backupUrl = result.backupCollectorUrl || DEFAULT_BACKUP_URL;
  serverUrlInput.value = url;
  backupUrlInput.value = backupUrl;

  checkConnection(url, primaryDot, primaryText);
  if (backupUrl) {
    checkConnection(backupUrl, backupDot, backupText);
  } else {
    showStatus(backupDot, backupText, 'idle', 'Not configured');
  }
}

// Save URLs to storage
async function saveSettings() {
  let url = serverUrlInput.value.trim();
  let backupUrl = backupUrlInput.value.trim();

  if (!url) {
    showStatus(primaryDot, primaryText, 'error', 'Please enter a valid URL');
    return;
  }

  // Auto-prepend http:// if no protocol specified
  if (!/^https?:\/\//i.test(url)) {
    url = 'http://' + url;
    serverUrlInput.value = url;
  }
  if (backupUrl && !/^https?:\/\//i.test(backupUrl)) {
    backupUrl = 'http://' + backupUrl;
    backupUrlInput.value = backupUrl;
  }

  await chrome.storage.local.set({ collectorUrl: url, backupCollectorUrl: backupUrl });
  showStatus(primaryDot, primaryText, 'checking', 'Saved! Checking...');

  setTimeout(() => {
    checkConnection(url, primaryDot, primaryText);
    if (backupUrl) {
      checkConnection(backupUrl, backupDot, backupText);
    } else {
      showStatus(backupDot, backupText, 'idle', 'Not configured');
    }
  }, 500);
}

// Check if server is reachable
async function checkConnection(url, dotEl, textEl) {
  showStatus(dotEl, textEl, 'checking', 'Checking connection...');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      showStatus(dotEl, textEl, 'connected', 'Connected');
    } else {
      showStatus(dotEl, textEl, 'error', `Server error: ${response.status}`);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      showStatus(dotEl, textEl, 'error', 'Connection timeout');
    } else {
      showStatus(dotEl, textEl, 'error', 'Cannot reach server');
    }
  }
}

// Update status indicator
function showStatus(dotEl, textEl, state, message) {
  dotEl.className = `status-dot ${state}`;
  textEl.textContent = message;
}

// Event listeners
saveBtn.addEventListener('click', saveSettings);
checkBtn.addEventListener('click', () => {
  const url = serverUrlInput.value.trim();
  const backupUrl = backupUrlInput.value.trim();
  if (url) checkConnection(url, primaryDot, primaryText);
  if (backupUrl) {
    checkConnection(backupUrl, backupDot, backupText);
  } else {
    showStatus(backupDot, backupText, 'idle', 'Not configured');
  }
});

// Allow Enter key to save
serverUrlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') saveSettings();
});
backupUrlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') saveSettings();
});

// Initialize
loadSettings();
