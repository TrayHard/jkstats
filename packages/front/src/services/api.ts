let baseURL: string;
switch (true) {
  case window.location.host.includes('localhost'):
    baseURL = import.meta.env.VITE_APP_API_URL_LOCAL;
    break;
  case window.location.host === 'stats.rujka.ru':
    baseURL = import.meta.env.VITE_APP_API_URL_RUJKA;
    break;
  case window.location.host === 'stats.jkhub.org':
    baseURL = import.meta.env.VITE_APP_API_URL_JKHUB;
    break;
  default:
    throw new Error('Unknown host for API');
}

export async function fetchOnlineData(interval: string) {
  const response = await fetch(`${baseURL}/online?interval=${interval}`);
  return await response.json();
}

export async function fetchServerlistRequestsData(interval: string) {
  const response = await fetch(`${baseURL}/svlist?interval=${interval}`);
  return await response.json();
}
