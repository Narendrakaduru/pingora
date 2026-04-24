import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert, ScrollView,
  KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { getSchedules, createSchedule, updateSchedule, getRooms, getGroups } from '../api/chat';
import { useAuth } from '../context/AuthContext';
import { COLORS, RADIUS, SHADOW, FONTS } from '../theme';

const { width } = Dimensions.get('window');
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isSameDaySafe(aRaw, bRaw) {
  if (!aRaw || !bRaw) return false;
  const a = new Date(aRaw);
  const b = new Date(bRaw);
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isSameDay(a, b) {
  return isSameDaySafe(a, b);
}

function buildCalendar(year, month) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  return cells;
}

export default function CalendarScreen() {
  const { user } = useAuth();
  const now = new Date();

  const [year, setYear]         = useState(now.getFullYear());
  const [month, setMonth]       = useState(now.getMonth());
  const [selected, setSelected] = useState(new Date());
  const [schedules, setSchedules]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const [editItem, setEditItem]       = useState(null);
  const [form, setForm] = useState({ title: '', room_id: 'general-chat', start_time: '', end_time: '', created_by: user?.username || '' });

  // Picker State
  const [pickerMode, setPickerMode]   = useState(null); // 'date' | 'time'
  const [pickerField, setPickerField] = useState(null); // 'start_time' | 'end_time'
  const [pickerCurrentDate, setPickerCurrentDate] = useState(new Date());

  // Dropdown State
  const [availableChats, setAvailableChats] = useState([{ id: 'general-chat', name: 'Public Room', type: 'room' }]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fetchSchedules = useCallback(async () => {
    try {
      const data = await getSchedules();
      console.log('DEBUG: Fetched Schedules:', data);
      setSchedules(data);
    } catch (e) {
      console.error('DEBUG: fetchSchedules Error:', e);
    }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const fetchAvailableChats = useCallback(async () => {
    try {
      const [rooms, groups] = await Promise.all([getRooms(user.username), getGroups(user.username)]);
      
      const combined = [
        { id: 'general-chat', name: 'Public Room', type: 'room' },
        ...rooms.map(p => {
          const name = p.username || p.name || 'Unknown User';
          const partnerId = name.toLowerCase();
          const roomId = `dm:${[user.username.toLowerCase(), partnerId].sort().join(':')}`;
          return { id: roomId, name: name.charAt(0).toUpperCase() + name.slice(1), type: 'dm' };
        }),
        ...groups.map(g => ({ id: `group:${g._id}`, name: g.name || g.title || 'Unknown Group', type: 'group' }))
      ];
      
      setAvailableChats(combined);
    } catch (e) {
      console.error('fetchAvailableChats Error:', e);
    }
  }, [user.username]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const daySchedules = schedules.filter(s => isSameDaySafe(s.start_time, selected));
  const otherSchedules = schedules.filter(s => !isSameDaySafe(s.start_time, selected))
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const hasEvent = (date) =>
    date && schedules.some(s => isSameDaySafe(s.start_time, date));

  const changeMonth = (dir) => {
    let m = month + dir, y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  const openCreate = () => {
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T09:00`;
    setEditItem(null);
    setForm({ title: '', room_id: 'general-chat', start_time: fmt(selected), end_time: fmt(selected).replace('T09:00','T10:00'), created_by: user?.username || '' });
    setShowModal(true);
    fetchAvailableChats();
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ title: item.title, room_id: item.room_id, start_time: item.start_time?.slice(0,16), end_time: item.end_time?.slice(0,16), created_by: item.created_by });
    setShowModal(true);
    fetchAvailableChats();
  };

  const handleSave = async () => {
    if (!form.title.trim()) return Alert.alert('Error', 'Enter a title.');
    try {
      const payload = { ...form, start_time: new Date(form.start_time).toISOString(), end_time: new Date(form.end_time).toISOString() };
      if (editItem) await updateSchedule(editItem._id, payload);
      else          await createSchedule(payload);
      setShowModal(false);
      fetchSchedules();
    } catch (e) { Alert.alert('Error', 'Could not save schedule.'); }
  };

  const onPickerChange = (event, selectedDate) => {
    const currentDate = selectedDate || pickerCurrentDate;
    setPickerMode(null); // Hide picker on Android

    if (event.type === 'set') {
      const pad = (n) => String(n).padStart(2, '0');
      const dateStr = `${currentDate.getFullYear()}-${pad(currentDate.getMonth()+1)}-${pad(currentDate.getDate())}`;
      const timeStr = `${pad(currentDate.getHours())}:${pad(currentDate.getMinutes())}`;
      
      if (pickerMode === 'date') {
        // Update both start and end dates but keep times
        const sTime = form.start_time.split('T')[1];
        const eTime = form.end_time.split('T')[1];
        setForm(prev => ({
          ...prev,
          start_time: `${dateStr}T${sTime}`,
          end_time:   `${dateStr}T${eTime}`
        }));
      } else {
        // Update specific time
        setForm(prev => ({
          ...prev,
          [pickerField]: `${dateStr}T${timeStr}`
        }));
      }
    }
  };

  const openPicker = (mode, field) => {
    setPickerMode(mode);
    setPickerField(field);
    setPickerCurrentDate(new Date(form[field] || selected));
  };

  const cells = buildCalendar(year, month);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Editorial Header */}
        <View style={styles.header}>
           <View>
              <Text style={styles.headerSubtitle}>CALENDAR</Text>
              <Text style={styles.headerTitle}>Timeline</Text>
           </View>
           <TouchableOpacity style={styles.headerBtn} onPress={openCreate}>
             <Feather name="plus-circle" size={26} color={COLORS.primary} />
           </TouchableOpacity>
        </View>

        {/* Tonal Month Navigator */}
        <View style={styles.calendarContainer}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
              <Feather name="chevron-left" size={22} color={COLORS.textMain} />
            </TouchableOpacity>
            <View style={styles.monthBadge}>
               <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
            </View>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
              <Feather name="chevron-right" size={22} color={COLORS.textMain} />
            </TouchableOpacity>
          </View>

          {/* Days Label Header */}
          <View style={styles.dayHeaderRow}>
            {DAYS.map(d => (
              <Text key={d} style={styles.dayHeaderText}>{d.toUpperCase()}</Text>
            ))}
          </View>

          {/* Grid View */}
          <View style={styles.grid}>
            {cells.map((date, i) => {
              if (!date) return <View key={`e${i}`} style={styles.cell} />;
              const isToday    = isSameDay(date, now);
              const isSelected = isSameDay(date, selected);
              const hasEv      = hasEvent(date);
              return (
                <TouchableOpacity key={i} style={styles.cell} onPress={() => setSelected(date)} activeOpacity={0.7}>
                  <View style={[
                    styles.dayCircle,
                    isSelected && { backgroundColor: COLORS.primary },
                    isToday && !isSelected && { backgroundColor: COLORS.surfaceHigh },
                  ]}>
                    <Text style={[
                       styles.dayText, 
                       isSelected && { color: '#fff', fontWeight: '900' },
                       isToday && !isSelected && { color: COLORS.primary, fontWeight: '900' }
                    ]}>
                      {date.getDate()}
                    </Text>
                    {hasEv && (
                       <View style={[styles.eventDot, isSelected && { backgroundColor: 'rgba(255,255,255,0.6)' }]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Event Detail */}
        <View style={styles.scheduleDetail}>
          <View style={styles.detailHeader}>
             <Feather name="calendar" size={14} color={COLORS.primary} />
             <Text style={styles.detailSubtitle}>SELECTED DATE</Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.detailTitle}>
              {isSameDaySafe(selected, new Date()) ? 'TODAY' : formatTime(selected.toISOString()).split(',')[0]}
            </Text>
            <Text style={styles.detailSubtitle}>
              {daySchedules.length} {daySchedules.length === 1 ? 'EVENT' : 'EVENTS'}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : (
            <>
              {daySchedules.map(s => (
                <TouchableOpacity key={s._id} style={[styles.eventCard, SHADOW.soft]} onPress={() => openEdit(s)} activeOpacity={0.9}>
                  <View style={[styles.eventTimeStrip, { backgroundColor: COLORS.primaryLight }]}>
                     <Text style={styles.timeDigit}>{new Date(s.start_time).getHours()}</Text>
                     <Text style={styles.timeAmPm}>{new Date(s.start_time).getHours() >= 12 ? 'PM' : 'AM'}</Text>
                  </View>
                  <View style={styles.eventBody}>
                     <Text style={styles.eventTitleText}>{s.title}</Text>
                     <View style={styles.eventMeta}>
                        <Feather name="clock" size={12} color={COLORS.textMuted} />
                        <Text style={styles.eventMetaText}>
                           {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <View style={styles.metaDot} />
                        <Feather name="hash" size={12} color={COLORS.textMuted} />
                        <Text style={styles.eventMetaText}>{s.room_id?.split(':').pop()}</Text>
                     </View>
                  </View>
                  <Feather name="chevron-right" size={18} color={COLORS.surfaceDim} />
                </TouchableOpacity>
              ))}

              {daySchedules.length === 0 && (
                <View style={styles.emptySchedule}>
                  <MaterialCommunityIcons name="calendar-blank" size={48} color={COLORS.surfaceLow} />
                  <Text style={styles.emptyText}>NO EVENTS TODAY</Text>
                  
                  {otherSchedules.length > 0 && (
                    <View style={{ marginTop: 32, width: '100%' }}>
                      <Text style={styles.otherTitle}>GLOBAL TIMELINE</Text>
                      {otherSchedules.slice(0, 3).map(s => (
                        <TouchableOpacity key={s._id} style={styles.miniCard} onPress={() => { setSelected(new Date(s.start_time)); }}>
                          <View style={styles.miniDate}>
                            <Text style={styles.miniDateText}>{new Date(s.start_time).getDate()}</Text>
                            <Text style={styles.miniMonthText}>{MONTHS[new Date(s.start_time).getMonth()]}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.miniTitle} numberOfLines={1}>{s.title}</Text>
                            <Text style={styles.miniTime}>{new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                          </View>
                          <Feather name="arrow-right" size={14} color={COLORS.primary} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Creation / Update Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
           <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={[styles.modalCard, SHADOW.medium]}>
              <View style={styles.modalHeader}>
                <View>
                   <Text style={styles.modalTitle}>Create Event</Text>
                   <Text style={styles.modalSubtitleAlt}>Complete the form below to add a new event.</Text>
                </View>
                <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                   <Feather name="x" size={20} color={COLORS.textSoft} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Row 1: Title */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>EVENT TITLE</Text>
                  <View style={styles.inputWrap}>
                     <Feather name="calendar" size={18} color={COLORS.primary} style={{ marginRight: 12 }} />
                     <TextInput
                       style={styles.input}
                       placeholder="e.g. Weekly Team Meeting"
                       placeholderTextColor={COLORS.textMuted}
                       value={form.title}
                       onChangeText={v => setForm(prev => ({ ...prev, title: v }))}
                     />
                  </View>
                </View>

                {/* Row 2: Date & Chat */}
                <View style={styles.gridRow}>
                   <View style={[styles.fieldWrap, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.fieldLabel}>EVENT DATE</Text>
                      <TouchableOpacity style={styles.inputWrap} onPress={() => openPicker('date', 'start_time')}>
                         <Feather name="calendar" size={18} color={COLORS.primary} style={{ marginRight: 12 }} />
                         <Text style={styles.inputText}>
                            {new Date(form.start_time).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                         </Text>
                      </TouchableOpacity>
                   </View>
                   <View style={[styles.fieldWrap, { flex: 1, marginLeft: 8 }]}>
                      <Text style={styles.fieldLabel}>SELECT CHAT</Text>
                      <View style={{ zIndex: 1000 }}>
                        <TouchableOpacity 
                          style={styles.inputWrap} 
                          onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                          activeOpacity={0.8}
                        >
                           <Feather name={form.room_id?.startsWith('dm:') ? 'user' : 'hash'} size={18} color={COLORS.primary} style={{ marginRight: 12 }} />
                           <Text style={styles.inputText} numberOfLines={1}>
                              {availableChats.find(c => c.id === form.room_id)?.name || form.room_id}
                           </Text>
                           <Feather name={isDropdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>

                        {isDropdownOpen && (
                          <View style={[styles.dropdownList, SHADOW.medium]}>
                            <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                              {availableChats.map(chat => (
                                <TouchableOpacity 
                                  key={chat.id} 
                                  style={[styles.dropdownItem, form.room_id === chat.id && { backgroundColor: COLORS.primary + '15' }]}
                                  onPress={() => {
                                    setForm(prev => ({ ...prev, room_id: chat.id }));
                                    setIsDropdownOpen(false);
                                  }}
                                >
                                  <Feather name={chat.type === 'dm' ? 'user' : 'hash'} size={14} color={form.room_id === chat.id ? COLORS.primary : COLORS.textMuted} />
                                  <Text style={[styles.dropdownItemText, form.room_id === chat.id && { color: COLORS.primary, fontWeight: '700' }]}>
                                    {chat.name}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                   </View>
                </View>

                {/* Row 3: Times */}
                <View style={styles.gridRow}>
                   <View style={[styles.fieldWrap, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.fieldLabel}>START TIME</Text>
                      <TouchableOpacity style={styles.inputWrap} onPress={() => openPicker('time', 'start_time')}>
                         <Feather name="clock" size={18} color={COLORS.primary} style={{ marginRight: 12 }} />
                         <Text style={styles.inputText}>
                            {formatTime(form.start_time)}
                         </Text>
                      </TouchableOpacity>
                   </View>
                   <View style={[styles.fieldWrap, { flex: 1, marginLeft: 8 }]}>
                      <Text style={styles.fieldLabel}>END TIME</Text>
                      <TouchableOpacity style={styles.inputWrap} onPress={() => openPicker('time', 'end_time')}>
                         <Feather name="clock" size={18} color={COLORS.primary} style={{ marginRight: 12 }} />
                         <Text style={styles.inputText}>
                            {formatTime(form.end_time)}
                         </Text>
                      </TouchableOpacity>
                   </View>
                </View>
                
                <TouchableOpacity onPress={handleSave} style={styles.submitWrapper}>
                  <View style={[styles.submitBtn, { backgroundColor: '#10b981' }]}>
                    <Text style={styles.submitBtnText}>{editItem ? 'UPDATE EVENT' : 'CREATE EVENT'}</Text>
                  </View>
                </TouchableOpacity>
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
           </KeyboardAvoidingView>
        </View>
      </Modal>

      {pickerMode && (
        <DateTimePicker
          value={pickerCurrentDate}
          mode={pickerMode}
          is24Hour={false}
          display="default"
          onChange={onPickerChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.surface },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingTop: 16, marginBottom: 32 },
  headerSubtitle: { fontSize: 10, fontWeight: '900', color: COLORS.primary, letterSpacing: 2.5, marginBottom: 4 },
  headerTitle:    { fontSize: 42, fontWeight: '900', color: COLORS.textMain, letterSpacing: -1.5 },
  headerBtn:      { width: 52, height: 52, borderRadius: 18, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  
  calendarContainer: { paddingHorizontal: 20 },
  monthNav:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 4 },
  navBtn:         { width: 44, height: 44, borderRadius: 16, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  monthBadge:     { backgroundColor: COLORS.surfaceLow, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  monthLabel:     { fontSize: 16, fontWeight: '800', color: COLORS.textMain },
  
  dayHeaderRow:   { flexDirection: 'row', marginBottom: 16 },
  dayHeaderText:  { flex: 1, textAlign: 'center', fontSize: 10, color: COLORS.textMuted, fontWeight: '900', letterSpacing: 1 },
  
  grid:           { flexDirection: 'row', flexWrap: 'wrap' },
  cell:           { width: `${100/7}%`, alignItems: 'center', paddingVertical: 10 },
  dayCircle:      { width: 44, height: 44, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayText:        { fontSize: 15, fontWeight: '600', color: COLORS.textSoft },
  eventDot:       { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, marginTop: 4 },
  
  scheduleDetail: { paddingHorizontal: 24, marginTop: 40 },
  detailHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  detailSubtitle: { fontSize: 9, fontWeight: '900', color: COLORS.primary, letterSpacing: 2 },
  detailSubtitle: { fontSize: 10, fontWeight: '900', color: COLORS.primary, letterSpacing: 2, marginBottom: 4 },
  detailTitle:    { fontSize: 28, fontWeight: '900', color: COLORS.textMain, letterSpacing: -1, marginBottom: 20 },
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },

  eventCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLowest, borderRadius: 24, padding: 20, marginBottom: 16, gap: 16 },
  eventTimeStrip: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  timeDigit:      { fontSize: 24, fontWeight: '900', color: COLORS.primaryDark, letterSpacing: -1 },
  timeAmPm:       { fontSize: 10, fontWeight: '800', color: COLORS.primary, opacity: 0.7, marginTop: -2 },
  eventBody:      { flex: 1, gap: 4 },
  eventTitleText: { fontSize: 16, fontWeight: '800', color: COLORS.textMain, letterSpacing: -0.3 },
  eventMeta:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventMetaText:  { fontSize: 12, fontWeight: '600', color: COLORS.textSoft },
  metaDot:        { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.surfaceDim },

  emptySchedule:  { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyText:      { fontSize: 13, fontWeight: '900', color: COLORS.textMuted, letterSpacing: 2, marginTop: 16 },
  
  otherTitle:     { fontSize: 10, fontWeight: '900', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 16, textAlign: 'left', width: '100%' },
  miniCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLow, borderRadius: 20, padding: 12, marginBottom: 10, gap: 12 },
  miniDate:       { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.surfaceLowest, alignItems: 'center', justifyContent: 'center' },
  miniDateText:   { fontSize: 16, fontWeight: '900', color: COLORS.textMain },
  miniMonthText:  { fontSize: 8, fontWeight: '800', color: COLORS.primary, marginTop: -2 },
  miniTitle:      { fontSize: 14, fontWeight: '700', color: COLORS.textMain },
  miniTime:       { fontSize: 11, color: COLORS.textSoft, fontWeight: '600' },
  
  metaDivider:    { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.surfaceDim, marginHorizontal: 8 },
  metaRoom:       { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard:      { backgroundColor: COLORS.surfaceLowest, borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32 },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  modalTitle:     { fontSize: 32, fontWeight: '900', color: COLORS.textMain, letterSpacing: -1, marginBottom: 4 },
  modalSubtitleAlt:{ fontSize: 13, fontWeight: '500', color: COLORS.textSoft, opacity: 0.7, marginBottom: 8 },
  closeBtn:       { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  
  fieldWrap:      { marginBottom: 24 },
  fieldLabel:     { fontSize: 10, fontWeight: '900', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 12, marginLeft: 4 },
  inputWrap:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLow, borderRadius: 16, paddingHorizontal: 20, height: 62 },
  input:          { flex: 1, color: COLORS.textMain, fontSize: 15, fontWeight: '600' },
  inputText:      { color: COLORS.textMain, fontSize: 15, fontWeight: '600' },
  gridRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  
  submitWrapper:  { marginTop: 12 },
  submitBtn:      { height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#10b981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
  submitBtnText:  { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },

  dropdownList:   { position: 'absolute', top: 70, left: 0, right: 0, backgroundColor: COLORS.surfaceLowest, borderRadius: 16, padding: 8, zIndex: 2000, borderWidth: 1, borderColor: COLORS.surfaceLow },
  dropdownItem:   { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, gap: 12 },
  dropdownItemText:{ fontSize: 14, fontWeight: '600', color: COLORS.textSoft },
});
