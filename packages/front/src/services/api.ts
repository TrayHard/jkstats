let baseURL: string;
switch (true) {
  case window.location.host.includes('localhost'):
    baseURL = import.meta.env.VITE_APP_API_URL_LOCAL;
    break;
  case window.location.host === 'stats.rujka.ru' || window.location.host === 'stats.jkhub.org':
    baseURL = import.meta.env.VITE_APP_API_URL_RUJKA;
    break;
  default:
    throw new Error('Unknown host for API');
}

// The chart only renders the most recent points; ask the API for a bounded set
// so payloads stay small regardless of how much history exists.
const DEFAULT_LIMIT = 500;

export async function fetchOnlineData(interval: string, limit = DEFAULT_LIMIT) {
  const response = await fetch(`${baseURL}/online?interval=${interval}&limit=${limit}`);
  return await response.json();
}

export async function fetchServerlistRequestsData(interval: string, limit = DEFAULT_LIMIT) {
  const response = await fetch(`${baseURL}/svlist?interval=${interval}&limit=${limit}`);
  return await response.json();
}
