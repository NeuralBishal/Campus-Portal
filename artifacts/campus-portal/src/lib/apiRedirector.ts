// This permanently fixes API routing on Vercel
const BACKEND_URL = 'https://campus-portal-rjze.onrender.com';
const originalFetch = window.fetch;

window.fetch = function(url, options) {
  let finalUrl = url;
  if (typeof url === 'string' && url.startsWith('/api/')) {
    finalUrl = BACKEND_URL + url;
  }
  return originalFetch(finalUrl, options);
};
