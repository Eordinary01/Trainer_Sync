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


// ✅ Request interceptor (unchanged)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);


// ✅ Response interceptor (UPDATED)
api.interceptors.response.use(
  (response) => {

    /*
      ⭐ Automatically normalize leave balance response
      Adjust this condition if your backend route changes
    */
    if (
      response?.data?.data &&
      response.config.url?.includes("leave-balance")
    ) {
      response.data.data = normalizeLeaveBalance(response.data.data);
    }

    return response;
  },

  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
