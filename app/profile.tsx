import { useAuth } from "@/src/context/AuthContext";
import { auth, db } from "@/src/firebase/firebase";
import {
  authenticateWithBiometrics,
  clearCredentials,
  ENROLLMENT_FLAG_KEY,
  getBiometricType,
  isBiometricAvailable,
  saveCredentials,
} from "@/src/utils/biometricAuth";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { Stack, useRouter } from "expo-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Design System ─────────────────────────────────────────────────────────────
const ds = {
  teal: "#039899",
  red: "#c56451",
  white: "#ffffff",
  bg: "#f5fafe",
  text: "#1a1a2e",
  subtext: "#5a6a7a",
  border: "#e8eef2",
} as const;

// ── Sub-components ────────────────────────────────────────────────────────────
const ProfileAvatar = ({
  name,
  url,
  onPress,
  uploading,
}: {
  name: string;
  url?: string | null;
  onPress: () => void;
  uploading: boolean;
}) => (
  <TouchableOpacity
    style={s.avatarWrap}
    onPress={onPress}
    activeOpacity={0.85}
    disabled={uploading}
  >
    {uploading ? (
      <View style={[s.avatar, s.avatarPlaceholder]}>
        <ActivityIndicator color={ds.white} />
      </View>
    ) : url ? (
      <Image source={{ uri: url }} style={s.avatar} />
    ) : (
      <View style={[s.avatar, s.avatarPlaceholder]}>
        <Text style={s.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
      </View>
    )}
    <View style={s.cameraBtn}>
      <Ionicons name="camera" size={15} color={ds.white} />
    </View>
  </TouchableOpacity>
);

const InfoRow = ({
  icon,
  label,
  value,
  isLast,
}: {
  icon: string;
  label: string;
  value: string | number;
  isLast?: boolean;
}) => (
  <View style={[s.row, !isLast && s.rowBorder]}>
    <View style={s.rowIcon}>
      <Ionicons name={icon as any} size={20} color={ds.teal} />
    </View>
    <View style={s.rowText}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{String(value)}</Text>
    </View>
  </View>
);

const InfoCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={s.card}>
    <View style={s.cardBar} />
    <View style={s.cardInner}>
      <Text style={s.cardTitle}>{title}</Text>
      {children}
    </View>
  </View>
);

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, logout } = useAuth() as any;
  const router = useRouter();
  const [fullData, setFullData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  // Change-password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [curPassword, setCurPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Biometric toggle state
  const [biometricHardwareAvailable, setBiometricHardwareAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<"face" | "fingerprint" | "none">("none");
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [bioPassword, setBioPassword] = useState("");
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (snap.exists()) setFullData(snap.data());
      })
      .catch(console.error);
  }, [user]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    (async () => {
      const available = await isBiometricAvailable();
      if (!available) return;
      setBiometricHardwareAvailable(true);
      setBiometricType(await getBiometricType());
      const flag = await SecureStore.getItemAsync(ENROLLMENT_FLAG_KEY);
      setBiometricEnabled(flag === "true");
    })();
  }, []);

  const handlePhotoUpdate = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert("Permission to access media library is required!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.2,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]?.base64 && user?.uid) {
      setUploading(true);
      const base64Image = "data:image/jpeg;base64," + result.assets[0].base64;
      await updateDoc(doc(db, "users", user.uid), { photoURL: base64Image });
      setFullData((prev: any) => ({ ...prev, photoURL: base64Image }));
      setUploading(false);
    }
  };

  // ── Change password handler ───────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    if (newPassword.length < 6) {
      return setPasswordError("Password must be at least 6 characters.");
    }
    if (newPassword !== confirmPassword) {
      return setPasswordError("Passwords do not match.");
    }
    setChangingPassword(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email)
        throw new Error("Not authenticated.");
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        curPassword,
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setPasswordSuccess("Password updated successfully.");
      setCurPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      if (
        e.code === "auth/wrong-password" ||
        e.code === "auth/invalid-credential"
      ) {
        setPasswordError("Current password is incorrect.");
      } else {
        setPasswordError(e.message || "Failed to update password.");
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // ── Biometric handlers ────────────────────────────────────────────────────
  const biometricLabel = biometricType === "face" ? "Face ID" : "Fingerprint";

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      setBioPassword("");
      setBioError("");
      setShowBiometricModal(true);
    } else {
      Alert.alert(`Disable ${biometricLabel}?`, "You can re-enable this anytime from your profile.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: async () => {
            await clearCredentials();
            await SecureStore.setItemAsync(ENROLLMENT_FLAG_KEY, "declined");
            setBiometricEnabled(false);
          },
        },
      ]);
    }
  };

  const handleEnableBiometric = async () => {
    if (!bioPassword) {
      setBioError("Please enter your password.");
      return;
    }
    setBioLoading(true);
    setBioError("");
    try {
      const ok = await authenticateWithBiometrics(`Confirm with ${biometricLabel} to enable quick sign-in`);
      if (!ok) {
        setBioError(`${biometricLabel} verification was cancelled. Please try again.`);
        setBioLoading(false);
        return;
      }
      const identifier = user?.role === "singer" ? (user?.phone ?? "") : (user?.email ?? "");
      await saveCredentials(identifier, bioPassword, user?.role);
      await SecureStore.setItemAsync(ENROLLMENT_FLAG_KEY, "true");
      setBiometricEnabled(true);
      setShowBiometricModal(false);
      setBioPassword("");
    } catch (e: any) {
      setBioError(`Could not enable ${biometricLabel}: ${e?.message ?? "Unknown error"}.`);
    } finally {
      setBioLoading(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const isSinger = user?.role === "singer";
  const isAdmin = user?.role === "admin";

  const profileName = fullData?.full_name || user?.full_name || "Unknown User";
  const profileRole = isAdmin ? "ADMIN" : "SINGER";
  const profileEmail = fullData?.email || user?.email || "N/A";
  const profilePhone = fullData?.phone || user?.phone || "N/A";
  const age = fullData?.age ?? "N/A";
  const dob = fullData?.birth_date || "N/A";
  const gender = fullData?.gender || "N/A";
  const schoolName = fullData?.school_name || user?.school_name || "N/A";
  const voiceType = fullData?.voice_type || user?.voice_type || "N/A";
  const shirtSize = fullData?.shirt_size || "N/A";
  const yearJoined = fullData?.year_joined || user?.current_year_id || "N/A";
  const neighborhood = fullData?.neighborhood || fullData?.address || "N/A";
  const parentName = fullData?.parent_name || "N/A";
  const parentPhone = fullData?.parent_phone || "N/A";
  const staffType = fullData?.staff_type || "N/A";
  const responsibleCategory =
    fullData?.responsible_category || user?.responsible_category;
  const jobPosition = fullData?.job || "N/A";

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Teal Header ───────────────────────────────────────────────────── */}
      <View style={s.headerBg}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={ds.white} />
        </TouchableOpacity>
        <View>
          <Text style={s.orgLabel}>🎵 Jerusalem Youth Chorus</Text>
          <Text style={s.pageTitle}>My Profile</Text>
        </View>
      </View>

      {/* ── Avatar Hero (still teal bg) ───────────────────────────────────── */}
      <View style={s.avatarHero}>
        <ProfileAvatar
          name={profileName}
          url={fullData?.photoURL || user?.photoURL || null}
          onPress={handlePhotoUpdate}
          uploading={uploading}
        />
        <Text style={s.heroName}>{profileName}</Text>
        <View
          style={[
            s.roleBadge,
            {
              backgroundColor: isAdmin
                ? ds.red + "33"
                : "rgba(255,255,255,0.2)",
            },
          ]}
        >
          <Text style={s.roleBadgeText}>{profileRole}</Text>
        </View>
      </View>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <ScrollView
        style={s.scrollBase}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Singer cards */}
        {isSinger && (
          <>
            <InfoCard title="Personal Information">
              <InfoRow
                icon="person-outline"
                label="Age"
                value={age !== "N/A" ? `${age} years` : "N/A"}
              />
              <InfoRow
                icon="calendar-outline"
                label="Date of Birth"
                value={dob}
              />
              <InfoRow
                icon="male-female-outline"
                label="Gender"
                value={gender}
              />
              <InfoRow
                icon="school-outline"
                label="School"
                value={schoolName}
              />
              <InfoRow
                icon="mic-outline"
                label="Voice Type"
                value={voiceType}
              />
              <InfoRow
                icon="shirt-outline"
                label="Shirt Size"
                value={shirtSize}
              />
              <InfoRow
                icon="star-outline"
                label="Year Joined"
                value={yearJoined}
                isLast
              />
            </InfoCard>

            <InfoCard title="Contact Information">
              <InfoRow icon="mail-outline" label="Email" value={profileEmail} />
              <InfoRow icon="call-outline" label="Phone" value={profilePhone} />
              <InfoRow
                icon="location-outline"
                label="Neighborhood"
                value={neighborhood}
                isLast
              />
            </InfoCard>

            <InfoCard title="Parent / Guardian">
              <InfoRow
                icon="person-circle-outline"
                label="Parent Name"
                value={parentName}
              />
              <InfoRow
                icon="call-outline"
                label="Parent Phone"
                value={parentPhone}
                isLast
              />
            </InfoCard>
          </>
        )}

        {/* Admin cards */}
        {isAdmin && (
          <InfoCard title="Staff Information">
            <InfoRow icon="mail-outline" label="Email" value={profileEmail} />
            <InfoRow icon="call-outline" label="Phone" value={profilePhone} />
            <InfoRow
              icon="ribbon-outline"
              label="Job Position"
              value={jobPosition}
            />
            <InfoRow
              icon="calendar-outline"
              label="Date of Birth"
              value={dob}
            />
            <InfoRow
              icon="business-outline"
              label="Staff Type"
              value={staffType}
              isLast={!responsibleCategory}
            />
            {responsibleCategory && (
              <InfoRow
                icon="people-outline"
                label="Responsible For"
                value={responsibleCategory}
                isLast
              />
            )}
          </InfoCard>
        )}

        {/* Settings */}
        <View style={s.card}>
          <View style={s.cardBar} />
          <View style={s.cardInner}>
            <Text style={s.cardTitle}>Settings</Text>

            {/* Change Password */}
            <TouchableOpacity
              style={s.settingRow}
              onPress={() => {
                setPasswordError("");
                setPasswordSuccess("");
                setShowPasswordModal(true);
              }}
              activeOpacity={0.7}
            >
              <View style={s.rowIcon}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={ds.teal}
                />
              </View>
              <View style={s.rowText}>
                <Text style={s.rowLabel}>Security</Text>
                <Text style={s.rowValue}>Change Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={ds.subtext} />
            </TouchableOpacity>

            {/* Biometric login toggle */}
            {biometricHardwareAvailable && (
              <View style={s.settingRow}>
                <View style={s.rowIcon}>
                  <Ionicons
                    name={biometricType === "face" ? "scan-outline" : "finger-print-outline"}
                    size={20}
                    color={ds.teal}
                  />
                </View>
                <View style={s.rowText}>
                  <Text style={s.rowLabel}>Quick Sign-In</Text>
                  <Text style={s.rowValue}>{biometricLabel}</Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: ds.border, true: ds.teal + "80" }}
                  thumbColor={biometricEnabled ? ds.teal : "#ccc"}
                  ios_backgroundColor={ds.border}
                />
              </View>
            )}

            {/* Manage Singers (admin only) */}
            {isAdmin && (
              <TouchableOpacity
                style={s.settingRow}
                onPress={() => router.push("/(tabs)/students" as any)}
                activeOpacity={0.7}
              >
                <View style={s.rowIcon}>
                  <Ionicons name="people-outline" size={20} color={ds.teal} />
                </View>
                <View style={s.rowText}>
                  <Text style={s.rowLabel}>Singers</Text>
                  <Text style={s.rowValue}>Edit Singer Information</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={ds.subtext} />
              </TouchableOpacity>
            )}

            {/* Manage Years & Voice Types (admin only) */}
            {isAdmin && (
              <TouchableOpacity
                style={s.settingRow}
                onPress={() => router.push("/manage-years" as any)}
                activeOpacity={0.7}
              >
                <View style={s.rowIcon}>
                  <Ionicons name="layers-outline" size={20} color={ds.teal} />
                </View>
                <View style={s.rowText}>
                  <Text style={s.rowLabel}>Groups</Text>
                  <Text style={s.rowValue}>Manage Years & Voice Types</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={ds.subtext} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={s.signOutBtn}
          onPress={async () => {
            await logout();
            router.replace("/(auth)/login" as any);
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="log-out-outline" size={20} color={ds.red} />
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Enable Biometric Modal */}
      <Modal
        visible={showBiometricModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBiometricModal(false)}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Enable {biometricLabel}</Text>
              <TouchableOpacity onPress={() => setShowBiometricModal(false)}>
                <Ionicons name="close" size={24} color={ds.text} />
              </TouchableOpacity>
            </View>

            <Text style={[s.msgText, { color: ds.subtext, marginBottom: 16 }]}>
              Enter your password to save it securely. {biometricLabel} will unlock it on future sign-ins.
            </Text>

            {bioError ? (
              <View style={s.msgBox}>
                <Ionicons name="warning-outline" size={16} color={ds.red} />
                <Text style={[s.msgText, { color: ds.red }]}>{bioError}</Text>
              </View>
            ) : null}

            <Text style={s.modalLabel}>Password</Text>
            <TextInput
              style={s.modalInput}
              value={bioPassword}
              onChangeText={setBioPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={ds.subtext}
            />

            <Pressable
              style={[s.modalBtn, bioLoading && { opacity: 0.6 }]}
              onPress={handleEnableBiometric}
              disabled={bioLoading}
            >
              {bioLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.modalBtnText}>Enable {biometricLabel}</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color={ds.text} />
              </TouchableOpacity>
            </View>

            {passwordError ? (
              <View style={s.msgBox}>
                <Ionicons name="warning-outline" size={16} color={ds.red} />
                <Text style={[s.msgText, { color: ds.red }]}>
                  {passwordError}
                </Text>
              </View>
            ) : null}
            {passwordSuccess ? (
              <View
                style={[
                  s.msgBox,
                  { backgroundColor: "#e6f7f0", borderLeftColor: "#34a853" },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color="#34a853"
                />
                <Text style={[s.msgText, { color: "#34a853" }]}>
                  {passwordSuccess}
                </Text>
              </View>
            ) : null}

            <Text style={s.modalLabel}>Current Password</Text>
            <TextInput
              style={s.modalInput}
              value={curPassword}
              onChangeText={setCurPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={ds.subtext}
            />

            <Text style={s.modalLabel}>New Password</Text>
            <TextInput
              style={s.modalInput}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={ds.subtext}
            />

            <Text style={s.modalLabel}>Confirm New Password</Text>
            <TextInput
              style={s.modalInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={ds.subtext}
            />

            <Pressable
              style={[s.modalBtn, changingPassword && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.modalBtnText}>Update</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ds.teal },

  // Header
  headerBg: {
    backgroundColor: ds.teal,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  orgLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 4,
  },
  pageTitle: { fontSize: 32, fontWeight: "900", color: ds.white },

  // Avatar hero
  avatarHero: {
    backgroundColor: ds.teal,
    alignItems: "center",
    paddingBottom: 24,
    paddingTop: 8,
  },
  avatarWrap: { position: "relative", marginBottom: 12 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: ds.white,
  },
  avatarPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 38, fontWeight: "800", color: ds.white },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#353535",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: ds.white,
  },
  heroName: {
    fontSize: 22,
    fontWeight: "800",
    color: ds.white,
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: ds.white,
  },

  // Scroll
  scrollBase: { backgroundColor: ds.bg },
  scroll: { padding: 16, paddingBottom: 40 },

  // Card
  card: {
    backgroundColor: ds.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ds.border,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: ds.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardBar: { height: 4, backgroundColor: ds.teal },
  cardInner: { padding: 16 },
  cardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: ds.subtext,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 16,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: ds.border },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: ds.teal + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: 11,
    color: ds.subtext,
    marginBottom: 2,
    fontWeight: "500",
  },
  rowValue: { fontSize: 15, fontWeight: "700", color: ds.text },

  // Sign out
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ds.red + "55",
    backgroundColor: ds.red + "0D",
  },
  signOutText: { fontSize: 15, fontWeight: "700", color: ds.red },

  // Settings card
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: ds.border,
    gap: 16,
  },

  // Change-password modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: ds.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: ds.text },
  modalLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: ds.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: ds.text,
    marginBottom: 14,
    backgroundColor: ds.bg,
  },
  modalBtn: {
    backgroundColor: ds.teal,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  modalBtnText: { color: ds.white, fontSize: 16, fontWeight: "700" },
  msgBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fdecea",
    borderLeftWidth: 3,
    borderLeftColor: ds.red,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  msgText: { fontSize: 13, flex: 1 },
});
