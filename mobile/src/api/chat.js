import axios from 'axios';
import { CHAT_API } from './config';

// ─── Rooms / DMs ─────────────────────────────────────────────────────────────
export const getRooms = async (username) => {
  const res = await axios.get(`${CHAT_API}/rooms`, {
    params: { username: username.toLowerCase() },
  });
  return res.data.partners || [];
};

export const deleteRoom = async (username, roomId) => {
  const res = await axios.delete(`${CHAT_API}/rooms/${roomId}`, {
    params: { username: username.toLowerCase() },
  });
  return res.data;
};

// ─── Messages ─────────────────────────────────────────────────────────────────
export const getMessages = async (room = 'general-chat') => {
  const res = await axios.get(`${CHAT_API}/messages`, { params: { room } });
  return res.data;
};

export const clearRoomMessages = async (roomId) => {
  const res = await axios.delete(`${CHAT_API}/messages/room/${roomId}`);
  return res.data;
};

export const uploadFile = async (uri, name, type, room, username, userId, fileType) => {
  const formData = new FormData();
  formData.append('file', { uri, name, type });
  formData.append('room', room);
  formData.append('username', username.toLowerCase());
  formData.append('user_id', userId);
  formData.append('file_type', fileType);
  
  const response = await fetch(`${CHAT_API}/upload`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Upload failed with status: ' + response.status);
  }
  
  return await response.json();
};

export const createPoll = async (room, username, question, options) => {
  const formData = new FormData();
  formData.append('room', room);
  formData.append('username', username.toLowerCase());
  formData.append('question', question);
  formData.append('options', JSON.stringify(options));
  const res = await axios.post(`${CHAT_API}/poll`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// ─── Groups ───────────────────────────────────────────────────────────────────
export const getGroups = async (username) => {
  const res = await axios.get(`${CHAT_API}/groups/${encodeURIComponent(username.toLowerCase())}`);
  return res.data;
};

export const createGroup = async (groupData) => {
  const data = {
    ...groupData,
    members: groupData.members?.map((m) => m.toLowerCase()) || [],
    created_by: groupData.created_by?.toLowerCase(),
  };
  const res = await axios.post(`${CHAT_API}/groups`, data);
  return res.data;
};
export const updateGroup = async (groupId, groupData, requester) => {
  const data = {
    ...groupData,
    members: groupData.members?.map((m) => m.toLowerCase()) || [],
  };
  const res = await axios.put(`${CHAT_API}/groups/${groupId}`, data, {
    params: { requester: requester.toLowerCase() },
  });
  return res.data;
};

export const deleteGroup = async (groupId, requester) => {
  const res = await axios.delete(`${CHAT_API}/groups/${groupId}`, {
    params: { requester: requester.toLowerCase() },
  });
  return res.data;
};
// ─── Settings ─────────────────────────────────────────────────────────────────
export const togglePin = async (username, roomId, pin) => {
  const res = await axios.post(`${CHAT_API}/pin`, null, {
    params: { username: username.toLowerCase(), room_id: roomId, pin },
  });
  return res.data;
};

export const toggleMute = async (username, roomId, mute) => {
  const res = await axios.post(`${CHAT_API}/mute`, null, {
    params: { username: username.toLowerCase(), room_id: roomId, mute },
  });
  return res.data;
};

export const toggleArchive = async (username, roomId, archive) => {
  const res = await axios.post(`${CHAT_API}/archive`, null, {
    params: { username: username.toLowerCase(), room_id: roomId, archive },
  });
  return res.data;
};

export const markAsRead = async (username, roomId) => {
  const res = await axios.post(`${CHAT_API}/read`, null, {
    params: { username: username.toLowerCase(), room_id: roomId },
  });
  return res.data;
};

// ─── Schedules ────────────────────────────────────────────────────────────────
export const getSchedules = async () => {
  const res = await axios.get(`${CHAT_API}/schedules`);
  return res.data;
};

export const createSchedule = async (scheduleData) => {
  const res = await axios.post(`${CHAT_API}/schedules`, scheduleData);
  return res.data;
};

export const updateSchedule = async (scheduleId, scheduleData) => {
  const res = await axios.put(`${CHAT_API}/schedules/${scheduleId}`, scheduleData);
  return res.data;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const getRoomId = (selectedChat, currentUsername) => {
  if (!selectedChat || selectedChat === 'general-chat') return 'general-chat';
  if (typeof selectedChat === 'object' && selectedChat !== null) {
    return `group:${selectedChat._id}`;
  }
  const other = selectedChat.toLowerCase();
  return 'dm:' + [currentUsername.toLowerCase(), other].sort().join(':');
};
