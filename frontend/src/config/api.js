import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ⭐ Infinity Normalizer Helpers
const normalizeInfinity = (value) => {
  if (value === "Infinity") return Infinity;
  if (value === null || value === undefined) return 0;
  return value;
};

const normalizeLeaveBalance = (data) => {
  if (!data) return data;

  const normalizeType = (type) => {
    if (!data[type]) return;
    data[type].available = normalizeInfinity(data[type].available);
    data[type].used = normalizeInfinity(data[type].used);
    data[type].total = normalizeInfinity(data[type].total);
  };

  normalizeType("sick");
  normalizeType("casual");
  normalizeType("paid");

  return data;
};

// ✅ Request interceptor
api.interceptors.request.use(
  (config) => {
    // ✅ ADD DEBUG LOG FOR REQUESTS
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data || config.params);
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// ✅ Response interceptor - FIXED VERSION WITH PROPER LOGGING
api.interceptors.response.use(
  (response) => {
    // ✅ LOG ALL SUCCESS RESPONSES
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      data: response.data
    });

    // ⭐ Automatically normalize leave balance response
    if (
      response?.data?.data &&
      response.config.url?.includes("leave-balance")
    ) {
      response.data.data = normalizeLeaveBalance(response.data.data);
    }

    return response;
  },
  (error) => {
    // ✅ LOG ALL ERROR RESPONSES - THIS IS WHAT YOU NEED!
    console.error("❌ API Error Response:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.response?.data?.message || error.message
    });

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Don't clear storage for login errors - only for expired tokens
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      
      if (!isLoginRequest) {
        console.log("🔐 Session expired, redirecting to login...");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;