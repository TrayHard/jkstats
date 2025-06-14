export type CacheKey = string;

export function setCache<T>(key: CacheKey, data: T, ttlMs: number) {
  localStorage.setItem(key, JSON.stringify({
    data,
    ts: Date.now(),
    ttl: ttlMs,
  }));
}

export function getCache<T>(key: CacheKey): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.ts !== 'number' || typeof parsed.ttl !== 'number') return null;
    if (Date.now() - parsed.ts < parsed.ttl) {
      return parsed.data as T;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export function clearCache(key: CacheKey) {
  localStorage.removeItem(key);
} 