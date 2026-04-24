import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../api/auth';
import { WS_BASE } from '../api/config';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const wsRef                 = useRef(null);
  const reconnectRef          = useRef(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall]     = useState(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const reconnectTimeoutRef             = useRef(null);
  // ── Hydrate from storage ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const data = await authAPI.getMe();
          if (data?.user) {
            const u = { ...data.user, username: data.user.username?.toLowerCase() };
            setUser(u);
          }
        }
      } catch {
        await AsyncStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── WebSocket Lifecycle ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.username) return;

    let isIntentionallyClosed = false;

    const connect = () => {
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;
      
      const wsUri = `${WS_BASE}/ws/${encodeURIComponent(user.username)}`;
      const socket = new WebSocket(wsUri);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsWsConnected(true);
        socket.send(JSON.stringify({ type: 'join_room', room: 'general-chat' }));
      };

      const handleMessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          
          if (msg.type === 'call_request') {
             // Handle incoming call request
             setIncomingCall({ 
                from: msg.from, 
                call_id: msg.call_id, 
                type: msg.call_type || 'video' 
             });
          } else if (msg.type === 'call_response') {
             // Handled in ChatRoomScreen
          } else if (msg.type === 'call_hangup' || msg.type === 'call_handled') {
             setIncomingCall(null);
             setActiveCall(null);
          } else if (msg.type === 'webrtc_signal' && msg.signal?.type === 'offer') {
             console.log("Global Offer Received:", msg.from);
          }
        } catch (err) {
          console.warn("WS Message Error:", err);
        }
      };

      socket.addEventListener('message', handleMessage);

      socket.onclose = () => {
        if (isIntentionallyClosed) return;
        setIsWsConnected(false);
        socket.removeEventListener('message', handleMessage);
        wsRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.warn("WS Error:", err);
      };
    };

    connect();
    return () => {
      isIntentionallyClosed = true;
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [user?.username]);

  // ── Auth actions ────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    await AsyncStorage.setItem('token', data.token);
    const u = { ...data.user, username: data.user.username?.toLowerCase() };
    setUser(u);
    return data;
  };

  const signup = async (username, email, password) => {
    const data = await authAPI.register(username, email, password);
    await AsyncStorage.setItem('token', data.token);
    const u = { ...data.user, username: data.user.username?.toLowerCase() };
    setUser(u);
    return data;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setUser(null);
    if (wsRef.current) wsRef.current.close();
  };

  const updateProfile = async (formData) => {
    const data = await authAPI.updateProfile(formData);
    if (data.success) {
      const u = { ...data.user, username: data.user.username?.toLowerCase() };
      setUser(u);
    }
    return data;
  };

  return (
    <AuthContext.Provider value={{ 
      user, setUser, login, signup, logout, updateProfile, 
      loading, wsRef, isWsConnected, incomingCall, setIncomingCall, activeCall, setActiveCall 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
