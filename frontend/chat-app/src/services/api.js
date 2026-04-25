import axios from 'axios';

// Add a request interceptor to include the auth token
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

const API_BASE = `/api/chat`;

export const getSchedules = async (username) => {
    const response = await axios.get(`${API_BASE}/schedules?username=${encodeURIComponent(username?.toLowerCase() || '')}`);
    return response.data;
};

export const createSchedule = async (scheduleData) => {
    const response = await axios.post(`${API_BASE}/schedules`, scheduleData);
    return response.data;
};

export const updateSchedule = async (scheduleId, scheduleData) => {
    const response = await axios.put(`${API_BASE}/schedules/${scheduleId}`, scheduleData);
    return response.data;
};

export const getRooms = async (username) => {
    const response = await axios.get(`${API_BASE}/rooms?username=${encodeURIComponent(username.toLowerCase())}`);
    return response.data.partners || [];
};

export const createGroup = async (groupData) => {
    const data = {
        ...groupData,
        members: groupData.members?.map(m => m.toLowerCase()) || [],
        created_by: groupData.created_by?.toLowerCase()
    };
    const response = await axios.post(`${API_BASE}/groups`, data);
    return response.data;
};

export const getGroups = async (username) => {
    const response = await axios.get(`${API_BASE}/groups/${encodeURIComponent(username.toLowerCase())}`);
    return response.data;
};

export const updateGroup = async (groupId, groupData, requester) => {
    const data = {
        ...groupData,
        members: groupData.members?.map(m => m.toLowerCase()) || []
    };
    const response = await axios.put(`${API_BASE}/groups/${groupId}?requester=${requester.toLowerCase()}`, data);
    return response.data;
};

export const deleteGroup = async (groupId, requester) => {
    const response = await axios.delete(`${API_BASE}/groups/${groupId}?requester=${requester.toLowerCase()}`);
    return response.data;
};

// Chat Settings & Management
export const togglePin = async (username, roomId, pin) => {
    const response = await axios.post(`${API_BASE}/settings/pin?username=${username.toLowerCase()}&room_id=${roomId}&pin=${pin}`);
    return response.data;
};

export const toggleMute = async (username, roomId, mute) => {
    const response = await axios.post(`${API_BASE}/settings/mute?username=${username.toLowerCase()}&room_id=${roomId}&mute=${mute}`);
    return response.data;
};

export const toggleArchive = async (username, roomId, archive) => {
    const response = await axios.post(`${API_BASE}/settings/archive?username=${username.toLowerCase()}&room_id=${roomId}&archive=${archive}`);
    return response.data;
};

export const markAsRead = async (username, roomId) => {
    const response = await axios.post(`${API_BASE}/settings/read?username=${username.toLowerCase()}&room_id=${roomId}`);
    return response.data;
};

export const toggleFavourite = async (username, roomId, favourite) => {
    const response = await axios.post(`${API_BASE}/settings/favourite?username=${username.toLowerCase()}&room_id=${roomId}&favourite=${favourite}`);
    return response.data;
};

export const updateChatLabel = async (username, roomId, label, action) => {
    const response = await axios.post(`${API_BASE}/settings/label?username=${username.toLowerCase()}&room_id=${roomId}&label=${encodeURIComponent(label)}&action=${action}`);
    return response.data;
};

export const getRoomSettings = async (username, roomId) => {
    const response = await axios.get(`${API_BASE}/settings/room/${encodeURIComponent(roomId)}?username=${encodeURIComponent(username.toLowerCase())}`);
    return response.data;
};

export const updateDisappearingTime = async (username, roomId, time) => {
    const response = await axios.post(`${API_BASE}/settings/room/disappearing?username=${username.toLowerCase()}&room_id=${roomId}&disappearing_time=${time}`);
    return response.data;
};

export const clearChatMessages = async (roomId) => {
    const response = await axios.delete(`${API_BASE}/messages/room/${roomId}`);
    return response.data;
};

export const deleteChatRoom = async (username, roomId) => {
    const response = await axios.delete(`${API_BASE}/rooms/${roomId}?username=${username.toLowerCase()}`);
    return response.data;
};

// Friend Management (User Service)
const AUTH_BASE = `/api/auth`;

export const getFriends = async () => {
    const response = await axios.get(`${AUTH_BASE}/friends`);
    return response.data.friends;
};

export const getPendingRequests = async () => {
    const response = await axios.get(`${AUTH_BASE}/friends/pending`);
    return response.data.pending;
};

export const sendFriendRequest = async (recipientUsername) => {
    const response = await axios.post(`${AUTH_BASE}/friends/request`, { recipientUsername });
    return response.data;
};

export const acceptFriendRequest = async (friendshipId) => {
    const response = await axios.post(`${AUTH_BASE}/friends/accept`, { friendshipId });
    return response.data;
};

export const rejectFriendRequest = async (friendshipId) => {
    const response = await axios.post(`${AUTH_BASE}/friends/reject`, { friendshipId });
    return response.data;
};

export const unfriendUser = async (friendshipId) => {
    const response = await axios.post(`${AUTH_BASE}/friends/unfriend`, { friendshipId });
    return response.data;
};

export const getAllFriendships = async () => {
    const response = await axios.get(`${AUTH_BASE}/friends/all`);
    return response.data;
};

export const getAllUsers = async () => {
    const response = await axios.get(`${AUTH_BASE}/users`);
    return response.data;
};

export const deleteAccount = async () => {
    const response = await axios.delete(`${AUTH_BASE}/delete-account`);
    return response.data;
};

// Support / Help & Feedback
const SUPPORT_BASE = `/api/support`;

export const submitSupportTicket = async ({ topic, message }) => {
    const response = await axios.post(`${SUPPORT_BASE}/tickets`, { topic, message });
    return response.data;
};

export const getMyTickets = async () => {
    const response = await axios.get(`${SUPPORT_BASE}/tickets`);
    return response.data;
};

export const requestPro = async (message) => {
    const response = await axios.post(`${SUPPORT_BASE}/request-pro`, { message });
    return response.data;
};


export const getProRequestStatus = async () => {
    const response = await axios.get(`${SUPPORT_BASE}/pro-request/status`);
    return response.data;
};


// Admin Panel API
const ADMIN_BASE = `/api/admin`;

export const getAllTickets = async () => {
    const response = await axios.get(`${ADMIN_BASE}/tickets`);
    return response.data;
};

export const updateTicketStatus = async (ticketId, status, adminFeedback) => {
    const response = await axios.patch(`${ADMIN_BASE}/tickets/${ticketId}/status`, { status, adminFeedback });
    return response.data;
};


export const getAllProRequests = async () => {
    const response = await axios.get(`${ADMIN_BASE}/pro-requests`);
    return response.data;
};

export const handleProRequest = async (requestId, status) => {
    const response = await axios.patch(`${ADMIN_BASE}/pro-requests/${requestId}`, { status });
    return response.data;
};


