const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    renderDayChart(data.byDayOfWeek);
    renderHourChart(data.byHour);
    renderTopSites(data.topSites);
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

function renderHourChart(data) {
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

function renderTopSites(sites) {
  const container = document.getElementById('topSites');
  if (!sites.length) {
    container.innerHTML = '<div class="loading">No data yet</div>';
    return;
  }

  const maxCount = sites[0].visit_count;

  container.innerHTML = `<div class="sites-list">${sites.map((site, i) => `
    <div class="site-row">
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
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadStats();
