import { useAuth, UserRole } from '@/src/context/AuthContext';
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
import Svg, { Circle, Ellipse, Path, Defs, RadialGradient, Stop } from 'react-native-svg';

// ── Brand tokens ──────────────────────────────────────────────────────────────
const C = {
  teal:        '#039899',
  tealLight:   '#e0f5f5',
  tealDark:    '#027273',
  red:         '#c56451',
  redLight:    '#faeae6',
  yellow:      '#cfad5d',
  black:       '#0a0f0f',
  white:       '#ffffff',
  gray:        '#687076',
  grayLight:   '#f4f6f7',
  border:      '#d8e0e0',
};

// ── Bird SVG logo ─────────────────────────────────────────────────────────────
function BirdLogo({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="bodyGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={C.teal} stopOpacity="1" />
          <Stop offset="100%" stopColor={C.tealDark} stopOpacity="1" />
        </RadialGradient>
      </Defs>
      <Path d="M18 38 Q10 20 28 14 Q38 10 45 22 Q35 26 30 35 Z" fill={C.teal} opacity={0.9} />
      <Path d="M22 52 Q12 48 14 36 Q22 28 34 38 Q28 44 26 54 Z" fill={C.teal} opacity={0.75} />
      <Path d="M30 70 Q18 72 16 60 Q20 52 32 56 Q30 62 30 70 Z" fill={C.teal} opacity={0.65} />
      <Ellipse cx="52" cy="50" rx="16" ry="20" fill="url(#bodyGrad)" />
      <Circle cx="58" cy="34" r="10" fill={C.teal} />
      <Path d="M67 33 L76 31 L68 36 Z" fill={C.yellow} />
      <Circle cx="61" cy="32" r="2" fill={C.black} />
      <Circle cx="62" cy="31" r="0.7" fill={C.white} />
      <Path d="M44 58 Q40 68 46 76 Q52 80 56 72 Q50 68 48 58 Z" fill={C.red} opacity={0.85} />
      <Path d="M50 60 Q48 72 54 78 Q58 74 56 64 Z" fill={C.red} opacity={0.6} />
      <Path d="M62 46 Q78 38 84 50 Q80 60 68 58" fill="none" stroke={C.yellow} strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M64 52 Q82 50 86 62 Q80 70 70 64" fill="none" stroke={C.yellow} strokeWidth="2" strokeLinecap="round" opacity={0.7} />
      <Circle cx="78" cy="22" r="1.5" fill={C.teal} opacity={0.7} />
      <Circle cx="84" cy="18" r="1" fill={C.teal} opacity={0.5} />
      <Circle cx="82" cy="26" r="1" fill={C.yellow} opacity={0.6} />
      <Circle cx="88" cy="24" r="0.8" fill={C.red} opacity={0.5} />
      <Path d="M46 76 Q40 86 48 90 Q54 86 52 76 Z" fill={C.teal} opacity={0.7} />
      <Path d="M50 78 Q50 90 56 88 Q60 82 56 74 Z" fill={C.red} opacity={0.5} />
    </Svg>
  );
}

// ── Role toggle pill ──────────────────────────────────────────────────────────
function RoleToggle({ role, onChange }: { role: UserRole; onChange: (r: UserRole) => void }) {
  return (
    <View style={rt.wrapper}>
      <Pressable
        style={[rt.pill, role === 'student' && rt.pillActive]}
        onPress={() => onChange('student')}
      >
        <Text style={[rt.pillIcon]}>🎓</Text>
        <Text style={[rt.pillText, role === 'student' && rt.pillTextActive]}>Student</Text>
      </Pressable>
      <Pressable
        style={[rt.pill, role === 'admin' && rt.pillActiveAdmin]}
        onPress={() => onChange('admin')}
      >
        <Text style={[rt.pillIcon]}>🛡️</Text>
        <Text style={[rt.pillText, role === 'admin' && rt.pillTextActive]}>Admin</Text>
      </Pressable>
    </View>
  );
}

