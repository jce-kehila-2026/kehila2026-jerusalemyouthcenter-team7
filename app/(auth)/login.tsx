import { useAuth, UserRole } from "@/src/context/AuthContext";
import { COLORS } from "@/src/data/mockData";
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

function BirdLogo({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="birdGrad" cx="50%" cy="50%" r="50%">
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
      <Ellipse cx="52" cy="50" rx="16" ry="20" fill="url(#birdGrad)" />
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

function RoleToggle({
  role,
  onChange,
}: {
  role: UserRole;
  onChange: (r: UserRole) => void;
}) {
  return (
    <View style={rt.wrapper}>
      <Pressable
        style={[
          rt.pill,
          role === "student" && { backgroundColor: COLORS.teal },
        ]}
        onPress={() => onChange("student")}
      >
        <Text style={rt.icon}>🎓</Text>
        <Text style={[rt.text, role === "student" && { color: COLORS.white }]}>
          Student
        </Text>
      </Pressable>
      <Pressable
        style={[rt.pill, role === "admin" && { backgroundColor: COLORS.red }]}
        onPress={() => onChange("admin")}
      >
        <Text style={rt.icon}>🛡️</Text>
        <Text style={[rt.text, role === "admin" && { color: COLORS.white }]}>
          Admin
        </Text>
      </Pressable>
    </View>
  );
}
const rt = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    backgroundColor: COLORS.grayLight,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  icon: { fontSize: 15 },
  text: { fontSize: 14, fontWeight: "600", color: COLORS.gray },
});

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();

  const [role, setRole] = useState<UserRole>("student");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  const accent = role === "admin" ? COLORS.red : COLORS.teal;

  const handleRoleChange = (r: UserRole) => {
    setRole(r);
    setIdentifier("");
    setError("");
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }
    setError("");
    setLoading(true);
    const ok = await login(identifier.trim(), password, role);
    setLoading(false);

    if (ok) {
      // Each role goes to its own tab stack
      router.replace(
        role === "admin" ? ("/(admin-tabs)" as any) : ("/(tabs)" as any),
      );
    } else {
      setError(
        role === "student"
          ? "No student account found with this phone number.\nPlease check and try again."
          : "No admin account found with these credentials.\nCheck your email or role selection.",
      );
    }
  };

  const inp = (key: string) => [
    s.input,
    focused === key && { borderColor: accent, backgroundColor: COLORS.white },
  ];

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={[s.ring, { shadowColor: accent }]}>
            <BirdLogo size={88} />
          </View>
          <Text style={[s.appName, { color: accent }]}>Kehila</Text>
          <Text style={s.tagline}>Jerusalem Youth Center</Text>
          <View style={s.accentBar}>
            {[COLORS.teal, COLORS.red, COLORS.yellow].map((c) => (
              <View key={c} style={[s.accentSeg, { backgroundColor: c }]} />
            ))}
          </View>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.title}>Welcome back</Text>
          <Text style={s.subtitle}>Select your role to sign in</Text>

          <RoleToggle role={role} onChange={handleRoleChange} />

          {/* Hint changes per role */}
          <View
            style={[
              s.badge,
              {
                backgroundColor:
                  role === "admin" ? COLORS.redLight : COLORS.tealLight,
              },
            ]}
          >
            <Text style={[s.badgeText, { color: accent }]}>
              {role === "admin"
                ? "🛡️  Admins sign in with their email address"
                : "🎓  Students sign in with their phone number"}
            </Text>
          </View>

          {error ? (
            <View style={s.errBox}>
              <Text style={s.errText}>⚠ {error}</Text>
            </View>
          ) : null}

          {/* Label + keyboard type change with role */}
          <Text style={s.label}>
            {role === "student" ? "Phone Number" : "Email"}
          </Text>
          <TextInput
            style={inp("id")}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder={
              role === "student" ? "+972-50-000-0000" : "admin@kehila.org"
            }
            placeholderTextColor="#aab"
            keyboardType={role === "student" ? "phone-pad" : "email-address"}
            autoCapitalize="none"
            onFocus={() => setFocused("id")}
            onBlur={() => setFocused(null)}
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={inp("pass")}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#aab"
            secureTextEntry
            onFocus={() => setFocused("pass")}
            onBlur={() => setFocused(null)}
          />

          <Pressable
            style={({ pressed }) => [
              s.btn,
              { backgroundColor: accent, shadowColor: accent },
              pressed && { opacity: 0.85 },
              loading && { opacity: 0.55 },
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={s.btnText}>Sign In</Text>
            )}
          </Pressable>

          <View style={s.divider}>
            <View style={s.divLine} />
            <Text style={s.divText}>or</Text>
            <View style={s.divLine} />
          </View>

          {/* Sign up link only shown for students */}
          {role === "student" ? (
            <View style={s.footer}>
              <Text style={s.footerText}>Don&apos;t have an account? </Text>
              <Link href={"/(auth)/signup" as any} style={s.signupLink}>
                Sign up
              </Link>
            </View>
          ) : (
            <Text style={s.adminNote}>
              Admin accounts are created by the organization.{"\n"}Contact your
              administrator for access.
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0fafa" },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 48 },

  hero: { alignItems: "center", marginBottom: 28 },
  ring: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  appName: { fontSize: 32, fontWeight: "800", letterSpacing: 1.5 },
  tagline: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  accentBar: { flexDirection: "row", marginTop: 14 },
  accentSeg: { width: 32, height: 4, marginHorizontal: 2, borderRadius: 2 },

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
  subtitle: { fontSize: 14, color: COLORS.gray, marginBottom: 16 },

  badge: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  badgeText: { fontSize: 13, fontWeight: "600" },

  errBox: {
    backgroundColor: COLORS.redLight,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.red,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errText: { color: COLORS.red, fontSize: 13, fontWeight: "500" },

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

  btn: {
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginTop: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  btnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  divider: { flexDirection: "row", alignItems: "center", marginVertical: 18 },
  divLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  divText: { marginHorizontal: 10, color: COLORS.gray, fontSize: 12 },

  footer: { flexDirection: "row", justifyContent: "center" },
  footerText: { color: COLORS.gray, fontSize: 14 },
  signupLink: { fontSize: 14, fontWeight: "700", color: COLORS.teal },
  adminNote: {
    textAlign: "center",
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 20,
  },
});
