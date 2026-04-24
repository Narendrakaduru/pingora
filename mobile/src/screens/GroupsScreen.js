import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, RefreshControl, ActivityIndicator,
  KeyboardAvoidingView, Platform, Dimensions, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getGroups, createGroup, updateGroup, deleteGroup } from '../api/chat';
import { authAPI } from '../api/auth';
import { COLORS, RADIUS, SHADOW, FONTS } from '../theme';
import ActionSheet from '../components/ActionSheet';

const { width, height } = Dimensions.get('window');

function GroupAvatar({ name, size = 56 }) {
  return (
    <View style={[styles.avatarFrame, { width: size, height: size, borderRadius: 18, backgroundColor: COLORS.surfaceHigh }]}>
       <View style={[styles.avatarInner, { backgroundColor: COLORS.primaryLight }]}>
          <Text style={{ color: COLORS.primaryDark, fontWeight: '900', fontSize: size * 0.35 }}>
            {(name || '?').slice(0, 2).toUpperCase()}
          </Text>
       </View>
    </View>
  );
}

export default function GroupsScreen({ navigation }) {
  const { user } = useAuth();
  const [groups, setGroups]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [allUsers, setAllUsers]     = useState([]);
  const [groupName, setGroupName]   = useState('');
  const [selected, setSelected]     = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showActionSheet, setShowActionSheet] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!user?.username) return;
    try {
      const data = await getGroups(user.username);
      if (Array.isArray(data)) setGroups(data);
    } catch (e) { }
    finally { setLoading(false); setRefreshing(false); }
  }, [user?.username]);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await authAPI.getUsers();
      if (data.success) {
        setAllUsers(data.users.filter(u => u.username?.toLowerCase() !== user?.username?.toLowerCase()));
      }
    } catch (e) { }
  }, [user?.username]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);
  useEffect(() => { if (showModal) fetchUsers(); }, [showModal]);

  const toggleMember = (username) => {
    setSelected(prev =>
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return Alert.alert('Incomplete Info', 'Specify a group name.');
    if (selected.length < 1) return Alert.alert('Incomplete Info', 'A group requires multiple participants.');
    
    setLoading(true);
    try {
      const payload = { 
        name: groupName.trim(), 
        members: [...selected, user.username] 
      };
      
      if (editingGroup) {
        await updateGroup(editingGroup._id, payload, user.username);
      } else {
        await createGroup({ ...payload, created_by: user.username });
      }
      
      setGroupName(''); setSelected([]); setShowModal(false); setEditingGroup(null);
      fetchGroups();
    } catch (e) { 
      Alert.alert('Error', `Could not ${editingGroup ? 'update' : 'create'} group.`); 
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (groupId) => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to permanently delete this group? All messages will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroup(groupId, user.username);
              fetchGroups();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete group.');
            }
          }
        }
      ]
    );
  };

  const openEditModal = (group) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setSelected(group.members.filter(u => u !== user.username));
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingGroup(null);
    setGroupName('');
    setSelected([]);
    setShowModal(true);
  };

  const filteredUsers = allUsers.filter(u =>
    (u.username || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  const showActions = (group) => {
    setSelectedGroup(group);
    setShowActionSheet(true);
  };

  const getGroupOptions = (group) => {
    if (!group) return [];
    const isAdmin = group.created_by === user.username;
    const opts = [];
    
    if (isAdmin) {
      opts.push({ 
        label: 'Edit Group', 
        icon: 'edit-3', 
        iconType: 'feather',
        onPress: () => openEditModal(group) 
      });
      opts.push({ 
        label: 'Delete Group', 
        icon: 'trash-2', 
        iconType: 'feather',
        isDestructive: true,
        onPress: () => handleDelete(group._id) 
      });
    } else {
      opts.push({ 
        label: 'Group Info', 
        icon: 'information-circle-outline', 
        onPress: () => Alert.alert(group.name, `${group.members?.length || 0} members`) 
      });
    }
    
    return opts;
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Editorial Header */}
      <View style={styles.header}>
        <View>
           <Text style={styles.headerSubtitle}>GROUPS</Text>
           <Text style={styles.headerTitle}>Groups</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={openCreateModal}>
          <Feather name="plus-circle" size={26} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing
        ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} size="large" />
        : <FlatList
            data={groups}
            keyExtractor={(g, i) => g._id || String(i)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGroups(); }} tintColor={COLORS.primary} />}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.groupCard, SHADOW.soft]}
                onPress={() => navigation.navigate('ChatRoom', { chat: item, title: item.name })}
                onLongPress={() => showActions(item)}
                activeOpacity={0.9}
              >
                <GroupAvatar name={item.name} />
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{item.name}</Text>
                  <Text style={styles.groupMeta}>{item.members?.length || 0} members</Text>
                </View>
                
                <View style={styles.arrowIcon}>
                   <Feather name="arrow-right" size={18} color={COLORS.primary} />
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="account-group-outline" size={72} color={COLORS.surfaceDim} />
                <Text style={styles.emptyText}>NO ACTIVE GROUPS</Text>
                <Text style={styles.emptySubText}>Start a new group chat to get started.</Text>
                <TouchableOpacity onPress={openCreateModal} style={styles.emptyBtnWrapper}>
                  <View style={[styles.emptyBtn, { backgroundColor: COLORS.primary }]}>
                    <Text style={styles.emptyBtnText}>CREATE GROUP</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          />
      }
      
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1, justifyContent: 'flex-end' }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalIndicator} />
               <View style={styles.modalHeader}>
                <View>
                   <Text style={styles.modalSubtitle}>GROUP SETTINGS</Text>
                   <Text style={styles.modalTitle}>{editingGroup ? 'Edit Group' : 'New Group'}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                  <Feather name="x" size={24} color={COLORS.textSoft} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalSection}>
                  <Text style={styles.label}>GROUP NAME</Text>
                  <View style={styles.inputWrap}>
                    <Feather name="tag" size={18} color={COLORS.primary} style={{ marginRight: 12 }} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter group name..."
                      placeholderTextColor={COLORS.textMuted}
                      value={groupName}
                      onChangeText={setGroupName}
                    />
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.label}>SEARCH PARTICIPANTS</Text>
                  <View style={styles.inputWrap}>
                    <Feather name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 12 }} />
                    <TextInput
                      style={styles.input}
                      placeholder="Search usernames..."
                      placeholderTextColor={COLORS.textMuted}
                      value={userSearch}
                      onChangeText={setUserSearch}
                    />
                  </View>
                </View>

                {selected.length > 0 && (
                  <View style={styles.selectionRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {selected.map(u => (
                        <TouchableOpacity key={u} style={styles.chip} onPress={() => toggleMember(u)}>
                          <Text style={styles.chipText}>{u.charAt(0).toUpperCase() + u.slice(1)}</Text>
                          <Feather name="x" size={12} color="#fff" />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.userList}>
                  {filteredUsers.map((item, i) => {
                    const isSelected = selected.includes(item.username);
                    return (
                      <TouchableOpacity key={item.id || i} style={[styles.userRow, isSelected && styles.userRowSelected]} onPress={() => toggleMember(item.username)}>
                        <GroupAvatar name={item.username} size={42} />
                        <Text style={[styles.userName, isSelected && { color: COLORS.primary, fontWeight: '900' }]}>
                          {item.username ? item.username.charAt(0).toUpperCase() + item.username.slice(1) : ''}
                        </Text>
                        <View style={[styles.checkCircle, isSelected && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                           {isSelected && <Feather name="check" size={14} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity onPress={handleCreate} style={styles.settingsSubmit}>
                  <View style={[styles.submitBtn, { backgroundColor: COLORS.primary }]}>
                    <Text style={styles.submitBtnText}>{editingGroup ? 'SAVE CHANGES' : 'CREATE GROUP'}</Text>
                  </View>
                </TouchableOpacity>
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
           </KeyboardAvoidingView>
        </View>
      </Modal>
      <ActionSheet 
        visible={showActionSheet}
        title={selectedGroup?.name}
        options={getGroupOptions(selectedGroup)}
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
  
  groupCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLowest, borderRadius: 24, padding: 18, marginBottom: 16, gap: 16 },
  avatarFrame:   { padding: 2 },
  avatarInner:   { width: '100%', height: '100%', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  groupInfo:     { flex: 1 },
  groupName:     { fontSize: 18, fontWeight: '900', color: COLORS.textMain, letterSpacing: -0.5 },
  groupMeta:     { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, marginTop: 4, letterSpacing: 0.2 },
  arrowIcon:     { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  
  empty:         { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText:     { color: COLORS.textMuted, fontSize: 16, fontWeight: '900', letterSpacing: 3, marginTop: 24 },
  emptySubText:  { color: COLORS.textMuted, fontSize: 13, fontWeight: '500', textAlign: 'center', marginTop: 10, lineHeight: 20, opacity: 0.6 },
  emptyBtnWrapper: { marginTop: 32 },
  emptyBtn:      { paddingHorizontal: 32, paddingVertical: 16, borderRadius: RADIUS.lg },
  emptyBtnText:  { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard:     { backgroundColor: COLORS.surfaceLowest, borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 28, maxHeight: height * 0.85 },
  modalIndicator:{ width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.surfaceDim, alignSelf: 'center', marginBottom: 20 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  modalSubtitle: { fontSize: 10, fontWeight: '900', color: COLORS.primary, letterSpacing: 2, marginBottom: 4 },
  modalTitle:    { fontSize: 28, fontWeight: '900', color: COLORS.textMain, letterSpacing: -1 },
  closeBtn:      { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  
  modalSection:  { marginBottom: 24 },
  label:         { fontSize: 10, fontWeight: '900', color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },
  inputWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLow, borderRadius: 18, paddingHorizontal: 20, height: 60 },
  input:         { flex: 1, color: COLORS.textMain, fontSize: 15, fontWeight: '600' },
  
  selectionRow:  { marginBottom: 20 },
  chip:          { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  chipText:      { color: '#fff', fontSize: 12, fontWeight: '700' },
  
  userList:      { marginBottom: 24 },
  userRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, gap: 16 },
  userRowSelected:{ opacity: 1 },
  userName:      { flex: 1, color: COLORS.textMain, fontSize: 15, fontWeight: '700' },
  checkCircle:   { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORS.surfaceDim, alignItems: 'center', justifyContent: 'center' },
  
  settingsSubmit: { marginTop: 12 },
  submitBtn:     { borderRadius: 20, height: 64, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },
  adminActions:  { flexDirection: 'row', gap: 4 },
  actionBtn:     { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
});
