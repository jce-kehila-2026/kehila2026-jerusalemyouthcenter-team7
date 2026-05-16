import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  addEvent,
  deleteEvent,
  getEvents,
  updateEvent,
} from "../../backend/eventsService";
import { COLORS } from "../../src/data/mockData";

const BADGE = {
  all: { bg: COLORS.teal + "25", text: COLORS.teal },
  year1: { bg: COLORS.yellow + "30", text: COLORS.yellow },
  year2: { bg: COLORS.red + "25", text: COLORS.red },
  year3: { bg: "#88888830", text: "#aaa" },
};

const FILTERS = [
  { key: "all_events", label: "All" },
  { key: "year1", label: "Year 1" },
  { key: "year2", label: "Year 2" },
  { key: "year3", label: "Year 3" },
  { key: "all", label: "All Groups" },
];

const emptyForm = {
  title: "",
  description: "",
  date: "",
  time: "",
  location: "",
  group: "all",
  groupLabel: "All Groups",
};
const emptyErrors = { title: "", date: "", time: "", location: "" };

const STATUSBAR_H =
  Platform.OS === "android"
    ? (StatusBar.currentHeight ?? 24)
    : Platform.OS === "ios"
      ? 44
      : 0;

const ISRAEL_KEYWORDS = [
  "jerusalem",
  "tel aviv",
  "haifa",
  "beer sheva",
  "netanya",
  "rishon",
  "petah tikva",
  "ashdod",
  "ashkelon",
  "rehovot",
  "holon",
  "bnei brak",
  "ramat gan",
  "bat yam",
  "herzliya",
  "kfar saba",
  "modiin",
  "nazareth",
  "eilat",
  "tiberias",
  "acre",
  "akko",
  "lod",
  "ramla",
  "nahariya",
  "community center",
  "room",
  "hall",
  "theater",
  "auditorium",
  "school",
  "synagogue",
  "בית",
  "אולם",
  "חדר",
  "בית ספר",
  "ירושלים",
  "תל אביב",
  "חיפה",
  "באר שבע",
  "נתניה",
  "אשדוד",
  "אשקלון",
  "רחובות",
  "הרצליה",
  "jaffa",
  "yafo",
  "yaffo",
  "givat",
  "ramat",
  "kiryat",
  "kfar",
  "moshav",
  "kibbutz",
  "emek",
  "valley",
  "mount",
  "har",
  "gate",
  "plaza",
  "park",
];

const validateForm = (values) => {
  const errors = { title: "", date: "", time: "", location: "" };
  let valid = true;

  if (!values.title.trim()) {
    errors.title = "Title is required.";
    valid = false;
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!values.date.trim()) {
    errors.date = "Date is required.";
    valid = false;
  } else if (!dateRegex.test(values.date)) {
    errors.date = "Date must be in format YYYY-MM-DD (e.g. 2026-05-15)";
    valid = false;
  } else {
    const d = new Date(values.date);
    if (isNaN(d.getTime())) {
      errors.date = "This is not a valid date.";
      valid = false;
    }
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!values.time.trim()) {
    errors.time = "Time is required.";
    valid = false;
  } else if (!timeRegex.test(values.time)) {
    errors.time = "Time must be in format HH:MM (e.g. 18:00)";
    valid = false;
  }

  if (!values.location.trim()) {
    errors.location = "Location is required.";
    valid = false;
  } else {
    const loc = values.location.toLowerCase();
    const isIsrael = ISRAEL_KEYWORDS.some((k) => loc.includes(k));
    if (!isIsrael) {
      errors.location = "Location must be inside Israel.";
      valid = false;
    }
  }

  return { errors, valid };
};

