import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Image, ActivityIndicator, RefreshControl, Alert,
  ActionSheetIOS, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getRooms, getRoomId, togglePin, toggleMute, toggleArchive, markAsRead, clearRoomMessages, deleteRoom } from '../api/chat';
import { CHAT_API, USER_API } from '../api/config';
import { authAPI } from '../api/auth';
import { COLORS, RADIUS, SHADOW, FONTS } from '../theme';
import ActionSheet from '../components/ActionSheet';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function Avatar({ username, photoUrl, size = 52, isOnline }) {
  const initials = (username || '?').slice(0, 2).toUpperCase();
  const displayName = username ? username.charAt(0).toUpperCase() + username.slice(1) : '';

  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.avatarFrame, { width: size, height: size, borderRadius: 16, backgroundColor: COLORS.surfaceHigh }]}>
        {photoUrl
          ? <Image 
              source={{ uri: photoUrl.startsWith('http') ? photoUrl : `${USER_API}/uploads/${photoUrl.replace(/^\/?(api\/auth\/)?uploads\//i, '')}` }}
              style={{ width: '100%', height: '100%', borderRadius: 14 }} 
            />
          : <View style={[{ width: '100%', height: '100%', borderRadius: 14, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: COLORS.primaryDark, fontWeight: '900', fontSize: size * 0.35 }}>{initials}</Text>
            </View>
        }
      </View>
      {isOnline && (
        <View style={styles.onlineStatus} />
      )}
    </View>
  );
}

