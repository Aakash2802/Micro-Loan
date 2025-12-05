// client/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user is authenticated
  const isAuthenticated = !!token && !!user;

  // Check user role
  const isAdmin = user?.role === 'admin';
  const isOfficer = user?.role === 'officer';
  const isCustomer = user?.role === 'customer';
  const isStaff = isAdmin || isOfficer;

  // Load user from token on mount
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setUser(response.data.data.user);
        setCustomerId(response.data.data.customer?._id);
      } catch (error) {
        console.error('Failed to load user:', error);
        // Token invalid, clear it
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  // Login
  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const data = response.data.data;

      // Check if 2FA is required
      if (data.requires2FA) {
        return {
          success: true,
          requires2FA: true,
          tempToken: data.tempToken,
          method: data.method,
          maskedEmail: data.maskedEmail,
        };
      }

      // Normal login (no 2FA)
      const { user: userData, customerId: custId, token: newToken } = data;

      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      setCustomerId(custId);

      toast.success(`Welcome back, ${userData.name}!`);

      // Redirect based on role
      if (userData.role === 'customer') {
        navigate('/dashboard/customer');
      } else {
        navigate('/dashboard');
      }

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  }, [navigate]);

  // Complete 2FA login
  const verify2FA = useCallback(async (tempToken, otp) => {
    try {
      const response = await api.post('/auth/verify-otp', { tempToken, otp });
      const { user: userData, customerId: custId, token: newToken } = response.data.data;

      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      setCustomerId(custId);

      toast.success(`Welcome back, ${userData.name}!`);

      // Redirect based on role
      if (userData.role === 'customer') {
        navigate('/dashboard/customer');
      } else {
        navigate('/dashboard');
      }

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid OTP';
      return { success: false, message };
    }
  }, [navigate]);

  // Register
  const register = useCallback(async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { user: newUser, customerId: custId, token: newToken } = response.data.data;

      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
      setCustomerId(custId);

      toast.success('Registration successful!');
      navigate('/dashboard/customer');

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, message };
    }
  }, [navigate]);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setCustomerId(null);
    toast.success('Logged out successfully');
    navigate('/login');
  }, [navigate]);

  // Update password
  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/auth/password', {
        currentPassword,
        newPassword,
      });

      // Update token
      const newToken = response.data.data.token;
      localStorage.setItem('token', newToken);
      setToken(newToken);

      toast.success('Password updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update password';
      toast.error(message);
      return { success: false, message };
    }
  }, []);

  // Update profile
  const updateProfile = useCallback(async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      setUser(response.data.data.user);
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
      return { success: false, message };
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!token) return;

    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data.user);
      setCustomerId(response.data.data.customer?._id);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, [token]);

  const value = {
    user,
    customerId,
    token,
    loading,
    isAuthenticated,
    isAdmin,
    isOfficer,
    isCustomer,
    isStaff,
    login,
    verify2FA,
    register,
    logout,
    updatePassword,
    updateProfile,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
