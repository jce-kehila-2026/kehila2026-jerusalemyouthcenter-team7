import { useAuth, UserRole } from "@/src/context/AuthContext";
import { COLORS } from "@/src/data/mockData";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const SCREEN_H = Dimensions.get("window").height;

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
        style={[rt.pill, role === "singer" && { backgroundColor: COLORS.teal }]}
        onPress={() => onChange("singer")}
      >
        <Text style={rt.icon}>🎤</Text>
        <Text style={[rt.text, role === "singer" && { color: COLORS.white }]}>
          Singer
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

  const [role, setRole] = useState<UserRole>("singer");
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

  // const handleLogin = async () => {
  //   if (!identifier.trim() || !password) {
  //     setError("Please fill in all fields");
  //     return;
  //   }

  //   setError("");
  //   setLoading(true);
  //   const ok = await login(identifier.trim(), password, role);
  //   setLoading(false);

  //   if (ok) {
  //     // Each role goes to its own tab stack
  //     router.replace(
  //       role === "admin" ? ("/(tabs)" as any) : ("/(tabs)" as any),
  //     );
  //   } else {
  //     setError(
  //       role === "singer"
  //         ? "No singer account found with this phone number.\nPlease check and try again."
  //         : "No admin account found with these credentials.\nCheck your email or role selection.",
  //     );
  //   }
  // };

  const handleLogin = async () => {
    if (role === "singer") {
      const phoneDigits = identifier.replace(/\D/g, "");
      if (phoneDigits.length < 5) {
        setError("Please enter a valid phone number.");
        return;
      }
    }

    setError("");
    setLoading(true);
    console.log("Attempting login with", { identifier, password, role });
    const result = await login(identifier.trim(), password, role);
    setLoading(false);

    if (result === true) {
      router.replace("/(tabs)" as any);
    } else if (result === "pending") {
      setError(
        "⏳ Your request is still pending admin approval.\nYou will be able to log in once approved.",
      );
    } else if (result === "rejected") {
      setError(
        "❌ Your join request was not approved.\nPlease contact the administrator for more information.",
      );
    } else {
      setError(
        role === "singer"
          ? "No account found for this phone number.\nPlease check your number or sign up."
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
      {/* Top half – hero image */}
      <ImageBackground
        source={require("../../assets/images/login-bg.jpg")}
        style={s.heroBg}
        resizeMode="cover"
      >
        <View style={s.heroOverlay} />
      </ImageBackground>

      {/* Bottom half – form */}
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        style={s.formArea}
      >
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
                : " 🎤 Singer sign in with their phone number"}
            </Text>
          </View>

          {error ? (
            <View style={s.errBox}>
              <Text style={s.errText}>⚠ {error}</Text>
            </View>
          ) : null}

          {/* Label + keyboard type change with role */}
          <Text style={s.label}>
            {role === "singer" ? "Phone Number" : "Email"}
          </Text>
          <TextInput
            style={inp("id")}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder={
              role === "singer" ? "+972-50-000-0000" : "admin@example.org"
            }
            placeholderTextColor="#aab"
            keyboardType={role === "singer" ? "phone-pad" : "email-address"}
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

          {/* Sign up link only shown for singers */}
          {role === "singer" ? (
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
  container: { flex: 1, backgroundColor: "#1a1a2e" },
  heroBg: { height: SCREEN_H * 0.48, width: "100%" },
  heroOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  formArea: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 28 },

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
  appName: { fontSize: 28, fontWeight: "800", letterSpacing: 1.5, color: "#fff", textAlign: "center", marginTop: 10 },
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
