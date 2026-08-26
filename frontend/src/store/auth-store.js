import { create } from 'zustand';
import { authApi } from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: true,

  // Initialize auth state
  initialize: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }

      const response = await authApi.getMe();
      set({ 
        user: response.data.data.user,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to authenticate:', error);
      set({ isAuthenticated: false, isLoading: false });
    }
  },

  // Register new user
  register: async (data) => {
    try {
      const response = await authApi.register(data);
      const { user, accessToken, refreshToken } = response.data.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      set({ 
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false 
      });
      
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Registration failed';
    }
  },

  // Login user
  login: async (data) => {
    try {
      const response = await authApi.login(data);
      const { user, accessToken, refreshToken } = response.data.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      set({ 
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false 
      });
      
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Login failed';
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ 
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false 
    });
  }
}));
