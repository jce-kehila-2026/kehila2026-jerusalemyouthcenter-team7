import { auth, db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
  dark: "#1a1a2e",
  muted: "#9aa8b4",
  border: "#e8eef2",
  white: "#ffffff",
} as const;

type Props = {
  visible: boolean;
  uid: string;
  onDone: () => void;
};

export function ForcePasswordChangeModal({ visible, uid, onDone }: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (newPassword.length < 6) {
      return setError("Password must be at least 6 characters.");
    }
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match.");
    }

    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("No authenticated user.");

      await updatePassword(currentUser, newPassword);

      // Dismiss the modal immediately — password is already changed.
      // Clear the Firestore flag in the background so it never blocks the dismiss.
      updateDoc(doc(db, "users", uid), { mustChangePassword: false }).catch(
        (e) => console.error("Failed to clear mustChangePassword flag:", e),
      );

      setNewPassword("");
      setConfirmPassword("");
      setSaving(false);
      onDone();
    } catch (e: any) {
      if (e.code === "auth/requires-recent-login") {
        setError("Session expired. Please log out and log back in.");
      } else {
        setError(e.message || "Failed to update password.");
      }
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => {}}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.card}>
          {/* Header */}
          <View style={s.cardHeader}>
            <View style={s.iconCircle}>
              <Ionicons name="lock-closed" size={20} color={C.white} />
            </View>
            <Text style={s.cardTitle}>Set New Password</Text>
          </View>

          <Text style={s.infoText}>
            First login — set a new password to continue.
          </Text>

          {error ? (
            <View style={s.errorBox}>
              <Ionicons name="warning-outline" size={14} color={C.red} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={s.fieldLabel}>NEW PASSWORD *</Text>
          <TextInput
            style={s.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Min 6 characters"
            placeholderTextColor={C.muted}
            secureTextEntry
          />

          <Text style={s.fieldLabel}>CONFIRM PASSWORD *</Text>
          <TextInput
            style={s.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat new password"
            placeholderTextColor={C.muted}
            secureTextEntry
          />

          <Pressable
            style={[s.btn, saving && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={s.btnText}>Set Password & Continue</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: C.dark },
  infoText: {
    fontSize: 13,
    color: "#5a6a7a",
    lineHeight: 19,
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fdecea",
    borderLeftWidth: 3,
    borderLeftColor: C.red,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { color: C.red, fontSize: 12, flex: 1 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    padding: 11,
    fontSize: 14,
    color: C.dark,
    marginBottom: 12,
    backgroundColor: "#f9fbfd",
  },
  btn: {
    backgroundColor: C.teal,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: { color: C.white, fontSize: 15, fontWeight: "700" },
});
