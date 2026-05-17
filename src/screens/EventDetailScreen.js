// src/screens/EventDetailScreen.js
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, groups } from "../data/mockData";

export default function EventDetailScreen({ route, navigation }) {
  // תיקון: חילוץ האירוע מפרמטרי הניווט
  const { event } = route.params || {};

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: "white", textAlign: "center", marginTop: 50 }}>
          No Event Data Available
        </Text>
      </SafeAreaView>
    );
  }

  const isAll = event.group_ids?.length >= 3;
  const groupName = isAll
    ? "All Groups"
    : groups.find((g) => g.id === event.group_ids?.[0])?.name || "General";

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>← Back to Events</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.badge,
            { backgroundColor: isAll ? COLORS.teal : COLORS.red },
          ]}
        >
          <Text style={styles.badgeText}>{groupName}</Text>
        </View>

        <Text style={styles.title}>{event.title}</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>📅 {event.date}</Text>
          <Text style={styles.infoText}>📍 {event.location}</Text>
        </View>

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{event.description}</Text>

        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => alert(`Joined ${event.title}`)}
        >
          <Text style={styles.registerBtnText}>Register Now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  backButton: { padding: 20 },
  backText: { color: COLORS.teal, fontSize: 16, fontWeight: "bold" },
  content: { padding: 20 },
  badge: {
    alignSelf: "flex-start",
    padding: 6,
    borderRadius: 6,
    marginBottom: 10,
  },
  badgeText: { color: "white", fontWeight: "bold", fontSize: 12 },
  title: { color: "white", fontSize: 26, fontWeight: "800", marginBottom: 20 },
  infoBox: {
    backgroundColor: COLORS.charcoal,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoText: { color: "#ccc", marginBottom: 5, fontSize: 15 },
  sectionTitle: {
    color: COLORS.teal,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  description: { color: "#aaa", lineHeight: 22, fontSize: 16 },
  registerBtn: {
    backgroundColor: COLORS.teal,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 30,
  },
  registerBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