const ChatItem = ({ item, currentUsername, onlineUsers, onPress, onLongPress }) => {
  const isOnline = onlineUsers?.has(item.username?.toLowerCase());
  const lastMsg  = item.lastMessage;
  const unread   = lastMsg && item.settings?.last_read_timestamp
    ? new Date(lastMsg.timestamp) > new Date(item.settings.last_read_timestamp) && lastMsg.username !== currentUsername
    : false;

  return (
    <TouchableOpacity style={styles.chatItem} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
      <Avatar username={item.username} photoUrl={item.profilePhoto} size={54} isOnline={isOnline} />
      <View style={styles.chatInfo}>
        <View style={styles.chatRow}>
          <Text style={styles.chatName} numberOfLines={1}>
            {item.username ? item.username.charAt(0).toUpperCase() + item.username.slice(1) : item.name}
          </Text>
          <Text style={styles.chatTime}>{formatTime(lastMsg?.timestamp)}</Text>
        </View>
        <View style={styles.chatRow}>
          <View style={styles.chatPreviewWrap}>
             {item.settings?.is_muted && <Ionicons name="notifications-off" size={12} color={COLORS.textMuted} style={{ marginRight: 4 }} />}
             {item.settings?.is_pinned && <Ionicons name="pin" size={12} color={COLORS.primary} style={{ marginRight: 4 }} />}
             <Text style={[styles.chatPreview, unread && styles.unreadText]} numberOfLines={1}>
                 {lastMsg?.type === 'image' ? '📷 Photo' :
                  lastMsg?.type === 'audio' ? '🎵 Voice Message' :
                  lastMsg?.type === 'document' ? '📄 Document' :
                  lastMsg?.type === 'call_log' ? '📞 Call' :
                  lastMsg?.type === 'poll' ? '📊 Poll' :
                  lastMsg?.text || 'Start a conversation'}
             </Text>
          </View>
          {unread && <View style={styles.unreadBadge} />}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function ChatsScreen({ navigation }) {
  const { user, wsRef } = useAuth();
  const [partners, setPartners]       = useState([]);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showActionSheet, setShowActionSheet] = useState(false);

  useEffect(() => {
    if (!wsRef.current) return;
    const socket = wsRef.current;
    const handler = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'online_users') {
          setOnlineUsers(new Set(msg.users.map(u => u.toLowerCase())));
        } else if (msg.type === 'user_status') {
          setOnlineUsers(prev => {
            const next = new Set(prev);
            msg.status === 'online' ? next.add(msg.username.toLowerCase()) : next.delete(msg.username.toLowerCase());
            return next;
          });
        } else if (msg.type === 'message' || msg.type === 'call_log') {
          const data = msg.data || msg;
          if (data.room?.startsWith('dm:')) {
            const parts = data.room.replace('dm:', '').split(':');
            const partner = parts.find(p => p !== user.username.toLowerCase());
            if (partner) {
              setPartners(prev => {
                const idx = prev.findIndex(p => p.username.toLowerCase() === partner);
                const existing = idx > -1 ? prev[idx] : { username: partner, settings: {} };
                const updated  = { ...existing, lastMessage: data };
                const next = [...prev];
                if (idx > -1) next.splice(idx, 1);
                return [updated, ...next];
              });
            }
          }
        }
      } catch (err) { }
    };
    socket.addEventListener('message', handler);
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'get_online' }));
    }
    return () => { socket.removeEventListener('message', handler); };
  }, [wsRef.current, user?.username]);

  const fetchRooms = useCallback(async () => {
    if (!user?.username) return;
    try {
      const [roomsData, usersData] = await Promise.all([
        getRooms(user.username),
        authAPI.getUsers()
      ]);
      
      // Map profile photos from User Service to Chat partners
      const photoMap = {};
      const actualUsers = usersData?.users || [];
      actualUsers.forEach(u => {
        if (u.username && u.profilePhoto) {
          photoMap[u.username.toLowerCase()] = u.profilePhoto;
        }
      });

      const augmented = (roomsData || []).map(room => ({
        ...room,
        profilePhoto: room.profilePhoto || (room.username ? photoMap[room.username.toLowerCase()] : null)
      }));

      setPartners(augmented);
    } catch (err) {
      console.error('fetchRooms', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.username]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const showActions = (partner) => {
    setSelectedPartner(partner);
    setShowActionSheet(true);
  };

  const getActionOptions = (partner) => {
    if (!partner) return [];
    const roomId = getRoomId(partner.username, user.username);
    return [
      { 
        label: partner.settings?.is_pinned ? 'Unpin Chat' : 'Pin Chat', 
        icon: 'pin', 
        onPress: async () => { await togglePin(user.username, roomId, !partner.settings?.is_pinned); fetchRooms(); } 
      },
      { 
        label: partner.settings?.is_muted ? 'Unmute Notifications' : 'Mute Notifications', 
        icon: partner.settings?.is_muted ? 'notifications' : 'notifications-off', 
        onPress: async () => { await toggleMute(user.username, roomId, !partner.settings?.is_muted); fetchRooms(); } 
      },
      { 
        label: partner.settings?.is_archived ? 'Unarchive Chat' : 'Archive Chat', 
        icon: 'archive', 
        onPress: async () => { await toggleArchive(user.username, roomId, !partner.settings?.is_archived); fetchRooms(); } 
      },
      { 
        label: 'Mark as Read', 
        icon: 'checkmark-done', 
        onPress: async () => { await markAsRead(user.username, roomId); fetchRooms(); } 
      },
      { 
        label: 'Clear Messages', 
        icon: 'trash-outline', 
        onPress: async () => { 
          Alert.alert('Clear Messages', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: async () => { await clearRoomMessages(roomId); fetchRooms(); } }
          ]);
        } 
      },
      { 
        label: 'Delete Chat', 
        icon: 'trash', 
        isDestructive: true, 
        onPress: async () => { 
          Alert.alert('Delete Chat', 'Everything will be lost. Proceed?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => { await deleteRoom(user.username, roomId); fetchRooms(); } }
          ]);
        } 
      },
    ];
  };

  const filtered = partners.filter(p =>
    (p.username || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={{ width: 44, height: 44 }} 
            resizeMode="contain" 
          />
          <View>
            <Text style={styles.headerSubtitle}>MESSAGES</Text>
            <Text style={styles.headerTitle}>Chats</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Users')}>
           <Feather name="plus-circle" size={26} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrap}>
          <Feather name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 12 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRooms(); }} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={[styles.generalChat, SHADOW.soft]}
          onPress={() => navigation.navigate('ChatRoom', { chat: 'general-chat', title: 'Main Group' })}
          activeOpacity={0.9}
        >
          <View style={[styles.generalAvatar, { backgroundColor: COLORS.primary }]}>
            <MaterialCommunityIcons name="molecule" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.generalTitle}>General Chat</Text>
            <Text style={styles.generalSubtitle}>Public community chat</Text>
          </View>
          <View style={styles.statusIndicator}>
              <View style={styles.activeDot} />
          </View>
        </TouchableOpacity>

        {loading
          ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} size="large" />
          : <View style={styles.listContainer}>
              {filtered.length === 0 ? (
                <View style={styles.empty}>
                  <MaterialCommunityIcons name="ghost-off-outline" size={64} color={COLORS.surfaceDim} />
                  <Text style={styles.emptyText}>NO CHATS</Text>
                  <Text style={styles.emptySubText}>You don't have any messages yet.</Text>
                </View>
              ) : (
                filtered.map((item, i) => (
                  <ChatItem
                    key={item.room_id || item.username || i}
                    item={item}
                    currentUsername={user.username}
                    onlineUsers={onlineUsers}
                    onPress={() => navigation.navigate('ChatRoom', { 
                      chat: item.username, 
                      title: item.username, 
                      profilePhoto: item.profilePhoto, // Pass photo to header
                      partnerSettings: item.settings, 
                      initialIsOnline: onlineUsers?.has(item.username?.toLowerCase()),
                      initialLastSeen: item.last_seen || null,
                    })}
                    onLongPress={() => showActions(item)}
                  />
                ))
              )}
            </View>
        }
        <View style={{ height: 40 }} />
      </ScrollView>
      <ActionSheet 
        visible={showActionSheet}
        title={selectedPartner?.username}
        options={getActionOptions(selectedPartner)}
        onClose={() => setShowActionSheet(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.surface },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingTop: 16, paddingBottom: 24 },
  headerSubtitle:{ fontSize: 10, fontWeight: '900', color: COLORS.primary, letterSpacing: 2.5, marginBottom: 4 },
  headerTitle:   { fontSize: 42, fontWeight: '900', color: COLORS.textMain, letterSpacing: -1.5 },
  headerBtn:     { width: 52, height: 52, borderRadius: 18, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  
  searchContainer: { paddingHorizontal: 24, marginBottom: 28 },
  searchWrap:    { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.surfaceLow, 
    borderRadius: RADIUS.lg, 
    paddingHorizontal: 20, 
    height: 58,
  },
  searchInput:   { flex: 1, color: COLORS.textMain, fontSize: 15, fontWeight: '600' },
  
  generalChat:   { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginHorizontal: 24, 
    marginBottom: 32, 
    backgroundColor: COLORS.surfaceLowest, 
    borderRadius: 24, 
    padding: 20, 
    gap: 16 
  },
  generalAvatar: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  generalTitle:  { fontSize: 18, fontWeight: '800', color: COLORS.textMain, letterSpacing: -0.5 },
  generalSubtitle:{ fontSize: 12, color: COLORS.textSoft, fontWeight: '500', marginTop: 2 },
  generalIndicator: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  activeDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  
  listContainer: { paddingHorizontal: 12 },
  chatItem:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 18, gap: 16 },
  avatarFrame:   { padding: 2 },
  onlineStatus:  { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.primary, borderWidth: 3, borderColor: COLORS.surface },
  
  chatInfo:      { flex: 1, gap: 4 },
  chatRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName:      { fontSize: 17, fontWeight: '800', color: COLORS.textMain, letterSpacing: -0.3, flex: 1 },
  chatTime:      { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, opacity: 0.6 },
  chatPreviewWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  chatPreview:   { fontSize: 14, color: COLORS.textSoft, fontWeight: '500' },
  unreadText:    { color: COLORS.textMain, fontWeight: '800' },
  unreadBadge:   { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginLeft: 8 },
  
  empty:         { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText:     { color: COLORS.textMuted, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  emptySubText:  { color: COLORS.textMuted, fontSize: 13, fontWeight: '500', opacity: 0.6 },
});
