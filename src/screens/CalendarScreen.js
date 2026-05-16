// src/screens/CalendarScreen.js
import { useEffect, useState } from "react";
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
import { getEvents } from "../../backend/eventsService";
import { COLORS } from "../data/mockData.js";

export default function CalendarScreen({ onEventPress }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const load = async () => {
      const data = await getEvents();
      setEvents(data);
    };
    load();
  }, []);

  const getGroupColor = (groupName) => {
    if (groupName === "All Groups") return COLORS.teal;
    if (groupName === "Year 1") return COLORS.yellow;
    if (groupName === "Year 2") return COLORS.red;
    if (groupName === "Year 3") return "#8b5cf6";
    return COLORS.charcoal;
  };

  //  :
  const markedDates = {};
  events.forEach((event) => {
    const date = event.date.split("T")[0]; //
    const color = getGroupColor(event.group_name);

    if (markedDates[date]) {
      markedDates[date].dots.push({ color });
    } else {
      markedDates[date] = {
        dots: [{ color }],
        selected: selectedDate === date,
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

  //  :
  const selectedEvents = selectedDate
    ? events.filter((e) => e.date.split("T")[0] === selectedDate)
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
        <Text style={styles.cardLocation}> {item.location}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      <View style={styles.header}>
        <Text style={styles.headerSub}>Jerusalem Youth Chorus</Text>
        <Text style={styles.headerTitle}>Calendar</Text>
      </View>

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

      <View style={styles.legend}>
        {[
          { label: "All Groups", color: COLORS.teal },
          { label: "Year 1", color: COLORS.yellow },
          { label: "Year 2", color: COLORS.red },
          { label: "Year 3", color: "#8b5cf6" },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
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
  calendar: { marginHorizontal: 12, borderRadius: 16, overflow: "hidden" },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 10,
    flexWrap: "wrap",
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
  cardLocation: { color: "#888", fontSize: 12 },
});
