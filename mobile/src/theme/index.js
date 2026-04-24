// Pingora UI Kit - Standard Design Tokens for Mobile
export const COLORS = {
  // Brand
  primary:      '#10B981',   // emerald-500 (Fresh Vitality)
  primaryLight: '#D1FAE5',   // emerald-100
  primaryDark:  '#059669',   // emerald-600
  
  // Surfaces (Tonal Stacking)
  surface:      '#F0F0F0',   // Warm Neutral (Standard Base)
  surfaceLow:   '#F7F7F5',   // Sidebar / Secondary
  surfaceLowest:'#FFFFFF',   // Card / Key Surface
  surfaceHigh:  '#EFF1EE',   // Hover / Subdued
  surfaceDim:   '#E5E7E2',   // Active / Deep Subdued
  
  // Text (Plus Jakarta Typography Hierarchy)
  textMain:     '#1A1C19',   // Deep Forest (Contrast)
  textSoft:     '#424940',   // Subdued Neutral
  textLight:    '#727970',   // Informational
  textMuted:    '#8C9389',   // Subtle Metadata
  
  // Functional
  success:      '#059669',
  error:        '#DC2626',
  warning:      '#D97706',
  white:        '#FFFFFF',
  black:        '#000000',
  transparent:  'transparent',
  
  // Messages
  msgSent:      '#ECFDF5',   // Very soft emerald
  msgRecv:      '#FFFFFF',   // Pure white
  msgBorder:    'rgba(16, 185, 129, 0.05)',
};

export const FONTS = {
  // Mobile uses System font by default, but we'll stick to a clean hierarchy
  regular:  { fontFamily: 'System', fontWeight: '400' },
  medium:   { fontFamily: 'System', fontWeight: '500' },
  semibold: { fontFamily: 'System', fontWeight: '600' },
  bold:     { fontFamily: 'System', fontWeight: '700' },
  black:    { fontFamily: 'System', fontWeight: '900' },
};

export const RADIUS = {
  xs:   8,
  sm:   12,
  md:   16,
  lg:   24,
  xl:   32,
  full: 9999,
};

// Standard Ambient Shadows
export const SHADOW = {
  soft: {
    shadowColor: '#1A1C19',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 4,
  },
  medium: {
    shadowColor: '#1A1C19',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 8,
  },
};
