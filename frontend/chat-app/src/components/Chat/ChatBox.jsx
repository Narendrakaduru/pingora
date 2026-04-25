import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, Image, Camera, Mic, BarChart3, Paperclip, Phone, PhoneOff,
  CheckCircle2, XCircle, LogOut, MessageSquare, ShieldCheck
} from 'lucide-react';

// Hooks
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useChatState } from './hooks/useChatState';
import { useChatSocket } from './hooks/useChatSocket';
import { useChatActions } from './hooks/useChatActions';
import { useChatCall } from './hooks/useChatCall';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Components
import Sidebar from './sidebar/Sidebar';
import ChatHeader from './window/ChatHeader';
import MessageList from './window/MessageList';
import MessageInput from './window/MessageInput';
import SelectionActionBar from './window/SelectionActionBar';
import QuickActionsDash from './window/QuickActionsDash';
import ViewManager from './window/ViewManager';
import CallUIManager from './window/CallUIManager';
import PinnedMessagesBar from './window/PinnedMessagesBar';
import CameraModal from './modals/CameraModal';
import ModalsManager from './modals/ModalsManager';
import GroupMembersPanel from '../Groups/GroupMembersPanel';

// Utils
import { getRoomId, formatFileSize, API_BASE } from '../../utils/chatUtils';
import { 
  togglePin, toggleMute, toggleArchive, 
  clearChatMessages, deleteChatRoom, deleteGroup,
  updateDisappearingTime as updateDisappearingTime_api,
  toggleFavourite, updateChatLabel,
  sendFriendRequest, acceptFriendRequest, rejectFriendRequest, unfriendUser
} from '../../services/api';

