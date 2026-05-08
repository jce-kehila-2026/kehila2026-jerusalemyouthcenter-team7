import { useAuth } from '@/src/context/AuthContext';
import { AppColors } from '@/constants/theme';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function SignupScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!form.name || !form.email || !form.password) {
      setError('Name, email, and password are required');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    await login(form.email, form.password);
    setLoading(false);
    router.replace('/(tabs)');
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChangeText: (v: string) => setForm(prev => ({ ...prev, [key]: v })),
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>K</Text>
          </View>
          <Text style={styles.appName}>Kehila</Text>
          <Text style={styles.tagline}>Create your account</Text>
        </View>

        <View style={styles.card}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} {...field('name')} placeholder="Your full name" placeholderTextColor="#999" />

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} {...field('email')} placeholder="you@example.com" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Phone (optional)</Text>
          <TextInput style={styles.input} {...field('phone')} placeholder="+972-50-000-0000" placeholderTextColor="#999" keyboardType="phone-pad" />

          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} {...field('password')} placeholder="••••••••" placeholderTextColor="#999" secureTextEntry />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput style={styles.input} {...field('confirm')} placeholder="••••••••" placeholderTextColor="#999" secureTextEntry />

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" style={styles.link}>Sign in</Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.primaryLight },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: AppColors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoText: { color: '#fff', fontSize: 36, fontWeight: '700' },
  appName: { fontSize: 28, fontWeight: '700', color: AppColors.primary },
  tagline: { fontSize: 14, color: '#666', marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  errorText: {
    color: AppColors.danger, fontSize: 13,
    backgroundColor: AppColors.dangerLight,
    padding: 10, borderRadius: 8, marginBottom: 12,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#11181C', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e0e4e8', borderRadius: 10,
    padding: 12, fontSize: 15, color: '#11181C', marginBottom: 16, backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: AppColors.primary, borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: '#687076', fontSize: 14 },
  link: { color: AppColors.primary, fontSize: 14, fontWeight: '600' },
});
