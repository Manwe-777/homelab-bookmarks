const collectorUrlInput = document.getElementById('collectorUrl');
const backupCollectorUrlInput = document.getElementById('backupCollectorUrl');
const saveButton = document.getElementById('save');
const statusDiv = document.getElementById('status');

// Load saved settings
chrome.storage.local.get(['collectorUrl', 'backupCollectorUrl'], (result) => {
  collectorUrlInput.value = result.collectorUrl || 'http://server.local:3100';
  backupCollectorUrlInput.value = result.backupCollectorUrl || '';
});

// Save settings
saveButton.addEventListener('click', () => {
  const collectorUrl = collectorUrlInput.value.trim();
  const backupCollectorUrl = backupCollectorUrlInput.value.trim();

  chrome.storage.local.set({ collectorUrl, backupCollectorUrl }, () => {
    statusDiv.textContent = 'Settings saved!';
    setTimeout(() => {
      statusDiv.textContent = '';
    }, 2000);
  });
});
