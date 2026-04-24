import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOW } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function IncomingCallOverlay({ call, onAccept, onReject }) {
  const insets = useSafeAreaInsets();
  
  if (!call) return null;

  return (
    <View style={[styles.overlay, { paddingTop: insets.top + 10 }]}>
      <View style={[styles.card, SHADOW.lg]}>
        <View style={styles.infoRow}>
          <View style={styles.iconBox}>
            <Ionicons name={call.type === 'video' ? 'videocam' : 'call'} size={24} color="#fff" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.caller}>{call.from}</Text>
            <Text style={styles.callType}>Incoming {call.type === 'video' ? 'Video' : 'Voice'} Call...</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={onReject}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={onAccept}>
            <Ionicons name="checkmark" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  caller: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  callType: {
    fontSize: 13,
    color: COLORS.textSub,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: COLORS.error,
  },
  acceptBtn: {
    backgroundColor: COLORS.success,
  },
});
