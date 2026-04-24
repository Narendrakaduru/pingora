import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Dimensions, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, RADIUS, SHADOW, FONTS } from '../theme';

const { width } = Dimensions.get('window');

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleSignup = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      return Alert.alert('Missing Information', 'All fields are required to create an account.');
    }
    if (password.length < 6) {
      return Alert.alert('Weak Password', 'Password must be at least 6 characters.');
    }
    setLoading(true);
    try {
      await signup(username.trim().toLowerCase(), email.trim().toLowerCase(), password);
    } catch (err) {
      Alert.alert('Signup Failed', err?.response?.data?.message || 'Account creation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.bg, { backgroundColor: COLORS.surface }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40}
      >
        <ScrollView 
          contentContainerStyle={styles.container} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Identity Header */}
          <View style={styles.header}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={{ width: 80, height: 80, alignSelf: 'center', marginBottom: 20 }}
              resizeMode="contain"
            />
            <View style={styles.badge}>
               <Ionicons name="sparkles" size={12} color={COLORS.primary} />
               <Text style={styles.badgeText}>NEW ACCOUNT</Text>
            </View>
            <Text style={styles.appName}>Create Account</Text>
            <Text style={styles.tagline}>Create an account to start messaging.</Text>
          </View>

          {/* Creation Card */}
          <View style={[styles.card, SHADOW.soft]}>
            <View style={styles.cardHeader}>
               <Text style={styles.title}>Create Account</Text>
               <View style={styles.statusDot} />
            </View>
            
            {/* Username */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="at-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="unique_handle"
                  placeholderTextColor={COLORS.textMuted}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-unread-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@email.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPw}
                />
                <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                  <Ionicons name={showPw ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Premium CTA */}
            <TouchableOpacity 
              onPress={handleSignup} 
              disabled={loading} 
              activeOpacity={0.9}
              style={styles.submitWrapper}
            >
              <View style={[styles.btn, { backgroundColor: COLORS.primary }]}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <View style={styles.btnContent}>
                      <Text style={styles.btnText}>SIGN UP</Text>
                      <Ionicons name="planet" size={18} color="#fff" />
                    </View>}
              </View>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.switchText}>ALREADY HAVE AN ACCOUNT? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.link}>LOG IN</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.branding}>
             <Text style={styles.brandingText}>SECURE • PINGORA v1.0</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1 },
  bg:         { flex: 1 },
  container:  { paddingHorizontal: 28, paddingBottom: 40, paddingTop: 60 },
  header:     { marginBottom: 40, alignItems: 'center' },
  badge:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLow, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, marginBottom: 16 },
  badgeText:  { color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginLeft: 6 },
  appName:    { fontSize: 44, fontWeight: '900', color: COLORS.textMain, letterSpacing: -2 },
  tagline:    { fontSize: 14, color: COLORS.textSoft, marginTop: 8, paddingHorizontal: 24, textAlign: 'center', lineHeight: 22 },
  
  card:       { backgroundColor: COLORS.surfaceLowest, borderRadius: RADIUS.xl, padding: 32 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title:      { fontSize: 28, fontWeight: '800', color: COLORS.textMain, letterSpacing: -0.5 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  
  inputSection: { marginBottom: 20 },
  label:      { fontSize: 10, fontWeight: '900', color: COLORS.textMuted, uppercase: true, letterSpacing: 1.5, marginBottom: 10, marginLeft: 4 },
  inputWrap:  { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.surfaceLow, 
    borderRadius: RADIUS.lg, 
    paddingHorizontal: 20, 
    height: 64,
  },
  inputIcon:  { marginRight: 16 },
  input:      { flex: 1, color: COLORS.textMain, fontSize: 15, fontWeight: '600' },
  eyeBtn:     { padding: 4 },
  
  submitWrapper: { marginTop: 12, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 },
  btn:        { borderRadius: RADIUS.lg, height: 68, alignItems: 'center', justifyContent: 'center' },
  btnContent: { flexDirection: 'row', alignItems: 'center' },
  btnText:    { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.5, marginRight: 10 },
  
  footerRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  switchText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  link:       { color: COLORS.primary, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  
  branding:   { marginTop: 40, alignItems: 'center' },
  brandingText: { fontSize: 9, fontWeight: '900', color: COLORS.textMuted, opacity: 0.4, letterSpacing: 2 },
});
