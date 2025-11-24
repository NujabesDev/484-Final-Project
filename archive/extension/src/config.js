// Centralized configuration for the extension

// Website URL - used for authentication and dashboard
export const WEBSITE_URL = 'https://484-final-project-three.vercel.app/';

// Allowed origins for postMessage communication
export const ALLOWED_ORIGINS = [
  'https://484-final-project-three.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

// Build authentication URL with extension ID
export function buildAuthUrl() {
  const extensionId = chrome.runtime.id;
  return `${WEBSITE_URL}?source=extension&extensionId=${extensionId}&reauth=true`;
}