export default function EventsScreen() {
  const router = useRouter();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setFilter] = useState("all_events");
  const [editVisible, setEditVisible] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState(emptyErrors);
  const [addVisible, setAddVisible] = useState(false);
  const [newForm, setNewForm] = useState(emptyForm);
  const [newErrors, setNewErrors] = useState(emptyErrors);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── טעינת אירועים מ-Firebase ──────────────────────────────────────────
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await getEvents();
        setEvents(data);
      } catch (error) {
        console.error("Error loading events:", error);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  const filtered =
    activeFilter === "all_events"
      ? events
      : events.filter((e) => e.group === activeFilter);

  // ── Delete ─────────────────────────────────────────────────────────────
  const doDelete = async () => {
    try {
      await deleteEvent(deleteTarget.id);
      setEvents((p) => p.filter((e) => e.id !== deleteTarget.id));
    } catch (error) {
      console.error("Error deleting:", error);
    }
    setDeleteTarget(null);
  };

  // ── Edit ───────────────────────────────────────────────────────────────
  const openEdit = (item) => {
    setEditTarget(item);
    setForm({
      title: item.title,
      description: item.description,
      date: item.date,
      time: item.time || "",
      location: item.location,
      group: item.group,
      groupLabel: item.groupLabel,
    });
    setFormErrors(emptyErrors);
    setEditVisible(true);
  };

  const saveEdit = async () => {
    const { errors, valid } = validateForm(form);
    setFormErrors(errors);
    if (!valid) return;
    try {
      await updateEvent(editTarget.id, form);
      setEvents((p) =>
        p.map((e) => (e.id === editTarget.id ? { ...e, ...form } : e)),
      );
    } catch (error) {
      console.error("Error updating:", error);
    }
    setEditVisible(false);
  };

  // ── Add ────────────────────────────────────────────────────────────────
  const saveNew = async () => {
    const { errors, valid } = validateForm(newForm);
    setNewErrors(errors);
    if (!valid) return;
    try {
      const newEvent = await addEvent({
        ...newForm,
        groupLabel:
          FILTERS.find((f) => f.key === newForm.group)?.label || "All Groups",
      });
      if (newEvent) setEvents((p) => [newEvent, ...p]);
    } catch (error) {
      console.error("Error adding:", error);
    }
    setAddVisible(false);
    setNewForm(emptyForm);
    setNewErrors(emptyErrors);
  };

  // ── Navigation ─────────────────────────────────────────────────────────
  const goToDetail = (item) => {
    router.push({
      pathname: "/event-detail",
      params: {
        eventId: item.id,
        title: item.title,
        description: item.description,
        date: item.date,
        time: item.time || "",
        location: item.location,
        group: item.groupLabel,
      },
    });
  };

  const goToAttendance = (item) => {
    router.push({
      pathname: "/attendance",
      params: { eventId: item.id, eventTitle: item.title },
    });
  };

  // ── Form fields ────────────────────────────────────────────────────────
  const FormFields = ({ values, setValues, errors }) => (
    <ScrollView keyboardShouldPersistTaps="handled">
      <View style={{ marginBottom: 14 }}>
        <Text style={s.label}>Title</Text>
        <TextInput
          style={[s.input, errors.title && s.inputError]}
          value={values.title}
          onChangeText={(v) => setValues((p) => ({ ...p, title: v }))}
          placeholder="Enter title"
          placeholderTextColor="#555"
        />
        {errors.title ? <Text style={s.errorText}>{errors.title}</Text> : null}
      </View>

      <View style={{ marginBottom: 14 }}>
        <Text style={s.label}>Description</Text>
        <TextInput
          style={[s.input, { height: 72, textAlignVertical: "top" }]}
          value={values.description}
          onChangeText={(v) => setValues((p) => ({ ...p, description: v }))}
          placeholder="Enter description"
          placeholderTextColor="#555"
          multiline
        />
      </View>

      <View style={{ marginBottom: 14 }}>
        <Text style={s.label}>Location</Text>
        <TextInput
          style={[s.input, errors.location && s.inputError]}
          value={values.location}
          onChangeText={(v) => setValues((p) => ({ ...p, location: v }))}
          placeholder="Enter location in Israel"
          placeholderTextColor="#555"
        />
        {errors.location ? (
          <Text style={s.errorText}>{errors.location}</Text>
        ) : (
          <Text style={s.hintText}>Must be a location inside Israel</Text>
        )}
      </View>

      <View style={{ marginBottom: 14 }}>
        <Text style={s.label}>Date</Text>
        <TextInput
          style={[s.input, errors.date && s.inputError]}
          value={values.date}
          onChangeText={(v) => setValues((p) => ({ ...p, date: v }))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#555"
        />
        {errors.date ? (
          <Text style={s.errorText}>{errors.date}</Text>
        ) : (
          <Text style={s.hintText}>Format: YYYY-MM-DD — e.g. 2026-05-15</Text>
        )}
      </View>

      <View style={{ marginBottom: 14 }}>
        <Text style={s.label}>Time</Text>
        <TextInput
          style={[s.input, errors.time && s.inputError]}
          value={values.time}
          onChangeText={(v) => setValues((p) => ({ ...p, time: v }))}
          placeholder="HH:MM"
          placeholderTextColor="#555"
        />
        {errors.time ? (
          <Text style={s.errorText}>{errors.time}</Text>
        ) : (
          <Text style={s.hintText}>Format: HH:MM — e.g. 18:00 (24h)</Text>
        )}
      </View>

      <Text style={s.label}>Group</Text>
      <View style={s.groupRow}>
        {FILTERS.slice(1).map((f) => (
          <Pressable
            key={f.key}
            style={[s.groupPill, values.group === f.key && s.groupPillActive]}
            onPress={() =>
              setValues((p) => ({ ...p, group: f.key, groupLabel: f.label }))
            }
          >
            <Text
              style={[
                s.groupPillText,
                values.group === f.key && { color: COLORS.black },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );

  // ── Event card ─────────────────────────────────────────────────────────
  const renderEvent = ({ item }) => {
    const badge = BADGE[item.group] || BADGE.all;
    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <View style={[s.badge, { backgroundColor: badge.bg }]}>
            <Text style={[s.badgeText, { color: badge.text }]}>
              {item.groupLabel}
            </Text>
          </View>
          <Text style={s.dateText}>
            📅 {item.date} {item.time}
          </Text>
        </View>
        <Pressable onPress={() => goToDetail(item)}>
          <Text style={s.cardTitle}>{item.title}</Text>
          <Text style={s.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={s.cardLoc}>📍 {item.location}</Text>
        </Pressable>
        <View style={s.btnRow}>
          <Pressable
            style={({ pressed }) => [
              s.btn,
              { backgroundColor: pressed ? "#027b7c" : COLORS.teal },
            ]}
            onPress={() => openEdit(item)}
          >
            <Text style={s.btnDark}>Edit</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              s.btn,
              { backgroundColor: pressed ? "#b8943f" : COLORS.yellow },
            ]}
            onPress={() => goToAttendance(item)}
          >
            <Text style={s.btnDark}>Attendance</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              s.btn,
              { backgroundColor: pressed ? "#a34e3e" : COLORS.red },
            ]}
            onPress={() => setDeleteTarget(item)}
          >
            <Text style={s.btnLight}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      <View style={s.header}>
        <Text style={s.orgName}>Jerusalem Youth Chorus</Text>
        <Text style={s.pageTitle}>Events</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filtersWrap}
        contentContainerStyle={s.filtersContent}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[s.filterBtn, activeFilter === f.key && s.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                s.filterText,
                activeFilter === f.key && s.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.empty}>
          <ActivityIndicator color={COLORS.teal} size="large" />
          <Text style={[s.emptyText, { marginTop: 12 }]}>
            Loading events...
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No events found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderEvent}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Pressable
        style={s.fab}
        onPress={() => {
          setNewForm(emptyForm);
          setNewErrors(emptyErrors);
          setAddVisible(true);
        }}
      >
        <Text
          style={{
            fontSize: 28,
            color: COLORS.black,
            lineHeight: 32,
            fontWeight: "300",
          }}
        >
          +
        </Text>
      </Pressable>

      {/* DELETE MODAL */}
      <Modal
        visible={!!deleteTarget}
        animationType="fade"
        transparent
        statusBarTranslucent
      >
        <View style={s.overlayCenter}>
          <View style={s.confirmBox}>
            <Text style={s.confirmTitle}>Delete Event</Text>
            <Text style={s.confirmMsg}>
              Are you sure you want to delete{"\n"}
              <Text style={{ color: COLORS.white, fontWeight: "700" }}>
                "{deleteTarget?.title}"
              </Text>
              ?
            </Text>
            <View style={s.btnRow}>
              <Pressable
                style={[s.btn, { flex: 1, backgroundColor: COLORS.charcoal }]}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={s.btnLight}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.btn, { flex: 1, backgroundColor: COLORS.red }]}
                onPress={doDelete}
              >
                <Text style={s.btnLight}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View style={s.overlayBottom}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Edit Event</Text>
            <Pressable
              style={s.modalClose}
              onPress={() => setEditVisible(false)}
            >
              <Text style={{ color: "#888", fontSize: 22 }}>✕</Text>
            </Pressable>
            <FormFields values={form} setValues={setForm} errors={formErrors} />
            <View style={[s.btnRow, { marginTop: 16 }]}>
              <Pressable
                style={[s.btn, { flex: 1, backgroundColor: COLORS.teal }]}
                onPress={saveEdit}
              >
                <Text style={s.btnDark}>Save Changes</Text>
              </Pressable>
              <Pressable
                style={[s.btn, { flex: 1, backgroundColor: COLORS.charcoal }]}
                onPress={() => setEditVisible(false)}
              >
                <Text style={s.btnLight}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD MODAL */}
      <Modal
        visible={addVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View style={s.overlayBottom}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>New Event</Text>
            <Pressable
              style={s.modalClose}
              onPress={() => setAddVisible(false)}
            >
              <Text style={{ color: "#888", fontSize: 22 }}>✕</Text>
            </Pressable>
            <FormFields
              values={newForm}
              setValues={setNewForm}
              errors={newErrors}
            />
            <View style={[s.btnRow, { marginTop: 16 }]}>
              <Pressable
                style={[s.btn, { flex: 1, backgroundColor: COLORS.teal }]}
                onPress={saveNew}
              >
                <Text style={s.btnDark}>Create Event</Text>
              </Pressable>
              <Pressable
                style={[s.btn, { flex: 1, backgroundColor: COLORS.charcoal }]}
                onPress={() => setAddVisible(false)}
              >
                <Text style={s.btnLight}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.black },
  header: {
    paddingHorizontal: 16,
    paddingTop: STATUSBAR_H + 16,
    paddingBottom: 8,
  },
  orgName: { color: COLORS.teal, fontSize: 13, fontWeight: "600" },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.white,
    marginTop: 2,
  },
  filtersWrap: { height: 56 },
  filtersContent: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
    flexDirection: "row",
  },
  filterBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.charcoal,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  filterBtnActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  filterText: { color: "#ccc", fontSize: 14 },
  filterTextActive: { color: COLORS.black, fontWeight: "700" },
  card: {
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  dateText: { fontSize: 12, color: COLORS.muted },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 4,
  },
  cardDesc: { fontSize: 13, color: "#aaa", lineHeight: 19, marginBottom: 8 },
  cardLoc: { fontSize: 13, color: COLORS.teal, marginBottom: 14 },
  btnRow: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDark: { color: COLORS.black, fontWeight: "700", fontSize: 13 },
  btnLight: { color: COLORS.white, fontWeight: "700", fontSize: 13 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: COLORS.muted, fontSize: 16 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    backgroundColor: COLORS.teal,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  overlayCenter: {
    flex: 1,
    backgroundColor: "#000c",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmBox: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  confirmMsg: { color: "#aaa", fontSize: 15, lineHeight: 22, marginBottom: 24 },
  overlayBottom: {
    flex: 1,
    backgroundColor: "#000c",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#111",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 16,
  },
  modalClose: { position: "absolute", top: 24, right: 24 },
  label: { color: "#aaa", fontSize: 13, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.charcoal,
    borderRadius: 8,
    padding: 12,
    color: COLORS.white,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#444",
  },
  inputError: { borderColor: "#e05555", borderWidth: 1.5 },
  errorText: { color: "#e05555", fontSize: 12, marginTop: 4 },
  hintText: { color: "#555", fontSize: 11, marginTop: 4 },
  groupRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  groupPill: {
    borderWidth: 1.5,
    borderColor: COLORS.charcoal,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  groupPillActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  groupPillText: { color: "#ccc", fontSize: 13 },
});
