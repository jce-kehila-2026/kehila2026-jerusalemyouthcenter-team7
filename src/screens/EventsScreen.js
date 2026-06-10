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
import { Calendar } from "react-native-calendars";
import {
  addEvent,
  deleteEvent,
  getEvents,
  updateEvent,
} from "../../backend/eventsService";

// ─── Design System ─────────────────────────────────────────────────────────
const T = {
  teal: "#039899",
  tealDark: "#027a7b",
  tealBg: "#f0fafa",
  red: "#c56451",
  redBg: "#fff1ee",
  yellow: "#cfad5d",
  yellowBg: "#fffbf0",
  white: "#ffffff",
  bg: "#f5fafe",
  card: "#ffffff",
  border: "#e8eef2",
  text: "#1a1a2e",
  textSub: "#5a6a7a",
  muted: "#9aa8b4",
};
const sp = (n) => n * 8;

const BADGE_STYLES = {
  all: { bg: T.tealBg, text: T.teal },
  year1: { bg: T.yellowBg, text: "#9a7b20" },
  year2: { bg: T.redBg, text: T.red },
  year3: { bg: "#f3f0ff", text: "#6b5ce7" },
};

const GROUP_COLORS = {
  "All Groups": T.teal,
  "Year 1": T.yellow,
  "Year 2": T.red,
  "Year 3": "#8b5cf6",
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
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!values.date.trim()) {
    errors.date = "Date is required.";
    valid = false;
  } else if (!dateRegex.test(values.date)) {
    errors.date = "Date must be in format DD/MM/YYYY";
    valid = false;
  } else {
    const [day, month, year] = values.date.split("/");
    if (isNaN(new Date(`${year}-${month}-${day}`).getTime())) {
      errors.date = "Not a valid date.";
      valid = false;
    }
  }
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!values.time.trim()) {
    errors.time = "Time is required.";
    valid = false;
  } else if (!timeRegex.test(values.time)) {
    errors.time = "Time must be in format HH:MM";
    valid = false;
  }
  if (!values.location.trim()) {
    errors.location = "Location is required.";
    valid = false;
  } else if (
    !ISRAEL_KEYWORDS.some((k) => values.location.toLowerCase().includes(k))
  ) {
    errors.location = "Location must be inside Israel.";
    valid = false;
  }
  return { errors, valid };
};

