// src/screens/EventDetailScreen.js

import { useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { COLORS } from "../data/mockData";
import { getGroupColor } from "../utils/eventUtils";

export default function EventDetailScreen({ event, navigation }) {
  const [registered, setRegistered] = useState(false);

  const currentEvent = event || {
    event_id: 1,
    title: "Workshop — Voice Training",
    description:
      "Weekly voice training session with all groups. Please bring your music booklet and water bottle.",
    date: "2026-05-10",
    time: "16:00",
    location: "Jerusalem Youth Center — Hall A",
    group_name: "Year 1",
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);

    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation?.goBack?.()}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Top color bar */}
        <View
          style={[
            styles.topBar,
            {
              backgroundColor: getGroupColor(currentEvent.group_name),
            },
          ]}
        />

        <View style={styles.content}>
          {/* Group Badge */}
          <View
            style={[
              styles.groupBadge,
              {
                backgroundColor: getGroupColor(currentEvent.group_name),
              },
            ]}
          >
            <Text style={styles.groupBadgeText}>{currentEvent.group_name}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{currentEvent.title}</Text>

          {/* Info Cards */}
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>📅</Text>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>
                {formatDate(currentEvent.date)}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>🕐</Text>
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>{currentEvent.time}</Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.locationCard}>
            <Text style={styles.infoIcon}>📍</Text>

            <View>
              <Text style={styles.infoLabel}>Location</Text>

              <Text style={styles.infoValue}>{currentEvent.location}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>

            <Text style={styles.description}>{currentEvent.description}</Text>
          </View>

          {/* Reminder */}
          <View style={styles.reminderBox}>
            <Text style={styles.reminderIcon}>🔔</Text>

            <Text style={styles.reminderText}>
              You will receive a reminder notification before this event.
            </Text>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[
              styles.registerButton,
              registered && styles.registeredButton,
            ]}
            onPress={() => setRegistered(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.registerButtonText}>
              {registered ? "Registered" : "Register"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },

  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  backText: {
    color: COLORS.teal,
    fontSize: 16,
    fontWeight: "600",
  },

  topBar: {
    height: 6,
    marginHorizontal: 20,
    borderRadius: 3,
    marginBottom: 20,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  groupBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 12,
  },

  groupBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },

  title: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 20,
    lineHeight: 32,
  },

  infoRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },

  infoCard: {
    flex: 1,
    backgroundColor: COLORS.charcoal,
    borderRadius: 14,
    padding: 14,
  },

  locationCard: {
    backgroundColor: COLORS.charcoal,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },

  infoIcon: {
    fontSize: 20,
    marginBottom: 6,
  },

  infoLabel: {
    color: "#888",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },

  infoValue: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },

  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    color: COLORS.teal,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  description: {
    color: "#ccc",
    fontSize: 15,
    lineHeight: 24,
  },

  reminderBox: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: COLORS.teal,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  reminderIcon: {
    fontSize: 22,
  },

  reminderText: {
    color: "#aaa",
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },

  registerButton: {
    backgroundColor: COLORS.teal,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
  },

  registeredButton: {
    backgroundColor: "#444",
  },

  registerButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
