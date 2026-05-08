// src/screens/EventsScreen.js

import React, { useState } from "react";
import {
    FlatList,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { COLORS, events } from "../data/mockData";

export default function EventsScreen({ onEventPress }) {
  const [selectedGroup, setSelectedGroup] = useState("All");

  const groups = ["All", "All Groups", "Year 1", "Year 2", "Year 3"];

  const filteredEvents =
    selectedGroup === "All"
      ? events
      : events.filter((e) => e.group_name === selectedGroup);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const getGroupColor = (groupName) => {
    if (groupName === "All Groups") return COLORS.teal;
    if (groupName === "Year 1") return COLORS.yellow;
    if (groupName === "Year 2") return COLORS.red;
    if (groupName === "Year 3") return "#8b5cf6";
    return COLORS.charcoal;
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
          <Text style={styles.cardIcon}>📅</Text>
          <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
          <Text style={styles.cardIcon}> 📍</Text>
          <Text style={styles.cardLocation} numberOfLines={1}>
            {item.location}
          </Text>
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
        <Text style={styles.headerTitle}>Events</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={groups}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterTab,
                selectedGroup === item && styles.filterTabActive,
              ]}
              onPress={() => setSelectedGroup(item)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedGroup === item && styles.filterTabTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Events Count */}
      <Text style={styles.eventsCount}>
        {filteredEvents.length} upcoming event
        {filteredEvents.length !== 1 ? "s" : ""}
      </Text>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.event_id.toString()}
        renderItem={renderEvent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerSub: {
    color: COLORS.teal,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: "800",
    marginTop: 2,
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.charcoal,
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  filterTabText: {
    color: "#999",
    fontSize: 13,
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: COLORS.white,
    fontWeight: "700",
  },
  eventsCount: {
    color: "#666",
    fontSize: 13,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: COLORS.charcoal,
    borderRadius: 16,
    marginBottom: 14,
    flexDirection: "row",
    overflow: "hidden",
  },
  cardAccent: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  groupBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  groupBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "700",
  },
  cardTime: {
    color: "#aaa",
    fontSize: 13,
    fontWeight: "500",
  },
  cardTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardDescription: {
    color: "#aaa",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardIcon: {
    fontSize: 12,
  },
  cardDate: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  cardLocation: {
    color: "#888",
    fontSize: 12,
    marginLeft: 4,
    flex: 1,
  },
});