const rt = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    backgroundColor: C.grayLight,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  pillActive:      { backgroundColor: C.teal },
  pillActiveAdmin: { backgroundColor: C.red },
  pillIcon:        { fontSize: 15 },
  pillText:        { fontSize: 14, fontWeight: '600', color: C.gray },
  pillTextActive:  { color: C.white },
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { login } = useAuth();
  const router    = useRouter();

  const [role, setRole]         = useState<UserRole>('student');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [focused, setFocused]   = useState<string | null>(null);

  // Active accent color driven by role
  const accent = role === 'admin' ? C.red : C.teal;

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setError('');
    setLoading(true);
    const success = await login(email, password, role);
    setLoading(false);

    if (success) {
      // Route to role-specific tab stack
      router.replace(
        (role === 'admin' ? '/(admin-tabs)' : '/(tabs)') as any
      );
    } else {
      setError(
        `No ${role} account found with these credentials.\nPlease check your role selection.`
      );
    }
  };

  const inputStyle = (field: string) => [
    styles.input,
    focused === field && { borderColor: accent, backgroundColor: C.white },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.ring, { shadowColor: accent }]}>
            <BirdLogo size={88} />
          </View>
          <Text style={[styles.appName, { color: accent }]}>Kehila</Text>
          <Text style={styles.tagline}>Jerusalem Youth Center</Text>
          <View style={styles.accentBar}>
            <View style={[styles.accentSegment, { backgroundColor: C.teal }]} />
            <View style={[styles.accentSegment, { backgroundColor: C.red }]} />
            <View style={[styles.accentSegment, { backgroundColor: C.yellow }]} />
          </View>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Who are you signing in as?</Text>

          {/* ── Role selector ── */}
          <RoleToggle role={role} onChange={(r) => { setRole(r); setError(''); }} />

          {/* Role context badge */}
          <View style={[styles.badge, { backgroundColor: role === 'admin' ? '#faeae6' : C.tealLight }]}>
            <Text style={[styles.badgeText, { color: accent }]}>
              {role === 'admin'
                ? '🛡️  Signing in as Administrator'
                : '🎓  Signing in as Student'}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={inputStyle('email')}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#aab"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={inputStyle('password')}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#aab"
            secureTextEntry
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: accent, shadowColor: accent },
              pressed && { opacity: 0.85 },
              loading && { opacity: 0.55 },
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={C.white} />
              : <Text style={styles.buttonText}>Sign In</Text>
            }
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/signup" style={[styles.link, { color: accent }]}>Sign up</Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fafa' },
  scroll:    { flexGrow: 1, padding: 24, paddingTop: 48 },

  hero: { alignItems: 'center', marginBottom: 28 },
  ring: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: C.black,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  appName:  { fontSize: 32, fontWeight: '800', letterSpacing: 1.5 },
  tagline:  { fontSize: 13, color: C.gray, marginTop: 4, letterSpacing: 0.5 },
  accentBar:     { flexDirection: 'row', marginTop: 14 },
  accentSegment: { width: 32, height: 4, marginHorizontal: 2, borderRadius: 2 },

  card: {
    backgroundColor: C.white, borderRadius: 20, padding: 26,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 6,
  },
  title:    { fontSize: 22, fontWeight: '700', color: '#0d1717', marginBottom: 4 },
  subtitle: { fontSize: 14, color: C.gray, marginBottom: 16 },

  badge: {
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
    marginBottom: 16, alignItems: 'center',
  },
  badgeText: { fontSize: 13, fontWeight: '600' },

  errorBox: {
    backgroundColor: C.redLight, borderLeftWidth: 3, borderLeftColor: C.red,
    borderRadius: 8, padding: 10, marginBottom: 14,
  },
  errorText: { color: C.red, fontSize: 13, fontWeight: '500' },

  label: {
    fontSize: 12, fontWeight: '700', color: '#334',
    marginBottom: 6, letterSpacing: 0.6, textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    padding: 13, fontSize: 15, color: '#0d1717',
    marginBottom: 16, backgroundColor: C.grayLight,
  },

  button: {
    borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 4,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  buttonText: { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { marginHorizontal: 10, color: C.gray, fontSize: 12 },

  footer:     { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: C.gray, fontSize: 14 },
  link:       { fontSize: 14, fontWeight: '700' },
});