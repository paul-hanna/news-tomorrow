// frontend/src/config.js
// API configuration - uses environment variable for production, localhost for development

const API_URL = import.meta.env.VITE_API_URL || '';

// Remove trailing slash from API URL if present
const cleanApiUrl = API_URL.replace(/\/+$/, '');

// For development, use relative paths (Vite proxy handles it)
// For production, use the full backend URL
export const apiBaseURL = cleanApiUrl || '';

// Always log config in production for debugging
console.log('🔧 API Config:', {
  VITE_API_URL: API_URL || '(not set - this will cause 404 errors!)',
  apiBaseURL: apiBaseURL || '(using relative paths - will fail on GitHub Pages)',
  mode: import.meta.env.MODE,
  isDev: import.meta.env.DEV,
  currentUrl: window.location.href
});

if (!API_URL && !import.meta.env.DEV) {
  console.error('❌ VITE_API_URL is not set! API calls will fail.');
  console.error('   Fix: Set VITE_API_URL secret in GitHub repository settings and rebuild.');
  console.error('   Go to: Settings → Secrets and variables → Actions → New repository secret');
}

// Helper function to create full API URL
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (apiBaseURL) {
    // Production: use full URL
    const fullUrl = `${apiBaseURL}/${cleanEndpoint}`;
    console.log(`🌐 API Call: ${fullUrl}`);
    return fullUrl;
  } else {
    // Development: use relative path (Vite proxy)
    // In production without API_URL, this will fail
    const relativeUrl = `/${cleanEndpoint}`;
    if (!import.meta.env.DEV) {
      console.error(`❌ API URL not configured! Trying relative path: ${relativeUrl}`);
      console.error('   This will result in 404 errors on GitHub Pages.');
      console.error('   Set VITE_API_URL secret and rebuild the site.');
    }
    return relativeUrl;
  }
};

