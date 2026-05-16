// src/screens/EventStudentScreen.js

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
import { Calendar } from "react-native-calendars";
import { useEvents } from "../context/EventsContext";
import { COLORS } from "../data/mockData";

export default function EventStudentScreen({
  studentYear = 1,
  studentName = "Student",
  isAdmin = false,
  onEventPress,
}) {
  const [activeTab, setActiveTab] = useState("list");
  const [selectedDate, setSelectedDate] = useState(null);
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [dateError, setDateError] = useState("");
  const [timeError, setTimeError] = useState("");

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

  const myEvents = isAdmin
    ? events
    : events.filter(
        (e) =>
          e.group_name === "All Groups" ||
          e.group_name === `Year ${studentYear}`,
      );

  const getGroupColor = (groupName) => {
    if (groupName === "All Groups") return COLORS.teal;
    if (groupName === "Year 1") return COLORS.yellow;
    if (groupName === "Year 2") return COLORS.red;
    if (groupName === "Year 3") return "#8b5cf6";
    return COLORS.charcoal;
  };

  const isValidDate = (dateStr) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
  };

  const isValidTime = (timeStr) => {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(timeStr);
  };

  const formatDate = (dateStr) => {
    if (!isValidDate(dateStr)) return "Invalid Date";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const openAddModal = () => {
    setEditingEvent(null);
    setForm(emptyForm);
    setDateError("");
    setTimeError("");
    setModalVisible(true);
  };

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
    setDateError("");
    setTimeError("");
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!form.title || !form.date || !form.time || !form.location) {
      Alert.alert(
        "Missing Fields",
        "Please fill Title, Date, Time and Location.",
      );
      return;
    }
    if (!isValidDate(form.date)) {
      setDateError("Invalid date! Use format: YYYY-MM-DD (e.g. 2026-05-20)");
      return;
    } else {
      setDateError("");
    }
    if (!isValidTime(form.time)) {
      setTimeError("Invalid time! Use format: HH:MM (e.g. 16:00)");
      return;
    } else {
      setTimeError("");
    }

    if (editingEvent) {
      updateEvent({ ...editingEvent, ...form });
    } else {
      addEvent(form);
    }
    setModalVisible(false);
    setForm(emptyForm);
    setDateError("");
    setTimeError("");
  };

  const handleDelete = (eventId) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      deleteEvent(eventId);
    }
  };

  // Calendar marked dates
  const markedDates = {};
  myEvents.forEach((event) => {
    if (!isValidDate(event.date)) return;
    const color = getGroupColor(event.group_name);
    if (markedDates[event.date]) {
      markedDates[event.date].dots.push({ color });
    } else {
      markedDates[event.date] = { dots: [{ color }] };
    }
  });
  if (selectedDate) {
    markedDates[selectedDate] = {
      ...(markedDates[selectedDate] || {}),
      selected: true,
      selectedColor: COLORS.teal,
    };
  }

  const calendarEvents = selectedDate
    ? myEvents.filter((e) => e.date === selectedDate)
    : myEvents;

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
          <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
          <Text style={styles.cardLocation}>{item.location}</Text>
        </View>
        {isAdmin && (
          <View style={styles.adminButtons}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => openEditModal(item)}
            >
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item.event_id)}
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      <View style={styles.header}>
        <Text style={styles.headerSub}>Jerusalem Youth Chorus</Text>
        <Text style={styles.headerTitle}>
          {isAdmin ? "Manage Events" : "My Events"}
        </Text>
        <View style={styles.headerRow}>
          {!isAdmin && (
            <View style={styles.yearBadge}>
              <Text style={styles.yearBadgeText}>Year {studentYear}</Text>
            </View>
          )}
          {isAdmin && (
            <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
              <Text style={styles.addBtnText}>+ Add Event</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!isAdmin && (
        <View style={styles.welcomeBox}>
          <Text style={styles.welcomeText}>
            Hello, {studentName}! You have {myEvents.length} upcoming event
            {myEvents.length !== 1 ? "s" : ""}.
          </Text>
        </View>
      )}

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "list" && styles.tabBtnActive]}
          onPress={() => setActiveTab("list")}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === "list" && styles.tabBtnTextActive,
            ]}
          >
            List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === "calendar" && styles.tabBtnActive,
          ]}
          onPress={() => setActiveTab("calendar")}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === "calendar" && styles.tabBtnTextActive,
            ]}
          >
            Calendar
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "list" ? (
        myEvents.length === 0 ? (
          <Text style={styles.noEvents}>
            No upcoming events for your group.
          </Text>
        ) : (
          <FlatList
            data={myEvents}
            keyExtractor={(item) => String(item.id ?? item.event_id)}
            renderItem={renderEvent}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Calendar
            key={JSON.stringify(markedDates)}
            markingType="multi-dot"
            markedDates={markedDates}
            onDayPress={(day) =>
              setSelectedDate(
                selectedDate === day.dateString ? null : day.dateString,
              )
            }
            theme={{
              backgroundColor: COLORS.black,
              calendarBackground: "#111",
              textSectionTitleColor: COLORS.teal,
              selectedDayBackgroundColor: COLORS.teal,
              selectedDayTextColor: "#fff",
              todayTextColor: COLORS.yellow,
              dayTextColor: "#fff",
              textDisabledColor: "#555",
              monthTextColor: "#fff",
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
                <View
                  style={[styles.legendDot, { backgroundColor: item.color }]}
                />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>
            {selectedDate ? `Events on ${selectedDate}` : "All Upcoming Events"}
          </Text>

          {calendarEvents.length === 0 ? (
            <Text style={styles.noEvents}>No events on this day</Text>
          ) : (
            calendarEvents.map((item) => (
              <View key={item.event_id} style={{ paddingHorizontal: 20 }}>
                {renderEvent({ item })}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {isAdmin && (
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>
                  {editingEvent ? "Edit Event" : "+ Add New Event"}
                </Text>

                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Event title"
                  placeholderTextColor="#555"
                  value={form.title}
                  onChangeText={(v) => setForm({ ...form, title: v })}
                />

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

                <Text style={styles.label}>Date * (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.input, dateError ? styles.inputError : null]}
                  placeholder="2026-05-20"
                  placeholderTextColor="#555"
                  value={form.date}
                  onChangeText={(v) => {
                    setForm({ ...form, date: v });
                    setDateError("");
                  }}
                />
                {dateError ? (
                  <Text style={styles.errorText}>{dateError}</Text>
                ) : null}

                <Text style={styles.label}>Time * (HH:MM)</Text>
                <TextInput
                  style={[styles.input, timeError ? styles.inputError : null]}
                  placeholder="16:00"
                  placeholderTextColor="#555"
                  value={form.time}
                  onChangeText={(v) => {
                    setForm({ ...form, time: v });
                    setTimeError("");
                  }}
                />
                {timeError ? (
                  <Text style={styles.errorText}>{timeError}</Text>
                ) : null}

                <Text style={styles.label}>Location * (Israel)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Jerusalem, Tel Aviv, Haifa..."
                  placeholderTextColor="#555"
                  value={form.location}
                  onChangeText={(v) => setForm({ ...form, location: v })}
                />

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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  yearBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.charcoal,
    borderWidth: 1,
    borderColor: COLORS.teal,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  yearBadgeText: { color: COLORS.teal, fontSize: 13, fontWeight: "700" },
  addBtn: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  welcomeBox: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.teal,
  },
  welcomeText: { color: "#ccc", fontSize: 14, lineHeight: 20 },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: COLORS.charcoal,
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: COLORS.teal },
  tabBtnText: { color: "#888", fontSize: 14, fontWeight: "600" },
  tabBtnTextActive: { color: "#fff" },
  listContent: { paddingHorizontal: 20, paddingBottom: 10 },
  noEvents: { color: "#666", textAlign: "center", marginTop: 40, fontSize: 14 },
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
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  cardDate: { color: COLORS.teal, fontSize: 12, fontWeight: "600" },
  cardLocation: { color: "#888", fontSize: 12, flex: 1 },
  adminButtons: { flexDirection: "row", gap: 8, marginTop: 8 },
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
    marginTop: 4,
  },
  inputError: { borderColor: COLORS.red },
  errorText: { color: COLORS.red, fontSize: 12, marginTop: 4, marginBottom: 4 },
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
