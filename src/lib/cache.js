const PREFIX = 'dashCache:v1:';

function urlKey(apiUrl) {
  return apiUrl ? apiUrl.split('/').slice(-2).join('-') : 'default';
}

function safeGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    if (e && e.name === 'QuotaExceededError') {
      clearAll();
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { /* give up */ }
    }
    return false;
  }
}

export function getCached(apiUrl, kind, name) {
  const key = `${PREFIX}${urlKey(apiUrl)}:${kind}${name ? ':' + name : ''}`;
  const wrap = safeGet(key);
  if (!wrap) return null;
  return wrap;
}

export function setCached(apiUrl, kind, name, data) {
  const key = `${PREFIX}${urlKey(apiUrl)}:${kind}${name ? ':' + name : ''}`;
  safeSet(key, { ts: Date.now(), data });
}

export function clearAll() {
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
