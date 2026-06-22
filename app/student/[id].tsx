import { useAuth } from "@/src/context/AuthContext";
import {
  Group,
  attendance as mockAttendance,
  events as mockEvents,
  groups as mockGroups,
  Student,
} from "@/src/data/mockData";
import { studentService } from "@/src/data/studentService";
import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
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

const EditRow = ({
  icon,
  label,
  value,
  onChange,
  isLast,
  keyboardType = "default",
}: {
  icon: string;
  label: string;
  value: string;
  onChange: (text: string) => void;
  isLast?: boolean;
  keyboardType?: "default" | "phone-pad" | "email-address";
}) => (
  <View style={[s.row, !isLast && s.rowBorder]}>
    <View style={s.rowIcon}>
      <Ionicons name={icon as any} size={20} color={ds.teal} />
    </View>
    <View style={s.rowText}>
      <Text style={s.rowLabel}>{label}</Text>
      <TextInput
        style={s.editInput}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholderTextColor={ds.subtext}
        autoCorrect={false}
      />
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
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
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

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => Number(a.year_id) - Number(b.year_id)),
    [groups],
  );

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

        // // Auto-alignment: If user is admin, ensure standard groups exist in Firestore
        // if (user?.role === "admin") {
        //   (async () => {
        //     try {
        //       // Ensure Year 1, Year 2, and Year 3 exist in the "groups" collection
        //       await setDoc(doc(db, "groups", "Year 1"), { name: "Year 1", year_id: 1, program_id: 1 });
        //       await setDoc(doc(db, "groups", "Year 2"), { name: "Year 2", year_id: 2, program_id: 2 });
        //       await setDoc(doc(db, "groups", "Year 3"), { name: "Year 3", year_id: 3, program_id: 1 });

        //       // Try to delete Year 4 to clean up the DB
        //       try {
        //         await deleteDoc(doc(db, "groups", "Year 4"));
        //       } catch (delErr) {
        //         console.log("Could not delete Year 4:", delErr);
        //       }
        //     } catch (err) {
        //       console.log("Failed to auto-write groups collection. This is normal if the rules block client writes to groups:", err);
        //     }
        //   })();
        // }
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

  // Derived display values
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

  const enterEditMode = () => {
    setDraft({
      birth_date: rawStudent?.birth_date || rawStudent?.date_of_birth || "",
      gender: rawStudent?.gender || "",
      school_name: rawStudent?.school_name || "",
      voice_type: rawStudent?.voice_type || "",
      shirt_size: rawStudent?.shirt_size || "",
      phone: student.phone || "",
      email: student.email || "",
      neighborhood: rawStudent?.neighborhood || rawStudent?.address || "",
      parent_name: rawStudent?.parent_name || "",
      parent_phone: rawStudent?.parent_phone || "",
      medical_situation:
        rawStudent?.medical_situation || rawStudent?.medical_notes || "",
      food_notes: rawStudent?.food_notes || rawStudent?.allergies || "",
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", id), {
        birth_date: draft.birth_date,
        gender: draft.gender,
        school_name: draft.school_name,
        voice_type: draft.voice_type,
        shirt_size: draft.shirt_size,
        phone: draft.phone,
        email: draft.email,
        neighborhood: draft.neighborhood,
        parent_name: draft.parent_name,
        parent_phone: draft.parent_phone,
        medical_situation: draft.medical_situation,
        food_notes: draft.food_notes,
      });
      await fetchStudentData(false);
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully.");
    } catch (error) {
      console.error("Error saving student profile:", error);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const statusColors: Record<string, string> = {
    attended: ds.teal,
    registered: "#f59e0b",
    absent: ds.red,
  };

  const initials = student.full_name
    .split(" ")
    .map((n: string) => n[0])
    .join("");

  const set = (field: string) => (text: string) =>
    setDraft((d) => ({ ...d, [field]: text }));

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      {/* ── Teal Header ───────────────────────────────────────────────────── */}
      <View style={s.headerBg}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          disabled={isSaving}
        >
          <Ionicons name="chevron-back" size={26} color={ds.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.orgLabel}>🎵 Jerusalem Youth Chorus</Text>
          <Text style={s.pageTitle}>Student Profile</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity
            style={s.editBtn}
            onPress={isEditing ? () => setIsEditing(false) : enterEditMode}
            disabled={isSaving}
          >
            <Ionicons
              name={isEditing ? "close-outline" : "create-outline"}
              size={18}
              color={ds.white}
            />
            <Text style={s.editBtnText}>{isEditing ? "Cancel" : "Edit"}</Text>
          </TouchableOpacity>
        )}
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
        keyboardShouldPersistTaps="handled"
      >
        {/* Personal Information */}
        <InfoCard title="Personal Information">
          {/* Age is derived — always read-only */}
          <InfoRow
            icon="person-outline"
            label="Age"
            value={age !== "N/A" ? `${age} years` : "N/A"}
          />
          {isEditing ? (
            <EditRow
              icon="calendar-outline"
              label="Date of Birth"
              value={draft.birth_date}
              onChange={set("birth_date")}
            />
          ) : (
            <InfoRow
              icon="calendar-outline"
              label="Date of Birth"
              value={dob}
            />
          )}
          {canViewAll &&
            (isEditing ? (
              <EditRow
                icon="male-female-outline"
                label="Gender"
                value={draft.gender}
                onChange={set("gender")}
              />
            ) : (
              <InfoRow
                icon="male-female-outline"
                label="Gender"
                value={gender}
              />
            ))}
          {canViewAll &&
            (isEditing ? (
              <EditRow
                icon="school-outline"
                label="School"
                value={draft.school_name}
                onChange={set("school_name")}
              />
            ) : (
              <InfoRow
                icon="school-outline"
                label="School"
                value={schoolName}
              />
            ))}
          {isEditing ? (
            <EditRow
              icon="mic-outline"
              label="Voice Type"
              value={draft.voice_type}
              onChange={set("voice_type")}
            />
          ) : (
            <InfoRow icon="mic-outline" label="Voice Type" value={voiceType} />
          )}
          {canViewAll &&
            (isEditing ? (
              <EditRow
                icon="shirt-outline"
                label="Shirt Size"
                value={draft.shirt_size}
                onChange={set("shirt_size")}
              />
            ) : (
              <InfoRow
                icon="shirt-outline"
                label="Shirt Size"
                value={shirtSize}
              />
            ))}
          {/* Year Joined is managed via the group modal — always read-only */}
          <InfoRow
            icon="star-outline"
            label="Year Joined"
            value={yearJoined}
            isLast={!isAdmin}
          />
          {isAdmin &&
            (isEditing ? (
              <>
                <EditRow
                  icon="medkit-outline"
                  label="Medical Situation"
                  value={draft.medical_situation}
                  onChange={set("medical_situation")}
                />
                <EditRow
                  icon="restaurant-outline"
                  label="Food Notes"
                  value={draft.food_notes}
                  onChange={set("food_notes")}
                  isLast
                />
              </>
            ) : (
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
            ))}
        </InfoCard>

        {/* Contact Information — full for admin/self, phone-only for peers */}
        <InfoCard title="Contact Information">
          {canViewAll &&
            (isEditing ? (
              <EditRow
                icon="mail-outline"
                label="Email"
                value={draft.email}
                onChange={set("email")}
                keyboardType="email-address"
              />
            ) : (
              <InfoRow
                icon="mail-outline"
                label="Email"
                value={student.email || "N/A"}
              />
            ))}
          {isEditing ? (
            <EditRow
              icon="call-outline"
              label="Phone"
              value={draft.phone}
              onChange={set("phone")}
              keyboardType="phone-pad"
              isLast={!canViewAll}
            />
          ) : (
            <InfoRow
              icon="call-outline"
              label="Phone"
              value={student.phone || "N/A"}
              isLast={!canViewAll}
            />
          )}
          {canViewAll &&
            (isEditing ? (
              <EditRow
                icon="location-outline"
                label="Neighborhood"
                value={draft.neighborhood}
                onChange={set("neighborhood")}
                isLast
              />
            ) : (
              <InfoRow
                icon="location-outline"
                label="Neighborhood"
                value={neighborhood}
                isLast
              />
            ))}
        </InfoCard>

        {/* Parent / Guardian — admin and self only */}
        {canViewAll && (
          <InfoCard title="Parent / Guardian">
            {isEditing ? (
              <>
                <EditRow
                  icon="person-circle-outline"
                  label="Parent Name"
                  value={draft.parent_name}
                  onChange={set("parent_name")}
                />
                <EditRow
                  icon="call-outline"
                  label="Parent Phone"
                  value={draft.parent_phone}
                  onChange={set("parent_phone")}
                  keyboardType="phone-pad"
                  isLast
                />
              </>
            ) : (
              <>
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
              </>
            )}
          </InfoCard>
        )}

        {/* Save Changes — edit mode only */}
        {isEditing && (
          <TouchableOpacity
            style={[s.saveBtn, isSaving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color={ds.white} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={ds.white}
                />
                <Text style={s.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Management Actions — admin only */}
        {isAdmin && !isEditing && (
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
        {!isEditing && (
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
        )}

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
              {sortedGroups.map((g) => {
                const isActive = Number(studentYear) === Number(g.year_id);
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[s.groupItem, isActive && s.groupItemActive]}
                    onPress={() => {
                      if (!student) return;
                      studentService
                        .updateStudentGroup(student.id, g.id)
                        .then(() => {
                          fetchStudentData(false);
                          Alert.alert("Success", `Assigned to ${g.name}`);
                          setShowGroupModal(false);
                        })
                        .catch((err) => {
                          console.error("Update group error:", err);
                          Alert.alert("Error", err.message || "Update failed");
                        });
                    }}
                  >
                    <Text
                      style={[
                        s.groupItemText,
                        isActive && s.groupItemTextActive,
                      ]}
                    >
                      {g.name}
                    </Text>
                    {isActive && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={ds.teal}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
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
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(255,255,255,0.15)",
    marginTop: 6,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: ds.white,
  },

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
  heroName: {
    fontSize: 22,
    fontWeight: "800",
    color: ds.white,
    marginBottom: 8,
  },
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
  rowLabel: {
    fontSize: 11,
    color: ds.subtext,
    marginBottom: 2,
    fontWeight: "500",
  },
  rowValue: { fontSize: 15, fontWeight: "700", color: ds.text },
  editInput: {
    fontSize: 15,
    fontWeight: "600",
    color: ds.text,
    borderBottomWidth: 1.5,
    borderBottomColor: ds.teal,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },

  // Save button
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: ds.teal,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: ds.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: "800", color: ds.white },

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
