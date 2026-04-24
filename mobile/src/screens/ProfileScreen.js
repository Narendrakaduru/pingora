import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, TextInput, Alert, ActivityIndicator, Dimensions,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { USER_API } from '../api/config';
import { COLORS, RADIUS, SHADOW, FONTS } from '../theme';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const [editing, setEditing]   = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail]       = useState(user?.email || '');
  const [avatar, setAvatar]     = useState(null);
  const [shouldRemovePhoto, setShouldRemovePhoto] = useState(false);
  const [saving, setSaving]     = useState(false);

  const photoUrl = avatar
    ? { uri: avatar }
    : (user?.profilePhoto && !shouldRemovePhoto)
    ? { uri: user.profilePhoto.startsWith('http')
        ? user.profilePhoto
        : `${USER_API}/uploads/${user.profilePhoto.replace(/^\/?(api\/auth\/)?uploads\//i, '')}` 
      }
    : null;

  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setAvatar(res.assets[0].uri);
      setShouldRemovePhoto(false);
    }
  };

  const removePortrait = () => {
    setAvatar(null);
    setShouldRemovePhoto(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('username', username.toLowerCase());
      fd.append('email', email.toLowerCase());
      if (avatar) {
        fd.append('profilePhoto', { uri: avatar, name: 'avatar.jpg', type: 'image/jpeg' });
      } else if (shouldRemovePhoto) {
        fd.append('removePhoto', 'true');
      }
      await updateProfile(fd);
      setEditing(false);
      setAvatar(null);
      setShouldRemovePhoto(false);
      Alert.alert('Status Updated', 'Profile updated successfully.');
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Update failed.');
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout of your account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'LOGOUT', style: 'destructive', onPress: logout },
    ]);
  };

  const initials = (user?.username || '?').slice(0, 2).toUpperCase();

  const stats = [
    { label: 'Joined Date', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' }) : '–' },
    { label: 'Status', value: 'ONLINE' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.safe}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Editorial Title */}
          <View style={styles.header}>
             <Text style={styles.headerSubtitle}>USER PROFILE</Text>
             <Text style={styles.headerTitle}>Profile</Text>
          </View>

          {/* Profile Card */}
          <View style={[styles.profileHero, SHADOW.soft]}>
            <TouchableOpacity onPress={editing ? pickAvatar : undefined} style={styles.avatarContainer} activeOpacity={editing ? 0.7 : 1}>
              <View style={[styles.avatarFrame, { backgroundColor: COLORS.surfaceHigh }]}>
                {photoUrl
                  ? <Image source={photoUrl} style={styles.avatarImg} />
                  : <View style={[styles.avatarImg, { backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={styles.avatarInitials}>{initials}</Text>
                    </View>
                }
              </View>
              {editing && (
                <>
                  <View style={styles.camBtn}>
                    <Feather name="camera" size={16} color="#fff" />
                  </View>
                  {(avatar || user?.profilePhoto) && !shouldRemovePhoto && (
                    <TouchableOpacity 
                      style={styles.trashBtn} 
                      onPress={removePortrait}
                    >
                      <Feather name="trash-2" size={16} color="#fff" />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </TouchableOpacity>

            {!editing && (
              <View style={styles.heroInfo}>
                <Text style={styles.heroUsername}>
                  {user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : ''}
                </Text>
                <Text style={styles.heroEmail}>{user?.email}</Text>
              </View>
            )}
          </View>

          {/* Tonal Stats Area */}
          {!editing && (
            <View style={styles.statsGrid}>
              {stats.map(s => (
                <View key={s.label} style={styles.statNode}>
                  <Text style={stats.indexOf(s) === 1 ? styles.statValueStatus : styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Edit Form (Tonal Inputs) */}
          {editing ? (
            <View style={styles.editSection}>
              <View style={styles.fieldNode}>
                <Text style={styles.fieldLabel}>USERNAME</Text>
                <View style={styles.inputWrap}>
                  <Feather name="at-sign" size={18} color={COLORS.primary} style={{ marginRight: 12 }} />
                  <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" placeholderTextColor={COLORS.textMuted} />
                </View>
              </View>

              <View style={styles.fieldNode}>
                <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
                <View style={styles.inputWrap}>
                  <Feather name="mail" size={18} color={COLORS.primary} style={{ marginRight: 12 }} />
                  <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={COLORS.textMuted} />
                </View>
              </View>

              <View style={styles.editActions}>
                <TouchableOpacity onPress={() => { setEditing(false); setAvatar(null); }} style={styles.abortBtn}>
                  <Text style={styles.abortText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={{ flex: 1.5 }}>
                    <View style={[styles.saveBtn, { backgroundColor: COLORS.primary }]}>
                      {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>SAVE CHANGES</Text>}
                    </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.menuRange}>
              {[
                { icon: 'edit-3', label: 'Edit Profile', color: COLORS.primary, action: () => setEditing(true) },
                { icon: 'bell', label: 'Notifications', color: '#6366F1', action: () => Alert.alert('Coming soon') },
                { icon: 'shield', label: 'Security', color: '#10B981', action: () => Alert.alert('Coming soon') },
                { icon: 'moon', label: 'Appearance', color: '#F59E0B', action: () => Alert.alert('Coming soon') },
                { icon: 'help-circle', label: 'Support', color: COLORS.textSoft, action: () => Alert.alert('Coming soon') },
              ].map(item => (
                <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.action} activeOpacity={0.7}>
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '10' }]}>
                    <Feather name={item.icon} size={18} color={item.color} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Feather name="chevron-right" size={18} color={COLORS.surfaceDim} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                <Feather name="power" size={20} color={COLORS.error} />
                <Text style={styles.logoutText}>LOGOUT</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.surface },
  header:         { paddingHorizontal: 28, paddingTop: 16, marginBottom: 32 },
  headerSubtitle: { fontSize: 10, fontWeight: '900', color: COLORS.primary, letterSpacing: 2.5, marginBottom: 4 },
  headerTitle:    { fontSize: 42, fontWeight: '900', color: COLORS.textMain, letterSpacing: -1.5 },
  
  profileHero:    { backgroundColor: COLORS.surfaceLowest, marginHorizontal: 20, borderRadius: 36, padding: 32, alignItems: 'center' },
  avatarContainer:{ position: 'relative', marginBottom: 20 },
  avatarFrame:    { width: 120, height: 120, borderRadius: 40, padding: 2 },
  avatarImg:      { width: '100%', height: '100%', borderRadius: 38 },
  avatarInitials: { fontSize: 44, fontWeight: '900', color: COLORS.primaryDark },
  camBtn:         { position: 'absolute', bottom: -4, right: -4, backgroundColor: COLORS.primary, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: COLORS.surfaceLowest },
  trashBtn:       { position: 'absolute', bottom: -4, left: -4, backgroundColor: COLORS.error, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: COLORS.surfaceLowest },
  
  heroInfo:       { alignItems: 'center' },
  heroUsername:   { fontSize: 24, fontWeight: '900', color: COLORS.textMain, letterSpacing: -0.5 },
  heroEmail:      { fontSize: 13, color: COLORS.textSoft, fontWeight: '500', marginTop: 4, opacity: 0.6 },
  
  statsGrid:      { flexDirection: 'row', paddingHorizontal: 20, marginTop: 24, gap: 12 },
  statNode:       { flex: 1, backgroundColor: COLORS.surfaceLow, borderRadius: 24, padding: 20 },
  statValue:      { fontSize: 14, fontWeight: '800', color: COLORS.textMain },
  statValueStatus: { fontSize: 11, fontWeight: '900', color: COLORS.primary, letterSpacing: 1.5 },
  statLabel:      { fontSize: 10, fontWeight: '900', color: COLORS.textMuted, letterSpacing: 1.5, marginTop: 10, opacity: 0.6 },
  
  menuRange:      { marginTop: 32, paddingHorizontal: 20 },
  menuItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 4, gap: 18 },
  menuIcon:       { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  menuLabel:      { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.textMain },
  
  logoutBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 40, marginBottom: 20, height: 64, borderRadius: 24, backgroundColor: COLORS.surfaceLow },
  logoutText:     { fontSize: 12, fontWeight: '900', color: COLORS.error, letterSpacing: 1.5 },
  
  editSection:    { paddingHorizontal: 24, marginTop: 8 },
  fieldNode:      { marginBottom: 24 },
  fieldLabel:     { fontSize: 10, fontWeight: '900', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 12, marginLeft: 4 },
  inputWrap:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLow, borderRadius: 20, paddingHorizontal: 20, height: 60 },
  input:          { flex: 1, color: COLORS.textMain, fontSize: 16, fontWeight: '600' },
  
  editActions:    { flexDirection: 'row', gap: 12, marginTop: 12 },
  abortBtn:       { flex: 1, height: 64, borderRadius: 24, backgroundColor: COLORS.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  abortText:      { color: COLORS.textMuted, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  saveBtn:        { height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  saveBtnText:    { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
});