const ChatBox = () => {
  const { user, logout } = useAuth();
  const { settings, blockContact, unblockContact } = useSettings();

  // ─── Refs ────────────────────────────────────────────────────
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const wsRef = useRef(null);

  // ─── 1. Core State (from useChatState) ───────────────────────
  const {
    activeView, setActiveView,
    selectedChat, setSelectedChat,
    showMobileChat, setShowMobileChat,
    messages, setMessages,
    dmPartners, setDmPartners,
    userGroups, setUserGroups,
    onlineUsers, setOnlineUsers,
    lastSeenMap, setLastSeenMap,
    typingUsers, setTypingUsers,
    allUsers,
    friendships, fetchAllFriendships, friendshipsLoaded,
    roomSettings, setRoomSettings,
    refreshPartners, fetchRoomSettings, getUser
  } = useChatState(user);

  // ─── 2. UI Local States ──────────────────────────────────────
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [newDMSearch, setNewDMSearch] = useState('');
  const [newDMMode, setNewDMMode] = useState('message'); // 'message' | 'call'
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showDisappearingModal, setShowDisappearingModal] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [messageSelectionMode, setMessageSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [activeReactionMsg, setActiveReactionMsg] = useState(null);
  const [fullReactionMsg, setFullReactionMsg] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: null });
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [editingGroupSettings, setEditingGroupSettings] = useState(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [msgContextMenu, setMsgContextMenu] = useState({ visible: false, x: 0, y: 0, msg: null });
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(null);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [isMessageSearchActive, setIsMessageSearchActive] = useState(false);
  const [selectedInfoMsg, setSelectedInfoMsg] = useState(null);
  const [chatContextMenu, setChatContextMenu] = useState({ visible: false, x: 0, y: 0, chat: null, type: null });
  const [listModal, setListModal] = useState({ visible: false, roomId: null, currentLabels: [] });
  const [selectedGroupForInfo, setSelectedGroupForInfo] = useState(null);
  const [selectedPollForVotes, setSelectedPollForVotes] = useState(null);

  // ─── 3. Helpers (defined BEFORE hooks that need them) ────────
  const showToast = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  }, []);

  const triggerNotification = useCallback((title, body) => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
       new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
       Notification.requestPermission().then(permission => {
          if (permission === 'granted') new Notification(title, { body });
       });
    }
  }, []);

  // ─── 4. Call Hook (needs wsRef, provides call setters) ───────
  const {
    activeCall, setActiveCall,
    incomingCall, setIncomingCall,
    isCalling, setIsCalling,
    callError, setCallError,
    activeCallRef, activeCallIdRef,
    incomingCallRef, incomingCallTimeoutRef,
    initiateCall, acceptCall, rejectCall, hangupCall, persistCallLog
  } = useChatCall(user, wsRef, selectedChat);

  // ─── 5. WebSocket Hook (ALL deps already defined above) ──────
  const {
    text, setText,
    sendMessage,
    handleTyping,
    showScrollBottom,
    scrollToBottom,
    handleScroll
  } = useChatSocket({
    user, settings, selectedChat, wsRef, scrollRef, containerRef,
    // State setters
    setMessages, setDmPartners, setUserGroups,
    setOnlineUsers, setLastSeenMap, setTypingUsers, setRoomSettings,
    // UI helpers
    showToast, triggerNotification, refreshPartners,
    // Call helpers
    setActiveCall, setIncomingCall, setIsCalling, setCallError,
    activeCallRef, incomingCallRef, incomingCallTimeoutRef, activeCallIdRef,
    rejectCall, persistCallLog
  });

  const handleEventCreated = useCallback((eventData) => {
    // Handled by backend broadcast
  }, []);

  // ─── 6. Other Hooks ──────────────────────────────────────────
  const {
    handleFileSelect, startAudioRecording, stopAudioRecording, cancelAudioRecording,
    votePoll, createPoll, sendReaction, openCamera, closeCamera, capturePhoto
  } = useChatActions({
    user, selectedChat, wsRef, setMessages, showToast, refreshPartners,
    setIsRecordingAudio, setRecordingTime, setShowAttachMenu, setShowCameraModal, videoRef
  });

  useKeyboardShortcuts({
    activeView, setActiveView, selectedChat, setSelectedChat,
    msgContextMenu, setMsgContextMenu,
    activeReactionMsg, setActiveReactionMsg,
    confirmModal, setConfirmModal, forwardingMessage, setForwardingMessage,
    messageSelectionMode, setMessageSelectionMode, setSelectedMessages,
    replyingToMessage, setReplyingToMessage, showGroupSettingsModal, setShowGroupSettingsModal,
    showNewDM, setShowNewDM, searchInputRef
  });

  const roomIdForScroll = getRoomId(selectedChat, user.username);
  const typingCount = typingUsers[roomIdForScroll]?.size || 0;

  // Friendship check for current selected chat
  const partnerUser = typeof selectedChat === 'string' ? getUser(selectedChat) : null;
  // Look up partner id from allUsers (getUser may return a stub without id)
  const partnerFullUser = partnerUser 
    ? allUsers.find(u => u.username?.toLowerCase() === partnerUser.username?.toLowerCase())
    : null;
  const partnerId = partnerFullUser?.id ?? partnerUser?.id;
  const friendship = partnerId 
    ? friendships.find(f => f.user1Id === partnerId || f.user2Id === partnerId)
    : null;
  const isFriend = !selectedChat || selectedChat === 'general-chat' || (typeof selectedChat === 'object' && selectedChat._id) || friendship?.status === 'accepted';
  const isPending = friendship?.status === 'pending';
  const iSentRequest = isPending && friendship?.requestSenderId === user.id;

  const [customLabels, setCustomLabels] = useState(() => {
    const saved = localStorage.getItem(`custom_labels_${user.username}`);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (selectedChat && selectedChat !== 'general-chat') {
      const rId = getRoomId(selectedChat, user.username);
      fetchRoomSettings(rId);
    }
  }, [selectedChat, user.username, fetchRoomSettings]);

  useEffect(() => {
    if (user.username) {
      localStorage.setItem(`custom_labels_${user.username}`, JSON.stringify(customLabels));
    }
  }, [customLabels, user.username]);

  // Collect all unique labels from all chats + persistent custom labels
  const allLabels = [...new Set([
    'Work', 'Family', 'Friends', 'Important', // Presets
    ...customLabels,
    ...dmPartners.flatMap(p => p.settings?.labels || []),
    ...userGroups.flatMap(g => g.settings?.labels || [])
  ])];

  useEffect(() => {
    if (activeView !== 'chat') return;
    const container = containerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom || messages.length === 0) {
        setTimeout(() => scrollToBottom(true), 50);
      }
    }
  }, [messages, typingCount, activeView, roomIdForScroll, scrollToBottom]);

  const pinnedMessages = useMemo(() => {
    return messages.filter(m => m.is_pinned).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [messages]);

  // ─── Bulk Action Handlers ──────────────────────────────────
  const handleBulkCopy = () => {
    const texts = messages
      .filter(m => selectedMessages.includes(m._id || m.id))
      .map(m => m.text)
      .join('\n');
    navigator.clipboard.writeText(texts);
    showToast(`${selectedMessages.length} messages copied`);
    setMessageSelectionMode(false);
    setSelectedMessages([]);
  };

  const handleBulkStar = () => {
    const rId = getRoomId(selectedChat, user.username);
    selectedMessages.forEach(id => {
       wsRef.current?.send(JSON.stringify({ type: 'star_message', room: rId, message_id: id }));
    });
    showToast(`${selectedMessages.length} messages starred`);
    setMessageSelectionMode(false);
    setSelectedMessages([]);
  };

  const handleBulkDelete = () => {
    const rId = getRoomId(selectedChat, user.username);
    setConfirmModal({
      visible: true,
      title: 'Delete Messages',
      message: `Delete ${selectedMessages.length} messages for everyone?`,
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, visible: false }));
        selectedMessages.forEach(id => {
          wsRef.current?.send(JSON.stringify({ type: 'delete_message', room: rId, message_id: id }));
        });
        showToast('Messages deleted');
        setMessageSelectionMode(false);
        setSelectedMessages([]);
      }
    });
  };

  const handleBulkDownload = () => {
    const mediaMessages = messages.filter(m => 
      selectedMessages.includes(m._id || m.id) && m.attachment && (m.attachment.type === 'image' || m.attachment.type === 'video')
    );
    
    if (mediaMessages.length === 0) {
      showToast('No media selected', 'error');
      return;
    }

    mediaMessages.forEach(m => {
      const link = document.createElement('a');
      link.href = `${API_BASE}${m.attachment.url}`;
      link.download = m.attachment.name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    showToast(`Downloading ${mediaMessages.length} files`);
    setMessageSelectionMode(false);
    setSelectedMessages([]);
  };

  const handleBulkForward = () => {
    const selectedMsgs = messages.filter(m => selectedMessages.includes(m._id || m.id));
    setForwardingMessage(selectedMsgs[0]);
    showToast('Multi-forward coming soon - forwarding first selected');
    setMessageSelectionMode(false);
    setSelectedMessages([]);
  };

  // ─── Action Wrappers ─────────────────────────────────────────
  const handleMenuAction = async (action, chatObj) => {
    const target = chatObj || selectedChat;
    if (!target) return;

    const isGroup = typeof target === 'object' && target._id;
    const rId = isGroup ? target._id : getRoomId(target, user.username);
    
    // Resolve full data to get settings
    const targetData = isGroup 
      ? userGroups.find(g => g._id === target._id)
      : dmPartners.find(p => p.username.toLowerCase() === (typeof target === 'string' ? target.toLowerCase() : target.username?.toLowerCase()));
    
    const settings = targetData?.settings || {};
    const targetName = isGroup ? targetData?.name : (typeof target === 'string' ? target : target.username);

    try {
      if (action === 'contact_info') {
        setShowContactInfo(getUser(typeof target === 'string' ? target : target.username));
      } else if (action === 'search') {
        setIsMessageSearchActive(true);
        setTimeout(() => {
          document.getElementById('message-search-input')?.focus();
        }, 100);
      } else if (action === 'select') {
        setMessageSelectionMode(true);
      } else if (action === 'disappearing') {
        setShowDisappearingModal(true);
      } else if (action === 'mute') {
        const isMuted = settings.is_muted;
        await toggleMute(user.username, rId, !isMuted);
        refreshPartners();
        showToast(isMuted ? 'Mute removed' : 'Notifications muted');
      } else if (action === 'favourite') {
        const isFav = settings.is_favourite;
        await toggleFavourite(user.username, rId, !isFav);
        refreshPartners();
        showToast(isFav ? 'Removed from favourites' : 'Added to favourites');
      } else if (action === 'change_list') {
        setListModal({ visible: true, roomId: rId, currentLabels: target.settings?.labels || [] });
      } else if (action === 'close') {
        backToList();
      } else if (action === 'block') {
        setConfirmModal({
          visible: true,
          title: 'Block User',
          message: `Are you sure you want to block ${targetName}? You will no longer receive messages from them.`,
          onConfirm: () => {
            blockContact(targetName);
            setConfirmModal(prev => ({ ...prev, visible: false }));
            showToast(`${targetName} has been blocked`);
          }
        });
      } else if (action === 'clear' || action === 'delete') {
        setConfirmModal({
          visible: true, 
          title: action === 'delete' ? 'Delete Chat' : 'Clear Chat',
          message: action === 'delete' 
            ? `Are you sure you want to PERMANENTLY delete the chat with ${targetName}?` 
            : `Are you sure you want to clear all messages with ${targetName}?`,
          onConfirm: async () => {
            setConfirmModal(prev => ({ ...prev, visible: false }));
            if (action === 'delete') {
              await deleteChatRoom(rId);
              setSelectedChat('general-chat');
              showToast('Chat deleted');
            } else {
              await clearChatMessages(rId);
              setMessages([]);
              showToast('Chat cleared');
            }
            refreshPartners();
          }
        });
      } else if (action === 'archive') {
         await toggleArchive(user.username, rId, !target.settings?.is_archived);
         showToast(target.settings?.is_archived ? 'Chat unarchived' : 'Chat archived');
         refreshPartners();
      } else if (action === 'pin') {
         await togglePin(user.username, rId, !target.settings?.is_pinned);
         showToast(target.settings?.is_pinned ? 'Chat unpinned' : 'Chat pinned');
         refreshPartners();
      } else if (action === 'delete_group') {
          setConfirmModal({
            visible: true, title: 'Delete Group',
            message: `Are you sure you want to PERMANENTLY delete "${targetName}"?`,
            onConfirm: async () => {
              setConfirmModal(prev => ({ ...prev, visible: false }));
              await deleteGroup(target._id, user.username);
              setSelectedChat('general-chat');
              showToast('Group deleted');
              refreshPartners();
            }
          });
      } else if (action === 'edit_group') {
          setEditingGroupSettings(target);
          setShowGroupSettingsModal(true);
      } else if (action === 'unfriend') {
        if (!friendship) return;
        setConfirmModal({
          visible: true,
          title: 'Unfriend User',
          message: `Are you sure you want to unfriend ${targetName}?`,
          onConfirm: async () => {
            setConfirmModal(prev => ({ ...prev, visible: false }));
            try {
              const res = await unfriendUser(friendship.id);
              if (res.success) {
                fetchAllFriendships();
                showToast("Unfriended successfully");
              } else {
                showToast(res.message || "Failed to unfriend", "error");
              }
            } catch (err) {
              showToast("Failed to unfriend", "error");
            }
          }
        });
      }
    } catch (e) {
      showToast('Action failed', 'error');
    }
  };

  const updateDisappearingTime = async (time) => {
    const rId = getRoomId(selectedChat, user.username);
    try {
      await updateDisappearingTime_api(user.username, rId, time);
      setRoomSettings(prev => ({ ...prev, disappearing_time: time }));
      
      // Update dmPartners locally for immediate sync in modals
      setDmPartners(prev => prev.map(p => 
        p.username.toLowerCase() === (typeof selectedChat === 'string' ? selectedChat.toLowerCase() : selectedChat.username?.toLowerCase())
          ? { ...p, settings: { ...(p.settings || {}), disappearing_time: time } }
          : p
      ));
      refreshPartners();
      showToast(`Messages will disappear after ${time}`);
    } catch (e) {
      showToast('Failed to update timer', 'error');
    }
  };

  const handleForward = (target) => {
    const rId = getRoomId(target, user.username);
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        message_type: forwardingMessage.type || 'text',
        room: rId,
        username: user.username,
        text: forwardingMessage.text,
        metadata: forwardingMessage.metadata || null
      }));
      setForwardingMessage(null);
      showToast('Message forwarded');
    }
  };

  const backToList = () => {
    setSelectedChat(null);
    setShowMobileChat(false);
  };

  const startDM = (username) => {
    if (newDMMode === 'call') {
      initiateCall('voice', username);
    } else {
      setSelectedChat(username);
      setActiveView('chat');
      if (window.innerWidth < 768) setShowMobileChat(true);
    }
    setShowNewDM(false);
    setNewDMSearch('');
  };

  const handleMessageContextMenu = (e, msg) => {
    e.preventDefault();
    if (messageSelectionMode) return;
    setMsgContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      msg
    });
  };

  const handleChatContextMenu = (e, chat, type) => {
    e.preventDefault();
    setChatContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      chat,
      type
    });
  };

  const handleChatAction = async (action, chat, type) => {
    if (!chat) return;
    const rId = type === 'group' ? chat._id : getRoomId(chat.username, user.username);
    const settings = chat.settings || {};

    try {
      switch (action) {
        case 'search':
          if (type === 'dm') {
            setSelectedChat(chat.username);
            if (window.innerWidth < 768) setShowMobileChat(true);
          } else if (type === 'group') {
            setSelectedChat(chat);
            if (window.innerWidth < 768) setShowMobileChat(true);
          }
          setIsMessageSearchActive(true);
          setTimeout(() => {
            document.getElementById('message-search-input')?.focus();
          }, 100);
          break;
        case 'archive':
          await toggleArchive(user.username, rId, !settings.is_archived);
          refreshPartners();
          showToast(`Chat ${settings.is_archived ? 'unarchived' : 'archived'}`);
          break;
        case 'mute':
          await toggleMute(user.username, rId, !settings.is_muted);
          refreshPartners();
          showToast(`Chat ${settings.is_muted ? 'unmuted' : 'muted'}`);
          break;
        case 'pin':
          await togglePin(user.username, rId, !settings.is_pinned);
          refreshPartners();
          showToast(`Chat ${settings.is_pinned ? 'unpinned' : 'pinned'}`);
          break;
        case 'favourite':
          await toggleFavourite(user.username, rId, !settings.is_favourite);
          refreshPartners();
          showToast(`Chat ${settings.is_favourite ? 'removed from favourites' : 'added to favourites'}`);
          break;
        case 'list':
          setListModal({ visible: true, roomId: rId, currentLabels: settings.labels || [] });
          break;
        case 'unread':
          showToast('Mark as unread coming soon');
          break;
        case 'block':
          setConfirmModal({
            visible: true,
            title: 'Block User',
            message: `Are you sure you want to block ${type === 'dm' ? chat.username : chat.name}? You will no longer receive messages from them.`,
            onConfirm: () => {
              blockContact(type === 'dm' ? chat.username : chat.name);
              setConfirmModal(prev => ({ ...prev, visible: false }));
              showToast(`${type === 'dm' ? chat.username : chat.name} has been blocked`);
            }
          });
          break;
        case 'clear':
          setConfirmModal({
            visible: true, title: 'Clear Chat',
            message: 'Are you sure you want to clear all messages? This cannot be undone.',
            onConfirm: async () => {
              setConfirmModal(prev => ({ ...prev, visible: false }));
              await clearChatMessages(rId);
              if (selectedChat === (type === 'dm' ? chat.username : chat)) {
                setMessages([]);
              }
              showToast('Chat cleared');
            }
          });
          break;
        case 'delete':
          setConfirmModal({
            visible: true, 
            title: type === 'group' ? 'Delete Group' : 'Delete Chat',
            message: `Are you sure you want to ${type === 'group' ? 'delete this group' : 'delete this chat'}?`,
            onConfirm: async () => {
              setConfirmModal(prev => ({ ...prev, visible: false }));
              if (type === 'group') {
                await deleteGroup(chat._id, user.username);
              } else {
                await deleteChatRoom(user.username, rId);
              }
              if (selectedChat === (type === 'dm' ? chat.username : chat)) {
                setSelectedChat(null);
              }
              refreshPartners();
              showToast(type === 'group' ? 'Group deleted' : 'Chat deleted');
            }
          });
          break;
        case 'unfriend':
          if (!friendship) return;
          setConfirmModal({
            visible: true,
            title: 'Unfriend User',
            message: `Are you sure you want to unfriend ${chat.username}?`,
            onConfirm: async () => {
              setConfirmModal(prev => ({ ...prev, visible: false }));
              try {
                const res = await unfriendUser(friendship.id);
                if (res.success) {
                  fetchAllFriendships();
                  showToast("Unfriended successfully");
                } else {
                  showToast(res.message || "Failed to unfriend", "error");
                }
              } catch (err) {
                showToast("Failed to unfriend", "error");
              }
            }
          });
          break;
        default: break;
      }
    } catch (e) {
      showToast('Action failed', 'error');
    }
  };

  const handleMessageAction = async (action, msg) => {
    if (!msg) return;
    const rId = getRoomId(selectedChat, user.username);
    try {
      switch (action) {
        case 'info':
          setSelectedInfoMsg(msg);
          setShowInfoModal(true);
          break;
        case 'reply':
          setReplyingToMessage({ id: msg._id || msg.id, text: msg.text || 'Attachment', username: msg.username });
          break;
        case 'copy':
          navigator.clipboard.writeText(msg.text || '');
          showToast('Copied to clipboard');
          break;
        case 'forward':
          setForwardingMessage(msg);
          break;
        case 'star':
          wsRef.current?.send(JSON.stringify({ type: 'star_message', room: rId, message_id: msg._id || msg.id }));
          break;
        case 'pin':
          const pinnedCount = pinnedMessages.length;
          const limit = user.accountType === 'pro' ? 20 : 3;
          
          if (!msg.is_pinned && pinnedCount >= limit) {
             setConfirmModal({
               visible: true,
               title: 'Pin Limit Reached',
               message: `You can only pin up to ${limit} messages. Would you like to replace the oldest pin?`,
               onConfirm: () => {
                 setConfirmModal(prev => ({ ...prev, visible: false }));
                 wsRef.current?.send(JSON.stringify({ 
                   type: 'pin_message', 
                   room: rId, 
                   message_id: msg._id || msg.id,
                   replace_oldest: true 
                 }));
               }
             });
          } else {
             wsRef.current?.send(JSON.stringify({ 
               type: 'pin_message', 
               room: rId, 
               message_id: msg._id || msg.id 
             }));
          }
          break;
        case 'edit':
          setEditingMessage(msg);
          setText(msg.text);
          break;
        case 'delete':
          setConfirmModal({
            visible: true, title: 'Delete Message',
            message: 'Delete this message for everyone?',
            onConfirm: () => {
              setConfirmModal(prev => ({ ...prev, visible: false }));
              wsRef.current?.send(JSON.stringify({ type: 'delete_message', room: rId, message_id: msg._id || msg.id }));
              showToast('Message deleted');
            }
          });
          break;
        case 'select':
          setMessageSelectionMode(true);
          setSelectedMessages([msg._id || msg.id]);
          break;
        case 'reaction':
          if (wsRef.current?.readyState === 1 && msg.emoji) {
            wsRef.current.send(JSON.stringify({ 
              type: 'reaction', 
              room: rId, 
              message_id: msg._id || msg.id, 
              emoji: msg.emoji 
            }));
          }
          break;
        default: break;
      }
    } catch (e) {
      showToast('Action failed', 'error');
    }
  };

  const scrollToMessage = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-pulse');
      setTimeout(() => el.classList.remove('highlight-pulse'), 2000);
    }
  }, []);

  const handleCreatePoll = () => {
    if (pollQuestion && pollOptions.filter(o => o.trim()).length >= 2) {
      createPoll(pollQuestion, pollOptions, allowMultiple);
      setPollQuestion('');
      setPollOptions(['', '']);
      setAllowMultiple(false);
      setShowPollModal(false);
    }
  };

  // ─── Attach Menu Items ───────────────────────────────────────
  const attachMenuItems = [
    { label: 'Document', icon: Paperclip, color: 'text-blue-500', onClick: () => fileInputRef.current?.click() },
    { label: 'Camera', icon: Camera, color: 'text-pink-500', onClick: openCamera },
    { label: 'Gallery', icon: Image, color: 'text-purple-500', onClick: () => imageInputRef.current?.click() },
    { label: 'Audio', icon: Mic, color: 'text-orange-500', onClick: startAudioRecording },
    { label: 'Poll', icon: BarChart3, color: 'text-violet-500', onClick: () => setShowPollModal(true) }
  ];

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="flex bg-surface-sidebar h-[100dvh] overflow-hidden font-sans text-text-main selection:bg-primary/20">
      <Sidebar 
        activeView={activeView} setActiveView={setActiveView}
        selectedChat={selectedChat} setSelectedChat={setSelectedChat}
        showMobileChat={showMobileChat} setShowMobileChat={setShowMobileChat}
        dmPartners={dmPartners} userGroups={userGroups}
        user={user} logout={logout} getUser={getUser}
        settings={settings}
        onlineUsers={onlineUsers} lastSeenMap={lastSeenMap}
        typingUsers={typingUsers}
        searchQuery={newDMSearch} setSearchQuery={setNewDMSearch}
        searchInputRef={searchInputRef}
        openNewDM={() => setShowNewDM(true)}
        handleContextMenu={handleChatContextMenu}
        onShowGroupInfo={(g) => setSelectedGroupForInfo(g)}
        onNewList={() => {
          if (selectedChat && selectedChat !== 'general-chat') {
            const rId = getRoomId(selectedChat, user.username);
            setListModal({ visible: true, roomId: rId, currentLabels: [] });
          } else {
            showToast('Select a chat first to add it to a list', 'error');
          }
        }}
      />

      <div className={`flex-1 flex flex-col min-w-0 bg-surface relative ${(showMobileChat || (activeView !== 'chat' && activeView !== 'archive')) ? 'flex' : 'hidden md:flex'}`}>
        {activeView === 'chat' ? (
          selectedChat ? (
            <>
              <ChatHeader 
                selectedChat={selectedChat} user={user}
                onlineUsers={onlineUsers} roomSettings={roomSettings}
                lastSeenMap={lastSeenMap} dmPartners={dmPartners}
                getUser={getUser} showHeaderMenu={showHeaderMenu}
                setShowHeaderMenu={setShowHeaderMenu}
                initiateCall={initiateCall}
                backToList={() => setShowMobileChat(false)}
                handleMenuAction={handleMenuAction}
                setShowDisappearingModal={setShowDisappearingModal}
                onShowContactInfo={(contact) => setShowContactInfo(contact)}
                onShowGroupInfo={(g) => setSelectedGroupForInfo(g)}
                isFriend={isFriend}
                friendship={friendship}
              />
              
              <PinnedMessagesBar 
                pinnedMessages={pinnedMessages} 
                onScrollToMessage={scrollToMessage} 
              />

              <AnimatePresence>
                {friendshipsLoaded && !isFriend && selectedChat !== 'general-chat' && typeof selectedChat === 'string' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-4 overflow-hidden"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={18} className="text-amber-600" />
                      <p className="text-xs font-semibold text-amber-800">
                        {isPending 
                          ? (iSentRequest ? "Friend request sent. Waiting for response." : "This user sent you a friend request.")
                          : "You are not friends with this user. You can only send 3 messages."}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isPending ? (
                        !iSentRequest && (
                          <>
                            <button 
                              onClick={async () => {
                                try {
                                  const res = await acceptFriendRequest(friendship.id);
                                  if (res.success) {
                                    fetchAllFriendships();
                                    showToast("Friend request accepted");
                                  } else {
                                    showToast(res.message || "Failed to accept request", "error");
                                  }
                                } catch (err) {
                                  showToast(err.response?.data?.message || "Failed to accept request", "error");
                                }
                              }}
                              className="px-3 py-1.5 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-green-700 transition-all"
                            >
                              Accept
                            </button>
                            <button 
                              onClick={async () => {
                                try {
                                  const res = await rejectFriendRequest(friendship.id);
                                  if (res.success) {
                                    fetchAllFriendships();
                                    showToast("Friend request rejected");
                                  } else {
                                    showToast(res.message || "Failed to reject request", "error");
                                  }
                                } catch (err) {
                                  showToast(err.response?.data?.message || "Failed to reject request", "error");
                                }
                              }}
                              className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-700 transition-all"
                            >
                              Reject
                            </button>
                          </>
                        )
                      ) : (
                        <button 
                          onClick={async () => {
                            try {
                              const res = await sendFriendRequest(selectedChat);
                              if (res.success) {
                                fetchAllFriendships();
                                showToast("Friend request sent");
                              } else {
                                showToast(res.message || "Failed to send request", "error");
                              }
                            } catch (err) {
                              showToast(err.response?.data?.message || "Failed to send request", "error");
                            }
                          }}
                          className="px-3 py-1.5 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-700 transition-all"
                        >
                          Add Friend
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
                {isMessageSearchActive && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 py-4 bg-white border-b border-border/10 flex items-center gap-4 overflow-hidden"
                  >
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" size={16} />
                      <input 
                        id="message-search-input"
                        type="text"
                        placeholder="Search messages..."
                        value={messageSearchQuery}
                        onChange={(e) => setMessageSearchQuery(e.target.value)}
                        className="w-full bg-surface-high/50 border-none rounded-xl py-2 pl-10 pr-4 outline-none focus:bg-surface-lowest focus:shadow-sm text-sm"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        setIsMessageSearchActive(false);
                        setMessageSearchQuery('');
                      }}
                      className="p-2 hover:bg-surface-high rounded-full text-text-soft transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <MessageList 
                messages={isMessageSearchActive && messageSearchQuery 
                  ? messages.filter(m => m.text?.toLowerCase().includes(messageSearchQuery.toLowerCase())) 
                  : messages} 
                user={user}
                selectedChat={selectedChat} roomSettings={roomSettings}
                typingUsers={typingUsers} settings={settings}
                getUser={getUser} formatFileSize={formatFileSize}
                initiateCall={initiateCall} votePoll={votePoll}
                setFullScreenImage={setFullScreenImage} sendReaction={sendReaction}
                handleMessageContextMenu={handleMessageContextMenu}
                handleMessageAction={handleMessageAction}
                scrollToMessage={scrollToMessage}
                activeReactionMsg={activeReactionMsg} setActiveReactionMsg={setActiveReactionMsg}
                fullReactionMsg={fullReactionMsg} setFullReactionMsg={setFullReactionMsg}
                messageSelectionMode={messageSelectionMode}
                selectedMessages={selectedMessages} setSelectedMessages={setSelectedMessages}
                containerRef={containerRef} scrollRef={scrollRef}
                handleScroll={handleScroll} scrollToBottom={scrollToBottom}
                showScrollBottom={showScrollBottom} dmPartners={dmPartners}
                onlineUsers={onlineUsers} lastSeenMap={lastSeenMap}
                setSelectedPollForVotes={setSelectedPollForVotes}
                showToast={showToast}
              />

              <AnimatePresence mode="wait">
                {messageSelectionMode ? (
                  <SelectionActionBar 
                    key="selection-bar"
                    selectedMessages={selectedMessages}
                    onClose={() => {
                      setMessageSelectionMode(false);
                      setSelectedMessages([]);
                    }}
                    onBulkCopy={handleBulkCopy}
                    onBulkStar={handleBulkStar}
                    onBulkDelete={handleBulkDelete}
                    onBulkForward={handleBulkForward}
                    onBulkDownload={handleBulkDownload}
                  />
                ) : (
                  <MessageInput 
                    key="message-input"
                    text={text} setText={setText}
                    sendMessage={sendMessage} handleTyping={handleTyping}
                    showEmojiPicker={showEmojiPicker} setShowEmojiPicker={setShowEmojiPicker}
                    showAttachMenu={showAttachMenu} setShowAttachMenu={setShowAttachMenu}
                    isRecordingAudio={isRecordingAudio} recordingTime={recordingTime}
                    startAudioRecording={startAudioRecording} cancelAudioRecording={cancelAudioRecording} stopAudioRecording={stopAudioRecording}
                    replyingToMessage={replyingToMessage} setReplyingToMessage={setReplyingToMessage}
                    editingMessage={editingMessage} cancelEdit={() => setEditingMessage(null)}
                    attachMenuItems={attachMenuItems} user={user}
                    getUser={getUser} 
                    currentChatName={
                      typeof selectedChat === 'string' 
                        ? (getUser(selectedChat)?.fullName || selectedChat) 
                        : (selectedChat.name || selectedChat.username)
                    }
                  />
                )}
              </AnimatePresence>
            </>
          ) : (
            <QuickActionsDash 
              onAction={(id) => {
                if (id === 'contact') {
                  setNewDMMode('message');
                  setShowNewDM(true);
                } else if (id === 'call') {
                  setNewDMMode('call');
                  setShowNewDM(true);
                }
                else if (id === 'document') fileInputRef.current?.click();
                else if (id === 'photo') imageInputRef.current?.click();
              }}
            />
          )
        ) : (
          <ViewManager 
            activeView={activeView} setActiveView={setActiveView}
            onMessageUser={startDM} 
            onMessageGroup={(g) => { setActiveView('chat'); setSelectedChat(g); if (window.innerWidth < 768) setShowMobileChat(true); }}
            handleEventCreated={handleEventCreated} allUsers={allUsers}
            getUser={getUser}
            user={user}
            sendMessage={sendMessage}
          />
        )}
      </div>

      <ModalsManager 
        showNewDM={showNewDM} setShowNewDM={setShowNewDM}
        newDMMode={newDMMode}
        newDMSearch={newDMSearch} setNewDMSearch={setNewDMSearch}
        showPollModal={showPollModal} setShowPollModal={setShowPollModal}
        pollQuestion={pollQuestion} setPollQuestion={setPollQuestion}
        pollOptions={pollOptions} setPollOptions={setPollOptions}
        allowMultiple={allowMultiple} setAllowMultiple={setAllowMultiple}
        showDisappearingModal={showDisappearingModal} setShowDisappearingModal={setShowDisappearingModal}
        forwardingMessage={forwardingMessage} setForwardingMessage={setForwardingMessage}
        confirmModal={confirmModal} setConfirmModal={setConfirmModal}
        listModal={listModal} setListModal={setListModal}
        showInfoModal={showInfoModal} setShowInfoModal={setShowInfoModal}
        showContactInfo={showContactInfo} setShowContactInfo={setShowContactInfo}
        selectedInfoMsg={selectedInfoMsg}
        messages={messages}
        showGroupSettingsModal={showGroupSettingsModal} setShowGroupSettingsModal={setShowGroupSettingsModal}
        editingGroupSettings={editingGroupSettings}
        fullScreenImage={fullScreenImage} setFullScreenImage={setFullScreenImage}
        msgContextMenu={msgContextMenu} setMsgContextMenu={setMsgContextMenu}
        chatContextMenu={chatContextMenu} setChatContextMenu={setChatContextMenu}
        selectedPollForVotes={selectedPollForVotes} setSelectedPollForVotes={setSelectedPollForVotes}
        toast={toast}
        user={user} onlineUsers={onlineUsers} allUsers={allUsers} 
        dmPartners={dmPartners} userGroups={userGroups} 
        allLabels={allLabels}
        setCustomLabels={setCustomLabels}
        roomSettings={roomSettings}
        selectedChat={selectedChat}
        startDM={startDM} updateDisappearingTime={updateDisappearingTime}
        handleForward={handleForward} updateChatLabel={updateChatLabel}
        refreshPartners={refreshPartners} getUser={getUser}
        handleMessageAction={handleMessageAction} handleChatAction={handleChatAction}
        scrollToMessage={scrollToMessage} showToast={showToast}
        initiateCall={initiateCall}
        onCreatePoll={handleCreatePoll}
      />

      <CallUIManager 
        incomingCall={incomingCall} acceptCall={acceptCall} rejectCall={rejectCall}
        isCalling={isCalling} callError={callError} hangupCall={hangupCall}
        activeCall={activeCall} ws={wsRef.current} selectedChat={selectedChat}
        dmPartners={dmPartners} onlineUsers={onlineUsers} getUser={getUser} user={user}
        allUsers={allUsers}
      />

      {showCameraModal && (
        <CameraModal 
          videoRef={videoRef} 
          onClose={closeCamera} 
          onCapture={capturePhoto} 
        />
      )}

      {/* Hidden file inputs */}
      <input type="file" ref={fileInputRef} onChange={(e) => handleFileSelect(e, 'document')} className="hidden" />
      <input type="file" ref={imageInputRef} onChange={(e) => handleFileSelect(e, 'image')} accept="image/*,video/*" className="hidden" />

      {/* Global Group Members Panel */}
      <AnimatePresence>
        {selectedGroupForInfo && (
          <GroupMembersPanel 
            group={selectedGroupForInfo}
            currentUser={user}
            getUser={getUser}
            onClose={() => setSelectedGroupForInfo(null)}
            onOpenChat={(g) => {
              setSelectedChat(g);
              setActiveView('chat');
              if (window.innerWidth < 768) setShowMobileChat(true);
              setSelectedGroupForInfo(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatBox;
