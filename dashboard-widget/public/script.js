// Elements
const bookmarksEl = document.getElementById('bookmarks');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const settingsToggle = document.getElementById('settings-toggle');
const settingsPanel = document.getElementById('settings-panel');
const columnsInput = document.getElementById('columns');
const rowsInput = document.getElementById('rows');
const mergeToRootCheckbox = document.getElementById('merge-to-root');
const ignoredListEl = document.getElementById('ignored-list');
const newIgnoredInput = document.getElementById('new-ignored');
const addIgnoredBtn = document.getElementById('add-ignored');
const closeSettingsBtn = document.getElementById('close-settings');

// Edit panel elements
const editPanel = document.getElementById('edit-panel');
const editUrlInput = document.getElementById('edit-url');
const editTitleInput = document.getElementById('edit-title');
const editCancelBtn = document.getElementById('edit-cancel');
const editDeleteBtn = document.getElementById('edit-delete');
const editSaveBtn = document.getElementById('edit-save');

let currentEditDomain = null;

// Default settings
const defaultSettings = {
  columns: 5,
  rows: 1,
  mergeToRoot: false,
  ignoredDomains: []
};

// Load settings from localStorage
function loadSettings() {
  const saved = localStorage.getItem('smartBookmarksSettings');
  if (saved) {
    return { ...defaultSettings, ...JSON.parse(saved) };
  }
  return { ...defaultSettings };
}

function saveSettings(settings) {
  localStorage.setItem('smartBookmarksSettings', JSON.stringify(settings));
  syncSettingsToServer(settings);
}

// Sync settings to server
async function syncSettingsToServer(settings) {
  try {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mergeToRoot: settings.mergeToRoot,
        ignoredDomains: settings.ignoredDomains
      })
    });
  } catch (err) {
    console.error('Failed to sync settings:', err);
  }
}

// Load settings from server
async function loadServerSettings() {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const serverSettings = await res.json();
      return serverSettings;
    }
  } catch (err) {
    console.error('Failed to load server settings:', err);
  }
  return null;
}

let settings = loadSettings();

// Apply settings to UI
function applySettings() {
  columnsInput.value = settings.columns;
  rowsInput.value = settings.rows;
  mergeToRootCheckbox.checked = settings.mergeToRoot;

  // Update CSS variables
  document.documentElement.style.setProperty('--columns', settings.columns);
  document.documentElement.style.setProperty('--rows', settings.rows);

  // Render ignored domains
  renderIgnoredDomains();
}

function renderIgnoredDomains() {
  ignoredListEl.innerHTML = settings.ignoredDomains.map(domain => `
    <div class="ignored-item">
      <span>${escapeHtml(domain)}</span>
      <button data-domain="${escapeHtml(domain)}" title="Remove">×</button>
    </div>
  `).join('');

  // Add click handlers
  ignoredListEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const domain = btn.dataset.domain;
      settings.ignoredDomains = settings.ignoredDomains.filter(d => d !== domain);
      saveSettings(settings);
      renderIgnoredDomains();
    });
  });
}

// Settings toggle
settingsToggle.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
  settingsPanel.classList.add('hidden');
});

// Settings change handlers
columnsInput.addEventListener('change', () => {
  settings.columns = parseInt(columnsInput.value) || 5;
  document.documentElement.style.setProperty('--columns', settings.columns);
  saveSettings(settings);
  fetchBookmarks();
});

rowsInput.addEventListener('change', () => {
  settings.rows = parseInt(rowsInput.value) || 1;
  document.documentElement.style.setProperty('--rows', settings.rows);
  saveSettings(settings);
  fetchBookmarks();
});

mergeToRootCheckbox.addEventListener('change', () => {
  settings.mergeToRoot = mergeToRootCheckbox.checked;
  saveSettings(settings);
  fetchBookmarks();
});

addIgnoredBtn.addEventListener('click', () => {
  let domain = newIgnoredInput.value.trim().toLowerCase();
  // Normalize: extract hostname from URLs, strip www.
  if (domain.includes('://')) {
    try { domain = new URL(domain).hostname; } catch { /* keep as-is */ }
  }
  domain = domain.replace(/^www\./, '').split('/')[0];
  if (domain && !settings.ignoredDomains.includes(domain)) {
    settings.ignoredDomains.push(domain);
    saveSettings(settings);
    renderIgnoredDomains();
    newIgnoredInput.value = '';
  }
});

newIgnoredInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addIgnoredBtn.click();
  }
});

// Favicon URL
function getFaviconUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

// Get short display name from domain
function getShortName(domain) {
  let name = domain.replace(/^www\./, '');
  const parts = name.split('.');
  if (parts.length >= 2) {
    let mainPart = parts[0];
    if (parts.length > 2 && parts[0].length <= 3) {
      mainPart = parts[1];
    }
    return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
  }
  return name;
}

// Render bookmarks
function renderBookmarks(bookmarks) {
  const maxItems = settings.columns * settings.rows;
  const items = bookmarks.slice(0, maxItems);

  bookmarksEl.innerHTML = items.map(b => {
    const displayTitle = getShortName(b.domain);
    return `
    <a href="${escapeHtml(b.url)}" target="_blank" rel="noopener" class="bookmark" title="${escapeHtml(b.title || b.domain)}">
      <button class="bookmark-edit" data-domain="${escapeHtml(b.domain)}" data-url="${escapeHtml(b.url)}" data-title="${escapeHtml(b.title || '')}" onclick="event.preventDefault(); event.stopPropagation(); openEditModal(this);">✎</button>
      <div class="bookmark-icon">
        <img src="${getFaviconUrl(b.domain)}" alt="" loading="lazy">
      </div>
      <div class="bookmark-info">
        <div class="bookmark-title">${escapeHtml(displayTitle)}</div>
      </div>
    </a>
  `}).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Edit panel functions
window.openEditModal = function(btn) {
  currentEditDomain = btn.dataset.domain;
  editUrlInput.value = btn.dataset.url;
  editTitleInput.value = btn.dataset.title;
  editPanel.classList.remove('hidden');
};

editCancelBtn.addEventListener('click', () => {
  editPanel.classList.add('hidden');
  currentEditDomain = null;
});

editSaveBtn.addEventListener('click', async () => {
  if (!currentEditDomain) return;

  try {
    const res = await fetch(`/api/bookmarks/${encodeURIComponent(currentEditDomain)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: editUrlInput.value,
        title: editTitleInput.value
      })
    });

    if (res.ok) {
      editPanel.classList.add('hidden');
      currentEditDomain = null;
      fetchBookmarks();
    }
  } catch (err) {
    console.error('Failed to update bookmark:', err);
  }
});

editDeleteBtn.addEventListener('click', async () => {
  if (!currentEditDomain) return;

  if (!confirm('Delete this bookmark?')) return;

  try {
    const res = await fetch(`/api/bookmarks/${encodeURIComponent(currentEditDomain)}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      editPanel.classList.add('hidden');
      currentEditDomain = null;
      fetchBookmarks();
    }
  } catch (err) {
    console.error('Failed to delete bookmark:', err);
  }
});

// Fetch bookmarks
async function fetchBookmarks() {
  loadingEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
  bookmarksEl.innerHTML = '';

  try {
    const limit = settings.columns * settings.rows;
    const res = await fetch(`/api/bookmarks?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch');

    const data = await res.json();
    loadingEl.classList.add('hidden');

    if (data.top && data.top.length > 0) {
      renderBookmarks(data.top);
    } else {
      bookmarksEl.innerHTML = '<div class="loading">No bookmarks yet</div>';
    }
  } catch (err) {
    loadingEl.classList.add('hidden');
    errorEl.textContent = 'Failed to load bookmarks';
    errorEl.classList.remove('hidden');
  }
}

// Initialize
async function init() {
  // Load server settings and merge
  const serverSettings = await loadServerSettings();
  if (serverSettings) {
    settings.mergeToRoot = serverSettings.mergeToRoot ?? settings.mergeToRoot;
    settings.ignoredDomains = serverSettings.ignoredDomains ?? settings.ignoredDomains;
    localStorage.setItem('smartBookmarksSettings', JSON.stringify(settings));
  }

  applySettings();
  fetchBookmarks();

  // Refresh every 60 seconds
  setInterval(fetchBookmarks, 60000);
}

init();
