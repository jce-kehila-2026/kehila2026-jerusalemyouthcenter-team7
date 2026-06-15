import { useAuth } from "@/src/context/AuthContext";
import {
  Group,
  attendance as mockAttendance,
  events as mockEvents,
  groups as mockGroups,
  Student,
} from "@/src/data/mockData";
import { studentService } from "@/src/data/studentService";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
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
export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const { user } = useAuth();

  const rawStudent = student as any;

  const studentYear = useMemo(
    () => student?.year_id || rawStudent?.year || rawStudent?.grade,
    [student, rawStudent],
  );

  const studentGroupId = useMemo(
    () => student?.group_id || rawStudent?.group || rawStudent?.groupId,
    [student, rawStudent],
  );

  const group = useMemo(() => {
    if (!groups.length || !studentGroupId) return null;
    const byId = groups.find((g) => String(g.id) === String(studentGroupId));
    if (byId) return byId;
    const byName = groups.find((g) => g.name === studentGroupId);
    if (byName) return byName;
    return groups.find((g) => studentYear && g.year_id === studentYear) || null;
  }, [groups, studentGroupId, studentYear]);

  const fetchStudentData = useCallback(
    async (isInitialLoad = false) => {
      if (!id) return;
      try {
        if (isInitialLoad) setInitialLoading(true);
        const [foundStudent, allGroups] = await Promise.all([
          studentService.getStudentById(id),
          studentService.getGroups(),
        ]);
        setStudent(foundStudent);
        setGroups(allGroups.length > 0 ? allGroups : mockGroups);
      } catch (error) {
        console.error("Error fetching student details:", error);
        setStudent(null);
        setGroups([]);
      } finally {
        setInitialLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    fetchStudentData(true);
  }, [fetchStudentData]);

  if (initialLoading) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.centered}>
          <Text style={s.loadingText}>Loading student details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.centered}>
          <Text style={s.loadingText}>Student not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const studentAttendance = mockAttendance.filter(
    (a) => String(a.student_id) === student.id,
  );
  const attendedEvents = studentAttendance
    .map((a) => ({
      ...a,
      event: mockEvents.find((e) => e.id === a.event_id),
    }))
    .filter((a) => a.event !== undefined);

  // Access control
  const isAdmin = user?.role === "admin";
  const isOwnProfile = user?.uid === student.id;
  const canViewAll = isAdmin || isOwnProfile;
  const age = rawStudent?.age ?? "N/A";
  const dob = rawStudent?.birth_date || rawStudent?.date_of_birth || "N/A";
  const gender = rawStudent?.gender || "N/A";
  const schoolName = rawStudent?.school_name || "N/A";
  const voiceType = rawStudent?.voice_type || "N/A";
  const shirtSize = rawStudent?.shirt_size || "N/A";
  const yearJoined = rawStudent?.year_joined || studentYear || "N/A";
  const neighborhood = rawStudent?.neighborhood || rawStudent?.address || "N/A";
  const parentName = rawStudent?.parent_name || "N/A";
  const parentPhone = rawStudent?.parent_phone || "N/A";
  const medicalSituation =
    rawStudent?.medical_situation || rawStudent?.medical_notes || "None";
  const foodNotes = rawStudent?.food_notes || rawStudent?.allergies || "None";

  const statusColors: Record<string, string> = {
    attended: ds.teal,
    registered: "#f59e0b",
    absent: ds.red,
  };

  const initials = student.full_name
    .split(" ")
    .map((n: string) => n[0])
    .join("");

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      {/* ── Teal Header ───────────────────────────────────────────────────── */}
      <View style={s.headerBg}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={ds.white} />
        </TouchableOpacity>
        <View>
          <Text style={s.orgLabel}>🎵 Jerusalem Youth Chorus</Text>
          <Text style={s.pageTitle}>Student Profile</Text>
        </View>
      </View>

      {/* ── Avatar Hero ───────────────────────────────────────────────────── */}
      <View style={s.avatarHero}>
        <View style={s.avatarWrap}>
          {rawStudent?.photoURL ? (
            <Image source={{ uri: rawStudent.photoURL }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarPlaceholder]}>
              <Text style={s.avatarInitial}>{initials}</Text>
            </View>
          )}
        </View>
        <Text style={s.heroName}>{student.full_name}</Text>
        <View style={s.groupBadge}>
          <Text style={s.groupBadgeText}>{group?.name || "No Group"}</Text>
        </View>
      </View>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <ScrollView
        style={s.scrollBase}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Personal Information */}
        <InfoCard title="Personal Information">
          <InfoRow
            icon="person-outline"
            label="Age"
            value={age !== "N/A" ? `${age} years` : "N/A"}
          />
          <InfoRow icon="calendar-outline" label="Date of Birth" value={dob} />
          {canViewAll && (
            <InfoRow icon="male-female-outline" label="Gender" value={gender} />
          )}
          {canViewAll && (
            <InfoRow icon="school-outline" label="School" value={schoolName} />
          )}
          <InfoRow icon="mic-outline" label="Voice Type" value={voiceType} />
          {canViewAll && (
            <InfoRow icon="shirt-outline" label="Shirt Size" value={shirtSize} />
          )}
          <InfoRow
            icon="star-outline"
            label="Year Joined"
            value={yearJoined}
            isLast={!isAdmin}
          />
          {isAdmin && (
            <>
              <InfoRow
                icon="medkit-outline"
                label="Medical Situation"
                value={medicalSituation}
              />
              <InfoRow
                icon="restaurant-outline"
                label="Food Notes"
                value={foodNotes}
                isLast
              />
            </>
          )}
        </InfoCard>

        {/* Contact Information — full for admin/self, phone-only for peers */}
        <InfoCard title="Contact Information">
          {canViewAll && (
            <InfoRow
              icon="mail-outline"
              label="Email"
              value={student.email || "N/A"}
            />
          )}
          <InfoRow
            icon="call-outline"
            label="Phone"
            value={student.phone || "N/A"}
            isLast={!canViewAll}
          />
          {canViewAll && (
            <InfoRow
              icon="location-outline"
              label="Neighborhood"
              value={neighborhood}
              isLast
            />
          )}
        </InfoCard>

        {/* Parent / Guardian — admin and self only */}
        {canViewAll && (
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
        )}

        {/* Management Actions — admin only */}
        {isAdmin && (
          <View style={s.managementSection}>
            <Text style={s.sectionLabel}>Management</Text>
            <Pressable
              style={s.manageBtn}
              onPress={() => setShowGroupModal(true)}
            >
              <Ionicons name="people-outline" size={20} color={ds.teal} />
              <Text style={s.manageBtnText}>Change Group</Text>
            </Pressable>
          </View>
        )}

        {/* Event Attendance */}
        <View style={s.attendanceSection}>
          <Text style={s.sectionLabel}>
            Event Attendance ({attendedEvents.length})
          </Text>
          {attendedEvents.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>No events recorded</Text>
            </View>
          ) : (
            attendedEvents.map((a) => (
              <View key={a.event_id} style={s.attendanceRow}>
                <View style={s.attendanceInfo}>
                  <Text style={s.eventTitle}>{a.event?.title}</Text>
                  <Text style={s.eventDate}>
                    {new Date(a.event!.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>
                <View
                  style={[
                    s.statusBadge,
                    {
                      backgroundColor:
                        (statusColors[a.status] || ds.subtext) + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.statusText,
                      { color: statusColors[a.status] || ds.subtext },
                    ]}
                  >
                    {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Group Selector Modal */}
      <Modal visible={showGroupModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Group</Text>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                <Ionicons name="close" size={24} color={ds.subtext} />
              </TouchableOpacity>
            </View>
            <View style={s.groupList}>
              {groups.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    s.groupItem,
                    student.group_id === g.id && s.groupItemActive,
                  ]}
                  onPress={() => {
                    if (!student) return;
                    studentService
                      .updateStudentGroup(student.id, g.id)
                      .then(() => {
                        fetchStudentData(false);
                        Alert.alert("Success", `Assigned to ${g.name}`);
                        setShowGroupModal(false);
                      })
                      .catch(() => Alert.alert("Error", "Update failed"));
                  }}
                >
                  <Text
                    style={[
                      s.groupItemText,
                      student.group_id === g.id && s.groupItemTextActive,
                    ]}
                  >
                    {g.name}
                  </Text>
                  {student.group_id === g.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={ds.teal}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ds.teal },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: ds.bg,
  },
  loadingText: { color: ds.text, fontSize: 16 },

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
  avatarWrap: { marginBottom: 12 },
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
  heroName: { fontSize: 22, fontWeight: "800", color: ds.white, marginBottom: 8 },
  groupBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  groupBadgeText: {
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
  rowLabel: { fontSize: 11, color: ds.subtext, marginBottom: 2, fontWeight: "500" },
  rowValue: { fontSize: 15, fontWeight: "700", color: ds.text },

  // Management
  managementSection: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: ds.subtext,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    gap: 8,
    backgroundColor: ds.white,
    borderWidth: 1,
    borderColor: ds.border,
    shadowColor: ds.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  manageBtnText: { fontWeight: "700", fontSize: 16, color: ds.teal },

  // Attendance
  attendanceSection: { marginBottom: 16 },
  attendanceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ds.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: ds.border,
    shadowColor: ds.teal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  attendanceInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: "600", color: ds.text },
  eventDate: { fontSize: 12, color: ds.subtext, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700" },
  emptyCard: {
    backgroundColor: ds.white,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: ds.border,
  },
  emptyText: { color: ds.subtext },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContainer: {
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
    marginBottom: 24,
  },
  modalTitle: { color: ds.text, fontSize: 20, fontWeight: "700" },
  groupList: { gap: 12 },
  groupItem: {
    backgroundColor: ds.bg,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: ds.border,
  },
  groupItemActive: { borderColor: ds.teal, backgroundColor: ds.teal + "10" },
  groupItemText: { color: ds.subtext, fontSize: 16, fontWeight: "600" },
  groupItemTextActive: { color: ds.text },
});
