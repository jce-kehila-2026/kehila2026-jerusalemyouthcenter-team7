import { AppColors } from "@/constants/theme";
import { useAuth } from "@/src/context/AuthContext";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import { COLORS } from "../../src/data/mockData";

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

// ── Bird SVG logo ─────────────────────────────────────────────────────────────
function BirdLogo({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="bodyGrad2" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={COLORS.teal} stopOpacity="1" />
          <Stop offset="100%" stopColor={COLORS.tealDark} stopOpacity="1" />
        </RadialGradient>
      </Defs>
      <Path
        d="M18 38 Q10 20 28 14 Q38 10 45 22 Q35 26 30 35 Z"
        fill={COLORS.teal}
        opacity={0.9}
      />
      <Path
        d="M22 52 Q12 48 14 36 Q22 28 34 38 Q28 44 26 54 Z"
        fill={COLORS.teal}
        opacity={0.75}
      />
      <Path
        d="M30 70 Q18 72 16 60 Q20 52 32 56 Q30 62 30 70 Z"
        fill={COLORS.teal}
        opacity={0.65}
      />
      <Ellipse cx="52" cy="50" rx="16" ry="20" fill="url(#bodyGrad2)" />
      <Circle cx="58" cy="34" r="10" fill={COLORS.teal} />
      <Path d="M67 33 L76 31 L68 36 Z" fill={COLORS.yellow} />
      <Circle cx="61" cy="32" r="2" fill={COLORS.black} />
      <Circle cx="62" cy="31" r="0.7" fill={COLORS.white} />
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
      <Circle cx="78" cy="22" r="1.5" fill={COLORS.teal} opacity={0.7} />
      <Circle cx="84" cy="18" r="1" fill={COLORS.teal} opacity={0.5} />
      <Circle cx="82" cy="26" r="1" fill={COLORS.yellow} opacity={0.6} />
      <Circle cx="88" cy="24" r="0.8" fill={COLORS.red} opacity={0.5} />
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

export default function SignupScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  const handleSignup = async () => {
    if (!form.name || !form.email || !form.password) {
      setError("Name, email, and password are required");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setLoading(true);
    await login(form.email, form.password);
    setLoading(false);
    router.replace("/(tabs)");
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChangeText: (v: string) => setForm((prev) => ({ ...prev, [key]: v })),
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
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
          <TextInput
            style={styles.input}
            {...field("name")}
            placeholder="Your full name"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            {...field("email")}
            placeholder="you@example.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Phone (optional)</Text>
          <TextInput
            style={styles.input}
            {...field("phone")}
            placeholder="+972-50-000-0000"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            {...field("password")}
            placeholder="••••••••"
            placeholderTextColor="#999"
            secureTextEntry
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            {...field("confirm")}
            placeholder="••••••••"
            placeholderTextColor="#999"
            secureTextEntry
          />

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" style={styles.link}>
              Sign in
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.primaryLight },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 32 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: { color: "#fff", fontSize: 36, fontWeight: "700" },
  appName: { fontSize: 28, fontWeight: "700", color: AppColors.primary },
  tagline: { fontSize: 14, color: "#666", marginTop: 4 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  errorText: {
    color: AppColors.danger,
    fontSize: 13,
    backgroundColor: AppColors.dangerLight,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#11181C", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#e0e4e8",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#11181C",
    marginBottom: 16,
    backgroundColor: "#fafafa",
  },
  button: {
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerText: { color: "#687076", fontSize: 14 },
  link: { color: AppColors.primary, fontSize: 14, fontWeight: "600" },
});
