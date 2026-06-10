import { useAuth } from "@/src/context/AuthContext";
import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  doc,
  getDoc,
  updateDoc
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── الألوان الرسمية للتطبيق ──────────────────────────────────────────────────────────
const themeColors = {
  teal: "#039899",
  red: "#c56451",
  yellow: "#cfad5d",
  bluishWhite: "#f5fafe",
  charcoal: "#353535",
  white: "#ffffff",
  gray: "#f0f0f0",
  textMuted: "#687076",
};

const ProfileAvatar = ({
  name,
  url,
  allowEdit,
  onPress,
  uploading,
}: {
  name: string;
  url?: string | null;
  allowEdit: boolean;
  onPress: () => void;
  uploading: boolean;
}) => {
  return (
    <TouchableOpacity
      style={styles.avatarContainer}
      onPress={onPress}
      disabled={!allowEdit || uploading}
    >
      {uploading ? (
        <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
          <ActivityIndicator color={themeColors.white} />
        </View>
      ) : url ? (
        <Image source={{ uri: url }} style={styles.avatarImage} />
      ) : (
        <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitial}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      {allowEdit && (
        <View style={styles.editAvatarBtn}>
          <Ionicons name="camera" size={16} color={themeColors.white} />
        </View>
      )}
    </TouchableOpacity>
  );
};
// 2. مكون صف المعلومات (Info Row)
const InfoRow = ({
  icon,
  label,
  value,
  showEdit,
  isLast,
}: {
  icon: string;
  label: string;
  value: string | number;
  showEdit?: boolean;
  isLast?: boolean;
}) => (
  <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
    <View style={styles.iconCircle}>
      <Ionicons name={icon as any} size={22} color={themeColors.teal} />
    </View>
    <View style={styles.infoTextContainer}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
    {showEdit && (
      <Pressable
        onPress={() => alert(`Edit ${label}`)}
        style={styles.inlineEditBtn}
      >
        <Ionicons name="pencil" size={16} color={themeColors.textMuted} />
      </Pressable>
    )}
  </View>
);

// 3. مكون البطاقة (Card Wrapper)
const InfoCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    <View style={styles.cardContent}>{children}</View>
  </View>
);

