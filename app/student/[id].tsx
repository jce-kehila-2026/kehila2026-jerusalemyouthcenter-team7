import { useAuth } from "@/src/context/AuthContext";
import {
  COLORS,
  Group,
  attendance as mockAttendance,
  events as mockEvents,
  groups as mockGroups,
  students as mockStudents,
  Student,
} from "@/src/data/mockData";
import { studentService } from "@/src/data/studentService";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
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

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { user } = useAuth();

  // Even more flexible data mapping to hunt down that missing Year/Group
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

    // Prioritize exact ID match first to avoid picking the wrong group from the same year
    const byId = groups.find((g) => String(g.id) === String(studentGroupId));
    if (byId) return byId;

    const byName = groups.find((g) => g.name === studentGroupId);
    if (byName) return byName;

    return groups.find((g) => studentYear && g.year_id === studentYear) || null;
  }, [groups, studentGroupId, studentYear]);

  // Wrap in useCallback to prevent infinite re-renders and make it accessible everywhere
  const fetchStudentData = useCallback(
    async (isInitialLoad = false) => {
      if (!id) return;

      try {
        if (isInitialLoad) setInitialLoading(true);
        else setLoading(true);

        const [foundStudent, allGroups] = await Promise.all([
          studentService.getStudentById(id),
          studentService.getGroups(),
        ]);

        if (foundStudent) {
          setStudent(foundStudent);
          setGroups(allGroups.length > 0 ? allGroups : mockGroups);
        } else {
          // Fallback to check mock data if not in DB
          setStudent(mockStudents.find((s) => s.id === id) || null);
          setGroups(allGroups.length > 0 ? allGroups : mockGroups);
        }
      } catch (error) {
        console.error("Error fetching student details:", error);
        setStudent(mockStudents.find((s) => s.id === id) || null);
        setGroups(mockGroups);
      } finally {
        setInitialLoading(false);
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    fetchStudentData(true);
  }, [fetchStudentData]);

  // --- DEBUGGING LOGS ---
  useEffect(() => {
    if (!loading) {
      console.log("--- Student Detail Debug ---");
      console.log("Student object:", student);
      console.log("Groups list:", groups);
      console.log("Found group:", group); // This now safely accesses the initialized 'group'
      console.log("Student year_id:", student?.year_id);
      console.log("Group year_id:", group?.year_id);
      console.log("Group name:", group?.name);
      console.log("--- End Debug ---");
    }
  }, [loading, student, group, groups]);
  // --- END DEBUGGING LOGS ---

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Loading student details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Student not found</Text>
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

  const getGroupColor = (groupName?: string) => {
    switch (groupName) {
      case "Year 1":
        return COLORS.yellow;
      case "Year 2":
        return COLORS.red;
      case "Year 3":
        return "#8b5cf6";
      case "All Groups":
        return COLORS.teal;
      default:
        return COLORS.gray;
    }
  };

  const groupColor = getGroupColor(group?.name);

  const statusColors: Record<string, string> = {
    attended: COLORS.teal,
    registered: COLORS.yellow,
    absent: COLORS.red,
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: groupColor + "20", borderColor: groupColor },
            ]}
          >
            <Text style={[styles.avatarText, { color: groupColor }]}>
              {student.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </Text>
          </View>
          <Text style={styles.name}>{student.full_name}</Text>
          <View
            style={[styles.groupBadge, { backgroundColor: groupColor + "30" }]}
          >
            <Text style={[styles.groupBadgeText, { color: groupColor }]}>
              {group?.name || "No Group"}
            </Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <InfoRow icon="mail-outline" label="Email" value={student.email} />
          <View style={styles.divider} />
          <InfoRow icon="call-outline" label="Phone" value={student.phone} />
          <View style={styles.divider} />
          <InfoRow
            icon="calendar-outline"
            label="Year"
            value={(() => {
              // Prioritize the year from the assigned group, then the student's own year_id
              const displayYear = group?.year_id || studentYear;
              if (displayYear) return `Year ${displayYear}`;
              return "N/A";
            })()}
          />
          <View style={styles.divider} />
        </View>

        {/* Management Actions */}
        {user?.role === "admin" && (
          <View style={styles.managementSection}>
            <Text style={styles.managementTitle}>Management</Text>
            <Pressable
              style={[
                styles.manageBtn,
                {
                  backgroundColor: COLORS.white,
                  borderColor: COLORS.border,
                  borderWidth: 1,
                },
              ]}
              onPress={() => setShowGroupModal(true)}
            >
              <Ionicons name="people-outline" size={20} color={COLORS.teal} />
              <Text style={[styles.manageBtnText, { color: COLORS.teal }]}>
                Change Group
              </Text>
            </Pressable>
          </View>
        )}

        {/* Attendance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Event Attendance ({attendedEvents.length})
          </Text>
          {attendedEvents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No events recorded</Text>
            </View>
          ) : (
            attendedEvents.map((a) => (
              <View key={a.event_id} style={styles.attendanceRow}>
                <View style={styles.attendanceInfo}>
                  <Text style={styles.eventTitle}>{a.event?.title}</Text>
                  <Text style={styles.eventDate}>
                    {new Date(a.event!.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColors[a.status] + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: statusColors[a.status] },
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Group</Text>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <View style={styles.groupList}>
              {groups.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.groupItem,
                    student.group_id === g.id && styles.groupItemActive,
                  ]}
                  onPress={() => {
                    if (!student) return;
                    studentService
                      .updateStudentGroup(student.id, g.id)
                      .then(() => {
                        // Re-fetch data in the background (no initialLoading spinner)
                        fetchStudentData(false);
                        Alert.alert("Success", `Assigned to ${g.name}`);
                        setShowGroupModal(false);
                      })
                      .catch(() => Alert.alert("Error", "Update failed"));
                  }}
                >
                  <Text
                    style={[
                      styles.groupItemText,
                      student.group_id === g.id && styles.groupItemTextActive,
                    ]}
                  >
                    {g.name}
                  </Text>
                  {student.group_id === g.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={COLORS.teal}
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

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.iconBg}>
        <Ionicons name={icon} size={20} color={COLORS.teal} />
      </View>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: COLORS.black, fontSize: 16 },
  header: { alignItems: "center", padding: 32 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: { fontSize: 32, fontWeight: "bold" },
  name: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.black,
    marginBottom: 8,
  },
  groupBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  groupBadgeText: { fontSize: 14, fontWeight: "700" },
  infoSection: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 16,
    margin: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  infoLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 2 },
  infoValue: { fontSize: 16, color: COLORS.black, fontWeight: "600" },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 56 },
  managementSection: { paddingHorizontal: 20, marginBottom: 20 },
  managementTitle: {
    color: COLORS.teal,
    fontSize: 13,
    fontWeight: "700",
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
  },
  manageBtnText: { fontWeight: "700", fontSize: 16 },
  section: { paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.black,
    marginBottom: 12,
  },
  attendanceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  attendanceInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: "600", color: COLORS.black },
  eventDate: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700" },
  emptyCard: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  emptyText: { color: COLORS.gray },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: COLORS.white,
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
  modalTitle: { color: COLORS.black, fontSize: 20, fontWeight: "700" },
  groupList: { gap: 12 },
  groupItem: {
    backgroundColor: COLORS.grayLight,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  groupItemActive: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.teal + "10",
  },
  groupItemText: { color: COLORS.gray, fontSize: 16, fontWeight: "600" },
  groupItemTextActive: { color: COLORS.black },
});
