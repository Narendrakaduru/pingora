import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator, Alert, Modal, Pressable, Keyboard, 
  Animated, PanResponder, Dimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { useAuth } from '../context/AuthContext';
import { getMessages, getRoomId, uploadFile, createPoll, markAsRead } from '../api/chat';
import { CHAT_API, USER_API } from '../api/config';
import { COLORS, RADIUS, SHADOW, FONTS } from '../theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

const EMOJIS = ['👍','❤️','😂','😮','😢','🔥','✨','🎉','🙌','🤔','👀','💯'];

// ─── VoicePlayer ──────────────────────────────────────────────────────────────
function VoicePlayer({ url, isMine }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function loadMetadata() {
      try {
        const { sound: newSound, status } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: false },
          (status) => {
            if (status.isLoaded && isMounted) {
              setPos(status.positionMillis);
              setDur(status.durationMillis || 0);
              if (status.didJustFinish) {
                setIsPlaying(false);
                setPos(0);
                newSound.setPositionAsync(0);
              }
            }
          }
        );
        if (isMounted) {
          setSound(newSound);
          setDur(status.durationMillis || 0);
        } else {
          newSound.unloadAsync();
        }
      } catch (err) { }
    }
    loadMetadata();
    return () => {
      isMounted = false;
      if (sound) sound.unloadAsync();
    };
  }, [url]);

  const togglePlay = async () => {
    if (!sound) return;
    if (isPlaying) { await sound.pauseAsync(); setIsPlaying(false); }
    else { await sound.playAsync(); setIsPlaying(true); }
  };

  const progress = dur > 0 ? pos / dur : 0;

  return (
    <View style={styles.audioRow}>
      <TouchableOpacity 
        onPress={togglePlay} 
        style={[styles.playBtn, { backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : COLORS.primary + '15' }]}
      >
        <Ionicons name={isPlaying ? "pause-sharp" : "play-sharp"} size={22} color={isMine ? '#fff' : COLORS.primary} />
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.waveformContainer}>
           <View style={[styles.waveformTrack, { backgroundColor: isMine ? 'rgba(255,255,255,0.1)' : COLORS.surfaceDim }]}>
              <View style={[styles.waveformProgress, { width: `${progress * 100}%`, backgroundColor: isMine ? '#fff' : COLORS.primary }]} />
           </View>
        </View>
        <Text style={[styles.audioLabel, { color: isMine ? 'rgba(255,255,255,0.6)' : COLORS.textMuted }]}>
          {dur > 0 ? `${Math.floor(pos/1000)}s` : 'Analyzing...'}
        </Text>
      </View>
    </View>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine, isRead, onReact, onJoin, currentUser, onImagePress }) {
  const [showReactions, setShowReactions] = useState(false);
  const fileUrl = msg.metadata?.file_url ? `${CHAT_API}${msg.metadata.file_url}` : null;
  const imageRef = useRef(null);

  const handleImagePress = () => {
    if (imageRef.current) {
      imageRef.current.measure((x, y, width, height, pageX, pageY) => {
        onImagePress(fileUrl, { x, y, width, height, pageX, pageY });
      });
    }
  };

  const renderContent = () => {
    if (msg.type === 'image') {
      return (
        <TouchableOpacity 
          style={styles.imageWrapper} 
          activeOpacity={0.9} 
          onPress={handleImagePress}
        >
           <Image 
             ref={imageRef}
             source={{ uri: fileUrl }} 
             style={styles.msgImage} 
             resizeMode="cover" 
           />
        </TouchableOpacity>
      );
    }
    if (msg.type === 'audio') {
      return <VoicePlayer url={fileUrl} isMine={isMine} />;
    }
    if (msg.type === 'document') {
      return (
        <View style={styles.docRow}>
          <View style={[styles.docIconWrap, { backgroundColor: isMine ? 'rgba(255,255,255,0.1)' : COLORS.primary + '10' }]}>
             <Feather name="file-text" size={20} color={isMine ? '#fff' : COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
             <Text style={[styles.docName, { color: isMine ? '#fff' : COLORS.textMain }]} numberOfLines={1}>
                {msg.metadata?.file_name || 'Document_File.pdf'}
             </Text>
             <Text style={[styles.docSize, { color: isMine ? 'rgba(255,255,255,0.5)' : COLORS.textMuted }]}>
                Secure Document Data
             </Text>
          </View>
        </View>
      );
    }
    if (msg.type === 'poll') {
      return (
        <View style={styles.pollCard}>
          <Text style={[styles.pollQ, { color: isMine ? '#fff' : COLORS.textMain }]}>
            📊 {msg.metadata?.question}
          </Text>
          {(msg.metadata?.options || []).map((opt, i) => {
            const total = (msg.metadata?.options || []).reduce((s, o) => s + (o.votes?.length || 0), 0);
            const pct   = total ? Math.round((opt.votes?.length || 0) / total * 100) : 0;
            const voted = opt.votes?.includes(currentUser);
            return (
              <TouchableOpacity
                key={i}
                style={[styles.pollOpt, { backgroundColor: isMine ? 'rgba(255,255,255,0.1)' : COLORS.surfaceLow }, voted && { backgroundColor: isMine ? '#fff' : COLORS.primary }]}
                onPress={() => onReact && onReact('poll_vote', msg._id, i)}
              >
                <Text style={[styles.pollOptText, voted && { color: isMine ? COLORS.primary : '#fff' }, !voted && { color: isMine ? '#fff' : COLORS.textSoft }]}>{opt.text}</Text>
                <Text style={[styles.pollPct, voted && { color: isMine ? COLORS.primary : '#fff', fontWeight: '900' }, !voted && { color: isMine ? 'rgba(255,255,255,0.4)' : COLORS.textMuted }]}>{pct}%</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }
    if (msg.type === 'call_log') {
       const isMissed = msg.metadata?.status === 'missed';
       return (
         <View style={styles.callLogChip}>
           <Feather name={isMissed ? "phone-missed" : "phone-call"} size={14} color={isMissed ? COLORS.error : COLORS.primary} />
           <Text style={styles.callLogText}>{msg.text}</Text>
         </View>
       );
    }
    if (msg.type === 'meeting_card') {
      return (
        <View style={styles.meetingCard}>
          <View style={styles.meetingHeader}>
            <View style={[styles.meetingIconWrap, { backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : COLORS.primary + '15' }]}>
               <Feather name="calendar" size={24} color={isMine ? '#fff' : COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
               <Text style={[styles.meetingTitle, { color: isMine ? '#fff' : COLORS.textMain }]} numberOfLines={1}>
                 {msg.metadata?.meeting_title || 'Meeting Session'}
               </Text>
               <Text style={[styles.meetingTime, { color: isMine ? 'rgba(255,255,255,0.6)' : COLORS.textMuted }]}>
                  {msg.metadata?.start_time && msg.metadata?.end_time 
                    ? `${formatTime(msg.metadata.start_time)} - ${formatTime(msg.metadata.end_time)}`
                    : 'Active Now'}
               </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.joinBtn, { backgroundColor: isMine ? '#fff' : COLORS.primary }]}
            onPress={() => onJoin && onJoin()}
          >
            <Text style={[styles.joinBtnText, { color: isMine ? COLORS.primary : '#fff' }]}>JOIN SESSION</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return <Text style={[styles.msgText, { color: isMine ? '#424242' : COLORS.textMain }]}>{msg.text}</Text>;
  };

  if (msg.type === 'call_log') {
     return (
       <View style={styles.callLogCenter}>
          {renderContent()}
          <Text style={styles.callLogTime}>{formatTime(msg.timestamp)}</Text>
       </View>
     );
  }

  return (
    <View style={[styles.bubbleRow, isMine ? styles.myRow : styles.theirRow]}>
      <TouchableOpacity
        onLongPress={() => setShowReactions(true)}
        activeOpacity={0.9}
        style={{ maxWidth: '85%' }}
      >
        <View style={[
          styles.bubble, 
          isMine ? styles.myBubble : styles.theirBubble,
          SHADOW.soft
        ]}>
          {!isMine && <Text style={styles.senderName}>{msg.username}</Text>}
          {renderContent()}
          <View style={styles.metaRow}>
            <Text style={[styles.bubbleTime, { color: isMine ? '#424242cc' : COLORS.textMuted }]}>
              {formatTime(msg.timestamp)}
            </Text>
            {isMine && (
               <View style={styles.statusIcons}>
                   <Ionicons name={isRead ? "checkmark-done" : "checkmark"} size={14} color={isRead ? '#34B7F1' : '#424242cc'} />
               </View>
            )}
          </View>
        </View>

        {msg.reactions?.length > 0 && (
          <View style={[styles.reactContainer, isMine ? { right: 4 } : { left: 4 }]}>
             <View style={styles.reactChipGroup}>
               {Object.entries(msg.reactions.reduce((acc, r) => ({ ...acc, [r.emoji]: (acc[r.emoji] || 0) + 1 }), {})).map(([emoji, count]) => (
                  <View key={emoji} style={[styles.reactChip, SHADOW.soft]}>
                     <Text style={styles.reactEmojiText}>{emoji}</Text>
                     {count > 1 && <Text style={styles.reactCountText}>{count}</Text>}
                  </View>
               ))}
             </View>
          </View>
        )}
      </TouchableOpacity>

      {showReactions && (
        <Modal transparent animationType="fade" visible={showReactions} onRequestClose={() => setShowReactions(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowReactions(false)}>
             <View style={[styles.reactionToolbar, isMine ? { alignSelf: 'flex-end', marginRight: 20 } : { alignSelf: 'flex-start', marginLeft: 20 }]}>
                {EMOJIS.map(e => (
                   <TouchableOpacity key={e} onPress={() => { onReact('reaction', msg._id, e); setShowReactions(false); }} style={styles.emojiBtn}>
                      <Text style={{ fontSize: 24 }}>{e}</Text>
                   </TouchableOpacity>
                ))}
             </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ChatRoomScreen({ route, navigation }) {
  const { chat, title, profilePhoto, partnerSettings, initialIsOnline, initialLastSeen } = route.params;
  const { user, wsRef, isWsConnected, setActiveCall } = useAuth();
  
  const partnerPhotoUri = profilePhoto 
    ? { uri: profilePhoto.startsWith('http') 
        ? profilePhoto 
        : `${USER_API}/uploads/${profilePhoto.replace(/^\/?(api\/auth\/)?uploads\//i, '')}` }
    : null;
  
  const roomId = getRoomId(chat, user?.username);
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading]         = useState(true);
  const [isCalling, setIsCalling]     = useState(false);
  const [callError, setCallError]     = useState(null);
  const [activeCallId, setActiveCallId] = useState(null);
  const [isOnline, setIsOnline]       = useState(initialIsOnline || false);
  const [lastSeen, setLastSeen]       = useState(initialLastSeen || null);
  const [partnerLastRead, setPartnerLastRead] = useState(partnerSettings?.partner_last_read_timestamp || null);
  const [showAttach, setShowAttach]   = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQ, setPollQ] = useState('');
  const [pollOpts, setPollOpts] = useState(['', '']);

  // --- Advanced Image Viewer State ---
  const [viewingImage, setViewingImage] = useState(null);
  const [sourceLayout, setSourceLayout] = useState(null);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY()).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 10,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          pan.y.setValue(gesture.dy);
          const opacity = 1 - (gesture.dy / 300);
          bgOpacity.setValue(Math.max(0, opacity));
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 150 || gesture.vy > 0.5) {
          closeViewer();
        } else {
          Animated.parallel([
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }),
            Animated.timing(bgOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
          ]).start();
        }
      },
    })
  ).current;

  const openViewer = (url, layout) => {
    setViewingImage(url);
    setSourceLayout(layout);
    pan.setValue({ x: 0, y: 0 });
    bgOpacity.setValue(0);
    expandAnim.setValue(0);
    
    Animated.parallel([
      Animated.spring(expandAnim, { toValue: 1, useNativeDriver: false, bounciness: 8 }),
      Animated.timing(bgOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
    ]).start();
  };

  const closeViewer = () => {
    Animated.parallel([
      Animated.timing(expandAnim, { toValue: 0, duration: 250, useNativeDriver: false }),
      Animated.timing(bgOpacity, { toValue: 0, duration: 250, useNativeDriver: false }),
    ]).start(() => {
      setViewingImage(null);
      setSourceLayout(null);
    });
  };

  const [recording, setRecording]     = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const flatRef = useRef();

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => {
        flatRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    return () => showSub.remove();
  }, [roomId]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMessages(roomId);
        setMessages(data);
        await markAsRead(user.username, roomId);
      } catch (e) { }
      finally { setLoading(false); }
    })();
  }, [roomId]);

  useEffect(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'join_room', room: roomId }));

    const handler = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if ((msg.type === 'message' || msg.type === 'call_log') && (msg.data?.room === roomId || msg.room === roomId)) {
          setMessages(prev => [...prev, msg.data || msg]);
          if (roomId !== 'general-chat') markAsRead(user.username, roomId).catch(() => {});
        } else if ((msg.type === 'reaction_update' || msg.type === 'poll_update') && msg.data?.room === roomId) {
          setMessages(prev => prev.map(m => m._id === msg.data._id ? msg.data : m));
        } else if (msg.type === 'user_status' && typeof chat === 'string' && msg.username.toLowerCase() === chat.toLowerCase()) {
          const online = msg.status === 'online';
          setIsOnline(online);
          if (!online && msg.last_seen) setLastSeen(msg.last_seen);
        } else if (msg.type === 'read_receipt' && msg.room === roomId) {
          if (msg.username !== user.username) setPartnerLastRead(msg.timestamp);
        } else if (msg.type === 'call_response' && msg.from?.toLowerCase() === chat.toLowerCase()) {
           if (msg.call_id === activeCallId) { 
              if (msg.accepted) {
                 setIsCalling(false); setActiveCallId(null);
                 setActiveCall({ target: chat, call_id: msg.call_id, type: msg.call_type || 'video', isCaller: true });
              } else {
                 setCallError('rejected'); setTimeout(() => { setIsCalling(false); setCallError(null); setActiveCallId(null); }, 3000);
              }
           }
        } else if (msg.type === 'call_hangup') { setIsCalling(false); setCallError(null); }
      } catch (err) {}
    };
    wsRef.current.addEventListener('message', handler);
    return () => {
      wsRef.current?.removeEventListener('message', handler);
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: 'leave_room', room: roomId }));
    };
  }, [wsRef.current, roomId, chat]);

  useEffect(() => { if (messages.length > 0) setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100); }, [messages.length]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => showSub.remove();
  }, [messages.length]);

  const sendMessage = () => {
    if (!text.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'message', room: roomId, text: text.trim() }));
    setText('');
  };

  const initiateCall = (type) => {
    const target = typeof chat === 'string' ? chat : chat._id;
    if (target === 'general-chat') return;
    const cid = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    wsRef.current.send(JSON.stringify({ type: 'call_request', target, call_type: type, call_id: cid }));
    setIsCalling(true); setActiveCallId(cid);
  };

  const uploadAndSend = async (uri, name, mime, type) => {
     try { await uploadFile(uri, name, mime, roomId, user.username, user.id, type); } catch (e) { Alert.alert('Error', 'Transmission failed.'); }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!res.canceled) uploadAndSend(res.assets[0].uri, `cam_${Date.now()}.jpg`, 'image/jpeg', 'image');
    setShowAttach(false);
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!res.canceled) uploadAndSend(res.assets[0].uri, res.assets[0].fileName || 'chat_img', res.assets[0].mimeType || 'image/jpeg', 'image');
    setShowAttach(false);
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec); setIsRecording(true); setShowAttach(false);
    } catch (e) { }
  };

  const stopRecording = async () => {
    if (!recording) return setIsRecording(false);
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      uploadAndSend(uri, `voice_${Date.now()}.m4a`, 'audio/m4a', 'audio');
      setRecording(null);
    } catch (e) { setRecording(null); }
  };

  const renderItem = ({ item, index }) => {
    const isMine = item.username?.toLowerCase() === user?.username?.toLowerCase();
    const prevMsg = messages[index - 1];
    const showDate = !prevMsg || formatDate(item.timestamp) !== formatDate(prevMsg.timestamp);
    const isRead = partnerLastRead ? new Date(item.timestamp || Date.now()) <= new Date(partnerLastRead) : false;
    return (
      <View key={item._id || index}>
        {showDate && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
            <View style={styles.dateLine} />
          </View>
        )}
        <MessageBubble msg={item} isMine={isMine} isRead={isRead} currentUser={user?.username} 
           onJoin={() => initiateCall('video')}
           onImagePress={openViewer}
           onReact={(t, id, p) => {
             if (t === 'reaction') wsRef.current.send(JSON.stringify({ type: 'reaction', room: roomId, message_id: id, emoji: p }));
             else if (t === 'poll_vote') wsRef.current.send(JSON.stringify({ type: 'poll_vote', room: roomId, message_id: id, option_index: p }));
        }} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Chat Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Feather name="chevron-left" size={28} color={COLORS.textMain} />
          </TouchableOpacity>
          
          {chat !== 'general-chat' && (
            <View style={styles.headerAvatarWrap}>
              {partnerPhotoUri ? (
                <Image source={partnerPhotoUri} style={styles.headerAvatar} />
              ) : (
                <View style={[styles.headerAvatar, { backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: COLORS.primaryDark, fontWeight: 'bold', fontSize: 14 }}>
                    {(title || chat || '?')[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={1}>
              {(() => {
                const name = title || (typeof chat === 'string' ? (chat === 'general-chat' ? 'Public Room' : chat) : (chat?.name || 'Group Chat'));
                return name.charAt(0).toUpperCase() + name.slice(1);
              })()}
            </Text>
            <View style={styles.statusRow}>
               <View style={[styles.statusPoint, { backgroundColor: isOnline ? COLORS.primary : COLORS.textMuted }]} />
               <Text style={styles.statusText}>
                 {isOnline ? 'ONLINE' : (() => {
                   if (!lastSeen) return 'OFFLINE';
                   const d = new Date(lastSeen);
                   const isToday = d.toDateString() === new Date().toDateString();
                   const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                   return isToday
                     ? `LAST SEEN AT ${timeStr}`
                     : `LAST SEEN ${d.toLocaleDateString([], { day: '2-digit', month: 'short' }).toUpperCase()}`;
                 })()}
               </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {(typeof chat === 'string' ? chat : (chat._id || '')) !== 'general-chat' && (
              <>
                 <TouchableOpacity onPress={() => initiateCall('voice')} style={styles.iconBtn}>
                   <Feather name="phone" size={20} color={COLORS.textMain} />
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => initiateCall('video')} style={styles.iconBtn}>
                   <Feather name="video" size={22} color={COLORS.textMain} />
                 </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Connection Notice */}
        {!isWsConnected && (
           <View style={styles.warningBanner}>
              <ActivityIndicator size="small" color={COLORS.error} />
              <Text style={styles.warningText}>CONNECTING...</Text>
           </View>
        )}

        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m, i) => m._id || String(i)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 10 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No messages yet</Text></View>}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Floating Organic Input */}
        <View style={styles.inputContainer}>
          <View style={[styles.inputBar, SHADOW.soft]}>
            {isRecording ? (
               <View style={styles.recordingOverlay}>
                  <View style={styles.statusIndicator} />
                  <Text style={styles.recordingLabel}>Recording...</Text>
                  <TouchableOpacity onPress={stopRecording} style={styles.stopBtn}>
                     <Feather name="mic" size={18} color="#fff" />
                  </TouchableOpacity>
               </View>
            ) : (
               <>
                  <TouchableOpacity style={styles.plusBtn} onPress={() => setShowAttach(!showAttach)}>
                     <Feather name={showAttach ? "x" : "plus"} size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor={COLORS.textMuted}
                    value={text}
                    onChangeText={setText}
                    multiline
                  />
                  {text.trim() ? (
                    <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
                       <Feather name="arrow-up" size={24} color="#fff" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.micBtn} onPress={startRecording}>
                       <Feather name="mic" size={20} color={COLORS.textSoft} />
                    </TouchableOpacity>
                  )}
               </>
            )}
          </View>
        </View>

        {/* Attachment Menu (Overlay) */}
        {showAttach && (
           <View style={styles.attachOverlay}>
              <View style={styles.attachGrid}>
                 {[
                    { icon: 'camera', label: 'Camera', action: handleCamera, color: '#10B981' },
                    { icon: 'image', label: 'Gallery', action: pickImage, color: '#3B82F6' },
                    { icon: 'mic', label: 'Audio', action: startRecording, color: '#8B5CF6' },
                    { icon: 'file-text', label: 'Document', action: async () => { setShowAttach(false); await pickDoc(); }, color: '#F59E0B' },
                    { icon: 'bar-chart-2', label: 'Poll', action: () => { setShowAttach(false); setShowPoll(true); }, color: '#EC4899' },
                 ].map(item => (
                   <TouchableOpacity key={item.label} style={styles.attachBox} onPress={item.action}>
                      <View style={[styles.attachCircle, { backgroundColor: item.color + '15' }]}>
                         <Feather name={item.icon} size={22} color={item.color} />
                      </View>
                      <Text style={styles.attachText}>{item.label}</Text>
                   </TouchableOpacity>
                 ))}
              </View>
           </View>
        )}
      </KeyboardAvoidingView>

      {/* Poll Creation (Modal) */}
      <Modal visible={showPoll} animationType="slide" transparent>
         <View style={styles.modalFull}>
            <View style={[styles.pollModal, SHADOW.medium]}>
               <Text style={styles.pollModalTitle}>CREATE POLL</Text>
               <TextInput style={styles.pollModalInput} placeholder="Poll Question?" value={pollQ} onChangeText={setPollQ} />
               {pollOpts.map((o, i) => (
                  <View key={i} style={styles.pollOptRow}>
                     <TextInput 
                        style={[styles.pollModalInput, { flex: 1, marginBottom: 0 }]} 
                        placeholder={`Option ${i+1}`} 
                        value={o} 
                        onChangeText={v => setPollOpts(prev => prev.map((x, j) => j === i ? v : x))} 
                     />
                     {i > 1 && <TouchableOpacity onPress={() => setPollOpts(p => p.filter((_, j) => j !== i))}><Feather name="minus-circle" size={20} color={COLORS.error} /></TouchableOpacity>}
                  </View>
               ))}
               <TouchableOpacity style={styles.addOpt} onPress={() => setPollOpts(p => [...p, ''])}>
                  <Feather name="plus" size={16} color={COLORS.primary} />
                  <Text style={styles.addOptText}>ADD OPTION</Text>
               </TouchableOpacity>
               <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPoll(false)}><Text style={styles.cancelBtnText}>CANCEL</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={async () => {
                     const opts = pollOpts.filter(o => o.trim());
                     await createPoll(roomId, user.username, pollQ, opts);
                     setShowPoll(false); setPollQ(''); setPollOpts(['','']);
                  }}><Text style={styles.confirmBtnText}>CREATE</Text></TouchableOpacity>
               </View>
            </View>
         </View>
      </Modal>

      {/* Global Call Overlay (Handled via useAuth, but keep local logic for visual only) */}
      <Modal visible={isCalling} transparent animationType="fade">
        <View style={styles.callingView}>
           <BlurView intensity={90} style={StyleSheet.absoluteFill} />
           <View style={styles.callingProfile}>
              <View style={styles.callCircleLarge}>
                 <MaterialCommunityIcons name="molecule" size={80} color={COLORS.primary} />
              </View>
              <Text style={styles.callingName}>@{chat}</Text>
              <Text style={styles.callingSub}>{callError === 'rejected' ? 'CALL REJECTED' : 'Calling...'}</Text>
           </View>
           <TouchableOpacity style={styles.hangupBtn} onPress={() => { wsRef.current.send(JSON.stringify({ type: 'call_hangup', target: chat, call_id: activeCallId })); setIsCalling(false); }}>
              <Feather name="x" size={32} color="#fff" />
           </TouchableOpacity>
        </View>
      </Modal>

      {/* Advanced Full Screen Image Viewer Overlay */}
      {viewingImage && (
        <Animated.View 
          style={[
            StyleSheet.absoluteFill, 
            { backgroundColor: 'black', opacity: bgOpacity, zIndex: 1000 }
          ]} 
        />
      )}
      
      {viewingImage && sourceLayout && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 1001 }]} pointerEvents="box-none">
          <Animated.Image
            {...panResponder.panHandlers}
            source={{ uri: viewingImage }}
            style={[
              {
                position: 'absolute',
                top: expandAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [sourceLayout.pageY, (Dimensions.get('window').height - (Dimensions.get('window').width * (sourceLayout.height / sourceLayout.width))) / 2]
                }),
                left: expandAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [sourceLayout.pageX, 0]
                }),
                width: expandAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [sourceLayout.width, Dimensions.get('window').width]
                }),
                height: expandAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [sourceLayout.height, Dimensions.get('window').width * (sourceLayout.height / sourceLayout.width)]
                }),
                transform: pan.getTranslateTransform(),
                borderRadius: expandAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0]
                })
              }
            ]}
            resizeMode="contain"
          />
          
          <TouchableOpacity 
            onPress={closeViewer} 
            style={{ 
              position: 'absolute', 
              top: 60, 
              right: 20, 
              padding: 12,
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: 24
            }}
          >
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.surface },
  header:        { backgroundColor: COLORS.surfaceHigh, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 80 },
  headerInfo:    { flex: 1, marginLeft: 10, justifyContent: 'center' },
  title:         { fontSize: 20, fontWeight: '900', color: COLORS.textMain, letterSpacing: -0.5, marginBottom: -2 },
  statusRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 0 },
  statusPoint:   { width: 7, height: 7, borderRadius: 4, marginRight: 5, marginTop: 1 },
  statusText:    { fontSize: 9, fontWeight: '900', color: COLORS.textSoft, letterSpacing: 1.2, textTransform: 'uppercase' },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconBtn:       { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  
  warningBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(220, 38, 38, 0.05)', paddingVertical: 10 },
  warningText:   { fontSize: 10, fontWeight: '900', color: COLORS.error, letterSpacing: 2, marginLeft: 10 },
  
  dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 32, paddingHorizontal: 40 },
  dateLine:      { flex: 1, height: 1.5, backgroundColor: COLORS.surfaceDim },
  dateText:      { paddingHorizontal: 20, fontSize: 10, fontWeight: '900', color: COLORS.textMuted, letterSpacing: 2, uppercase: true },
  
  bubbleRow:     { marginVertical: 6 },
  myRow:         { alignItems: 'flex-end' },
  theirRow:      { alignItems: 'flex-start' },
  bubble:        { padding: 10, borderRadius: 16 },
  myBubble:      { backgroundColor: 'rgb(172, 237, 187)', borderBottomRightRadius: 6 },
  theirBubble:   { backgroundColor: COLORS.surfaceLowest, borderBottomLeftRadius: 6 },
  senderName:    { fontSize: 10, fontWeight: '900', color: COLORS.primary, marginBottom: 6, letterSpacing: 0.5 },
  msgText:       { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  metaRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 },
  bubbleTime:    { fontSize: 10, fontWeight: '700' },
  statusIcons:   { marginLeft: 6 },
  
  imageWrapper:  { borderRadius: 16, overflow: 'hidden', marginVertical: 4 },
  msgImage:      { width: 240, height: 280 },
  
  audioRow:      { flexDirection: 'row', alignItems: 'center', minWidth: 200, paddingVertical: 4 },
  playBtn:       { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  waveformContainer: { height: 6, justifyContent: 'center' },
  waveformTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  waveformProgress: { height: '100%' },
  audioLabel:    { fontSize: 10, fontWeight: '800', marginTop: 4 },
  
  docRow:        { flexDirection: 'row', alignItems: 'center', padding: 4, gap: 12 },
  docIconWrap:   { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  docName:       { fontSize: 14, fontWeight: '700' },
  docSize:       { fontSize: 10, fontWeight: '800', marginTop: 2 },
  
  pollCard:      { minWidth: 220 },
  pollQ:         { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  pollOpt:       { height: 52, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pollOptText:   { fontSize: 14, fontWeight: '700' },
  pollPct:       { fontSize: 12 },
  
  callLogCenter: { alignItems: 'center', marginVertical: 20 },
  callLogChip:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceHigh, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 8 },
  callLogText:   { fontSize: 12, fontWeight: '700', color: COLORS.textSoft },
  callLogTime:   { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, marginTop: 6, letterSpacing: 1 },
  
  reactContainer:{ position: 'absolute', bottom: -14, zIndex: 100 },
  reactChipGroup:{ flexDirection: 'row', gap: 4 },
  reactChip:     { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.white, 
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerAvatarWrap: {
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
  },
  reactEmojiText:{ fontSize: 13 },
  reactCountText:{ fontSize: 10, fontWeight: '900', color: COLORS.textMain, marginLeft: 2 },
  
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingBottom: 100 },
  reactionToolbar: { flexDirection: 'row', backgroundColor: COLORS.surfaceLowest, borderRadius: 24, padding: 8, gap: 12, marginHorizontal: 20 },
  emojiBtn:      { padding: 8 },
  
  inputContainer:{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12, backgroundColor: COLORS.surface },
  inputBar:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLowest, borderRadius: 32, padding: 8 },
  plusBtn:       { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  input:         { flex: 1, paddingHorizontal: 16, color: COLORS.textMain, fontSize: 15, fontWeight: '600', maxHeight: 120 },
  sendBtn:       { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  micBtn:        { padding: 12 },
  
  recordingOverlay: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  statusIndicator: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.error, marginRight: 12 },
  recordingLabel: { flex: 1, fontSize: 14, fontWeight: '900', color: COLORS.error, letterSpacing: 1 },
  stopBtn:       { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center' },
  
  attachOverlay: { position: 'absolute', bottom: 100, left: 16, right: 16, zIndex: 100 },
  attachGrid:    { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: COLORS.surfaceLowest, borderRadius: 32, padding: 20, gap: 10 },
  attachBox:     { width: '30%', alignItems: 'center', marginVertical: 10 },
  attachCircle:  { width: 56, height: 56, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  attachText:    { fontSize: 10, fontWeight: '900', color: COLORS.textSoft, marginTop: 8, uppercase: true, letterSpacing: 1 },
  
  modalFull:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  pollModal:     { backgroundColor: COLORS.surfaceLowest, borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, paddingBottom: 48 },
  pollModalTitle:{ fontSize: 12, fontWeight: '900', color: COLORS.primary, letterSpacing: 2, marginBottom: 24, textAlign: 'center' },
  pollModalInput:{ backgroundColor: COLORS.surfaceLow, borderRadius: 16, padding: 18, color: COLORS.textMain, fontSize: 16, fontWeight: '600', marginBottom: 16 },
  pollOptRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  addOpt:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  addOptText:    { fontSize: 11, fontWeight: '900', color: COLORS.primary, letterSpacing: 1 },
  modalBtns:     { flexDirection: 'row', gap: 16, marginTop: 32 },
  cancelBtn:     { flex: 1, height: 62, borderRadius: 20, backgroundColor: COLORS.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  confirmBtn:    { flex: 1, height: 62, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: COLORS.textSoft, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  confirmBtnText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  
  callingView:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center' },
  callingProfile:{ alignItems: 'center' },
  callCircleLarge: { width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  callingName:   { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1.5 },
  callingSub:    { fontSize: 12, fontWeight: '900', color: COLORS.primary, letterSpacing: 2, marginTop: 12 },
  hangupBtn:     { position: 'absolute', bottom: 80, width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center' },
  
  emptyContainer:{ flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText:     { fontSize: 12, fontWeight: '900', color: COLORS.surfaceDim, letterSpacing: 4 },
  
  meetingCard:   { minWidth: 260, padding: 8 },
  meetingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  meetingIconWrap:{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  meetingTitle:  { fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  meetingTime:   { fontSize: 11, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  joinBtn:       { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  joinBtnText:   { fontSize: 11, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
});
