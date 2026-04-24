import { useState, useEffect, useRef, useCallback } from 'react';
import { getRoomId } from '../../../utils/chatUtils';
import { markAsRead } from '../../../services/api';

const API_BASE = '/api/chat';

/**
 * useChatSocket - Manages the WebSocket connection and real-time message flow.
 * 
 * Accepts ALL state setters as flat params to avoid circular dependencies.
 * Returns only action functions + its own local state (text, scrollBottom).
 */
export const useChatSocket = ({
  user, settings, selectedChat, wsRef, scrollRef, containerRef,
  // State setters (from useChatState)
  setMessages, setDmPartners, setUserGroups,
  setOnlineUsers, setLastSeenMap, setTypingUsers, setRoomSettings,
  // UI helpers
  showToast, triggerNotification, refreshPartners,
  // Call helpers
  setActiveCall, setIncomingCall, setIsCalling, setCallError,
  activeCallRef, incomingCallRef, incomingCallTimeoutRef, activeCallIdRef,
  rejectCall, persistCallLog
}) => {
  const currentRoomRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const pendingJoinRef = useRef(null);   // room to join when WS opens
  const [text, setText] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const roomId = getRoomId(selectedChat, user?.username);

  // ─── WebSocket Connection ─────────────────────────────────────
  useEffect(() => {
    if (!user?.username) return;

    let reconnectTimeout = null;
    let socket = null;
    let isIntentionallyClosed = false;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(`${protocol}://${window.location.host}/ws/${encodeURIComponent(user.username)}`);
      wsRef.current = socket;

      socket.onopen = () => {
        // Join the current room (pendingJoinRef set by the room-change effect)
        const roomToJoin = pendingJoinRef.current || currentRoomRef.current || getRoomId(selectedChat, user.username);
        if (roomToJoin) {
          socket.send(JSON.stringify({ type: 'join_room', room: roomToJoin }));
        }
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'online_users') {
          setOnlineUsers(new Set(message.users.map(u => u.toLowerCase())));
        } else if (message.type === 'user_status') {
          setOnlineUsers(prev => {
            const next = new Set(prev);
            if (message.status === 'online') next.add(message.username.toLowerCase());
            else next.delete(message.username.toLowerCase());
            return next;
          });
          if (message.status === 'offline' && message.last_seen) {
             setLastSeenMap(prev => ({ ...prev, [message.username.toLowerCase()]: message.last_seen }));
          }
        } else if (message.type === 'message' || message.type === 'call_log') {
          const msgData = message.data || message;
          
          // ── Block filter: silently drop messages from blocked users ──
          const blockedList = settings?.privacy?.blockedContacts || [];
          const senderName = (msgData.username || '').toLowerCase();
          if (senderName && senderName !== user.username.toLowerCase() && blockedList.map(u => u.toLowerCase()).includes(senderName)) {
            return; // Blocked user — discard message
          }

          if (msgData.room && msgData.username) {
            setTypingUsers(prev => {
              const newTypers = { ...prev };
              const roomSet = new Set(newTypers[msgData.room] || []);
              roomSet.delete(msgData.username);
              newTypers[msgData.room] = roomSet;
              return newTypers;
            });
          }

          if (msgData.room && msgData.room.startsWith('dm:')) {
            const parts = msgData.room.replace('dm:', '').split(':');
            const partnerName = parts.find(p => p !== user.username.toLowerCase());
            
            if (partnerName && msgData.username !== user.username && (document.hidden || msgData.room !== currentRoomRef.current)) {
                if (settings?.notifications?.messages) {
                    const title = `New message from ${partnerName}`;
                    const body = settings?.notifications?.preview ? msgData.text : 'You have a new message';
                    if (!document.hidden) showToast(settings?.notifications?.preview ? `${title}: ${msgData.text}` : title, 'info');
                    triggerNotification(title, body);
                }
            }

            setDmPartners(prev => {
              if (!partnerName) return prev;
              const existingIdx = prev.findIndex(p => p.username.toLowerCase() === partnerName);
              const existingPartner = existingIdx > -1 ? prev[existingIdx] : {};
              const newPartnerObj = { ...existingPartner, username: partnerName, lastMessage: msgData };
              let next = [...prev];
              if (existingIdx > -1) next.splice(existingIdx, 1);
              return [newPartnerObj, ...next];
            });
          } else if (msgData.room && msgData.room !== 'general-chat') {
            setUserGroups(prev => {
              const existingIdx = prev.findIndex(g => g._id === msgData.room);
              if (existingIdx === -1) return prev;
              const existingGroup = prev[existingIdx];
              const newGroupObj = { ...existingGroup, lastMessage: msgData };
              
              if (msgData.username !== user.username && (document.hidden || msgData.room !== currentRoomRef.current)) {
                if (settings?.notifications?.groups) {
                    const title = `New message in ${existingGroup.name}`;
                    const body = settings?.notifications?.preview ? msgData.text : 'You have a new message';
                    if (!document.hidden) showToast(settings?.notifications?.preview ? `${title}: ${msgData.text}` : title, 'info');
                    triggerNotification(title, body);
                }
              }
              let next = [...prev];
              next.splice(existingIdx, 1);
              return [newGroupObj, ...next];
            });
          }

          // HIDE reaction_summary messages from the chat bubbles
          if (msgData.type === 'reaction_summary') return;

          if (msgData.room === currentRoomRef.current) {
            setMessages(prev => {
              // Deduplicate real-time messages against current state
              if (prev.some(m => (m._id || m.id) === (msgData._id || msgData.id))) return prev;
              return [...prev, msgData];
            });

            // Mark as read immediately if we are viewing this room
            if (msgData.username !== user?.username) {
              markRoomAsRead(msgData.room);
            }
          }
        } else if (message.type === 'typing') {
          const { room, username: typer } = message;
          if (typer === user.username) return;
          setTypingUsers(prev => {
            const next = { ...prev };
            const roomSet = new Set(next[room] || []);
            roomSet.add(typer);
            next[room] = roomSet;
            return next;
          });
        } else if (message.type === 'stop_typing') {
          const { room, username: typer } = message;
          setTypingUsers(prev => {
            const next = { ...prev };
            const roomSet = new Set(next[room] || []);
            roomSet.delete(typer);
            next[room] = roomSet;
            return next;
          });
        } else if (message.type === 'read_receipt') {
          const { username: receivingUser, timestamp } = message;
          setDmPartners(prev => prev.map(p => {
            if (p.username.toLowerCase() === receivingUser) {
               return {
                  ...p,
                  settings: { ...(p.settings || {}), partner_last_read_timestamp: timestamp }
               };
            }
            return p;
          }));
        } else if (message.type === 'reaction_update' || message.type === 'poll_update' || message.type === 'message_update') {
          setMessages(prev => prev.map(m => (m._id || m.id) === message.data._id ? message.data : m));
        } else if (message.type === 'delete_message_permanent') {
          setMessages(prev => prev.filter(m => (m._id || m.id) !== message.message_id));
        } else if (message.type === 'call_request') {
          // ── Block filter: silently reject calls from blocked users ──
          const blockedList = settings?.privacy?.blockedContacts || [];
          if (blockedList.map(u => u.toLowerCase()).includes((message.from || '').toLowerCase())) {
            // Silently reject: send hangup so caller knows it didn't go through
            if (wsRef.current?.readyState === 1) {
              wsRef.current.send(JSON.stringify({
                type: 'call_hangup',
                to: message.from,
                call_id: message.call_id,
                reason: 'unavailable'
              }));
            }
            return;
          }

          if (activeCallRef.current) return;
          if (incomingCallRef.current && incomingCallRef.current.from === message.from) return;
          
          if (incomingCallTimeoutRef.current) clearTimeout(incomingCallTimeoutRef.current);
          incomingCallTimeoutRef.current = setTimeout(() => {
            rejectCall('missed');
          }, 45000);

          setIncomingCall({ from: message.from, type: message.call_type, call_id: message.call_id });
        } else if (message.type === 'call_response') {
           if (message.call_id === activeCallIdRef.current) {
               if (message.accepted) {
               if (activeCallRef.current) {
                     // Already in a call — this is a new participant joining.
                     // Fire a dedicated event so CallModal can orchestrate the mesh handshake.
                     window.dispatchEvent(new CustomEvent('call_participant_joined', { detail: {
                       participant: message.from,
                       call_id: message.call_id
                     }}));
                  } else {
                     // Initial call accepted — mount the CallModal for the first time.
                     setIsCalling(false);
                     setCallError(null);
                     setActiveCall({ target: message.from, type: message.call_type, isCaller: true, call_id: message.call_id });
                  }
               } else {
                  if (activeCallRef.current) {
                      window.dispatchEvent(new CustomEvent('call_rejected_event', { detail: message }));
                  } else {
                      setCallError('rejected');
                  }
               }
           }
        } else if (message.type === 'call_handled') {
           if (incomingCallRef.current?.call_id === message.call_id || (!message.call_id && incomingCallRef.current?.from === message.from)) {
               if (incomingCallTimeoutRef.current) {
                  clearTimeout(incomingCallTimeoutRef.current);
                  incomingCallTimeoutRef.current = null;
               }
               setIncomingCall(null);
           }
        } else if (message.type === 'room_settings_update') {
           if (message.room === currentRoomRef.current) {
              setRoomSettings(message.settings);
              if (refreshPartners) refreshPartners();
           }
        } else if (message.type === 'call_hangup') {
           console.log("[useChatSocket] Received call_hangup:", message);
           const isRelevant = activeCallRef.current?.call_id === message.call_id || 
                              message.call_id === activeCallIdRef.current || 
                              incomingCallRef.current?.call_id === message.call_id ||
                              (incomingCallRef.current?.from === message.from && !message.call_id);
                              
           if (isRelevant) {
              if (activeCallRef.current?.call_id === message.call_id) {
                 console.log("[useChatSocket] Dispatching call_hangup_event");
                 window.dispatchEvent(new CustomEvent('call_hangup_event', { detail: message }));
              } else {
                 if (incomingCallTimeoutRef.current) {
                    clearTimeout(incomingCallTimeoutRef.current);
                    incomingCallTimeoutRef.current = null;
                 }
                 console.log("[useChatSocket] Terminating inactive/incoming call state (ID mismatch check)");
                 // IGNORE 'declined' reasons if we are already in a call — these are often 
                 // server-side false positives during mesh joining between non-friends.
                 if (activeCallRef.current && message.reason === 'declined') {
                     console.log("[useChatSocket] Ignoring 'declined' signal for active mesh");
                     return;
                 }
                 
                 if (!activeCallRef.current || (message.call_id && message.call_id === activeCallRef.current.call_id)) {
                     if (!activeCallRef.current) setActiveCall(null);
                     setIncomingCall(null);
                     setIsCalling(false);
                 }
              }
           }
        } else if (message.type === 'error') {
           if (message.code === 'LIMIT_REACHED') {
              showToast(message.message, 'error');
           } else {
              showToast(message.message || 'An error occurred', 'error');
           }
        } else if (message.type === 'webrtc_signal') {
            if (!activeCallIdRef.current || message.call_id !== activeCallIdRef.current) return;
            window.dispatchEvent(new CustomEvent('webrtc_signal', { detail: message }));
        }
      };

      socket.onclose = () => {
        if (isIntentionallyClosed) return;
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };
      
      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
        socket.close();
      };
    };

    connectWebSocket();

    return () => {
      isIntentionallyClosed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) {
        if (socket.readyState === WebSocket.CONNECTING) {
          socket.onopen = () => socket.close();
        } else {
          socket.close();
        }
      }
    };
  }, [user?.username]);

  // ─── Mark as Read Helper ────────────────────────────────────
  const markRoomAsRead = useCallback(async (rId) => {
    if (!rId || !user?.username) return;
    try {
      await markAsRead(user.username, rId);
      const now = new Date().toISOString();
      
      // Update DM partners locally for immediate UI feedback (sidebar dots)
      setDmPartners(prev => prev.map(p => {
        if (p.room_id === rId) {
          return { ...p, settings: { ...(p.settings || {}), last_read_timestamp: now } };
        }
        return p;
      }));

      // Update Groups locally
      setUserGroups(prev => prev.map(g => {
        if (g._id === rId) {
          return { ...g, settings: { ...(g.settings || {}), last_read_timestamp: now } };
        }
        return g;
      }));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  }, [user?.username, setDmPartners, setUserGroups]);

  // ─── Join room on selectedChat change ────────────────────────
  useEffect(() => {
    if (!roomId) return;
    
    // Clear messages immediately when switching rooms to prevent flickering stale content
    setMessages([]);
    currentRoomRef.current = roomId;
    pendingJoinRef.current = roomId;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'join_room', room: roomId }));
    }

    // Mark room as read on join
    markRoomAsRead(roomId);

    // AbortController prevents stale fetch from overwriting a newer room's messages
    const controller = new AbortController();
    fetch(`${API_BASE}/messages?room=${encodeURIComponent(roomId)}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        // Double-check we're still on this room (guard against rapid switching)
        if (currentRoomRef.current === roomId) {
          const history = Array.isArray(data) ? data : [];
          const filteredHistory = history.filter(m => m.type !== 'reaction_summary');
          setMessages(prev => {
            // Merge fetched history with any real-time messages that arrived after the fetch started
            const historyIds = new Set(filteredHistory.map(m => m._id || m.id));
            const realTimeMessages = prev.filter(m => !historyIds.has(m._id || m.id));
            return [...filteredHistory, ...realTimeMessages];
          });
        }
      })
      .catch(err => { if (err.name !== 'AbortError') console.error(err); });

    return () => controller.abort();
  }, [roomId, setMessages, markRoomAsRead]);



  // ─── Action Functions ────────────────────────────────────────
  const sendMessage = useCallback((overrideText, msgType = 'text', metadata = null, replyTo = null, editId = null) => {
    const msgText = overrideText || text;
    if (!msgText?.trim() && !metadata && msgType === 'text') return;
    if (!wsRef.current || wsRef.current.readyState !== 1) return;

    const payload = {
      type: editId ? 'edit_message' : 'message',
      room: metadata?.room_id || roomId,
      username: user.username,
      text: msgText?.trim() || '',
      message_type: msgType,
      metadata: metadata
    };
    if (replyTo) payload.reply_to = replyTo;
    if (editId) payload.message_id = editId;

    wsRef.current.send(JSON.stringify(payload));
    if (!overrideText) setText('');
    
    // Force scroll to bottom on send
    setTimeout(() => scrollToBottom(true), 100);

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'stop_typing', room: roomId, username: user.username }));
    }
  }, [text, roomId, user?.username, wsRef]);

  const handleTyping = useCallback(() => {
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'typing', room: roomId, username: user.username }));
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === 1) {
        wsRef.current.send(JSON.stringify({ type: 'stop_typing', room: roomId, username: user.username }));
      }
    }, 2000);
  }, [roomId, user?.username, wsRef]);

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollRef?.current) {
      scrollRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, [scrollRef]);

  const handleScroll = useCallback((e) => {
    const el = e.target;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distFromBottom > 200);
  }, []);

  return {
    text, setText,
    sendMessage,
    handleTyping,
    showScrollBottom,
    scrollToBottom,
    handleScroll
  };
};
