// src/screens/CalendarScreen.js
import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getEvents } from "../../backend/eventsService";

const COLORS = {
  teal: "#039899",
  yellow: "#cfad5d",
  red: "#c56451",
  purple: "#8b5cf6",
  purpleDark: "#a855f7",
  white: "#ffffff",
  bg: "#f5fafe",
  text: "#1a1a2e",
  textSub: "#5a6a7a",
  muted: "#9aa8b4",
  border: "#e8eef2",
};

export default function CalendarScreen({ onEventPress }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const load = async () => {
      const data = await getEvents();
      setEvents(data);
    };
    load();
  }, []);

  const getGroupColor = (groupName) => {
    if (groupName === "All Groups" || groupName === "all") return COLORS.teal;
    if (groupName === "Year 1" || groupName === "year1") return COLORS.yellow;
    if (groupName === "Year 2" || groupName === "year2") return COLORS.red;
    if (groupName === "Year 3" || groupName === "year3") return COLORS.purple;
    if (groupName === "Year 4" || groupName === "year4")
      return COLORS.purpleDark;
    return "#888";
  };

  const eventsByDate = {};
  events.forEach((event) => {
    const date = (event.date || "").split("T")[0];
    if (!date) return;
    if (!eventsByDate[date]) {
      eventsByDate[date] = [];
    }
    eventsByDate[date].push(event);
  });

  // Hybrid core groups + dynamic fallback
  const baseGroups = ["All Groups", "Year 1", "Year 2", "Year 3", "Year 4"];
  const eventGroups = events
    .map((e) => {
      return (
        e.groupLabel ||
        e.group_name ||
        (e.group === "all" ? "All Groups" : e.group)
      );
    })
    .filter(Boolean);

  const finalLegendGroups = Array.from(
    new Set([...baseGroups, ...eventGroups]),
  ).sort((a, b) => {
    if (a === "All Groups") return -1;
    if (b === "All Groups") return 1;
    return a.localeCompare(b, undefined, { numeric: true });
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

  const selectedEvents = selectedDate
    ? events.filter((e) => (e.date || "").split("T")[0] === selectedDate)
    : events;

  const renderEvent = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onEventPress && onEventPress(item)}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.cardAccent,
          {
            backgroundColor: getGroupColor(
              item.groupLabel || item.group || item.group_name,
            ),
          },
        ]}
      />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.groupBadge,
              {
                backgroundColor:
                  getGroupColor(
                    item.groupLabel || item.group || item.group_name,
                  ) + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.groupBadgeText,
                {
                  color: getGroupColor(
                    item.groupLabel || item.group || item.group_name,
                  ),
                },
              ]}
            >
              {item.groupLabel ||
                item.group_name ||
                (item.group === "all" ? "All Groups" : item.group)}
            </Text>
          </View>
          <Text style={styles.cardTime}>{item.time}</Text>
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardLocation}>📍 {item.location}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.teal} />

      {/* Header - Dashboard Style */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerSub}>🎵 Jerusalem Youth Chorus</Text>
          <Text style={styles.headerTitle}>Events</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Custom Calendar Grid */}
        <View style={styles.calendarContainer}>
          <View style={styles.monthNavigation}>
            <Pressable onPress={goToPrevMonth} style={styles.monthNavBtn}>
              <Text style={styles.monthNavBtnText}>←</Text>
            </Pressable>
            <Text style={styles.monthTitle}>
              {monthNames[currentMonth]} {currentYear}
            </Text>
            <Pressable onPress={goToNextMonth} style={styles.monthNavBtn}>
              <Text style={styles.monthNavBtnText}>→</Text>
            </Pressable>
          </View>

          {/* Week days header */}
          <View style={styles.weekHeader}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <Text key={day} style={styles.weekDay}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, idx) => {
              const dateStr = day
                ? `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                : null;
              const hasEvent = dateStr && eventsByDate[dateStr];
              const eventColor = hasEvent
                ? getGroupColor(
                    eventsByDate[dateStr][0]?.groupLabel ||
                      eventsByDate[dateStr][0]?.group ||
                      eventsByDate[dateStr][0]?.group_name,
                  )
                : null;
              const isSelected = dateStr === selectedDate;

              return (
                <Pressable
                  key={idx}
                  style={[
                    styles.calendarDay,
                    hasEvent && { borderColor: eventColor, borderWidth: 2 },
                    isSelected && styles.calendarDaySelected,
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
                          styles.calendarDayNum,
                          isSelected && { color: COLORS.white },
                        ]}
                      >
                        {day}
                      </Text>
                      {hasEvent && (
                        <Text
                          style={[
                            styles.calendarEventName,
                            { color: eventColor },
                          ]}
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
        <View style={styles.legend}>
          {finalLegendGroups.map((groupLabel) => (
            <View key={groupLabel} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: getGroupColor(groupLabel) },
                ]}
              />
              <Text style={styles.legendText}>{groupLabel}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>
          {selectedDate ? `Events on ${selectedDate}` : "All Upcoming Events"}
        </Text>

        {selectedEvents.length === 0 ? (
          <Text style={styles.noEvents}>No events on this day</Text>
        ) : (
          <FlatList
            data={selectedEvents}
            keyExtractor={(item) => String(item.id ?? item.event_id)}
            renderItem={renderEvent}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerContent: {},
  headerSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 4,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: "800",
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  calendarContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
  },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  monthNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#f0fafa",
    alignItems: "center",
    justifyContent: "center",
  },
  monthNavBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.teal,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    color: COLORS.textSub,
    fontSize: 12,
    fontWeight: "600",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 16,
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  calendarDaySelected: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  calendarDayNum: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  calendarEventName: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexWrap: "wrap",
    backgroundColor: COLORS.white,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: COLORS.textSub, fontSize: 12 },
  sectionTitle: {
    color: COLORS.teal,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 8,
  },
  noEvents: {
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardAccent: { width: 4 },
  cardContent: { flex: 1, padding: 12 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  groupBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  groupBadgeText: { fontSize: 11, fontWeight: "700" },
  cardTime: { color: COLORS.textSub, fontSize: 13 },
  cardTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardLocation: { color: COLORS.textSub, fontSize: 12 },
});
