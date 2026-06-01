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
          
          // Save in localStorage for robust route guards
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('role', user.role);
          console.log("🟢 [authStore] Login success. Saved token, user, role to localStorage. Token:", token);
          
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

      // ======= GOOGLE LOGIN =======
      googleLogin: async (idToken) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/google-login', { idToken });
          const { token, refreshToken, user } = res.data.data;
          
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Save in localStorage for robust route guards
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('role', user.role);
          console.log("🟢 [authStore] Google login success. Saved token, user, role to localStorage. Token:", token);
          
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
                              'Google login failed. Please try again.';
          
          set({
            isLoading: false,
            error: errorMessage,
          });
          
          throw {
            ...err,
            message: errorMessage,
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

          // Save in localStorage for robust route guards
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('role', user.role);
          console.log("🟢 [authStore] Registration success. Saved token, user, role to localStorage. Token:", token);

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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        
        // Clean Google Sign-In session state
        try {
          if (window.google?.accounts?.id) {
            window.google.accounts.id.disableAutoSelect();
            console.log("🔵 [authStore] Google Sign-In session cleared successfully.");
          }
        } catch (gsiErr) {
          console.warn("⚠️ Failed to disable GSI auto-select on logout:", gsiErr.message);
        }

        console.log("🔴 [authStore] Logged out. Cleared token, user, role from localStorage");
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
          localStorage.setItem('token', newToken); // Update localStorage token
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
        const token = localStorage.getItem('token') || get().token;
        const userJson = localStorage.getItem('user');
        const user = userJson ? JSON.parse(userJson) : get().user;
        const isAuthenticated = !!token;
        
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          console.log('🔐 [authStore] Auth initialized with existing token from localStorage/Zustand');
          set({ token, user, isAuthenticated });
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
