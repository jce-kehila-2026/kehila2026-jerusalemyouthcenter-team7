import { confirmOtpAndGetToken, sendOtp } from "@/src/firebase/phoneAuth";
import { db } from "@/src/firebase/firebase";
import { COLORS } from "@/src/data/mockData";
import { isValidIsraeliLocalMobile, toE164 } from "@/src/utils/validation";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Step = "phone" | "otp" | "password" | "success";

const PHONE_PREFIX = "+972";

const localDigits = (full: string) =>
  (full.startsWith(PHONE_PREFIX) ? full.slice(PHONE_PREFIX.length) : full)
    .replace(/\D/g, "")
    .slice(0, 9);

export default function ForgotPasswordScreen() {
  const router = useRouter();

  // All hooks must be declared before any early return (Rules of Hooks).
  const [step, setStep] = useState<Step>("phone");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [idToken, setIdToken] = useState("");

  const confirmationRef = useRef<FirebaseAuthTypes.ConfirmationResult | null>(null);

  // SMS OTP is native-only (Play Integrity / silent push). Web has no phone
  // auth capability, so show a clear message instead of a broken flow.
  if (Platform.OS === "web") {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Text style={s.backTxt}>← Back</Text>
          </Pressable>
          <Text style={s.headerTitle}>Password Recovery</Text>
          <View style={{ width: 64 }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={s.card}>
            <View style={s.iconRow}>
              <Text style={s.stepEmoji}>📱</Text>
            </View>
            <Text style={s.cardTitle}>Mobile App Required</Text>
            <Text style={s.cardSub}>
              Password reset uses SMS verification, which is only available in
              the mobile app.{"\n\n"}Please open the app on your phone to reset
              your password.
            </Text>
            <Pressable style={s.btn} onPress={() => router.back()}>
              <Text style={s.btnTxt}>Back to Login</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const fullPhone = phoneLocal ? `${PHONE_PREFIX}${phoneLocal}` : "";
  const phoneValid = isValidIsraeliLocalMobile(phoneLocal);

  // ── Step 1: Verify phone exists in Firestore, then send OTP ───────────────
  const handleSendCode = async () => {
    if (!phoneValid) {
      setError("Enter a valid 9-digit mobile number starting with 5.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // Check if this phone is registered in the users collection.
      const snap = await getDocs(
        query(collection(db, "users"), where("phone", "==", fullPhone)),
      );
      if (snap.empty) {
        setError("No account found for this phone number.");
        setLoading(false);
        return;
      }

      confirmationRef.current = await sendOtp(toE164(fullPhone));
      setStep("otp");
    } catch (e: any) {
      setError(e?.message ?? "Could not send verification code. Try again.");
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setError("");
    setOtpCode("");
    setLoading(true);
    try {
      confirmationRef.current = await sendOtp(toE164(fullPhone));
    } catch (e: any) {
      setError(e?.message ?? "Could not resend code.");
    }
    setLoading(false);
  };

  // ── Step 2: Verify OTP, obtain phone-auth idToken ─────────────────────────
  const handleVerifyOtp = async () => {
    if (otpCode.trim().length < 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    if (!confirmationRef.current) return;
    setError("");
    setLoading(true);
    try {
      const token = await confirmOtpAndGetToken(confirmationRef.current, otpCode.trim());
      setIdToken(token);
      setStep("password");
    } catch {
      setError("Incorrect code. Please try again.");
    }
    setLoading(false);
  };

  // ── Step 3: Call Cloud Function to reset the password ─────────────────────
  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPw) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const functions = getFunctions();
      const resetUserPassword = httpsCallable(functions, "resetUserPassword");

      // On web the OTP was skipped, so idToken is empty. The Cloud Function
      // will reject unauthenticated calls — web users see a clear message.
      await resetUserPassword({ idToken, newPassword });
      setStep("success");
    } catch (e: any) {
      const msg =
        e?.message?.replace(/^.*?:\s*/, "") ?? // strip Firebase error prefix
        "Failed to reset password. Please try again.";
      setError(msg);
    }
    setLoading(false);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const inp = (key: string) => [
    s.input,
    focused === key && { borderColor: COLORS.teal, backgroundColor: COLORS.white },
  ];

  const goBack = () => {
    if (step === "otp") { setStep("phone"); setOtpCode(""); setError(""); return; }
    if (step === "password") { setStep("otp"); setError(""); return; }
    router.back();
  };

  // ── Step indicators ───────────────────────────────────────────────────────
  const STEPS: Step[] = ["phone", "otp", "password"];
  const stepIndex = STEPS.indexOf(step);

  // ── Render ────────────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <SafeAreaView style={s.successWrap}>
        <View style={s.successCard}>
          <View style={s.successIcon}>
            <Text style={s.successEmoji}>🔓</Text>
          </View>
          <Text style={s.successTitle}>Password Reset!</Text>
          <Text style={s.successBody}>
            Your password has been successfully updated.{"\n"}You can now sign
            in with your new password.
          </Text>
          <Pressable
            style={s.btn}
            onPress={() => router.replace("/(auth)/login" as any)}
          >
            <Text style={s.btnTxt}>Back to Login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header row */}
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={goBack} hitSlop={12}>
            <Text style={s.backTxt}>← Back</Text>
          </Pressable>
          <Text style={s.headerTitle}>Password Recovery</Text>
          <View style={{ width: 64 }} />
        </View>

        {/* Step progress bar */}
        {step !== "success" && (
          <View style={s.progressRow}>
            {STEPS.map((st, i) => (
              <View
                key={st}
                style={[
                  s.dot,
                  { backgroundColor: i <= stepIndex ? COLORS.teal : COLORS.border },
                ]}
              />
            ))}
          </View>
        )}

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.card}>
            {/* ── Step: phone ────────────────────────────────────────────── */}
            {step === "phone" && (
              <>
                <View style={s.iconRow}>
                  <Text style={s.stepEmoji}>📱</Text>
                </View>
                <Text style={s.cardTitle}>Enter your phone number</Text>
                <Text style={s.cardSub}>
                  We&apos;ll send a verification code to confirm your identity.
                </Text>

                {error ? <ErrorBox msg={error} /> : null}

                <Text style={s.label}>Phone Number</Text>
                <View style={s.phoneRow}>
                  <View style={s.prefix}>
                    <Text style={s.prefixTxt}>{PHONE_PREFIX}</Text>
                  </View>
                  <TextInput
                    style={[
                      s.phoneInput,
                      focused === "phone" && {
                        borderColor: COLORS.teal,
                        backgroundColor: COLORS.white,
                      },
                    ]}
                    value={phoneLocal}
                    onChangeText={(t) =>
                      setPhoneLocal(t.replace(/\D/g, "").slice(0, 9))
                    }
                    onFocus={() => setFocused("phone")}
                    onBlur={() => setFocused(null)}
                    placeholder="501234567"
                    placeholderTextColor="#aab"
                    keyboardType="number-pad"
                    maxLength={9}
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    s.btn,
                    pressed && { opacity: 0.85 },
                    (loading || !phoneValid) && { opacity: 0.55 },
                  ]}
                  onPress={handleSendCode}
                  disabled={loading || !phoneValid}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={s.btnTxt}>Send Code</Text>
                  )}
                </Pressable>
              </>
            )}

            {/* ── Step: otp ──────────────────────────────────────────────── */}
            {step === "otp" && (
              <>
                <View style={s.iconRow}>
                  <Text style={s.stepEmoji}>💬</Text>
                </View>
                <Text style={s.cardTitle}>Enter verification code</Text>
                <Text style={s.cardSub}>
                  We sent a 6-digit code to{"\n"}
                  <Text style={{ fontWeight: "700", color: "#0d1717" }}>
                    {fullPhone}
                  </Text>
                </Text>

                {error ? <ErrorBox msg={error} /> : null}

                <Text style={s.label}>Verification Code</Text>
                <TextInput
                  style={[
                    s.input,
                    s.codeInput,
                    focused === "otp" && {
                      borderColor: COLORS.teal,
                      backgroundColor: COLORS.white,
                    },
                  ]}
                  value={otpCode}
                  onChangeText={(t) =>
                    setOtpCode(t.replace(/\D/g, "").slice(0, 6))
                  }
                  onFocus={() => setFocused("otp")}
                  onBlur={() => setFocused(null)}
                  placeholder="123456"
                  placeholderTextColor="#aab"
                  keyboardType="number-pad"
                  maxLength={6}
                />

                <Pressable
                  style={({ pressed }) => [
                    s.btn,
                    pressed && { opacity: 0.85 },
                    (loading || otpCode.trim().length < 6) && { opacity: 0.55 },
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={loading || otpCode.trim().length < 6}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={s.btnTxt}>Verify Code</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={handleResend}
                  disabled={loading}
                  style={{ marginTop: 14, alignItems: "center" }}
                >
                  <Text style={s.resendTxt}>Didn&apos;t get it? Resend code</Text>
                </Pressable>
              </>
            )}

            {/* ── Step: password ─────────────────────────────────────────── */}
            {step === "password" && (
              <>
                <View style={s.iconRow}>
                  <Text style={s.stepEmoji}>🔐</Text>
                </View>
                <Text style={s.cardTitle}>Set new password</Text>
                <Text style={s.cardSub}>
                  Choose a strong password for your account.
                </Text>

                {error ? <ErrorBox msg={error} /> : null}

                <Text style={s.label}>New Password</Text>
                <TextInput
                  style={inp("pw")}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onFocus={() => setFocused("pw")}
                  onBlur={() => setFocused(null)}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor="#aab"
                  secureTextEntry
                />

                <Text style={s.label}>Confirm Password</Text>
                <TextInput
                  style={[
                    inp("cpw"),
                    confirmPw && newPassword !== confirmPw
                      ? s.inputErr
                      : null,
                    confirmPw && newPassword === confirmPw
                      ? s.inputOk
                      : null,
                  ].filter(Boolean)}
                  value={confirmPw}
                  onChangeText={setConfirmPw}
                  onFocus={() => setFocused("cpw")}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  placeholderTextColor="#aab"
                  secureTextEntry
                />
                {confirmPw && newPassword === confirmPw ? (
                  <Text style={s.matchTxt}>✓ Passwords match</Text>
                ) : null}

                <Pressable
                  style={({ pressed }) => [
                    s.btn,
                    pressed && { opacity: 0.85 },
                    loading && { opacity: 0.55 },
                  ]}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={s.btnTxt}>Reset Password</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <View style={s.errBox}>
      <Text style={s.errTxt}>⚠ {msg}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f7fa" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  backTxt: { fontSize: 15, fontWeight: "600", color: COLORS.teal },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#0d1717" },

  progressRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dot: { flex: 1, height: 4, borderRadius: 2 },

  scroll: { padding: 20, paddingBottom: 40 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 5,
  },

  iconRow: { alignItems: "center", marginBottom: 16 },
  stepEmoji: { fontSize: 48 },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0d1717",
    marginBottom: 6,
    textAlign: "center",
  },
  cardSub: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },

  errBox: {
    backgroundColor: COLORS.redLight,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.red,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errTxt: { color: COLORS.red, fontSize: 13, fontWeight: "500" },

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
  inputErr: { borderColor: COLORS.red, backgroundColor: COLORS.redLight },
  inputOk: { borderColor: "#1fa971", backgroundColor: "#f0fff5" },

  codeInput: { fontSize: 22, letterSpacing: 6, textAlign: "center" },

  phoneRow: { flexDirection: "row", marginBottom: 16 },
  prefix: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    backgroundColor: COLORS.grayLight,
    paddingHorizontal: 13,
    justifyContent: "center",
  },
  prefixTxt: { fontSize: 15, color: COLORS.gray, fontWeight: "600" },
  phoneInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    padding: 13,
    fontSize: 15,
    color: "#0d1717",
    backgroundColor: COLORS.grayLight,
  },

  btn: {
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    backgroundColor: COLORS.teal,
    marginTop: 4,
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  btnTxt: { color: COLORS.white, fontSize: 16, fontWeight: "700" },

  resendTxt: { color: COLORS.teal, fontSize: 13, fontWeight: "600" },

  matchTxt: {
    fontSize: 12,
    color: "#1fa971",
    fontWeight: "600",
    marginTop: -10,
    marginBottom: 12,
  },

  // ── Success screen ────────────────────────────────────────────────────────
  successWrap: {
    flex: 1,
    backgroundColor: "#f0fafa",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  successCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  successIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#e6fafa",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successEmoji: { fontSize: 44 },
  successTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0d1717",
    marginBottom: 12,
    textAlign: "center",
  },
  successBody: {
    fontSize: 15,
    color: "#687076",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
});
