import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ======= LOGIN =======
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/login', { email, password });
          const { token, refreshToken, user } = res.data.data;
          
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          return { success: true, user };
        } catch (err) {
          const errorMessage = err.response?.data?.message || 
                              err.message || 
                              'Login failed. Please try again.';
          
          set({
            isLoading: false,
            error: errorMessage,
          });
          
          throw {
            ...err,
            message: errorMessage,
            validationErrors: err.response?.data?.errors || [],
          };
        }
      },

      // ======= REGISTER =======
      register: async (formData) => {
        set({ isLoading: true, error: null });
        try {
          console.log('📝 Sending registration data:', {
            ...formData,
            password: '[REDACTED]',
          });

          const res = await api.post('/auth/register', formData);
          const { token, refreshToken, user } = res.data.data;

          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          console.log('✅ Registration successful');
          return { success: true, user };
        } catch (err) {
          console.error('❌ Registration error:', err.response?.data || err.message);

          // Build comprehensive error response
          const errorResponse = {
            ...err,
            validationErrors: [],
            fieldErrors: {},
            message: 'Registration failed',
          };

          // Parse validation errors from response
          if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
            errorResponse.validationErrors = err.response.data.errors;
            
            // Map errors by field for easier access
            err.response.data.errors.forEach((error) => {
              const field = error.field || 'general';
              errorResponse.fieldErrors[field] = error.message;
            });

            errorResponse.message =
              err.response.data.message || 'Please check the errors below and try again.';
          } else if (err.response?.data?.message) {
            errorResponse.message = err.response.data.message;
          } else if (err.message) {
            errorResponse.message = err.message;
          }

          set({
            isLoading: false,
            error: errorResponse.message,
          });

          throw errorResponse;
        }
      },

      // ======= LOGOUT =======
      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // ======= UPDATE USER =======
      updateUser: (updates) => {
        set((state) => ({
          user: { ...state.user, ...updates },
        }));
      },

      // ======= REFRESH ACCESS TOKEN =======
      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          console.warn('⚠️ No refresh token available');
          return false;
        }

        try {
          console.log('🔄 Attempting to refresh access token');
          const res = await api.post('/auth/refresh', { refreshToken });
          const newToken = res.data.data.token;

          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          set({ token: newToken, error: null });

          console.log('✅ Access token refreshed');
          return true;
        } catch (err) {
          console.error('❌ Token refresh failed:', err.message);
          
          // Clear auth on refresh failure
          get().logout();
          
          set({
            error: 'Session expired. Please login again.',
          });
          
          return false;
        }
      },

      // ======= INITIALIZE AUTH =======
      initializeAuth: () => {
        const { token } = get();
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          console.log('🔐 Auth initialized with existing token');
        }
      },

      // ======= CLEAR ERROR =======
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'grievance-auth', // LocalStorage key
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
