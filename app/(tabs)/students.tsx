import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, UserType } from "../../src/context/AuthContext";
import {
  Group,
  groups as mockGroups,
  students as mockStudents,
  Student,
} from "../../src/data/mockData";
import { studentService } from "../../src/data/studentService";

// ── Design System ─────────────────────────────────────────────────────────────
const ds = {
  teal: "#039899",
  red: "#c56451",
  yellow: "#cfad5d",
  purple: "#6b5ce7",
  white: "#ffffff",
  bg: "#f5fafe",      // Background
  text: "#1a1a2e",    // Text
  subtext: "#5a6a7a", // Text Sub
  muted: "#9aa8b4",   // Muted
  border: "#e8eef2",  // Border
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────
type StudentWithVoice = Student & {
  voice_type?: UserType["voice_type"];
};

type StudentWithGroup = Omit<StudentWithVoice, "year_id"> & {
  group_name: string;
  voice_type?: UserType["voice_type"];
  year_id: number | null;
};

// ── Filter data ───────────────────────────────────────────────────────────────
const YEAR_FILTERS = [
  { label: "All", value: null },
  { label: "Year 1", value: "Year 1" },
  { label: "Year 2", value: "Year 2" },
  { label: "Year 3", value: "Year 3" },
];

const VOICE_FILTERS = [
  { label: "All", value: null },
  { label: "Bass", value: "bass" },
  { label: "Tenor", value: "tenor" },
  { label: "Alto", value: "alto" },
  { label: "Soprano", value: "soprano" },
];

// ── Screen ────────────────────────────────────────────────────────────────────
export default function StudentsListScreen() {
  const router   = useRouter();
  const { user } = useAuth();
  const { action } = useLocalSearchParams<{ action?: string }>();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string | null>(null);
  const [selectedVoiceFilter, setSelectedVoiceFilter] = useState<string | null>(null);
  const [studentsList, setStudentsList] = useState<StudentWithVoice[]>([]);
  const [groupsList, setGroupsList]     = useState<Group[]>([]);
  const [loading, setLoading]           = useState(true);

  // ── Add Student modal state ───────────────────────────────────────────────
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName]   = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [addSaving, setAddSaving]   = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          const [s, g] = await Promise.all([
            studentService.getAllStudents(),
            studentService.getGroups(),
          ]);
          setStudentsList(s.length > 0 ? s : mockStudents);
          setGroupsList(g.length > 0 ? g : mockGroups);
        } catch (error) {
          console.error("Firebase fetch error:", error);
          setStudentsList(mockStudents);
          setGroupsList(mockGroups);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, []),
  );

  // ── Open Add modal when arriving with ?action=add ────────────────────────
  useEffect(() => {
    if (action === "add" && user?.role === "admin") {
      setAddModalVisible(true);
      router.setParams({ action: "" });
    }
  }, [action]);

  // ── Add student handler ────────────────────────────────────────────────────
  const handleAddStudent = async () => {
    if (!newName.trim()) {
      Alert.alert("Required", "Please enter the student's full name.");
      return;
    }
    if (!newPhone.trim()) {
      Alert.alert("Required", "Please enter a phone number.");
      return;
    }
    setAddSaving(true);
    try {
      const chosenGroup = groupsList.find((g) => g.id === newGroupId);
      await studentService.addStudent({
        full_name:  newName.trim(),
        phone:      newPhone.trim(),
        email:      `${newPhone.trim().replace(/\D/g, "")}@kehila.app`,
        group_id:   newGroupId || undefined,
        year_id:    chosenGroup?.year_id ?? undefined,
        program_id: chosenGroup?.program_id ?? undefined,
      } as any);
      // Refresh list
      const fresh = await studentService.getAllStudents();
      setStudentsList(fresh.length > 0 ? fresh : studentsList);
      setAddModalVisible(false);
      setNewName("");
      setNewPhone("");
      setNewGroupId("");
    } catch (e) {
      Alert.alert("Error", "Could not add student. Please try again.");
      console.error(e);
    } finally {
      setAddSaving(false);
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    const enriched = studentsList.map((student) => {
      const group = groupsList.find(
        (g) => g.id === student.group_id || g.name === student.group_id,
      );
      const yearId =
        group?.year_id !== undefined
          ? Number(group.year_id)
          : student.year_id !== undefined
            ? Number(student.year_id)
            : null;

      return {
        ...student,
        group_name: yearId ? `Year ${yearId}` : student.group_id || "N/A",
        year_id: yearId,
        voice_type: student.voice_type,
      };
    });

    let result = enriched;

    if (user?.role === "singer") {
      const myGroup = groupsList.find((g) => g.id === user.group_id);
      const myYear = myGroup ? Number(myGroup.year_id) : null;
      const myVoice = user.voice_type
        ? String(user.voice_type).trim().toLowerCase()
        : null;

      if (myYear === null || !myVoice) return [];

      result = result.filter((s) => {
        const otherYear = s.year_id != null ? Number(s.year_id) : null;
        const otherVoice = s.voice_type
          ? String(s.voice_type).trim().toLowerCase()
          : null;
        return otherYear === myYear && otherVoice === myVoice;
      });
    } else {
      if (selectedYearFilter) {
        const yearNum = parseInt(selectedYearFilter.replace("Year ", ""), 10);
        if (!isNaN(yearNum))
          result = result.filter((s) => Number(s.year_id) === yearNum);
      }
      if (selectedVoiceFilter) {
        result = result.filter(
          (s) =>
            s.voice_type?.toLowerCase() === selectedVoiceFilter.toLowerCase(),
        );
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.full_name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q),
      );
    }

    return result;
  }, [
    searchQuery,
    selectedYearFilter,
    selectedVoiceFilter,
    studentsList,
    groupsList,
    user,
  ]);

  useEffect(() => {
    console.log("Filtered Students Count (final):", filteredStudents.length);
  }, [filteredStudents]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getGroupColor = (groupName: string): string => {
    switch (groupName) {
      case "Year 1":
        return ds.yellow;
      case "Year 2":
        return ds.red;
      case "Year 3":
        return ds.purple;
      default:
        return ds.teal;
    }
  };

  // ── Card render ───────────────────────────────────────────────────────────
  const renderStudent = ({ item }: { item: StudentWithGroup }) => {
    const groupColor = getGroupColor(item.group_name);
    const initials = item.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
    const voiceLabel = item.voice_type
      ? item.voice_type.charAt(0).toUpperCase() + item.voice_type.slice(1)
      : "N/A";

    return (
      <Pressable
        onPress={() => router.push(`/student/${item.id}`)}
        style={({ pressed }) => [
          s.card,
          Platform.OS === "ios" && pressed && { opacity: 0.85 },
        ]}
        android_ripple={{ color: ds.teal + "20" }}
      >
        {/* Colored top accent bar */}
        <View style={[s.cardTopBar, { backgroundColor: groupColor }]} />

        <View style={s.cardBody}>
          {/* Top — badges */}
          <View style={s.badgesRow}>
            <View style={[s.badge, { backgroundColor: groupColor + "22" }]}>
              <Text style={[s.badgeText, { color: groupColor }]}>
                {item.group_name}
              </Text>
            </View>
            <View style={[s.badge, { backgroundColor: ds.border }]}>
              <Text style={[s.badgeText, { color: ds.subtext }]}>
                {voiceLabel}
              </Text>
            </View>
          </View>

          {/* Middle — avatar + name */}
          <View style={s.nameRow}>
            <View
              style={[
                s.avatar,
                { backgroundColor: ds.bg, borderColor: ds.border, borderWidth: 1 },
              ]}
            >
              <Text style={[s.avatarText, { color: ds.text }]}>
                {initials}
              </Text>
            </View>
            <Text style={s.cardTitle} numberOfLines={1}>
              {item.full_name}
            </Text>
          </View>

          <View style={s.actionsRow}>
            <Pressable
              hitSlop={8}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/messages",
                  params: { studentId: item.id, studentName: item.full_name },
                } as any)
              }
            >
              <Ionicons name="chatbubbles-outline" size={24} color={ds.teal} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={ds.teal} />

      {/* ── Teal Header ───────────────────────────────────────────────── */}
      <View style={s.headerBg}>
        <Text style={s.orgLabel}>
          <Text style={{ opacity: 0.85 }}>🎵 Jerusalem Youth Chorus</Text>
        </Text>
        <Text style={s.pageTitle}>Students</Text>
      </View>

      <View style={s.content}>
        {/* ── Search ────────────────────────────────────────────────── */}
        <View style={s.searchSection}>
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={18} color={ds.subtext} />
            <TextInput
              style={s.searchInput}
              placeholder="Search by name or email..."
              placeholderTextColor={ds.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {/* ── Admin Filters ─────────────────────────────────────────── */}
        {user?.role === "admin" && (
          <View style={s.filterSection}>
            <Text style={s.filterLabel}>Year</Text>
            <View style={s.filterRow}>
              {YEAR_FILTERS.map((f) => (
                <Pressable
                  key={f.label}
                  onPress={() => setSelectedYearFilter(f.value)}
                  style={[
                    s.filterChip,
                    selectedYearFilter === f.value && s.filterChipActive,
                  ]}
                >
                  <View
                    style={[
                      s.filterDot,
                      {
                        backgroundColor: getGroupColor(
                          f.label === "All" ? "All Groups" : f.label,
                        ),
                      },
                    ]}
                  />
                  <Text
                    style={[
                      s.filterChipText,
                      selectedYearFilter === f.value && s.filterChipTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[s.filterLabel, { marginTop: 8 }]}>Voice Section</Text>
            <View style={s.filterRow}>
              {VOICE_FILTERS.map((f) => (
                <Pressable
                  key={f.label}
                  onPress={() => setSelectedVoiceFilter(f.value)}
                  style={[
                    s.filterChip,
                    selectedVoiceFilter === f.value && s.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      s.filterChipText,
                      selectedVoiceFilter === f.value && s.filterChipTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* ── List / Empty / Loading ─────────────────────────────────── */}
        {loading ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>Loading...</Text>
          </View>
        ) : filteredStudents.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color={ds.border} />
            <Text style={s.emptyText}>
              {searchQuery
                ? "No students match your search"
                : "No students found"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredStudents}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderStudent}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* ── FAB — Add Student ─────────────────────────────────────────── */}
      {user?.role === "admin" && (
        <Pressable style={s.fab} onPress={() => setAddModalVisible(true)}>
          <Ionicons name="person-add" size={22} color="#fff" />
        </Pressable>
      )}

      {/* ── Add Student Modal ──────────────────────────────────────────── */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            {/* Handle bar */}
            <View style={s.modalHandle} />

            <Text style={s.modalTitle}>Add New Student</Text>

            <Text style={s.fieldLabel}>Full Name *</Text>
            <TextInput
              style={s.fieldInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Sara Cohen"
              placeholderTextColor={ds.muted}
              autoFocus
            />

            <Text style={s.fieldLabel}>Phone Number *</Text>
            <TextInput
              style={s.fieldInput}
              value={newPhone}
              onChangeText={setNewPhone}
              placeholder="+972-50-000-0000"
              placeholderTextColor={ds.muted}
              keyboardType="phone-pad"
            />

            <Text style={s.fieldLabel}>Year / Group</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <Pressable
                style={[s.groupChip, !newGroupId && s.groupChipActive]}
                onPress={() => setNewGroupId("")}
              >
                <Text style={[s.groupChipText, !newGroupId && s.groupChipTextActive]}>None</Text>
              </Pressable>
              {groupsList.map((g) => {
                const active = newGroupId === g.id;
                return (
                  <Pressable
                    key={g.id}
                    style={[s.groupChip, active && s.groupChipActive]}
                    onPress={() => setNewGroupId(g.id)}
                  >
                    <Text style={[s.groupChipText, active && s.groupChipTextActive]}>
                      {g.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={s.modalActions}>
              <Pressable
                style={s.cancelBtn}
                onPress={() => { setAddModalVisible(false); setNewName(""); setNewPhone(""); setNewGroupId(""); }}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={s.saveBtn} onPress={handleAddStudent} disabled={addSaving}>
                {addSaving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.saveBtnText}>Add Student</Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ds.bg },
  headerBg: { backgroundColor: ds.teal, padding: 16, paddingTop: 40 },
  orgLabel: { color: ds.white, opacity: 0.9 },
  pageTitle: { color: ds.white, fontSize: 20, fontWeight: "700", marginTop: 6 },
  content: { flex: 1, padding: 12 },
  searchSection: { marginBottom: 12 },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: ds.white, padding: 8, borderRadius: 8 },
  searchInput: { marginLeft: 8, flex: 1, color: ds.text },
  filterSection: { marginBottom: 12 },
  filterLabel: { color: ds.subtext, fontSize: 12, marginBottom: 6 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, backgroundColor: ds.white, marginRight: 8, marginBottom: 8 },
  filterChipActive: { backgroundColor: ds.teal },
  filterDot: { width: 8, height: 8, borderRadius: 8, marginRight: 8 },
  filterChipText: { color: ds.text },
  filterChipTextActive: { color: ds.white },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: ds.muted, marginTop: 8 },
  list: { paddingBottom: 120 },

  // ── FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ds.teal,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ds.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  // ── Add Student modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: ds.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: ds.text,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: ds.subtext,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  fieldInput: {
    borderWidth: 1.5,
    borderColor: ds.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: ds.text,
    marginBottom: 16,
    backgroundColor: "#f9fbfd",
  },
  groupChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f4f8",
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  groupChipActive: {
    backgroundColor: ds.teal + "18",
    borderColor: ds.teal,
  },
  groupChipText: { fontSize: 13, fontWeight: "600", color: ds.subtext },
  groupChipTextActive: { color: ds.teal },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: ds.border,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: ds.subtext },
  saveBtn: {
    flex: 2,
    backgroundColor: ds.teal,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    shadowColor: ds.teal,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  card: { backgroundColor: ds.white, borderRadius: 8, marginBottom: 12, overflow: "hidden" },
  cardTopBar: { height: 6, width: "100%" },
  cardBody: { padding: 12, flexDirection: "row", alignItems: "center" , justifyContent: "space-between"},
  badgesRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, marginRight: 8 },
  badgeText: { fontSize: 12 },
  nameRow: { flex: 1, flexDirection: "row", alignItems: "center", marginLeft: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  avatarText: { fontWeight: "700" },
  cardTitle: { marginLeft: 12, fontWeight: "600", color: ds.text, flex: 1 },
  actionsRow: { marginLeft: 8 },
});