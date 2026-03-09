# Smart Bookmarks

Local bookmark ranking system that learns from your browsing habits.

## Components

- **browser-extension/** - Chromium extension that tracks page visits
- **collector/** - Node.js API that stores and ranks bookmarks
- **dashboard-widget/** - Iframe widget for Glance dashboard

## Quick Start

### 1. Configure

Copy and edit the environment file:

```bash
cp .env.example .env
```

Edit `.env` to set your collector URL:

```env
COLLECTOR_URL=http://server.local:3100
COLLECTOR_PORT=3100
WIDGET_PORT=3101
```

### 2. Start the services

```bash
docker-compose up -d
```

This starts:
- Collector API on port `${COLLECTOR_PORT}` (default 3100)
- Dashboard widget on port `${WIDGET_PORT}` (default 3101)

### 3. Build and install the browser extension

```bash
npm run build:extension
```

Then:
1. Open `brave://extensions` (or `chrome://extensions`)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `browser-extension/dist/` folder

### 4. Add to Glance

Add an iframe widget to your Glance config:

```yaml
- type: iframe
  source: http://server.local:3101
  height: 400
```

#### Theme sync

The widget automatically inherits Glance's active theme (including custom presets) via `postMessage`. Add the following to your `glance.yml` to enable it:

```yaml
document:
  head: |
    <script>
      (function() {
        function broadcast() {
          var el = document.documentElement;
          var cs = getComputedStyle(el);
          var msg = {
            glanceTheme: {
              scheme: el.dataset.scheme || 'dark',
              themeKey: el.dataset.theme || 'default',
              bgh: cs.getPropertyValue('--bgh').trim(),
              bgs: cs.getPropertyValue('--bgs').trim(),
              bgl: cs.getPropertyValue('--bgl').trim(),
              cm: cs.getPropertyValue('--cm').trim(),
              tsm: cs.getPropertyValue('--tsm').trim(),
              primary: cs.getPropertyValue('--color-primary').trim(),
              positive: cs.getPropertyValue('--color-positive').trim(),
              negative: cs.getPropertyValue('--color-negative').trim()
            }
          };
          document.querySelectorAll('iframe').forEach(function(f) {
            try { f.contentWindow.postMessage(msg, '*'); } catch(e) {}
          });
        }
        new MutationObserver(broadcast).observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme', 'data-theme'] });
        window.addEventListener('load', function() { setTimeout(broadcast, 500); });
      })();
    </script>
```

This script reads Glance's CSS variables and broadcasts them to all iframes whenever the theme changes. The widget picks them up automatically — no manual theme configuration needed.

## API

### POST /api/track

Track a page visit.

```json
{
  "url": "https://example.com/page",
  "title": "Page Title",
  "timestamp": 1234567890
}
```

### GET /api/bookmarks

Get ranked bookmarks.

```json
{
  "top": [
    {
      "url": "https://example.com",
      "domain": "example.com",
      "title": "Example",
      "visits": 42,
      "last_seen": 1234567890,
      "score": 38.5
    }
  ]
}
```

## Development

```bash
# Install dependencies
npm install

# Run collector locally
npm run dev:collector

# Run widget locally
npm run dev:widget

# Rebuild extension after .env changes
npm run build:extension
```
