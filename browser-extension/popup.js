const DEFAULT_URL = 'http://server.local:3100';

const serverUrlInput = document.getElementById('serverUrl');
const saveBtn = document.getElementById('saveBtn');
const checkBtn = document.getElementById('checkBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// Load saved URL on popup open
async function loadSettings() {
  const result = await chrome.storage.local.get(['collectorUrl']);
  const url = result.collectorUrl || DEFAULT_URL;
  serverUrlInput.value = url;
  
  // Auto-check connection on load
  checkConnection(url);
}

// Save URL to storage
async function saveSettings() {
  const url = serverUrlInput.value.trim();
  
  if (!url) {
    showStatus('error', 'Please enter a valid URL');
    return;
  }
  
  await chrome.storage.local.set({ collectorUrl: url });
  showStatus('checking', 'Saved! Checking connection...');
  
  // Check connection after saving
  setTimeout(() => checkConnection(url), 500);
}

// Check if server is reachable
async function checkConnection(url) {
  showStatus('checking', 'Checking connection...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      showStatus('connected', 'Connected');
    } else {
      showStatus('error', `Server error: ${response.status}`);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      showStatus('error', 'Connection timeout');
    } else {
      showStatus('error', 'Cannot reach server');
    }
  }
}

// Update status indicator
function showStatus(state, message) {
  statusDot.className = `status-dot ${state}`;
  statusText.textContent = message;
}

// Event listeners
saveBtn.addEventListener('click', saveSettings);
checkBtn.addEventListener('click', () => checkConnection(serverUrlInput.value.trim()));

// Allow Enter key to save
serverUrlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveSettings();
  }
});

// Initialize
loadSettings();
