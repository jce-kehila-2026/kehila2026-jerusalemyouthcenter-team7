// src/screens/StudentCalendarScreen.js

import { useState } from "react";
import {
    FlatList,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { COLORS, events } from "../data/mockData";

export default function StudentCalendarScreen({
  studentYear = 1,
  studentName = "Student",
  onEventPress,
}) {
  const [selectedDate, setSelectedDate] = useState(null);

  // סטודנט רואה רק האירועים של השנה שלו + All Groups
  const myEvents = events.filter(
    (e) =>
      e.group_name === "All Groups" || e.group_name === `Year ${studentYear}`,
  );

  const getGroupColor = (groupName) => {
    if (groupName === "All Groups") return COLORS.teal;
    if (groupName === "Year 1") return COLORS.yellow;
    if (groupName === "Year 2") return COLORS.red;
    if (groupName === "Year 3") return "#8b5cf6";
    return COLORS.charcoal;
  };

  // בנה את האירועים המסומנים לקלנדר
  const markedDates = {};
  myEvents.forEach((event) => {
    const color = getGroupColor(event.group_name);
    if (markedDates[event.date]) {
      markedDates[event.date].dots.push({ color });
    } else {
      markedDates[event.date] = {
        dots: [{ color }],
        selected: selectedDate === event.date,
        selectedColor: COLORS.teal,
      };
    }
  });

  if (selectedDate) {
    markedDates[selectedDate] = {
      ...(markedDates[selectedDate] || {}),
      selected: true,
      selectedColor: COLORS.teal,
    };
  }

  const selectedEvents = selectedDate
    ? myEvents.filter((e) => e.date === selectedDate)
    : myEvents;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const renderEvent = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onEventPress && onEventPress(item)}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.cardAccent,
          { backgroundColor: getGroupColor(item.group_name) },
        ]}
      />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.groupBadge,
              { backgroundColor: getGroupColor(item.group_name) },
            ]}
          >
            <Text style={styles.groupBadgeText}>{item.group_name}</Text>
          </View>
          <Text style={styles.cardTime}>{item.time}</Text>
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>📅 {formatDate(item.date)}</Text>
          <Text style={styles.cardLocation}>📍 {item.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerSub}>Jerusalem Youth Chorus</Text>
        <Text style={styles.headerTitle}>My Calendar</Text>
        <View style={styles.yearBadge}>
          <Text style={styles.yearBadgeText}>📚 Year {studentYear}</Text>
        </View>
      </View>

      {/* Calendar */}
      <Calendar
        markingType="multi-dot"
        markedDates={markedDates}
        onDayPress={(day) => {
          setSelectedDate(
            selectedDate === day.dateString ? null : day.dateString,
          );
        }}
        theme={{
          backgroundColor: COLORS.black,
          calendarBackground: "#111",
          textSectionTitleColor: COLORS.teal,
          selectedDayBackgroundColor: COLORS.teal,
          selectedDayTextColor: COLORS.white,
          todayTextColor: COLORS.yellow,
          dayTextColor: COLORS.white,
          textDisabledColor: "#555",
          dotColor: COLORS.teal,
          monthTextColor: COLORS.white,
          arrowColor: COLORS.teal,
          textMonthFontWeight: "700",
          textDayFontSize: 14,
          textMonthFontSize: 16,
        }}
        style={styles.calendar}
      />

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.teal }]} />
          <Text style={styles.legendText}>All Groups</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              {
                backgroundColor:
                  studentYear === 1
                    ? COLORS.yellow
                    : studentYear === 2
                      ? COLORS.red
                      : "#8b5cf6",
              },
            ]}
          />
          <Text style={styles.legendText}>Year {studentYear}</Text>
        </View>
      </View>

      {/* Section Title */}
      <Text style={styles.sectionTitle}>
        {selectedDate ? `Events on ${selectedDate}` : "All My Upcoming Events"}
      </Text>

      {selectedEvents.length === 0 ? (
        <Text style={styles.noEvents}>No events on this day</Text>
      ) : (
        <FlatList
          data={selectedEvents}
          keyExtractor={(item) => item.event_id.toString()}
          renderItem={renderEvent}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerSub: {
    color: COLORS.teal,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  headerTitle: { color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 2 },
  yearBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.charcoal,
    borderWidth: 1,
    borderColor: COLORS.teal,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  yearBadgeText: { color: COLORS.teal, fontSize: 13, fontWeight: "700" },
  calendar: { marginHorizontal: 12, borderRadius: 16, overflow: "hidden" },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 10,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: "#aaa", fontSize: 12 },
  sectionTitle: {
    color: COLORS.teal,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  noEvents: { color: "#666", textAlign: "center", marginTop: 20, fontSize: 14 },
  listContent: { paddingHorizontal: 20, paddingBottom: 30 },
  card: {
    backgroundColor: COLORS.charcoal,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
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
  groupBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  cardTime: { color: "#aaa", fontSize: 13 },
  cardTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardDescription: {
    color: "#aaa",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardDate: { color: COLORS.teal, fontSize: 12, fontWeight: "600" },
  cardLocation: { color: "#888", fontSize: 12, flex: 1 },
});
