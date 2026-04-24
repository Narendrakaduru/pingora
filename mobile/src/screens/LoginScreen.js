import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Dimensions, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, RADIUS, SHADOW, FONTS } from '../theme';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const { login }   = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return Alert.alert('Login Required', 'Please enter your login details.');
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      Alert.alert('Login Failed', err?.response?.data?.message || 'Incorrect username or password.');
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
          {/* Auth Header */}
          <View style={styles.header}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={{ width: 80, height: 80, alignSelf: 'center', marginBottom: 20 }}
              resizeMode="contain"
            />
            <View style={styles.badge}>
               <Ionicons name="flash" size={12} color={COLORS.primary} />
               <Text style={styles.badgeText}>CONNECTED</Text>
            </View>
            <Text style={styles.appName}>Pingora</Text>
            <Text style={styles.tagline}>Connect with your friends and team.</Text>
          </View>

          {/* Identity Capture Card */}
          <View style={[styles.card, SHADOW.soft]}>
            <View style={styles.cardHeader}>
               <Text style={styles.title}>Welcome Back</Text>
               <View style={styles.statusDot} />
            </View>
            <Text style={styles.subtitle}>Login to your account.</Text>

            {/* Organic Input: Email */}
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

            {/* Organic Input: Password */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter your password"
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
              onPress={handleLogin} 
              disabled={loading} 
              activeOpacity={0.9}
              style={styles.submitWrapper}
            >
              <View style={[styles.btn, { backgroundColor: COLORS.primary }]}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <View style={styles.btnContent}>
                      <Text style={styles.btnText}>LOG IN</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </View>}
              </View>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.switchText}>NEW USER? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.link}>SIGN UP</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Subtle Branding */}
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
  header:     { marginBottom: 48, alignItems: 'center', textAlign: 'center' },
  badge:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLow, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, marginBottom: 16 },
  badgeText:  { color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginLeft: 6 },
  appName:    { fontSize: 48, fontWeight: '900', color: COLORS.textMain, letterSpacing: -2 },
  tagline:    { fontSize: 14, color: COLORS.textSoft, marginTop: 8, paddingHorizontal: 20, textAlign: 'center', lineHeight: 22 },
  
  card:       { backgroundColor: COLORS.surfaceLowest, borderRadius: RADIUS.xl, padding: 32 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title:      { fontSize: 28, fontWeight: '800', color: COLORS.textMain, letterSpacing: -0.5 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  subtitle:   { fontSize: 13, color: COLORS.textSoft, marginBottom: 32, fontWeight: '500' },
  
  inputSection: { marginBottom: 24 },
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
