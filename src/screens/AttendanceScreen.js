// app/attendance.js
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getAttendance,
  saveAttendance as saveToFirebase,
} from "../../backend/attendanceService";
import { getStudents } from "../../backend/eventsService";

const C = {
  teal: "#039899",
  red: "#c56451",
  yellow: "#cfad5d",
  white: "#ffffff",
  black: "#111111",
  muted: "#888888",
  bg: "#f8f9fa",
  card: "#ffffff",
  border: "#e8e8e8",
};

const STATUSES = [
  { key: "on_time", label: "On Time", color: C.teal },
  { key: "late", label: "Late", color: C.yellow },
  { key: "absent", label: "Absent", color: C.red },
  { key: "school_trip", label: "School Trip", color: "#8b5cf6" },
  { key: "sick", label: "Sick", color: C.muted },
];

export default function AttendancePage() {
  const { eventId, eventTitle } = useLocalSearchParams();
  const router = useRouter();

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const studentsData = await getStudents();
      setStudents(studentsData);
      const initial = Object.fromEntries(studentsData.map((s) => [s.id, null]));
      const existing = await getAttendance(eventId);
      if (existing && Object.keys(existing).length > 0) {
        setAttendance({ ...initial, ...existing });
      } else {
        setAttendance(initial);
      }
    };
    load();
  }, [eventId]);

  const setStatus = (studentId, statusKey) => {
    setSaved(false);
    setAttendance((prev) => ({ ...prev, [studentId]: statusKey }));
  };

  const handleSave = async () => {
    const ok = await saveToFirebase(eventId, attendance);
    if (ok) setSaved(true);
  };

  const counts = STATUSES.map((s) => ({
    ...s,
    count: Object.values(attendance).filter((v) => v === s.key).length,
  }));
  const unmarked = Object.values(attendance).filter((v) => v === null).length;

  const renderStudent = ({ item }) => {
    const current = attendance[item.id];
    const name = item.full_name ?? item.name ?? "Unknown";
    const year = item.year_id ? `Year ${item.year_id}` : (item.year ?? "");
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2);

    return (
      <View style={s.card}>
        <View style={s.studentInfo}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.studentName}>{name}</Text>
            <Text style={s.studentYear}>{year}</Text>
          </View>
          {current && (
            <View
              style={[
                s.currentBadge,
                {
                  backgroundColor:
                    STATUSES.find((st) => st.key === current)?.color + "20",
                },
              ]}
            >
              <Text
                style={[
                  s.currentBadgeText,
                  { color: STATUSES.find((st) => st.key === current)?.color },
                ]}
              >
                {STATUSES.find((st) => st.key === current)?.label}
              </Text>
            </View>
          )}
        </View>

        <View style={s.statusRow}>
          {STATUSES.map((st) => {
            const isActive = current === st.key;
            return (
              <Pressable
                key={st.key}
                style={[
                  s.statusBtn,
                  { borderColor: st.color },
                  isActive && { backgroundColor: st.color },
                ]}
                onPress={() => setStatus(item.id, st.key)}
              >
                <Text
                  style={[
                    s.statusBtnText,
                    { color: isActive ? "#fff" : st.color },
                  ]}
                >
                  {st.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </Pressable>
        <Text style={s.eventName} numberOfLines={1}>
          {eventTitle || "Attendance"}
        </Text>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {counts.map((st) => (
          <View
            key={st.key}
            style={[s.statBox, { borderColor: st.color + "60" }]}
          >
            <Text style={[s.statNum, { color: st.color }]}>{st.count}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
        <View style={[s.statBox, { borderColor: "#ddd" }]}>
          <Text style={[s.statNum, { color: C.muted }]}>{unmarked}</Text>
          <Text style={s.statLabel}>Unmarked</Text>
        </View>
      </View>

      {/* Students */}
      <FlatList
        data={students}
        keyExtractor={(i) => i.id}
        renderItem={renderStudent}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={s.emptyText}>Loading students...</Text>
        }
      />

      {/* Save */}
      <View style={s.footer}>
        <Pressable
          style={[s.saveBtn, saved && s.saveBtnDone]}
          onPress={handleSave}
        >
          <Text style={s.saveBtnText}>
            {saved ? "✓ Saved!" : "Save Attendance"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { padding: 4 },
  backText: { color: C.teal, fontSize: 15, fontWeight: "600" },
  eventName: { flex: 1, fontSize: 17, fontWeight: "700", color: C.black },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 6,
    marginVertical: 12,
    flexWrap: "wrap",
  },
  statBox: {
    flex: 1,
    minWidth: 60,
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statNum: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 9, color: C.muted, textAlign: "center", marginTop: 2 },
  emptyText: {
    color: C.muted,
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  studentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.teal + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: C.teal, fontWeight: "700", fontSize: 14 },
  studentName: { color: C.black, fontWeight: "600", fontSize: 15 },
  studentYear: { color: C.muted, fontSize: 12, marginTop: 1 },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  currentBadgeText: { fontSize: 11, fontWeight: "700" },
  statusRow: { flexDirection: "row", gap: 6 },
  statusBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBtnText: { fontSize: 11, fontWeight: "700", textAlign: "center" },
  footer: {
    padding: 16,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  saveBtn: {
    backgroundColor: C.teal,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  saveBtnDone: { backgroundColor: "#027a5f" },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
