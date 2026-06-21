import { confirmOtp, sendOtp } from "@/src/firebase/phoneAuth";
import { isValidPhone, toE164 } from "@/src/utils/validation";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const C = {
  teal: "#039899",
  red: "#c56451",
  muted: "#9aa8b4",
  border: "#e8eef2",
  white: "#ffffff",
  successBg: "#f0fff5",
  success: "#1fa971",
} as const;

type Status = "idle" | "sending" | "sent" | "verifying";

type Props = {
  phone: string;
  verified: boolean;
  onVerified: () => void;
};

export function PhoneVerify({ phone, verified, onVerified }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const confirmationRef = useRef<FirebaseAuthTypes.ConfirmationResult | null>(
    null,
  );

  // @react-native-firebase/auth's SMS OTP flow is native-only (Play
  // Integrity / silent push) — there's no web app registered for it, so it
  // can't run in a browser. Skip straight to verified on web; the mobile
  // app is what actually proves phone ownership.
  useEffect(() => {
    if (Platform.OS === "web" && !verified) onVerified();
  }, [verified, onVerified]);

  if (Platform.OS === "web") {
    return verified ? (
      <View style={st.okBox}>
        <Text style={st.okTxt}>✓ Phone number verified</Text>
      </View>
    ) : null;
  }

  const handleSend = async () => {
    setError("");
    if (!isValidPhone(phone)) {
      setError("Enter a valid phone number first");
      return;
    }
    setStatus("sending");
    try {
      confirmationRef.current = await sendOtp(toE164(phone));
      setStatus("sent");
    } catch (e: any) {
      setError(e?.message ?? "Could not send code. Try again.");
      setStatus("idle");
    }
  };

  const handleVerify = async () => {
    setError("");
    if (!confirmationRef.current) return;
    setStatus("verifying");
    try {
      await confirmOtp(confirmationRef.current, code.trim());
      onVerified();
    } catch {
      setError("Incorrect code. Please try again.");
      setStatus("sent");
    }
  };

  if (verified) {
    return (
      <View style={st.okBox}>
        <Text style={st.okTxt}>✓ Phone number verified</Text>
      </View>
    );
  }

  return (
    <View style={st.wrap}>
      {status === "sent" || status === "verifying" ? (
        <>
          <Text style={st.hint}>Enter the 6-digit code we texted you</Text>
          <TextInput
            style={st.codeInput}
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            placeholderTextColor="#aab"
            keyboardType="number-pad"
            maxLength={6}
          />
          <Pressable
            style={({ pressed }) => [
              st.btn,
              pressed && { opacity: 0.85 },
              (status === "verifying" || code.trim().length < 6) && {
                opacity: 0.5,
              },
            ]}
            onPress={handleVerify}
            disabled={status === "verifying" || code.trim().length < 6}
          >
            {status === "verifying" ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={st.btnTxt}>Verify Code</Text>
            )}
          </Pressable>
          <Pressable onPress={handleSend} disabled={status === "verifying"}>
            <Text style={st.resend}>Didn&apos;t get it? Resend code</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          style={({ pressed }) => [
            st.btn,
            pressed && { opacity: 0.85 },
            status === "sending" && { opacity: 0.5 },
          ]}
          onPress={handleSend}
          disabled={status === "sending"}
        >
          {status === "sending" ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={st.btnTxt}>Send Verification Code</Text>
          )}
        </Pressable>
      )}
      {error ? <Text style={st.errTxt}>⚠ {error}</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginBottom: 16 },
  hint: { fontSize: 12, color: C.muted, marginBottom: 8 },
  codeInput: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: "center",
    marginBottom: 10,
  },
  btn: {
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
    backgroundColor: C.teal,
  },
  btnTxt: { color: C.white, fontSize: 14, fontWeight: "700" },
  resend: {
    fontSize: 12,
    color: C.teal,
    textAlign: "center",
    marginTop: 10,
    fontWeight: "600",
  },
  errTxt: { color: C.red, fontSize: 12, fontWeight: "600", marginTop: 8 },
  okBox: {
    backgroundColor: C.successBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  okTxt: { color: C.success, fontWeight: "700", fontSize: 13 },
});