function FormFields({ values, setValues, errors }) {
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      {[
        { key: "title", label: "Title", placeholder: "Enter title" },
        {
          key: "location",
          label: "Location",
          placeholder: "Enter location in Israel",
          hint: "Must be a location inside Israel",
        },
        {
          key: "date",
          label: "Date",
          placeholder: "DD/MM/YYYY",
          hint: "Format: DD/MM/YYYY — e.g. 15/05/2026",
        },
        {
          key: "time",
          label: "Time",
          placeholder: "HH:MM",
          hint: "Format: HH:MM — e.g. 18:00",
        },
      ].map(({ key, label, placeholder, hint }) => (
        <View key={key} style={{ marginBottom: sp(2) }}>
          <Text style={s.label}>{label}</Text>
          <TextInput
            style={[s.input, errors[key] && s.inputError]}
            value={values[key]}
            onChangeText={(v) => setValues((p) => ({ ...p, [key]: v }))}
            placeholder={placeholder}
            placeholderTextColor={T.muted}
          />
          {errors[key] ? (
            <Text style={s.errorText}>{errors[key]}</Text>
          ) : hint ? (
            <Text style={s.hintText}>{hint}</Text>
          ) : null}
        </View>
      ))}
      <View style={{ marginBottom: sp(2) }}>
        <Text style={s.label}>Description</Text>
        <TextInput
          style={[s.input, { height: 80, textAlignVertical: "top" }]}
          value={values.description}
          onChangeText={(v) => setValues((p) => ({ ...p, description: v }))}
          placeholder="Enter description"
          placeholderTextColor={T.muted}
          multiline
        />
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
                values.group === f.key && { color: "#fff" },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list"); // "list" | "calendar"
  const [activeFilter, setFilter] = useState("all_events");
  const [selectedDate, setSelectedDate] = useState(null);
  const [editVisible, setEditVisible] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState(emptyErrors);
  const [addVisible, setAddVisible] = useState(false);
  const [newForm, setNewForm] = useState(emptyForm);
  const [newErrors, setNewErrors] = useState(emptyErrors);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await getEvents();
        setEvents(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  const filtered =
    activeFilter === "all_events"
      ? events
      : activeFilter === "all"
        ? events.filter((e) => e.group === "all")
        : events.filter((e) => e.group === activeFilter || e.group === "all");

  const formatDisplayDate = (date) =>
    date && date.includes("-") ? date.split("-").reverse().join("/") : date;

  // ── Calendar helpers ────────────────────────────────────────────────
  const markedDates = {};
  events.forEach((event) => {
    const date = (event.date || "").split("T")[0];
    if (!date) return;
    const color = GROUP_COLORS[event.groupLabel] || T.teal;
    if (markedDates[date]) {
      markedDates[date].dots.push({ color });
    } else {
      markedDates[date] = { dots: [{ color }] };
    }
  });
  if (selectedDate) {
    markedDates[selectedDate] = {
      ...(markedDates[selectedDate] || {}),
      selected: true,
      selectedColor: T.teal,
    };
  }
  const calendarEvents = selectedDate
    ? events.filter((e) => (e.date || "").split("T")[0] === selectedDate)
    : events;

  // ── CRUD ────────────────────────────────────────────────────────────
  const doDelete = async () => {
    try {
      await deleteEvent(deleteTarget.id);
      setEvents((p) => p.filter((e) => e.id !== deleteTarget.id));
    } catch (e) {
      console.error(e);
    }
    setDeleteTarget(null);
  };

  const openEdit = (item) => {
    setEditTarget(item);
    const dateForDisplay =
      item.date && item.date.includes("-")
        ? item.date.split("-").reverse().join("/")
        : item.date;
    setForm({
      title: item.title,
      description: item.description,
      date: dateForDisplay,
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
      const [day, month, year] = form.date.split("/");
      const isoDate = `${year}-${month}-${day}`;
      const formWithIso = { ...form, date: isoDate };
      await updateEvent(editTarget.id, formWithIso);
      setEvents((p) =>
        p.map((e) => (e.id === editTarget.id ? { ...e, ...formWithIso } : e)),
      );
    } catch (e) {
      console.error(e);
    }
    setEditVisible(false);
  };

  const saveNew = async () => {
    const { errors, valid } = validateForm(newForm);
    setNewErrors(errors);
    if (!valid) return;
    try {
      const [day, month, year] = newForm.date.split("/");
      const isoDate = `${year}-${month}-${day}`;
      const newEvent = await addEvent({
        ...newForm,
        date: isoDate,
        groupLabel:
          FILTERS.find((f) => f.key === newForm.group)?.label || "All Groups",
      });
      if (newEvent) setEvents((p) => [newEvent, ...p]);
    } catch (e) {
      console.error(e);
    }
    setAddVisible(false);
    setNewForm(emptyForm);
    setNewErrors(emptyErrors);
  };

  const goToDetail = (item) =>
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
  const goToAttendance = (item) =>
    router.push({
      pathname: "/attendance",
      params: { eventId: item.id, eventTitle: item.title },
    });

  const renderEventCard = ({ item }) => {
    const badge = BADGE_STYLES[item.group] || BADGE_STYLES.all;
    return (
      <View style={s.card}>
        <View style={[s.cardBar, { backgroundColor: badge.text }]} />
        <View style={s.cardInner}>
          <View style={s.cardTop}>
            <View style={[s.badge, { backgroundColor: badge.bg }]}>
              <Text style={[s.badgeText, { color: badge.text }]}>
                {item.groupLabel}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: sp(1) }}
            >
              <Text style={s.dateText}>
                📅 {formatDisplayDate(item.date)} 🕐 {item.time}
              </Text>
              <Pressable
                style={s.deleteSmall}
                onPress={() => setDeleteTarget(item)}
              >
                <Text style={s.deleteSmallText}>🗑</Text>
              </Pressable>
            </View>
          </View>
          <Pressable onPress={() => goToDetail(item)}>
            <Text style={s.cardTitle}>{item.title}</Text>
            <Text style={s.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={s.cardLoc}>📍 {item.location}</Text>
          </Pressable>
          <View style={s.btnRow}>
            <Pressable style={s.btnEdit} onPress={() => openEdit(item)}>
              <Text style={s.btnEditText}>Edit</Text>
            </Pressable>
            <Pressable
              style={s.btnAttendance}
              onPress={() => goToAttendance(item)}
            >
              <Text style={s.btnAttendanceText}>Attendance</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderCalendarEvent = ({ item }) => {
    const color = GROUP_COLORS[item.groupLabel] || T.teal;
    return (
      <Pressable style={s.calCard} onPress={() => goToDetail(item)}>
        <View style={[s.calCardBar, { backgroundColor: color }]} />
        <View style={s.calCardContent}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View style={[s.badge, { backgroundColor: color + "18" }]}>
              <Text style={[s.badgeText, { color }]}>{item.groupLabel}</Text>
            </View>
            <Text style={s.dateText}>🕐 {item.time}</Text>
          </View>
          <Text style={s.calCardTitle}>{item.title}</Text>
          <Text style={s.calCardLoc}>📍 {item.location}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.teal} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.orgLabel}>🎵 Jerusalem Youth Chorus</Text>
          <Text style={s.pageTitle}>Events</Text>
        </View>
        {/* List / Calendar toggle */}
        <View style={s.tabToggle}>
          <Pressable
            style={[
              s.tabToggleBtn,
              activeTab === "list" && s.tabToggleBtnActive,
            ]}
            onPress={() => setActiveTab("list")}
          >
            <Text
              style={[
                s.tabToggleText,
                activeTab === "list" && s.tabToggleTextActive,
              ]}
            >
              List
            </Text>
          </Pressable>
          <Pressable
            style={[
              s.tabToggleBtn,
              activeTab === "calendar" && s.tabToggleBtnActive,
            ]}
            onPress={() => setActiveTab("calendar")}
          >
            <Text
              style={[
                s.tabToggleText,
                activeTab === "calendar" && s.tabToggleTextActive,
              ]}
            >
              Calendar
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── LIST VIEW ── */}
      {activeTab === "list" && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.filtersWrap}
            contentContainerStyle={s.filtersContent}
          >
            {FILTERS.map((f) => (
              <Pressable
                key={f.key}
                style={[
                  s.filterBtn,
                  activeFilter === f.key && s.filterBtnActive,
                ]}
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
              <ActivityIndicator color={T.teal} size="large" />
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 48 }}>🎵</Text>
              <Text style={s.emptyText}>No events found</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(i) => i.id}
              renderItem={renderEventCard}
              contentContainerStyle={{
                padding: sp(2),
                paddingBottom: 100,
                gap: sp(2),
              }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {/* ── CALENDAR VIEW ── */}
      {activeTab === "calendar" && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Calendar
            markingType="multi-dot"
            markedDates={markedDates}
            onDayPress={(day) =>
              setSelectedDate(
                selectedDate === day.dateString ? null : day.dateString,
              )
            }
            theme={{
              backgroundColor: "#fff",
              calendarBackground: "#fff",
              textSectionTitleColor: T.teal,
              selectedDayBackgroundColor: T.teal,
              selectedDayTextColor: "#fff",
              todayTextColor: T.teal,
              dayTextColor: "#111",
              textDisabledColor: "#ccc",
              monthTextColor: "#111",
              arrowColor: T.teal,
              textMonthFontWeight: "700",
              textDayFontSize: 14,
              textMonthFontSize: 16,
            }}
            style={s.calendar}
          />

          {/* Legend */}
          <View style={s.legend}>
            {Object.entries(GROUP_COLORS).map(([label, color]) => (
              <View key={label} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: color }]} />
                <Text style={s.legendText}>{label}</Text>
              </View>
            ))}
          </View>

          <Text style={s.sectionTitle}>
            {selectedDate
              ? `Events on ${formatDisplayDate(selectedDate)}`
              : "All Upcoming Events"}
          </Text>

          {calendarEvents.length === 0 ? (
            <Text style={s.noEvents}>No events on this day</Text>
          ) : (
            <FlatList
              data={calendarEvents}
              keyExtractor={(i) => String(i.id)}
              renderItem={renderCalendarEvent}
              contentContainerStyle={{
                paddingHorizontal: sp(2),
                paddingBottom: 100,
                gap: sp(1.5),
              }}
              scrollEnabled={false}
            />
          )}
        </ScrollView>
      )}

      {/* FAB */}
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
            fontSize: 32,
            color: "#fff",
            fontWeight: "300",
            lineHeight: 36,
          }}
        >
          +
        </Text>
      </Pressable>

      {/* DELETE */}
      <Modal
        visible={!!deleteTarget}
        animationType="fade"
        transparent
        statusBarTranslucent
      >
        <View style={s.overlayCenter}>
          <View style={s.confirmBox}>
            <Text
              style={{ fontSize: 32, textAlign: "center", marginBottom: sp(1) }}
            >
              🗑️
            </Text>
            <Text style={s.confirmTitle}>Delete Event?</Text>
            <Text style={s.confirmMsg}>
              This will permanently remove{"\n"}
              <Text style={{ color: T.text, fontWeight: "700" }}>
                "{deleteTarget?.title}"
              </Text>
            </Text>
            <View style={s.btnRow}>
              <Pressable
                style={s.btnCancel}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={s.btnCancelText}>Keep it</Text>
              </Pressable>
              <Pressable style={s.btnDeleteConfirm} onPress={doDelete}>
                <Text style={s.btnLight}>Yes, delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View style={s.overlayBottom}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>✏️ Edit Event</Text>
            <Pressable
              style={s.modalClose}
              onPress={() => setEditVisible(false)}
            >
              <Text style={{ color: T.muted, fontSize: 22 }}>✕</Text>
            </Pressable>
            <FormFields values={form} setValues={setForm} errors={formErrors} />
            <View style={[s.btnRow, { marginTop: sp(2) }]}>
              <Pressable style={s.btnPrimary} onPress={saveEdit}>
                <Text style={s.btnLight}>Save Changes</Text>
              </Pressable>
              <Pressable
                style={s.btnCancel}
                onPress={() => setEditVisible(false)}
              >
                <Text style={s.btnCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD */}
      <Modal
        visible={addVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View style={s.overlayBottom}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>🎵 New Event</Text>
            <Pressable
              style={s.modalClose}
              onPress={() => setAddVisible(false)}
            >
              <Text style={{ color: T.muted, fontSize: 22 }}>✕</Text>
            </Pressable>
            <FormFields
              values={newForm}
              setValues={setNewForm}
              errors={newErrors}
            />
            <View style={[s.btnRow, { marginTop: sp(2) }]}>
              <Pressable style={s.btnPrimary} onPress={saveNew}>
                <Text style={s.btnLight}>Create Event</Text>
              </Pressable>
              <Pressable
                style={s.btnCancel}
                onPress={() => setAddVisible(false)}
              >
                <Text style={s.btnCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  header: {
    backgroundColor: T.teal,
    paddingHorizontal: sp(2),
    paddingTop: STATUSBAR_H + sp(2),
    paddingBottom: sp(2),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  orgLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
    marginTop: 4,
    letterSpacing: -0.5,
  },

  // Tab toggle
  tabToggle: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    flexDirection: "row",
    padding: 3,
  },
  tabToggleBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
  tabToggleBtnActive: { backgroundColor: "#fff" },
  tabToggleText: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    fontSize: 13,
  },
  tabToggleTextActive: { color: T.teal, fontWeight: "700" },

  // Filters
  filtersWrap: {
    height: 56,
    backgroundColor: T.white,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  filtersContent: {
    paddingHorizontal: sp(2),
    alignItems: "center",
    gap: sp(1),
    flexDirection: "row",
  },
  filterBtn: {
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 999,
    paddingHorizontal: sp(2),
    paddingVertical: 6,
  },
  filterBtnActive: { backgroundColor: T.teal, borderColor: T.teal },
  filterText: { color: T.textSub, fontSize: 13, fontWeight: "500" },
  filterTextActive: { color: "#fff", fontWeight: "700" },

  // Event card
  card: {
    backgroundColor: T.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: T.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardBar: { height: 4 },
  cardInner: { padding: sp(2) },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: sp(1),
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  dateText: { fontSize: 11, color: T.textSub },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: T.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: T.textSub,
    lineHeight: 20,
    marginBottom: sp(1),
  },
  cardLoc: {
    fontSize: 13,
    color: T.teal,
    fontWeight: "500",
    marginBottom: sp(1.5),
  },
  deleteSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: T.redBg,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteSmallText: { fontSize: 14 },
  btnRow: { flexDirection: "row", gap: sp(1) },
  btnEdit: {
    flex: 1,
    backgroundColor: T.tealBg,
    borderWidth: 1.5,
    borderColor: T.teal,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnEditText: { color: T.teal, fontWeight: "700", fontSize: 13 },
  btnAttendance: {
    flex: 1,
    backgroundColor: T.teal,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnAttendanceText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Calendar view
  calendar: {
    marginHorizontal: sp(1.5),
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: T.border,
    marginTop: sp(1),
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: sp(2),
    paddingVertical: sp(1.5),
    flexWrap: "wrap",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: T.textSub, fontSize: 12 },
  sectionTitle: {
    color: T.teal,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: sp(2),
    marginBottom: sp(1),
    marginTop: sp(0.5),
  },
  noEvents: {
    color: T.muted,
    textAlign: "center",
    marginTop: sp(2.5),
    fontSize: 14,
  },
  calCard: {
    backgroundColor: T.card,
    borderRadius: 12,
    overflow: "hidden",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: T.border,
  },
  calCardBar: { width: 4 },
  calCardContent: { flex: 1, padding: sp(1.5) },
  calCardTitle: {
    color: T.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 4,
  },
  calCardLoc: { color: T.textSub, fontSize: 12 },

  // Empty
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: {
    color: T.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: sp(1),
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    backgroundColor: T.teal,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: T.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },

  // Modals
  overlayCenter: {
    flex: 1,
    backgroundColor: "#0008",
    justifyContent: "center",
    alignItems: "center",
    padding: sp(3),
  },
  confirmBox: {
    backgroundColor: T.card,
    borderRadius: 20,
    padding: sp(3),
    width: "100%",
    maxWidth: 340,
  },
  confirmTitle: {
    color: T.text,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: sp(1),
  },
  confirmMsg: {
    color: T.textSub,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: sp(3),
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: "#0008",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: T.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: sp(3),
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: T.text,
    marginBottom: sp(2),
  },
  modalClose: { position: "absolute", top: sp(3), right: sp(3) },
  btnPrimary: {
    flex: 1,
    backgroundColor: T.teal,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnCancel: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnCancelText: { color: T.textSub, fontWeight: "700" },
  btnDeleteConfirm: {
    flex: 1,
    backgroundColor: T.red,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnLight: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Form
  label: {
    color: T.textSub,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: T.bg,
    borderRadius: 10,
    padding: 12,
    color: T.text,
    fontSize: 15,
    borderWidth: 1.5,
    borderColor: T.border,
  },
  inputError: { borderColor: T.red, borderWidth: 1.5 },
  errorText: { color: T.red, fontSize: 12, marginTop: 4 },
  hintText: { color: T.muted, fontSize: 11, marginTop: 4 },
  groupRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: sp(1),
    marginBottom: sp(2),
  },
  groupPill: {
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  groupPillActive: { backgroundColor: T.teal, borderColor: T.teal },
  groupPillText: { color: T.textSub, fontSize: 13 },
});
