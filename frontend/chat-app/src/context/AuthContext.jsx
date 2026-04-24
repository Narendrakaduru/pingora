import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        const u = res.data.user;
        if (u && u.username) u.username = u.username.toLowerCase();
        setUser(u);
      })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(`/api/auth/login`, { email, password });
    localStorage.setItem('token', res.data.token);
    const u = res.data.user;
    if (u && u.username) u.username = u.username.toLowerCase();
    setUser(u);
    return res.data;
  };

  const signup = async (username, email, password) => {
    const res = await axios.post(`/api/auth/register`, { username, email, password });
    localStorage.setItem('token', res.data.token);
    const u = res.data.user;
    if (u && u.username) u.username = u.username.toLowerCase();
    setUser(u);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateProfile = async (formData) => {
    const token = localStorage.getItem('token');
    const res = await axios.put(`/api/auth/profile`, formData, {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.data.success) {
      const u = res.data.user;
      if (u && u.username) u.username = u.username.toLowerCase();
      setUser(u);
    }
    return res.data;
  };

  const toggleProStatus = async () => {
    const token = localStorage.getItem('token');
    const res = await axios.post(`/api/auth/toggle-pro`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.data.success) {
      setUser(prev => ({ ...prev, accountType: res.data.accountType }));
    }
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateProfile, toggleProStatus, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