// ── الشاشة الرئيسية (Main Screen) ──────────────────────────────────────────────
// ── الشاشة الرئيسية (Main Screen) ──────────────────────────────────────────────
export default function ProfileScreen() {
  // 1. جلب بيانات المستخدم الحقيقي اللي مسجل دخول
  const { user, logout } = useAuth() as any;
  const router = useRouter();
  const [fullData, setFullData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const getFullData = async () => {
      if (!user?.uid) return;
      try {
        // Use UID-based lookup from unified users collection
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setFullData(snap.data());
        }
      } catch (error) {
        console.error("Error fetching full data:", error);
      }
    };
    getFullData();
  }, [user]);

  const handlePhotoUpdate = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        alert("Permission to access media library is required!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.2, // Small file size for Base64 compatibility
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        setUploading(true);
        const base64Image = "data:image/jpeg;base64," + result.assets[0].base64;

        // Update user document in unified users collection
        if (user?.uid) {
          const docRef = doc(db, "users", user.uid);
          await updateDoc(docRef, { photoURL: base64Image });
          setFullData((prev: any) => ({ ...prev, photoURL: base64Image }));
        }
        setUploading(false);
      }
    } catch (error) {
      console.error("Error updating photo:", error);
      setUploading(false);
    }
  };

  // 2. فحص نوع المستخدم
  const isViewingStudent = user?.role === "student";
  const isViewingAdmin = user?.role === "admin" || user?.role === "staff";
  const isOwner = true; // بما إنه فاتح بروفايله الشخصي، إذن هو المالك بيقدر يعدل

  // 3. تجهيز البيانات (عشان لو في معلومة ناقصة بالداتابيس ما يضرب التطبيق)
  // Name
  const profileName =
    fullData?.full_name ||
    fullData?.["full-name"] ||
    user?.["full-name"] ||
    "Unknown User";

  // Role & Contact
  const profileRole =
    fullData?.role?.toUpperCase() || user?.role?.toUpperCase() || "STUDENT";
  const profileEmail = fullData?.email || user?.email || "N/A";
  const profilePhone = fullData?.phone || user?.phone || "N/A";
  const address =
    fullData?.neighborhood || fullData?.address || user?.address || "N/A";

  // Student Info
  const age = fullData?.age || user?.age || "N/A";
  const dob =
    fullData?.birth_date ||
    fullData?.date_of_birth ||
    user?.date_of_birth ||
    "N/A";
  const studyYear =
    fullData?.study_year || fullData?.year_joined || user?.study_year || "N/A";
  const voiceType = fullData?.voice_type || user?.voice_type || "N/A";

  // Admin Info (fallback)
  const jobTitle = fullData?.job_title || user?.job_title || "N/A";
  const staffType = fullData?.staff_type || user?.staff_type || "N/A";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── قسم الترويسة والصورة ── */}
        <View style={styles.headerSection}>
          <ProfileAvatar
            name={profileName}
            url={
              fullData?.photoURL || user?.photoURL || user?.avatar_url || null
            }
            allowEdit={isOwner}
            onPress={handlePhotoUpdate}
            uploading={uploading}
          />
          <Text style={styles.profileName}>{profileName}</Text>
          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor: isViewingAdmin
                  ? themeColors.red + "20"
                  : themeColors.teal + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.roleBadgeText,
                { color: isViewingAdmin ? themeColors.red : themeColors.teal },
              ]}
            >
              {profileRole}
            </Text>
          </View>
        </View>

        {/* ── عرض حساب الطالب (Student Profile) ── */}
        {isViewingStudent && (
          <>
            <InfoCard title="Basic Information">
              <InfoRow
                icon="person-outline"
                label="Age"
                value={`${age} years`}
                showEdit={isOwner}
              />
              <InfoRow
                icon="calendar-outline"
                label="Date of Birth"
                value={dob}
                showEdit={isOwner}
              />
              <InfoRow
                icon="school-outline"
                label="Study Year"
                value={studyYear}
                showEdit={isOwner}
              />
              <InfoRow
                icon="mic-outline"
                label="Voice Type"
                value={voiceType}
                showEdit={isOwner}
                isLast={true}
              />
            </InfoCard>

            <InfoCard title="Contact Information">
              <InfoRow
                icon="mail-outline"
                label="Email"
                value={profileEmail}
                showEdit={isOwner}
              />
              <InfoRow
                icon="call-outline"
                label="Phone"
                value={profilePhone}
                showEdit={isOwner}
              />
              <InfoRow
                icon="location-outline"
                label="Address"
                value={address}
                showEdit={isOwner}
                isLast={true}
              />
            </InfoCard>
          </>
        )}

        {/* ── عرض حساب الإدارة/الطاقم (Admin / Staff Profile) ── */}
        {isViewingAdmin && (
          <InfoCard title="Staff Information">
            <InfoRow icon="mail-outline" label="Email" value={profileEmail} />
            <InfoRow icon="call-outline" label="Phone" value={profilePhone} />
            <InfoRow
              icon="calendar-outline"
              label="Date of Birth"
              value={dob}
            />
            <InfoRow
              icon="briefcase-outline"
              label="Job Title"
              value={jobTitle}
            />
            <InfoRow
              icon="business-outline"
              label="Staff Type"
              value={staffType}
              isLast={!user?.responsible_category}
            />
            {user?.responsible_category && (
              <InfoRow
                icon="people-outline"
                label="Responsible For"
                value={user?.responsible_category}
                isLast={true}
              />
            )}
          </InfoCard>
        )}

        {/* ── Sign Out ── */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={async () => {
            await logout();
            router.replace("/(auth)/login" as any);
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="log-out-outline" size={20} color={themeColors.red} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
// ── الأنماط (Styles) ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.bluishWhite,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: themeColors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: "bold",
    color: themeColors.white,
  },
  editAvatarBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: themeColors.charcoal,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: themeColors.bluishWhite,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "800",
    color: themeColors.charcoal,
    marginBottom: 6,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // ── الستايلات الجديدة للبطاقات (Cards) ──
  card: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: themeColors.charcoal,
    marginBottom: 8,
    marginTop: 8,
  },
  cardContent: {
    flexDirection: "column",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: themeColors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  inlineEditBtn: {
    padding: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: themeColors.red + "55",
    backgroundColor: themeColors.red + "0D",
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "700",
    color: themeColors.red,
  },
});
