import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${baseURL}/auth/refresh-token`, {
          refresh_token: refreshToken
        });

        const { access_token } = response.data;
        localStorage.setItem('accessToken', access_token);

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    return Promise.reject(error);
  }
);

// API wrapper functions
export const apiClient = {
  get: <T>(url: string, config = {}) =>
    api.get<T>(url, config).then((response) => response.data),

  post: <T>(url: string, data = {}, config = {}) =>
    api.post<T>(url, data, config).then((response) => response.data),

  put: <T>(url: string, data = {}, config = {}) =>
    api.put<T>(url, data, config).then((response) => response.data),

  patch: <T>(url: string, data = {}, config = {}) =>
    api.patch<T>(url, data, config).then((response) => response.data),

  delete: <T>(url: string, config = {}) =>
    api.delete<T>(url, config).then((response) => response.data)
};

// Error handling utility
export const handleApiError = (error: any): string => {
  if (error.response) {
    // Server responded with error
    const { status, data } = error.response;
    if (data.message) {
      return data.message;
    }
    return `Error ${status}: ${data.detail || 'Something went wrong'}`;
  } else if (error.request) {
    // Request made but no response
    return 'No response from server. Please check your connection.';
  } else {
    // Error setting up request
    return error.message || 'An unexpected error occurred';
  }
}; 