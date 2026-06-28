import { useAuth, UserRole } from "@/src/context/AuthContext";
import { COLORS } from "@/src/data/mockData";
import {
  authenticateWithBiometrics,
  clearCredentials,
  ENROLLMENT_FLAG_KEY,
  getBiometricType,
  isBiometricAvailable,
  loadCredentials,
  saveCredentials,
} from "@/src/utils/biometricAuth";
import { auth, db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { sendPasswordResetEmail } from "firebase/auth";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { Link, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
// login-bg.jpg is 1600x900 — derive hero height from its own aspect ratio so
// the full photo is visible (no cropping) instead of a fixed screen fraction.
const HERO_H = Math.round((SCREEN_W * 600) / 950);
// How far the sheet's rounded top initially overlaps the hero image at rest.
const CARD_OVERLAP = 15;
// Extra scroll travel (beyond a normal screen-filling scroll) reserved so the
// sheet can keep sliding up until it fully covers the hero image.
const SCROLL_TRAVEL = HERO_H - CARD_OVERLAP;

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
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<
    "face" | "fingerprint" | "none"
  >("none");
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [adminResetLoading, setAdminResetLoading] = useState(false);
  const [adminResetSent, setAdminResetSent] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === "web") return;
    (async () => {
      try {
        const enrolled = await SecureStore.getItemAsync(ENROLLMENT_FLAG_KEY);
        if (enrolled !== "true") return;
        const available = await isBiometricAvailable();
        if (!available) return;
        const type = await getBiometricType();
        setBiometricType(type);
        setBiometricAvailable(true);
      } catch {
        // biometric button stays hidden
      }
    })();
  }, []);

  const accent = role === "admin" ? COLORS.red : COLORS.teal;

  const handleRoleChange = (r: UserRole) => {
    setRole(r);
    setIdentifier("");
    setError("");
    setAdminResetSent(false);
  };

  const handleAdminForgotPassword = async () => {
    const email = identifier.trim();
    if (!email) {
      setError("Enter your email address above, then tap 'Forgot password?'");
      return;
    }
    setAdminResetLoading(true);
    setError("");
    try {
      // Firebase's Email Enumeration Protection silently succeeds even for
      // non-existent emails, giving a false "reset sent" impression. Check
      // Firestore first so we can surface a real error to the user.
      const snap = await getDocs(
        query(
          collection(db, "users"),
          where("email", "==", email),
          where("role", "==", "admin"),
          limit(1),
        ),
      );
      if (snap.empty) {
        setError("No admin account found for this email address.");
        return;
      }
      await sendPasswordResetEmail(auth, email);
      setAdminResetSent(true);
    } catch (e: any) {
      if (e?.code === "auth/invalid-email") {
        setError("Enter a valid email address.");
      } else {
        setError("Could not send reset email. Please try again.");
      }
    } finally {
      setAdminResetLoading(false);
    }
  };

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
    const result = await login(identifier.trim(), password, role);
    setLoading(false);

    if (result === true) {
      try {
        const canUseBiometric = await isBiometricAvailable();
        const alreadyEnrolled =
          await SecureStore.getItemAsync(ENROLLMENT_FLAG_KEY);
        if (canUseBiometric && alreadyEnrolled === null) {
          const type = await getBiometricType();
          const label = type === "face" ? "Face ID" : "Fingerprint";
          Alert.alert(
            `Enable ${label}?`,
            `Sign in faster next time using ${label}. You can change this later in your profile.`,
            [
              {
                text: "Not Now",
                style: "cancel",
                onPress: async () => {
                  await SecureStore.setItemAsync(ENROLLMENT_FLAG_KEY, "declined");
                  router.replace("/(tabs)" as any);
                },
              },
              {
                text: "Enable",
                onPress: async () => {
                  const ok = await authenticateWithBiometrics(
                    `Confirm with ${label} to enable quick sign-in`,
                  );
                  if (ok) {
                    await saveCredentials(identifier.trim(), password, role);
                    await SecureStore.setItemAsync(ENROLLMENT_FLAG_KEY, "true");
                  } else {
                    await SecureStore.setItemAsync(
                      ENROLLMENT_FLAG_KEY,
                      "declined",
                    );
                  }
                  router.replace("/(tabs)" as any);
                },
              },
            ],
          );
        } else {
          router.replace("/(tabs)" as any);
        }
      } catch {
        // SecureStore or biometric check failed — proceed normally
        router.replace("/(tabs)" as any);
      }
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

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      const label = biometricType === "face" ? "Face ID" : "Fingerprint";
      const ok = await authenticateWithBiometrics(`Sign in with ${label}`);
      if (!ok) {
        setBiometricLoading(false);
        return;
      }
      const creds = await loadCredentials();
      if (!creds) {
        setBiometricLoading(false);
        return;
      }
      setRole(creds.role);
      const result = await login(creds.identifier, creds.password, creds.role);
      if (result === true) {
        router.replace("/(tabs)" as any);
      } else if (result === "pending") {
        setError(
          "⏳ Your request is still pending admin approval.\nYou will be able to log in once approved.",
        );
      } else {
        setError(
          result === "rejected"
            ? "❌ Your join request was not approved. Contact the administrator."
            : "Saved credentials are no longer valid. Please sign in manually.",
        );
        await clearCredentials();
        setBiometricAvailable(false);
      }
    } catch {
      setError("Biometric authentication failed. Please sign in manually.");
    } finally {
      setBiometricLoading(false);
    }
  };

  const inp = (key: string) => [
    s.input,
    focused === key && { borderColor: accent, backgroundColor: COLORS.white },
  ];

  // The hero drifts upward slower than the scroll (parallax) and stretches
  // when the user pulls down past the top. The sheet itself (rendered as
  // scroll content) slides up at normal scroll speed and is what visually
  // covers the hero as the user scrolls.
  const heroTranslateY = scrollY.interpolate({
    inputRange: [-HERO_H, 0, HERO_H],
    outputRange: [HERO_H * 0.7, 0, -HERO_H * 0.2],
    extrapolate: "clamp",
  });
  const heroScale = scrollY.interpolate({
    inputRange: [-HERO_H, 0],
    outputRange: [2, 1],
    extrapolateRight: "clamp",
  });
  const heroOverlayOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_TRAVEL],
    outputRange: [0.1, 0.45],
    extrapolate: "clamp",
  });

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Fixed hero image — sits behind the scrolling sheet */}
      <Animated.View
        style={[
          s.hero,
          { transform: [{ translateY: heroTranslateY }, { scale: heroScale }] },
        ]}
      >
        <Image
          source={require("../../assets/images/login-bg.jpg")}
          style={s.heroImg}
          resizeMode="cover"
        />
        <Animated.View
          style={[s.heroOverlay, { opacity: heroOverlayOpacity }]}
        />
      </Animated.View>

      {/* Scrolling sheet — its rounded top slides up over the hero on scroll */}
      <Animated.ScrollView
        style={s.scrollContainer}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
      >
        <View style={s.sheet}>
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

            {role === "singer" ? (
              <Pressable
                style={s.forgotRow}
                onPress={() => router.push("/(auth)/forgot-password" as any)}
              >
                <Text style={s.forgotTxt}>Did you forget your password?</Text>
              </Pressable>
            ) : adminResetSent ? (
              <View style={s.resetSentBox}>
                <Text style={s.resetSentTxt}>
                  ✉ Password reset email sent to {identifier.trim()}.{"\n"}
                  Check your inbox and follow the link to set a new password.
                </Text>
              </View>
            ) : (
              <Pressable
                style={[s.forgotRow, adminResetLoading && { opacity: 0.5 }]}
                onPress={handleAdminForgotPassword}
                disabled={adminResetLoading}
              >
                {adminResetLoading ? (
                  <ActivityIndicator size="small" color={COLORS.red} />
                ) : (
                  <Text style={[s.forgotTxt, { color: COLORS.red }]}>
                    Forgot password?
                  </Text>
                )}
              </Pressable>
            )}

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

            {biometricAvailable && (
              <Pressable
                style={({ pressed }) => [
                  s.biometricBtn,
                  pressed && { opacity: 0.7 },
                  (biometricLoading || loading) && { opacity: 0.5 },
                ]}
                onPress={handleBiometricLogin}
                disabled={biometricLoading || loading}
              >
                {biometricLoading ? (
                  <ActivityIndicator size="small" color={COLORS.teal} />
                ) : (
                  <>
                    <Ionicons
                      name={
                        biometricType === "face"
                          ? "scan-outline"
                          : "finger-print-outline"
                      }
                      size={22}
                      color={COLORS.teal}
                    />
                    <Text style={s.biometricText}>
                      {biometricType === "face"
                        ? "Sign in with Face ID"
                        : "Sign in with Fingerprint"}
                    </Text>
                  </>
                )}
              </Pressable>
            )}

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
                Admin accounts are created by the organization.{"\n"}Contact
                your administrator for access.
              </Text>
            )}
          </View>
        </View>
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },

  hero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HERO_H,

    overflow: "hidden",
  },
  heroImg: { width: "100%", height: "100%" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },

  scrollContainer: { flex: 1 },
  scrollContent: {
    paddingTop: SCROLL_TRAVEL,
    // Reserve enough scroll room (even on tall screens / short content) for
    // the sheet to travel all the way from "peeking gap" to "fully covers
    // the hero", instead of relying on the form content being long enough.
    minHeight: SCREEN_H + SCROLL_TRAVEL,
  },

  sheet: {
    flexGrow: 1,
    minHeight: SCREEN_H,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    padding: 24,
  },

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

  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.teal,
    backgroundColor: COLORS.tealLight,
  },
  biometricText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.teal,
  },
  forgotRow: { alignItems: "flex-end", marginTop: -8, marginBottom: 16 },
  forgotTxt: { fontSize: 13, fontWeight: "600", color: COLORS.teal },

  resetSentBox: {
    backgroundColor: "#e6f4ea",
    borderLeftWidth: 3,
    borderLeftColor: "#1fa971",
    borderRadius: 8,
    padding: 10,
    marginTop: -8,
    marginBottom: 16,
  },
  resetSentTxt: { color: "#155724", fontSize: 13, fontWeight: "500", lineHeight: 19 },
});
