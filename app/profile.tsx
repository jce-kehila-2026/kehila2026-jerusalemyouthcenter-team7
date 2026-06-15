import { useAuth } from "@/src/context/AuthContext";
import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
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

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (snap.exists()) setFullData(snap.data());
      })
      .catch(console.error);
  }, [user]);

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
  const jobTitle = fullData?.job_title || "N/A";
  const staffType = fullData?.staff_type || "N/A";
  const responsibleCategory =
    fullData?.responsible_category || user?.responsible_category;

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
            { backgroundColor: isAdmin ? ds.red + "33" : "rgba(255,255,255,0.2)" },
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
              <InfoRow icon="calendar-outline" label="Date of Birth" value={dob} />
              <InfoRow icon="male-female-outline" label="Gender" value={gender} />
              <InfoRow icon="school-outline" label="School" value={schoolName} />
              <InfoRow icon="mic-outline" label="Voice Type" value={voiceType} />
              <InfoRow icon="shirt-outline" label="Shirt Size" value={shirtSize} />
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
            <InfoRow icon="calendar-outline" label="Date of Birth" value={dob} />
            <InfoRow icon="briefcase-outline" label="Job Title" value={jobTitle} />
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
});
