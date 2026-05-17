// src/screens/AttendanceScreen.js

import { useLocalSearchParams, useRouter } from "expo-router"; // ← FIX
import { useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS } from "../../src/data/mockData";

// ─── 5 statuses — text only, no emoji ─────────────────────────────────────
const STATUSES = [
  { key: "on_time", label: "On Time", color: COLORS.teal },
  { key: "late", label: "Late", color: COLORS.yellow },
  { key: "absent", label: "Absent", color: COLORS.red },
  { key: "school_trip", label: "School Trip", color: "#8b5cf6" },
  { key: "sick", label: "Sick", color: "#888888" },
];

// ─── Mock students – replace with Firebase ────────────────────────────────
const MOCK_STUDENTS = [
  { id: "s1", name: "Yael Cohen", year: "Year 1" },
  { id: "s2", name: "Noa Levi", year: "Year 1" },
  { id: "s3", name: "David Mizrahi", year: "Year 2" },
  { id: "s4", name: "Tamar Katz", year: "Year 2" },
  { id: "s5", name: "Eli Ben-David", year: "Year 3" },
  { id: "s6", name: "Maya Shapiro", year: "Year 3" },
];

export default function AttendanceScreen({ route }) {
  // ── FIX: useRouter instead of navigation prop ──────────────────────────
  const router = useRouter();

  // Support both Expo Router params and React Navigation route.params
  const localParams = useLocalSearchParams();
  const eventTitle =
    localParams?.eventTitle || route?.params?.eventTitle || "Attendance";

  const [attendance, setAttendance] = useState(
    Object.fromEntries(MOCK_STUDENTS.map((s) => [s.id, null])),
  );
  const [saved, setSaved] = useState(false);

  const setStatus = (studentId, statusKey) => {
    setSaved(false);
    setAttendance((prev) => ({ ...prev, [studentId]: statusKey }));
  };

  const saveAttendance = () => {
    // TODO: Firebase → setDoc(doc(db, 'attendance', eventId), attendance)
    setSaved(true);
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const counts = STATUSES.map((s) => ({
    ...s,
    count: Object.values(attendance).filter((v) => v === s.key).length,
  }));
  const unmarked = Object.values(attendance).filter((v) => v === null).length;

  // ── Student row ──────────────────────────────────────────────────────────
  const renderStudent = ({ item }) => {
    const current = attendance[item.id];
    const currentStatus = STATUSES.find((st) => st.key === current);

    return (
      <View style={s.studentCard}>
        {/* Student info row */}
        <View style={s.studentInfo}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {item.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.studentName}>{item.name}</Text>
            <Text style={s.studentYear}>{item.year}</Text>
          </View>
          {/* Current status badge */}
          {currentStatus && (
            <View
              style={[
                s.currentBadge,
                { backgroundColor: currentStatus.color + "30" },
              ]}
            >
              <Text
                style={[s.currentBadgeText, { color: currentStatus.color }]}
              >
                {currentStatus.label}
              </Text>
            </View>
          )}
        </View>

        {/* 5 status buttons — TEXT only, no emoji, dark text on active */}
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
                    { color: isActive ? COLORS.black : st.color },
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
        {/* ← FIX: router.back() instead of navigation.goBack() */}
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </Pressable>
        <Text style={s.eventName} numberOfLines={1}>
          {eventTitle}
        </Text>
      </View>

      {/* Stats summary */}
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
        <View style={[s.statBox, { borderColor: "#44444460" }]}>
          <Text style={[s.statNum, { color: "#888" }]}>{unmarked}</Text>
          <Text style={s.statLabel}>Unmarked</Text>
        </View>
      </View>

      {/* Students list */}
      <FlatList
        data={MOCK_STUDENTS}
        keyExtractor={(i) => i.id}
        renderItem={renderStudent}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Save button */}
      <View style={s.footer}>
        <Pressable
          style={[s.saveBtn, saved && s.saveBtnDone]}
          onPress={saveAttendance}
        >
          <Text style={s.saveBtnText}>
            {saved ? "Saved!" : "Save Attendance"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.black },
  header: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  backBtn: { padding: 4 },
  backText: { color: COLORS.teal, fontSize: 15, fontWeight: "600" },
  eventName: { flex: 1, fontSize: 17, fontWeight: "700", color: COLORS.white },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  statBox: {
    flex: 1,
    minWidth: 60,
    backgroundColor: "#111",
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    alignItems: "center",
  },
  statNum: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 9, color: "#888", textAlign: "center", marginTop: 2 },

  studentCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
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
    backgroundColor: COLORS.teal + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.teal, fontWeight: "700", fontSize: 14 },
  studentName: { color: COLORS.white, fontWeight: "600", fontSize: 15 },
  studentYear: { color: "#888", fontSize: 12, marginTop: 1 },

  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  currentBadgeText: { fontSize: 11, fontWeight: "700" },

  // ── Status buttons: text only, readable ──────────────────────────────
  statusRow: { flexDirection: "row", gap: 6 },
  statusBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 14,
  },

  footer: { padding: 16 },
  saveBtn: {
    backgroundColor: COLORS.teal,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  saveBtnDone: { backgroundColor: "#025f5f" },
  saveBtnText: { color: COLORS.black, fontWeight: "800", fontSize: 16 },
});
