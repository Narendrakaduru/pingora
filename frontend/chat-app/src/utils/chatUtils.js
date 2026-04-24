/**
 * Generates a unique room ID based on chat type.
 * @param {string|object} chat - The selected chat (username or group object)
 * @param {string} currentUsername - The logged-in user's username
 */
export const getRoomId = (chat, currentUsername) => {
  if (!chat) return null;
  if (chat === 'general-chat') return 'general-chat';
  if (typeof chat === 'object' && chat._id) return chat._id; // Group ID
  
  const otherUser = typeof chat === 'string' ? chat : chat.username;
  if (!otherUser) return null;
  if (!currentUsername) return 'general-chat';
  
  const members = [currentUsername.toLowerCase(), otherUser.toLowerCase()].sort();
  return `dm:${members[0]}:${members[1]}`;
};

export const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

export const API_BASE = '/api/chat';
export const USER_API = '/api/auth';
export const STATUS_API = '/api/status';
