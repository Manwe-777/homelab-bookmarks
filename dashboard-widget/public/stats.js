const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let selectedDomain = null;
let allSites = [];

async function loadStats(domain = null) {
  try {
    // Update URL query parameter
    const url = new URL(window.location);
    if (domain) {
      url.searchParams.set('domain', domain);
    } else {
      url.searchParams.delete('domain');
    }
    window.history.pushState({}, '', url);
    
    // Fetch data
    const apiUrl = domain ? `/api/stats?domain=${encodeURIComponent(domain)}` : '/api/stats';
    const res = await fetch(apiUrl);
    const data = await res.json();
    
    selectedDomain = domain;
    allSites = data.topSites;
    
    renderDayChart(data.byDayOfWeek);
    renderHourChart(data.byHour, domain);
    renderTopSites(data.topSites, domain);
    renderSiteHeader(data.siteInfo);
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

function renderDayChart(data) {
  const container = document.getElementById('dayChart');
  const counts = new Array(7).fill(0);
  for (const row of data) counts[row.day] = row.count;
  const max = Math.max(...counts, 1);
  const today = new Date().getDay();

  container.innerHTML = counts.map((count, i) => `
    <div class="day-row${i === today ? ' is-today' : ''}">
      <span class="day-label">${DAY_NAMES[i]}</span>
      <div class="day-track">
        <div class="day-fill" style="width: ${(count / max) * 100}%"></div>
      </div>
      <span class="day-value">${count}</span>
    </div>
  `).join('');
}

function renderHourChart(data, domain = null) {
  const container = document.getElementById('hourChart');
  const counts = new Array(24).fill(0);
  for (const row of data) counts[row.hour] = row.count;
  const max = Math.max(...counts, 1);

  // SVG gridlines (same pattern as Glance dns-stats)
  const gridlines = `
    <div class="hour-gridlines-container">
      <svg class="hour-gridlines" shape-rendering="crispEdges" viewBox="0 0 1 100" preserveAspectRatio="none">
        <g stroke="var(--color-graph-gridlines)" stroke-width="1">
          <line x1="0" y1="1" x2="1" y2="1" vector-effect="non-scaling-stroke"/>
          <line x1="0" y1="25" x2="1" y2="25" vector-effect="non-scaling-stroke"/>
          <line x1="0" y1="50" x2="1" y2="50" vector-effect="non-scaling-stroke"/>
          <line x1="0" y1="75" x2="1" y2="75" vector-effect="non-scaling-stroke"/>
          <line x1="0" y1="99" x2="1" y2="99" vector-effect="non-scaling-stroke"/>
        </g>
      </svg>
    </div>
  `;

  const currentHour = new Date().getHours();

  const columns = counts.map((count, h) => {
    const pct = (count / max) * 100;
    const label = h.toString().padStart(2, '0');
    return `
      <div class="hour-column${h === currentHour ? ' is-now' : ''}">
        <span class="hour-count">${count}</span>
        <div class="hour-bar" style="--bar-height: ${pct}"></div>
        <div class="hour-time">${label}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = gridlines + `<div class="hour-columns">${columns}</div>`;
}

function renderTopSites(sites, selectedDomain = null) {
  const container = document.getElementById('topSites');
  if (!sites.length) {
    container.innerHTML = '<div class="loading">No data yet</div>';
    return;
  }

  const maxCount = sites[0].visit_count;

  container.innerHTML = `<div class="sites-list">${sites.map((site, i) => `
    <div class="site-row${site.domain === selectedDomain ? ' is-selected' : ''}" data-domain="${escapeHtml(site.domain)}">
      <span class="site-rank">${i + 1}</span>
      <img class="site-favicon" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(site.domain)}&sz=32" alt="">
      <span class="site-domain">${escapeHtml(site.domain)}</span>
      <div class="site-bar-cell">
        <div class="site-bar-track">
          <div class="site-bar-fill" style="width: ${(site.visit_count / maxCount) * 100}%"></div>
        </div>
      </div>
      <span class="site-count">${site.visit_count}</span>
    </div>
  `).join('')}</div>`;

  // Add click handlers
  container.querySelectorAll('.site-row').forEach(row => {
    row.addEventListener('click', () => {
      const domain = row.getAttribute('data-domain');
      loadStats(domain);
    });
  });
}

function renderSiteHeader(siteInfo) {
  const header = document.querySelector('.widget-header.hour-header');
  if (!header) return;
  
  if (!siteInfo) {
    header.innerHTML = 'Activity by Hour of Day';
    return;
  }
  
  header.innerHTML = `
    <div class="site-header-content">
      <img class="site-header-favicon" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(siteInfo.domain)}&sz=32" alt="">
      <span class="site-header-title">${escapeHtml(siteInfo.title || siteInfo.domain)}</span>
      <span class="site-header-domain">(${escapeHtml(siteInfo.domain)})</span>
      <button class="clear-selection-btn" onclick="loadStats()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        Clear
      </button>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Load stats on page load, checking for domain query parameter
function init() {
  const params = new URLSearchParams(window.location.search);
  const domain = params.get('domain');
  loadStats(domain);
}

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  const domain = params.get('domain');
  loadStats(domain);
});

init();
