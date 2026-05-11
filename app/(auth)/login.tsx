import { useAuth } from "@/src/context/AuthContext";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
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
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { COLORS } from "../../src/data/mockData";

// ── Bird SVG logo (based on the uploaded artwork) ────────────────────────────
function BirdLogo({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="bodyGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={COLORS.teal} stopOpacity="1" />
          <Stop offset="100%" stopColor={COLORS.tealDark} stopOpacity="1" />
        </RadialGradient>
      </Defs>

      {/* Left wing – upper sweep */}
      <Path
        d="M18 38 Q10 20 28 14 Q38 10 45 22 Q35 26 30 35 Z"
        fill={COLORS.teal}
        opacity={0.9}
      />
      {/* Left wing – lower feathers */}
      <Path
        d="M22 52 Q12 48 14 36 Q22 28 34 38 Q28 44 26 54 Z"
        fill={COLORS.teal}
        opacity={0.75}
      />
      {/* Left lower tail feather */}
      <Path
        d="M30 70 Q18 72 16 60 Q20 52 32 56 Q30 62 30 70 Z"
        fill={COLORS.teal}
        opacity={0.65}
      />

      {/* Body */}
      <Ellipse cx="52" cy="50" rx="16" ry="20" fill="url(#bodyGrad)" />

      {/* Head */}
      <Circle cx="58" cy="34" r="10" fill={COLORS.teal} />
      {/* Beak */}
      <Path d="M67 33 L76 31 L68 36 Z" fill={COLORS.yellow} />
      {/* Eye */}
      <Circle cx="61" cy="32" r="2" fill={COLORS.black} />
      <Circle cx="62" cy="31" r="0.7" fill={COLORS.white} />

      {/* Red accent feathers on body */}
      <Path
        d="M44 58 Q40 68 46 76 Q52 80 56 72 Q50 68 48 58 Z"
        fill={COLORS.red}
        opacity={0.85}
      />
      <Path
        d="M50 60 Q48 72 54 78 Q58 74 56 64 Z"
        fill={COLORS.red}
        opacity={0.6}
      />

      {/* Right wing – golden curved lines */}
      <Path
        d="M62 46 Q78 38 84 50 Q80 60 68 58"
        fill="none"
        stroke={COLORS.yellow}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Path
        d="M64 52 Q82 50 86 62 Q80 70 70 64"
        fill="none"
        stroke={COLORS.yellow}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.7}
      />

      {/* Scattered music-note dots (top right) */}
      <Circle cx="78" cy="22" r="1.5" fill={COLORS.teal} opacity={0.7} />
      <Circle cx="84" cy="18" r="1" fill={COLORS.teal} opacity={0.5} />
      <Circle cx="82" cy="26" r="1" fill={COLORS.yellow} opacity={0.6} />
      <Circle cx="88" cy="24" r="0.8" fill={COLORS.red} opacity={0.5} />

      {/* Bottom tail feathers */}
      <Path
        d="M46 76 Q40 86 48 90 Q54 86 52 76 Z"
        fill={COLORS.teal}
        opacity={0.7}
      />
      <Path
        d="M50 78 Q50 90 56 88 Q60 82 56 74 Z"
        fill={COLORS.red}
        opacity={0.5}
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setError("");
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      router.replace("/(tabs)");
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero header ── */}
        <View style={styles.hero}>
          {/* Decorative ring */}
          <View style={styles.ring}>
            <BirdLogo size={88} />
          </View>
          <Text style={styles.appName}>Kehila</Text>
          <Text style={styles.tagline}>Jerusalem Youth Center</Text>

          {/* Three-color accent bar */}
          <View style={styles.accentBar}>
            <View
              style={[styles.accentSegment, { backgroundColor: COLORS.teal }]}
            />
            <View
              style={[styles.accentSegment, { backgroundColor: COLORS.red }]}
            />
            <View
              style={[styles.accentSegment, { backgroundColor: COLORS.yellow }]}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#aab"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            onFocus={() => setFocused("email")}
            onBlur={() => setFocused(null)}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#999"
            secureTextEntry
            onFocus={() => setFocused("password")}
            onBlur={() => setFocused(null)}
          />

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <Link href="/(auth)/signup" style={styles.link}>
              Sign up
            </Link>
          </View>

          <Text style={styles.hint}>Demo: any email + password works</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0fafa" },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 48 },

  // Hero
  hero: { alignItems: "center", marginBottom: 28 },
  ring: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.tealDark,
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  accentBar: {
    flexDirection: "row",
    marginTop: 14,
    borderRadius: 4,
    overflow: "hidden",
  },
  accentSegment: { width: 32, height: 4, marginHorizontal: 2, borderRadius: 2 },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#0d1717", marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.gray, marginBottom: 20 },

  // Error
  errorBox: {
    backgroundColor: COLORS.redLight,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.red,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: { color: COLORS.red, fontSize: 13, fontWeight: "500" },

  // Form
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334",
    marginBottom: 6,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: "#0d1717",
    marginBottom: 16,
    backgroundColor: COLORS.grayLight,
  },
  inputFocused: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },

  // Button
  button: {
    backgroundColor: COLORS.teal,
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginTop: 4,
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.55 },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Divider
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { marginHorizontal: 10, color: COLORS.gray, fontSize: 12 },

  // Footer
  footer: { flexDirection: "row", justifyContent: "center" },
  footerText: { color: COLORS.gray, fontSize: 14 },
  link: { color: COLORS.teal, fontSize: 14, fontWeight: "700" },
  hint: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 16,
    textAlign: "center",
  },
});
