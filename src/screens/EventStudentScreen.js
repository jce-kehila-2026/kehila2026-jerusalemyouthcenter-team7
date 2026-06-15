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

const sp = (n) => n * 8;

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
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

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
  const eventsByDate = {};
  myEvents.forEach((event) => {
    const date = (event.date || "").split("T")[0];
    if (!date) return;
    if (!eventsByDate[date]) {
      eventsByDate[date] = [];
    }
    eventsByDate[date].push(event);
  });

  // Generate calendar grid
  const calendarDays = [];
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

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
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: sp(1),
            }}
          >
            <View style={{ alignItems: "flex-start" }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: color,
                  marginBottom: 2,
                }}
              >
                {formatDate(item.date).split("/")[0]}
              </Text>
              <Text style={{ fontSize: 12, color: color, fontWeight: "500" }}>
                {formatDate(item.date).split("/").slice(1).join("/")}
              </Text>
            </View>
            <View style={[s.badge, { backgroundColor: color + "18" }]}>
              <Text style={[s.badgeText, { color }]}>
                {item.groupLabel || item.group_name}
              </Text>
            </View>
          </View>
          <Text style={s.calCardTitle}>{item.title}</Text>
          <Text
            style={{ fontSize: 13, color: T.textSub, marginBottom: sp(0.5) }}
          >
            {item.time} · {item.location}
          </Text>
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
        {activeTab === "list" && (
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
        )}
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
            contentContainerStyle={{
              padding: sp(2),
              gap: sp(1.5),
              paddingBottom: 100,
            }}
            showsVerticalScrollIndicator={false}
          />
        ))}

      {/* ── CALENDAR VIEW ── */}
      {activeTab === "calendar" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={s.calendarScroll}
        >
          <View style={s.calendarContainer}>
            <View style={s.monthNavigation}>
              <Pressable onPress={goToPrevMonth} style={s.monthNavBtn}>
                <Text style={s.monthNavBtnText}>←</Text>
              </Pressable>
              <Text style={s.monthTitle}>
                {monthNames[currentMonth]} {currentYear}
              </Text>
              <Pressable onPress={goToNextMonth} style={s.monthNavBtn}>
                <Text style={s.monthNavBtnText}>→</Text>
              </Pressable>
            </View>

            {/* Week day headers */}
            <View style={s.weekHeaderRow}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <Text key={`header-${day}`} style={s.weekDayHeader}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={s.calendarGrid}>
              {/* Calendar days */}
              {calendarDays.map((day, idx) => {
                const dateStr = day
                  ? `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  : null;
                const hasEvent = dateStr && eventsByDate[dateStr];
                const eventColor = hasEvent
                  ? GROUP_COLORS[eventsByDate[dateStr][0]?.groupLabel] || T.teal
                  : null;
                const isSelected = dateStr === selectedDate;

                return (
                  <Pressable
                    key={idx}
                    style={[
                      s.calendarDay,
                      hasEvent && {
                        borderColor: eventColor,
                        borderWidth: 2.5,
                      },
                      isSelected && s.calendarDaySelected,
                    ]}
                    onPress={() => {
                      if (day) {
                        setSelectedDate(isSelected ? null : dateStr);
                      }
                    }}
                  >
                    {day && (
                      <>
                        <Text
                          style={[
                            s.calendarDayNum,
                            isSelected && { color: T.white },
                          ]}
                        >
                          {day}
                        </Text>
                        {hasEvent && (
                          <Text
                            style={[s.calendarEventName, { color: eventColor }]}
                            numberOfLines={1}
                          >
                            {eventsByDate[dateStr][0]?.title}
                          </Text>
                        )}
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

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
                paddingHorizontal: sp(2),
                paddingBottom: 100,
                gap: sp(1.5),
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
    paddingHorizontal: sp(2),
    paddingTop: STATUSBAR_H + sp(2),
    paddingBottom: sp(2),
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
    margin: sp(2),
    backgroundColor: T.tealBg,
    borderRadius: 12,
    padding: sp(1.75),
    borderLeftWidth: 3,
    borderLeftColor: T.teal,
  },
  welcomeText: { color: "#333", fontSize: 14, lineHeight: 20 },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: sp(4),
  },
  emptyText: {
    color: T.text,
    fontSize: 16,
    fontWeight: "600",
    marginTop: sp(1.5),
    textAlign: "center",
  },

  // Event cards (list view)
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
  cardInner: { padding: sp(2) },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: sp(1),
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
  cardDesc: {
    fontSize: 13,
    color: T.textSub,
    lineHeight: 19,
    marginBottom: sp(1),
  },
  cardLoc: { fontSize: 13, color: T.teal, fontWeight: "500" },

  // Calendar view
  calendarScroll: { backgroundColor: T.white },
  calendarContainer: {
    padding: sp(2),
    backgroundColor: T.white,
  },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: sp(2),
  },
  monthNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: T.tealBg,
    alignItems: "center",
    justifyContent: "center",
  },
  monthNavBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: T.teal,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: T.text,
    textAlign: "center",
  },
  weekHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: sp(1),
    paddingHorizontal: 2,
  },
  weekDayHeader: {
    flex: 1,
    textAlign: "center",
    color: T.textSub,
    fontSize: 12,
    fontWeight: "600",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: sp(2),
  },
  calendarDay: {
    width: "13.8%",
    aspectRatio: 0.9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.white,
  },
  calendarDaySelected: {
    backgroundColor: T.teal,
    borderColor: T.teal,
  },
  calendarDayNum: {
    fontSize: 13,
    fontWeight: "600",
    color: T.text,
  },
  calendarEventName: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
    color: T.teal,
  },

  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: sp(2),
    paddingVertical: sp(1.5),
    flexWrap: "wrap",
    backgroundColor: T.white,
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
    paddingHorizontal: sp(2),
    marginBottom: sp(1),
    marginTop: sp(0.5),
  },
  noEvents: {
    color: T.muted,
    textAlign: "center",
    marginTop: sp(2.5),
    fontSize: 14,
  },

  // Calendar event cards
  calCard: {
    backgroundColor: T.card,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: sp(1),
  },
  calCardBar: { height: 4, width: "100%" },
  calCardContent: { padding: sp(1.5) },
  calCardTitle: {
    color: T.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 4,
  },
  calCardLoc: { color: T.textSub, fontSize: 12 },
});
