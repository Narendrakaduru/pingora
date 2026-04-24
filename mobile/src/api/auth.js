import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { USER_API } from './config';

const getHeaders = async () => {
  const token = await AsyncStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

export const authAPI = {
  register: async (username, email, password) => {
    const res = await axios.post(`${USER_API}/register`, { username, email, password });
    return res.data;
  },

  login: async (email, password) => {
    const res = await axios.post(`${USER_API}/login`, { email, password });
    return res.data;
  },

  getMe: async () => {
    const headers = await getHeaders();
    const res = await axios.get(`${USER_API}/me`, { headers });
    return res.data;
  },

  getUsers: async () => {
    const headers = await getHeaders();
    const res = await axios.get(`${USER_API}/users`, { headers });
    return res.data;
  },

  updateProfile: async (formData) => {
    const token = await AsyncStorage.getItem('token');
    const res = await axios.put(`${USER_API}/profile`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
};
