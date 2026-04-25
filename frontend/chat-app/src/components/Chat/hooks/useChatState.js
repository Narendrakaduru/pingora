import { useState, useEffect, useCallback } from 'react';
import { 
  getRooms, getGroups, getRoomSettings,
  getAllFriendships, getAllUsers 
} from '../../../services/api';

const USER_API = '/api/auth';

export const useChatState = (user) => {
  // Navigation
  // Navigation
  const [activeView, setActiveView] = useState(() => localStorage.getItem(`pingora_active_view_${user?.username}`) || 'chat');
  const [selectedChat, setSelectedChat] = useState(() => {
    const saved = localStorage.getItem(`pingora_selected_chat_${user?.username}`);
    if (!saved) return 'general-chat';
    try {
      return JSON.parse(saved);
    } catch (e) {
      return saved;
    }
  });
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Persist navigation
  useEffect(() => {
    if (user?.username) {
      localStorage.setItem(`pingora_active_view_${user.username}`, activeView);
      const toStore = typeof selectedChat === 'object' ? JSON.stringify(selectedChat) : selectedChat;
      localStorage.setItem(`pingora_selected_chat_${user.username}`, toStore);
    }
  }, [activeView, selectedChat, user?.username]);


  // Data
  const [messages, setMessages] = useState([]);
  const [dmPartners, setDmPartners] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [typingUsers, setTypingUsers] = useState({}); // { roomId: Set([usernames]) }
  const [allUsers, setAllUsers] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [friendshipsLoaded, setFriendshipsLoaded] = useState(false);
  const [roomSettings, setRoomSettings] = useState({ disappearing_time: 'off' });

  const fetchAllFriendships = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getAllFriendships();
      if (data.success) {
        setFriendships(data.friendships || []);
      }
    } catch (err) {
      console.error("Error fetching friendships:", err);
    } finally {
      setFriendshipsLoaded(true);
    }
  }, [user]);

  const fetchAllUsers = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getAllUsers();
      setAllUsers(data.success ? data.users : (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, [user]);

  const refreshPartners = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getRooms(user.username);
      setDmPartners(data);
      const seeded = {};
      data.forEach(p => {
        if (p.last_seen) seeded[p.username.toLowerCase()] = p.last_seen;
      });
      setLastSeenMap(prev => ({ ...seeded, ...prev }));
    } catch (err) {
      console.error("Error refreshing partners:", err);
    }
    try {
      const groups = await getGroups(user.username);
      if (Array.isArray(groups)) setUserGroups(groups);
    } catch (err) {
      console.error("Error refreshing groups:", err);
    }
  }, [user]);

  const fetchRoomSettings = useCallback(async (roomId) => {
    if (!user?.username) return;
    try {
      const data = await getRoomSettings(user.username, roomId);
      if (data) {
        // Handle both flat and nested settings structures
        const settings = data.settings || data;
        setRoomSettings(settings);
      }
    } catch (err) {
      console.error("Error fetching room settings:", err);
    }
  }, [user?.username]);

  useEffect(() => {
    if (user) {
      refreshPartners();
      fetchAllUsers();
      fetchAllFriendships();
    }
  }, [user, refreshPartners, fetchAllUsers, fetchAllFriendships]);

  // Keep allUsers in sync with current user updates
  useEffect(() => {
    if (user && user.username) {
      setAllUsers(prev => prev.map(u => 
        u.username.toLowerCase() === user.username.toLowerCase() ? user : u
      ));
    }
  }, [user]);

  const getUser = useCallback((username) => {
    if (!username) return null;
    const lowerUsername = username.toLowerCase();
    if (user && user.username && user.username.toLowerCase() === lowerUsername) return user;
    return allUsers.find(u => u.username.toLowerCase() === lowerUsername) || { username };
  }, [user, allUsers]);

  return {
    // Navigation
    activeView, setActiveView,
    selectedChat, setSelectedChat,
    showMobileChat, setShowMobileChat,
    // Data
    messages, setMessages,
    dmPartners, setDmPartners,
    userGroups, setUserGroups,
    onlineUsers, setOnlineUsers,
    lastSeenMap, setLastSeenMap,
    typingUsers, setTypingUsers,
    allUsers, setAllUsers,
    friendships, setFriendships,
    friendshipsLoaded,
    roomSettings, setRoomSettings,
    // Actions
    refreshPartners,
    fetchAllUsers,
    fetchAllFriendships,
    fetchRoomSettings,
    getUser
  };
};
