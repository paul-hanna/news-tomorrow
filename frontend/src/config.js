// frontend/src/config.js
// API configuration - uses environment variable for production, localhost for development

const API_URL = import.meta.env.VITE_API_URL || '';

// For development, use relative paths (Vite proxy handles it)
// For production, use the full backend URL
export const apiBaseURL = API_URL || '';

// Helper function to create full API URL
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (apiBaseURL) {
    // Production: use full URL
    return `${apiBaseURL}/${cleanEndpoint}`;
  } else {
    // Development: use relative path (Vite proxy)
    return `/${cleanEndpoint}`;
  }
};

