import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Animated, Dimensions, Platform, ScrollView
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS, SHADOW } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * A premium Bottom Sheet for organic action menus
 * @param {boolean} visible - Modal visibility
 * @param {string} title - Optional header title
 * @param {Array} options - Array of objects { label, icon, iconType, iconColor, onPress, isDestructive }
 * @param {Function} onClose - Called when closing or tapping overlay
 */
export default function ActionSheet({ visible, title, options, onClose }) {
  const panY = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(panY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8
      }).start();
    } else {
      Animated.timing(panY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        
        <Animated.View 
          style={[
            styles.sheet, 
            SHADOW.heavy,
            { transform: [{ translateY: panY }] }
          ]}
        >
          <View style={styles.indicator} />
          
          {title && (
            <View style={styles.header}>
              <Text style={styles.title}>{title.toUpperCase()}</Text>
            </View>
          )}

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollContent}
          >
            {options.map((opt, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.option} 
                onPress={() => {
                  onClose();
                  opt.onPress();
                }}
              >
                <View style={[
                  styles.iconWrap, 
                  { backgroundColor: opt.isDestructive ? 'rgba(239, 68, 68, 0.1)' : COLORS.primaryLight }
                ]}>
                  {opt.iconType === 'feather' ? (
                     <Feather name={opt.icon} size={20} color={opt.isDestructive ? '#ef4444' : COLORS.primary} />
                  ) : (
                     <Ionicons name={opt.icon} size={20} color={opt.isDestructive ? '#ef4444' : COLORS.primary} />
                  )}
                </View>
                <Text style={[
                  styles.label, 
                  opt.isDestructive && { color: '#ef4444' }
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: COLORS.surfaceLowest,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: SCREEN_HEIGHT * 0.7
  },
  indicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surfaceDim,
    alignSelf: 'center',
    marginBottom: 20
  },
  header: {
    paddingHorizontal: 32,
    marginBottom: 20
  },
  title: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2
  },
  scrollContent: {
    paddingHorizontal: 20
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 4
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    letterSpacing: -0.3
  }
});
