// src/screens/AdminEventsScreen.js

import { useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { COLORS, events as initialEvents } from "../data/mockData";

export default function AdminEventsScreen({ onEventPress }) {
  const [events, setEvents] = useState(initialEvents);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // null = add mode

  // טופס
  const emptyForm = {
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    group_name: "All Groups",
  };
  const [form, setForm] = useState(emptyForm);

  const groupOptions = ["All Groups", "Year 1", "Year 2", "Year 3"];

  const getGroupColor = (groupName) => {
    if (groupName === "All Groups") return COLORS.teal;
    if (groupName === "Year 1") return COLORS.yellow;
    if (groupName === "Year 2") return COLORS.red;
    if (groupName === "Year 3") return "#8b5cf6";
    return COLORS.charcoal;
  };

  // פתח מודל להוספה
  const openAddModal = () => {
    setEditingEvent(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  // פתח מודל לעריכה
  const openEditModal = (event) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      group_name: event.group_name,
    });
    setModalVisible(true);
  };

  // שמור (הוסף או ערוך)
  const handleSave = () => {
    if (!form.title || !form.date || !form.time || !form.location) {
      Alert.alert(
        "Missing Fields",
        "Please fill in Title, Date, Time, and Location.",
      );
      return;
    }

    if (editingEvent) {
      // עדכן אירוע קיים
      setEvents((prev) =>
        prev.map((e) =>
          e.event_id === editingEvent.event_id ? { ...e, ...form } : e,
        ),
      );
    } else {
      // הוסף אירוע חדש
      const newEvent = {
        ...form,
        event_id: Date.now(),
        group_id: null,
      };
      setEvents((prev) => [...prev, newEvent]);
    }

    setModalVisible(false);
    setForm(emptyForm);
  };

  // מחק אירוע
  const handleDelete = (eventId) => {
    Alert.alert("Delete Event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          setEvents((prev) => prev.filter((e) => e.event_id !== eventId)),
      },
    ]);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const renderEvent = ({ item }) => (
    <View style={styles.card}>
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

        {/* Admin Buttons */}
        <View style={styles.adminButtons}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => openEditModal(item)}
          >
            <Text style={styles.editBtnText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.event_id)}
          >
            <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerSub}>Jerusalem Youth Chorus</Text>
        <Text style={styles.headerTitle}>Manage Events</Text>
        <View style={styles.headerRow}>
          <Text style={styles.eventCount}>{events.length} events</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <Text style={styles.addBtnText}>＋ Add Event</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Events List */}
      <FlatList
        data={events}
        keyExtractor={(item) => item.event_id.toString()}
        renderItem={renderEvent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal - Add / Edit */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingEvent ? "✏️ Edit Event" : "＋ Add New Event"}
              </Text>

              {/* Title */}
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Event title"
                placeholderTextColor="#555"
                value={form.title}
                onChangeText={(v) => setForm({ ...form, title: v })}
              />

              {/* Description */}
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Event description"
                placeholderTextColor="#555"
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
                multiline
                numberOfLines={3}
              />

              {/* Date */}
              <Text style={styles.label}>Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-05-20"
                placeholderTextColor="#555"
                value={form.date}
                onChangeText={(v) => setForm({ ...form, date: v })}
              />

              {/* Time */}
              <Text style={styles.label}>Time * (HH:MM)</Text>
              <TextInput
                style={styles.input}
                placeholder="16:00"
                placeholderTextColor="#555"
                value={form.time}
                onChangeText={(v) => setForm({ ...form, time: v })}
              />

              {/* Location */}
              <Text style={styles.label}>Location *</Text>
              <TextInput
                style={styles.input}
                placeholder="Location"
                placeholderTextColor="#555"
                value={form.location}
                onChangeText={(v) => setForm({ ...form, location: v })}
              />

              {/* Group */}
              <Text style={styles.label}>Group</Text>
              <View style={styles.groupSelector}>
                {groupOptions.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.groupOption,
                      {
                        backgroundColor:
                          form.group_name === g
                            ? getGroupColor(g)
                            : COLORS.charcoal,
                        borderColor:
                          form.group_name === g ? getGroupColor(g) : "#444",
                      },
                    ]}
                    onPress={() => setForm({ ...form, group_name: g })}
                  >
                    <Text
                      style={[
                        styles.groupOptionText,
                        { color: form.group_name === g ? "#fff" : "#aaa" },
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>
                    {editingEvent ? "Save Changes" : "Add Event"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  eventCount: { color: "#888", fontSize: 14 },
  addBtn: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  listContent: { paddingHorizontal: 20, paddingBottom: 30 },
  card: {
    backgroundColor: COLORS.charcoal,
    borderRadius: 16,
    marginBottom: 14,
    flexDirection: "row",
    overflow: "hidden",
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
  groupBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  cardTime: { color: "#aaa", fontSize: 13 },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardDescription: {
    color: "#aaa",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  cardFooter: { flexDirection: "row", gap: 10, marginBottom: 12 },
  cardDate: { color: COLORS.teal, fontSize: 12, fontWeight: "600" },
  cardLocation: { color: "#888", fontSize: 12, flex: 1 },
  adminButtons: { flexDirection: "row", gap: 8 },
  editBtn: {
    flex: 1,
    backgroundColor: "#1a3a3a",
    borderWidth: 1,
    borderColor: COLORS.teal,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: "center",
  },
  editBtnText: { color: COLORS.teal, fontSize: 13, fontWeight: "700" },
  deleteBtn: {
    flex: 1,
    backgroundColor: "#3a1a1a",
    borderWidth: 1,
    borderColor: COLORS.red,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: "center",
  },
  deleteBtnText: { color: COLORS.red, fontSize: 13, fontWeight: "700" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 20,
  },
  label: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.charcoal,
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#444",
  },
  inputMultiline: { minHeight: 70, textAlignVertical: "top" },
  groupSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  groupOption: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  groupOptionText: { fontSize: 13, fontWeight: "600" },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
    marginBottom: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.charcoal,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelBtnText: { color: "#aaa", fontSize: 15, fontWeight: "600" },
  saveBtn: {
    flex: 2,
    backgroundColor: COLORS.teal,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
