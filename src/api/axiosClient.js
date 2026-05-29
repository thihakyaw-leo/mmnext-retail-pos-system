import axios from 'axios';

// Get API URL from Vite env or fallback to local Cloudflare Worker
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8787/api';

const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach JWT Token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401s and format errors
axiosClient.interceptors.response.use(
  (response) => {
    // Return the response data directly for ease of use
    return response.data;
  },
  (error) => {
    // Check if unauthorized (token expired or invalid)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Dispatch a custom event to alert the app to redirect to login
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    
    // Format error message to be readable
    const message = 
      error.response?.data?.message || 
      error.response?.data?.error || 
      error.message || 
      'An unexpected error occurred';
      
    return Promise.reject(new Error(message));
  }
);

export default axiosClient;
