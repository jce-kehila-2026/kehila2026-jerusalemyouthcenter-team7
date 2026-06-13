// src/screens/EventStudentScreen.js
import { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useEvents } from "../context/EventsContext";

const T = {
  teal: "#039899",
  tealBg: "#f0fafa",
  red: "#c56451",
  yellow: "#cfad5d",
  white: "#ffffff",
  bg: "#f5fafe",
  card: "#ffffff",
  border: "#e8eef2",
  text: "#1a1a2e",
  textSub: "#5a6a7a",
  muted: "#9aa8b4",
};

const GROUP_COLORS = {
  "All Groups": T.teal,
  "Year 1": T.yellow,
  "Year 2": T.red,
  "Year 3": "#8b5cf6",
};

const BADGE_STYLES = {
  all: { bg: T.tealBg, text: T.teal },
  year1: { bg: "#fffbf0", text: "#9a7b20" },
  year2: { bg: "#fff1ee", text: T.red },
  year3: { bg: "#f3f0ff", text: "#6b5ce7" },
};

const STATUSBAR_H =
  Platform.OS === "android"
    ? (StatusBar.currentHeight ?? 24)
    : Platform.OS === "ios"
      ? 44
      : 0;

export default function EventStudentScreen({
  studentYear = 1,
  studentName = "Student",
}) {
  const { events } = useEvents();
  const [activeTab, setActiveTab] = useState("list");
  const [selectedDate, setSelectedDate] = useState(null);

  const myEvents = events.filter(
    (e) =>
      e.group === "all" ||
      e.group_name === "All Groups" ||
      e.group === `year${studentYear}` ||
      e.group_name === `Year ${studentYear}` ||
      e.groupLabel === "All Groups" ||
      e.groupLabel === `Year ${studentYear}`,
  );

  const getGroupColor = (item) =>
    GROUP_COLORS[item.groupLabel] || GROUP_COLORS[item.group_name] || T.teal;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const clean = dateStr.split("T")[0];
    if (clean.includes("-")) {
      return clean.split("-").reverse().join("/");
    }
    return clean;
  };

  // ── Calendar helpers ────────────────────────────────────────────────
  const markedDates = {};
  myEvents.forEach((event) => {
    const date = (event.date || "").split("T")[0];
    if (!date) return;
    const color = getGroupColor(event);
    if (markedDates[date]) {
      markedDates[date].dots.push({ color });
    } else {
      markedDates[date] = { dots: [{ color }] };
    }
  });
  if (selectedDate) {
    markedDates[selectedDate] = {
      ...(markedDates[selectedDate] || {}),
      selected: true,
      selectedColor: T.teal,
    };
  }

  const calendarEvents = selectedDate
    ? myEvents.filter((e) => (e.date || "").split("T")[0] === selectedDate)
    : myEvents;

  // ── Render list card ────────────────────────────────────────────────
  const renderEvent = ({ item }) => {
    const badge = BADGE_STYLES[item.group] || BADGE_STYLES.all;
    const color = getGroupColor(item);
    return (
      <View style={s.card}>
        <View style={[s.cardBar, { backgroundColor: color }]} />
        <View style={s.cardInner}>
          <View style={s.cardTop}>
            <View style={[s.badge, { backgroundColor: badge.bg }]}>
              <Text style={[s.badgeText, { color: badge.text }]}>
                {item.groupLabel || item.group_name}
              </Text>
            </View>
            <Text style={s.dateText}>
              📅 {formatDate(item.date)} 🕐 {item.time}
            </Text>
          </View>
          <Text style={s.cardTitle}>{item.title}</Text>
          <Text style={s.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={s.cardLoc}>📍 {item.location}</Text>
        </View>
      </View>
    );
  };

  // ── Render calendar card ────────────────────────────────────────────
  const renderCalendarEvent = ({ item }) => {
    const color = getGroupColor(item);
    return (
      <View style={s.calCard}>
        <View style={[s.calCardBar, { backgroundColor: color }]} />
        <View style={s.calCardContent}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View style={[s.badge, { backgroundColor: color + "18" }]}>
              <Text style={[s.badgeText, { color }]}>
                {item.groupLabel || item.group_name}
              </Text>
            </View>
            <Text style={s.dateText}>🕐 {item.time}</Text>
          </View>
          <Text style={s.calCardTitle}>{item.title}</Text>
          <Text style={s.calCardLoc}>📍 {item.location}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.teal} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.orgLabel}>🎵 Jerusalem Youth Chorus</Text>
          <Text style={s.pageTitle}>My Events</Text>
          <View style={s.yearBadge}>
            <Text style={s.yearBadgeText}>Year {studentYear}</Text>
          </View>
        </View>
        {/* List / Calendar toggle */}
        <View style={s.tabToggle}>
          <Pressable
            style={[
              s.tabToggleBtn,
              activeTab === "list" && s.tabToggleBtnActive,
            ]}
            onPress={() => setActiveTab("list")}
          >
            <Text
              style={[
                s.tabToggleText,
                activeTab === "list" && s.tabToggleTextActive,
              ]}
            >
              List
            </Text>
          </Pressable>
          <Pressable
            style={[
              s.tabToggleBtn,
              activeTab === "calendar" && s.tabToggleBtnActive,
            ]}
            onPress={() => setActiveTab("calendar")}
          >
            <Text
              style={[
                s.tabToggleText,
                activeTab === "calendar" && s.tabToggleTextActive,
              ]}
            >
              Calendar
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Welcome */}
      <View style={s.welcomeBox}>
        <Text style={s.welcomeText}>
          Hello, {studentName}! You have {myEvents.length} upcoming event
          {myEvents.length !== 1 ? "s" : ""}.
        </Text>
      </View>

      {/* ── LIST VIEW ── */}
      {activeTab === "list" &&
        (myEvents.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 48 }}>🎵</Text>
            <Text style={s.emptyText}>No upcoming events for your group.</Text>
          </View>
        ) : (
          <FlatList
            data={myEvents}
            keyExtractor={(item) => String(item.id ?? item.event_id)}
            renderItem={renderEvent}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />
        ))}

      {/* ── CALENDAR VIEW ── */}
      {activeTab === "calendar" && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Calendar
            markingType="multi-dot"
            markedDates={markedDates}
            onDayPress={(day) =>
              setSelectedDate(
                selectedDate === day.dateString ? null : day.dateString,
              )
            }
            theme={{
              backgroundColor: "#fff",
              calendarBackground: "#fff",
              textSectionTitleColor: T.teal,
              selectedDayBackgroundColor: T.teal,
              selectedDayTextColor: "#fff",
              todayTextColor: T.teal,
              dayTextColor: "#111",
              textDisabledColor: "#ccc",
              monthTextColor: "#111",
              arrowColor: T.teal,
              textMonthFontWeight: "700",
              textDayFontSize: 14,
              textMonthFontSize: 16,
            }}
            style={s.calendar}
          />

          {/* Legend */}
          <View style={s.legend}>
            {Object.entries(GROUP_COLORS).map(([label, color]) => (
              <View key={label} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: color }]} />
                <Text style={s.legendText}>{label}</Text>
              </View>
            ))}
          </View>

          <Text style={s.sectionTitle}>
            {selectedDate
              ? `Events on ${formatDate(selectedDate)}`
              : "All Upcoming Events"}
          </Text>

          {calendarEvents.length === 0 ? (
            <Text style={s.noEvents}>No events on this day</Text>
          ) : (
            <FlatList
              data={calendarEvents}
              keyExtractor={(i) => String(i.id ?? i.event_id)}
              renderItem={renderCalendarEvent}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 100,
                gap: 10,
              }}
              scrollEnabled={false}
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  header: {
    backgroundColor: T.teal,
    paddingHorizontal: 16,
    paddingTop: STATUSBAR_H + 16,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  orgLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  pageTitle: { fontSize: 28, fontWeight: "900", color: "#fff", marginTop: 4 },
  yearBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
  },
  yearBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  tabToggle: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    flexDirection: "row",
    padding: 3,
  },
  tabToggleBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
  tabToggleBtnActive: { backgroundColor: "#fff" },
  tabToggleText: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    fontSize: 13,
  },
  tabToggleTextActive: { color: T.teal, fontWeight: "700" },

  welcomeBox: {
    margin: 16,
    backgroundColor: T.tealBg,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: T.teal,
  },
  welcomeText: { color: "#333", fontSize: 14, lineHeight: 20 },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: {
    color: T.text,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    textAlign: "center",
  },

  card: {
    backgroundColor: T.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: T.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardBar: { height: 4 },
  cardInner: { padding: 16 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  dateText: { fontSize: 11, color: T.textSub },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: T.text,
    marginBottom: 4,
  },
  cardDesc: { fontSize: 13, color: T.textSub, lineHeight: 19, marginBottom: 8 },
  cardLoc: { fontSize: 13, color: T.teal, fontWeight: "500" },

  calendar: {
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: T.border,
    marginTop: 8,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 10,
    flexWrap: "wrap",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: T.textSub, fontSize: 12 },
  sectionTitle: {
    color: T.teal,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  noEvents: {
    color: T.muted,
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
  },
  calCard: {
    backgroundColor: T.card,
    borderRadius: 12,
    overflow: "hidden",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: T.border,
  },
  calCardBar: { width: 4 },
  calCardContent: { flex: 1, padding: 12 },
  calCardTitle: {
    color: T.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 4,
  },
  calCardLoc: { color: T.textSub, fontSize: 12 },
});
