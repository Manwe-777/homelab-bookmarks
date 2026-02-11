const collectorUrlInput = document.getElementById('collectorUrl');
const saveButton = document.getElementById('save');
const statusDiv = document.getElementById('status');

// Load saved settings
chrome.storage.local.get(['collectorUrl'], (result) => {
  collectorUrlInput.value = result.collectorUrl || 'http://server.local:3100';
});

// Save settings
saveButton.addEventListener('click', () => {
  const collectorUrl = collectorUrlInput.value.trim();

  chrome.storage.local.set({ collectorUrl }, () => {
    statusDiv.textContent = 'Settings saved!';
    setTimeout(() => {
      statusDiv.textContent = '';
    }, 2000);
  });
});
