import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Image, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/auth';
import { USER_API } from '../api/config';
import { COLORS, RADIUS, SHADOW, FONTS } from '../theme';

const { width } = Dimensions.get('window');

function UserAvatar({ username, photoUrl, size = 52 }) {
  const initials = (username || '?').slice(0, 2).toUpperCase();
  const photo = photoUrl 
    ? { uri: photoUrl.startsWith('http') 
        ? photoUrl 
        : `${USER_API}/uploads/${photoUrl.replace(/^\/?(api\/auth\/)?uploads\//i, '')}` 
      } 
    : null;

  return (
    <View style={[styles.avatarFrame, { width: size, height: size, borderRadius: 18, backgroundColor: COLORS.surfaceHigh }]}>
       {photo ? (
         <Image source={photo} style={styles.avatarInner} />
       ) : (
         <View style={[styles.avatarInner, { backgroundColor: COLORS.primaryLight }]}>
           <Text style={{ color: COLORS.primaryDark, fontWeight: '900', fontSize: size * 0.35 }}>{initials}</Text>
         </View>
       )}
    </View>
  );
}

export default function UsersScreen({ navigation }) {
  const { user } = useAuth();
  const [users, setUsers]   = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await authAPI.getUsers();
      if (data.success) {
        setUsers(data.users.filter(u => u.username?.toLowerCase() !== user?.username?.toLowerCase()));
      }
    } catch (e) { }
    finally { setLoading(false); }
  }, [user?.username]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u =>
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email    || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.safe}
      >
        {/* Editorial Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="chevron-left" size={28} color={COLORS.textMain} />
          </TouchableOpacity>
          <View style={styles.headerText}>
             <Text style={styles.headerSubtitle}>FIND USERS</Text>
             <Text style={styles.headerTitle}>Users</Text>
          </View>
        </View>

        {/* Tonal Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Feather name="search" size={20} color={COLORS.textMuted} style={{ marginRight: 12 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search usernames..."
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {loading
          ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} size="large" />
          : <FlatList
              data={filtered}
              keyExtractor={(u, i) => u.id || String(i)}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.userCard, SHADOW.soft]}
                  onPress={() => navigation.navigate('ChatRoom', { 
                    chat: item.username, 
                    title: item.username,
                    profilePhoto: item.profilePhoto 
                  })}
                  activeOpacity={0.9}
                >
                  <UserAvatar username={item.username} photoUrl={item.profilePhoto} />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.username ? item.username.charAt(0).toUpperCase() + item.username.slice(1) : ''}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                  </View>
                  <View style={[styles.dmAction, { backgroundColor: COLORS.primaryLight }]}>
                     <Feather name="message-square" size={16} color={COLORS.primaryDark} />
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.empty}>
                  <MaterialCommunityIcons name="broadcast-off" size={64} color={COLORS.surfaceDim} />
                  <Text style={styles.emptyText}>NO USERS FOUND</Text>
                  <Text style={styles.emptySubText}>No users found matching your search.</Text>
                </View>
              )}
            />
        }
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.surface },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, marginBottom: 24, gap: 16 },
  backBtn:       { width: 52, height: 52, borderRadius: 18, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  headerText:    { flex: 1 },
  headerSubtitle:{ fontSize: 10, fontWeight: '900', color: COLORS.primary, letterSpacing: 2.5, marginBottom: 4 },
  headerTitle:   { fontSize: 36, fontWeight: '900', color: COLORS.textMain, letterSpacing: -1 },
  
  searchContainer: { paddingHorizontal: 20, marginBottom: 20 },
  searchBar:     { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLow, borderRadius: 20, paddingHorizontal: 20, height: 60 },
  searchInput:   { flex: 1, color: COLORS.textMain, fontSize: 15, fontWeight: '600' },
  
  userCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLowest, borderRadius: 24, padding: 16, marginBottom: 12, gap: 16 },
  avatarFrame:   { padding: 2 },
  avatarInner:   { width: '100%', height: '100%', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  userInfo:      { flex: 1 },
  userName:      { fontSize: 17, fontWeight: '800', color: COLORS.textMain, letterSpacing: -0.3 },
  userEmail:     { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, marginTop: 4, letterSpacing: 0.2, opacity: 0.6 },
  dmAction:      { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  
  empty:         { alignItems: 'center', marginTop: 100, gap: 12 },
  emptyText:     { fontSize: 14, fontWeight: '900', color: COLORS.textMuted, letterSpacing: 2.5 },
  emptySubText:  { fontSize: 13, fontWeight: '500', color: COLORS.textMuted, textAlign: 'center', opacity: 0.6, paddingHorizontal: 40 },
});
