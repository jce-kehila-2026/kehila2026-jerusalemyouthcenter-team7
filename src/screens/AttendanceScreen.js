// src/screens/AttendanceScreen.js

import React, { useState } from "react";
import {
  FlatList,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { events, students } from "../data/mockData";

const COLORS = {
  teal: "#039899",
  red: "#c56451",
  yellow: "#cfad5d",
  black: "#000000",
  charcoal: "#353535",
  white: "#ffffff",
};

const STATUSES = [
  { key: "on_time_ready", label: "On Time ", color: "#22c55e" },
  { key: "late", label: "Late ", color: COLORS.yellow },
  { key: "absent", label: "Absent ", color: COLORS.red },
  { key: "school_trip", label: "School Trip ", color: "#3b82f6" },
  { key: "sick", label: "Sick ", color: "#a855f7" },
];

const SEMESTERS = [
  { key: 1, label: "Semester 1" },
  { key: 2, label: "Semester 2" },
];

const YEARS = [
  { key: 1, label: "Year 1" },
  { key: 2, label: "Year 2" },
  { key: 3, label: "Year 3" },
];

export default function AttendanceScreen({ adminGroupId = 1 }) {
  const [step, setStep] = useState("select_event"); // select_event → select_details → take_attendance
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [saved, setSaved] = useState(false);

  const groupStudents = students.filter((s) => s.group_id === adminGroupId);

  const setStatus = (studentId, status) => {
    setSaved(false);
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSave = () => {
    const records = groupStudents.map((s) => ({
      student_id: s.id,
      event_id: selectedEvent.id,
      semester: selectedSemester,
      year: selectedYear,
      status: attendance[s.id] || "absent",
      timestamp: new Date().toISOString(),
    }));
    console.log("Attendance saved:", records);
    setSaved(true);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const countStatus = (statusKey) =>
    groupStudents.filter((s) => attendance[s.id] === statusKey).length;

  // ── שלב 1: בחירת אירוע ──
  if (step === "select_event") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />
        <View style={styles.header}>
          <Text style={styles.headerSub}>Jerusalem Youth Chorus</Text>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerHint}>Step 1 — Select an event</Text>
        </View>

        <FlatList
          data={events}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.eventCard}
              onPress={() => {
                setSelectedEvent(item);
                setStep("select_details");
              }}
              activeOpacity={0.85}
            >
              <View
                style={[styles.eventAccent, { backgroundColor: COLORS.teal }]}
              />
              <View style={styles.eventContent}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventDate}>📅 {formatDate(item.date)}</Text>
                <Text style={styles.eventLocation}>📍 {item.location}</Text>
              </View>
              <Text style={styles.eventArrow}>›</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    );
  }

  // ── שלב 2: בחירת Semester + Year ──
  if (step === "select_details") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setStep("select_event")}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.eventName}>{selectedEvent.title}</Text>
          <Text style={styles.eventDateSmall}>
            📅 {formatDate(selectedEvent.date)}
          </Text>
          <Text style={styles.headerHint}>Step 2 — Select semester & year</Text>
        </View>

        <ScrollView contentContainerStyle={styles.detailsContent}>
          {/* Semester */}
          <Text style={styles.sectionLabel}>Semester</Text>
          <View style={styles.optionsRow}>
            {SEMESTERS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.optionBtn,
                  selectedSemester === s.key && styles.optionBtnActive,
                ]}
                onPress={() => setSelectedSemester(s.key)}
              >
                <Text
                  style={[
                    styles.optionBtnText,
                    selectedSemester === s.key && styles.optionBtnTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Year */}
          <Text style={styles.sectionLabel}>Year</Text>
          <View style={styles.optionsRow}>
            {YEARS.map((y) => (
              <TouchableOpacity
                key={y.key}
                style={[
                  styles.optionBtn,
                  selectedYear === y.key && styles.optionBtnActive,
                ]}
                onPress={() => setSelectedYear(y.key)}
              >
                <Text
                  style={[
                    styles.optionBtnText,
                    selectedYear === y.key && styles.optionBtnTextActive,
                  ]}
                >
                  {y.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary */}
          {selectedSemester && selectedYear && (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                📋 {selectedEvent.title}
                {"\n"}
                📅 {formatDate(selectedEvent.date)}
                {"\n"}
                📚 Semester {selectedSemester} • Year {selectedYear}
              </Text>
            </View>
          )}

          {/* Next Button */}
          <TouchableOpacity
            style={[
              styles.nextBtn,
              (!selectedSemester || !selectedYear) && styles.nextBtnDisabled,
            ]}
            onPress={() => {
              if (selectedSemester && selectedYear) {
                setAttendance({});
                setSaved(false);
                setStep("take_attendance");
              }
            }}
          >
            <Text style={styles.nextBtnText}>Next — Take Attendance →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── שלב 3: לקיחת נוכחות ──
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setStep("select_details")}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <Text style={styles.eventName}>{selectedEvent.title}</Text>
        <Text style={styles.eventDateSmall}>
          📅 {formatDate(selectedEvent.date)} • 📚 Semester {selectedSemester} •
          Year {selectedYear}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {STATUSES.map((s) => (
          <View key={s.key} style={styles.statBox}>
            <Text style={[styles.statCount, { color: s.color }]}>
              {countStatus(s.key)}
            </Text>
            <Text style={styles.statLabel}>{s.label.split(" ")[0]}</Text>
          </View>
        ))}
      </View>

      {/* Students */}
      <ScrollView contentContainerStyle={styles.studentsList}>
        {groupStudents.map((student) => (
          <View key={student.id} style={styles.studentCard}>
            <View style={styles.studentInfo}>
              <View style={styles.studentAvatar}>
                <Text style={styles.studentAvatarText}>
                  {student.full_name.charAt(0)}
                </Text>
              </View>
              <View>
                <Text style={styles.studentName}>{student.full_name}</Text>
                <Text style={styles.studentYear}>Year {student.year_id}</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.statusRow}>
                {STATUSES.map((status) => (
                  <TouchableOpacity
                    key={status.key}
                    style={[
                      styles.statusBtn,
                      { borderColor: status.color },
                      attendance[student.id] === status.key && {
                        backgroundColor: status.color,
                      },
                    ]}
                    onPress={() => setStatus(student.id, status.key)}
                  >
                    <Text
                      style={[
                        styles.statusBtnText,
                        { color: status.color },
                        attendance[student.id] === status.key && {
                          color: "#fff",
                        },
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      {/* Save */}
      <View style={styles.saveContainer}>
        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.saveBtnDone]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>
            {saved ? "✅ Attendance Saved!" : "Save Attendance"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerSub: {
    color: COLORS.teal,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  headerTitle: { color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 2 },
  headerHint: { color: "#888", fontSize: 13, marginTop: 4 },
  backBtn: { marginBottom: 8 },
  backText: { color: COLORS.teal, fontSize: 15, fontWeight: "600" },
  eventName: {
    color: COLORS.teal,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  eventDateSmall: { color: "#888", fontSize: 12, marginTop: 2 },

  listContent: { paddingHorizontal: 20, paddingBottom: 30 },
  eventCard: {
    backgroundColor: COLORS.charcoal,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
    alignItems: "center",
  },
  eventAccent: { width: 4, alignSelf: "stretch" },
  eventContent: { flex: 1, padding: 14 },
  eventTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  eventDate: { color: COLORS.teal, fontSize: 12, marginBottom: 2 },
  eventLocation: { color: "#888", fontSize: 12 },
  eventArrow: { color: COLORS.teal, fontSize: 24, paddingRight: 14 },

  detailsContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: {
    color: COLORS.teal,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 20,
  },
  optionsRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  optionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.charcoal,
  },
  optionBtnActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  optionBtnText: { color: "#888", fontSize: 14, fontWeight: "600" },
  optionBtnTextActive: { color: "#fff" },
  summaryBox: {
    marginTop: 24,
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.teal,
  },
  summaryText: { color: "#ccc", fontSize: 14, lineHeight: 24 },
  nextBtn: {
    marginTop: 24,
    backgroundColor: COLORS.teal,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  nextBtnDisabled: { backgroundColor: COLORS.charcoal },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#111",
    paddingVertical: 10,
    marginHorizontal: 20,
    borderRadius: 14,
    marginBottom: 12,
  },
  statBox: { alignItems: "center" },
  statCount: { fontSize: 20, fontWeight: "800" },
  statLabel: { color: "#888", fontSize: 10, marginTop: 2 },

  studentsList: { paddingHorizontal: 20, paddingBottom: 100 },
  studentCard: {
    backgroundColor: COLORS.charcoal,
    borderRadius: 14,
    marginBottom: 12,
    padding: 14,
  },
  studentInfo: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.teal,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  studentAvatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  studentName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  studentYear: { color: "#888", fontSize: 12, marginTop: 2 },
  statusRow: { flexDirection: "row", gap: 8 },
  statusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  statusBtnText: { fontSize: 12, fontWeight: "600" },

  saveContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: COLORS.black,
  },
  saveBtn: {
    backgroundColor: COLORS.teal,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  saveBtnDone: { backgroundColor: "#22c55e" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
