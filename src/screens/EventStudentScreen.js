// src/screens/EventStudentScreen.js
import {
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useEvents } from "../context/EventsContext";
import { COLORS } from "../data/mockData";

export default function EventStudentScreen({
  studentYear = 1,
  studentName = "Student",
  isAdmin = false,
  onEventPress,
}) {
  const { events } = useEvents();

  const myEvents = isAdmin
    ? events
    : events.filter(
        (e) =>
          e.group === "all" ||
          e.group_name === "All Groups" ||
          e.group === `year${studentYear}` ||
          e.group_name === `Year ${studentYear}`,
      );

  const getGroupColor = (groupName) => {
    if (groupName === "All Groups") return COLORS.teal;
    if (groupName === "Year 1") return COLORS.yellow;
    if (groupName === "Year 2") return COLORS.red;
    if (groupName === "Year 3") return "#8b5cf6";
    return "#888";
  };

  const isValidDate = (dateStr) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
  };

  const formatDate = (dateStr) => {
    if (!isValidDate(dateStr)) return dateStr;
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
              { backgroundColor: getGroupColor(item.group_name) + "20" },
            ]}
          >
            <Text
              style={[
                styles.groupBadgeText,
                { color: getGroupColor(item.group_name) },
              ]}
            >
              {item.group_name}
            </Text>
          </View>
          <Text style={styles.cardTime}>{item.time}</Text>
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
          <Text style={styles.cardLocation}>📍 {item.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <Text style={styles.headerSub}>Jerusalem Youth Chorus</Text>
        <Text style={styles.headerTitle}>My Events</Text>
        <View style={styles.headerRow}>
          <View style={styles.yearBadge}>
            <Text style={styles.yearBadgeText}>Year {studentYear}</Text>
          </View>
        </View>
      </View>

      <View style={styles.welcomeBox}>
        <Text style={styles.welcomeText}>
          Hello, {studentName}! You have {myEvents.length} upcoming event
          {myEvents.length !== 1 ? "s" : ""}.
        </Text>
      </View>

      {myEvents.length === 0 ? (
        <Text style={styles.noEvents}>No upcoming events for your group.</Text>
      ) : (
        <FlatList
          data={myEvents}
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
  container: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerSub: {
    color: COLORS.teal,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  headerTitle: { color: "#111", fontSize: 32, fontWeight: "800", marginTop: 2 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  yearBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f0fafa",
    borderWidth: 1,
    borderColor: COLORS.teal,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  yearBadgeText: { color: COLORS.teal, fontSize: 13, fontWeight: "700" },
  welcomeBox: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#f0fafa",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.teal,
  },
  welcomeText: { color: "#333", fontSize: 14, lineHeight: 20 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  noEvents: { color: "#888", textAlign: "center", marginTop: 40, fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 14,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccent: { width: 4 },
  cardContent: { flex: 1, padding: 14 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  groupBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  groupBadgeText: { fontSize: 11, fontWeight: "700" },
  cardTime: { color: "#888", fontSize: 13 },
  cardTitle: {
    color: "#111",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardDescription: {
    color: "#666",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardDate: { color: COLORS.teal, fontSize: 12, fontWeight: "600" },
  cardLocation: { color: "#888", fontSize: 12, flex: 1 },
});
