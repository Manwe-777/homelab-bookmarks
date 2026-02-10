export function getSettings(db) {
  const mergeToRoot = db.prepare(`SELECT value FROM settings WHERE key = ?`).get('mergeToRoot');
  const ignoredDomains = db.prepare(`SELECT value FROM settings WHERE key = ?`).get('ignoredDomains');

  return {
    mergeToRoot: mergeToRoot ? JSON.parse(mergeToRoot.value) : false,
    ignoredDomains: ignoredDomains ? JSON.parse(ignoredDomains.value) : []
  };
}

export function normalizeToHostname(input) {
  let s = input.trim().toLowerCase();
  if (s.includes('://')) {
    try { s = new URL(s).hostname; } catch { /* fall through */ }
  }
  s = s.replace(/^www\./, '');
  s = s.split('/')[0];
  return s;
}

export function isIgnored(domain, ignoredDomains) {
  const bare = normalizeToHostname(domain);
  return ignoredDomains.some(ignored => {
    const normalizedIgnored = normalizeToHostname(ignored);
    return bare === normalizedIgnored || bare.endsWith('.' + normalizedIgnored);
  });
}
