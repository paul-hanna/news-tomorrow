// frontend/src/config.js
// API configuration - uses environment variable for production, localhost for development

const API_URL = import.meta.env.VITE_API_URL || '';

// For development, use relative paths (Vite proxy handles it)
// For production, use the full backend URL
export const apiBaseURL = API_URL || '';

// Debug logging (only in development or if API_URL is missing)
if (import.meta.env.DEV || !API_URL) {
  console.log('🔧 API Config:', {
    VITE_API_URL: API_URL || '(not set)',
    apiBaseURL: apiBaseURL || '(using relative paths)',
    mode: import.meta.env.MODE,
    isDev: import.meta.env.DEV
  });
  
  if (!API_URL && !import.meta.env.DEV) {
    console.warn('⚠️ VITE_API_URL is not set! API calls will fail on GitHub Pages.');
    console.warn('   Make sure VITE_API_URL secret is set in GitHub repository settings.');
  }
}

// Helper function to create full API URL
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (apiBaseURL) {
    // Production: use full URL
    const fullUrl = `${apiBaseURL}/${cleanEndpoint}`;
    if (import.meta.env.DEV) {
      console.log(`🌐 API Call: ${fullUrl}`);
    }
    return fullUrl;
  } else {
    // Development: use relative path (Vite proxy)
    // In production without API_URL, this will fail - but log a warning
    if (!import.meta.env.DEV) {
      console.error(`❌ API URL not configured! Cannot call ${cleanEndpoint}`);
      console.error('   Set VITE_API_URL secret in GitHub repository settings and rebuild.');
    }
    return `/${cleanEndpoint}`;
  }
};

