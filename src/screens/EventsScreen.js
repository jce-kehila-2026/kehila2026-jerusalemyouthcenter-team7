import { useLocalSearchParams, useRouter } from "expo-router";
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

const MONTH_ABBR = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const getDateParts = (dateStr) => {
  if (!dateStr) return { day: "--", month: "" };
  const isoPart = dateStr.split("T")[0];
  const segments = isoPart.includes("-") ? isoPart.split("-") : null;
  if (!segments || segments.length < 3) return { day: "--", month: "" };
  const [, month, day] = segments;
  const monthIndex = parseInt(month, 10) - 1;
  return {
    day: String(parseInt(day, 10)),
    month: MONTH_ABBR[monthIndex] || "",
  };
};

// Decorative music notes used as a subtle accent on the right edge of cards.
function MusicTrace() {
  return (
    <View style={[s.traceCol, { pointerEvents: "none" }]}>
      <Text style={[s.traceNote, s.traceNoteTop]}>🎵</Text>
      <Text style={[s.traceNote, s.traceNoteMid]}>🎶</Text>
      <Text style={[s.traceNote, s.traceNoteBottom]}>🎵</Text>
    </View>
  );
}

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
  const { action } = useLocalSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");
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
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (action === "add") {
      setAddVisible(true);
      router.setParams({ action: "" });
    }
  }, [action]);

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

  const eventsByDate = {};
  events.forEach((event) => {
    const date = (event.date || "").split("T")[0];
    if (!date) return;
    if (!eventsByDate[date]) {
      eventsByDate[date] = [];
    }
    eventsByDate[date].push(event);
  });

  const calendarEvents = selectedDate
    ? events.filter((e) => (e.date || "").split("T")[0] === selectedDate)
    : events;

  const calendarDays = [];
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

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
    const { day, month } = getDateParts(item.date);
    return (
      <View style={s.card}>
        <View style={[s.dateBlock, { backgroundColor: badge.text }]}>
          <Text style={s.dateBlockDay}>{day}</Text>
          <Text style={s.dateBlockMonth}>{month}</Text>
        </View>
        <View style={s.cardInner}>
          <View style={s.cardTop}>
            <View style={[s.badge, { backgroundColor: badge.bg }]}>
              <Text style={[s.badgeText, { color: badge.text }]}>
                {item.groupLabel}
              </Text>
            </View>
            <Pressable
              style={s.deleteSmall}
              onPress={() => setDeleteTarget(item)}
            >
              <Text style={s.deleteSmallText}>🗑</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => goToDetail(item)}>
            <Text style={s.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={s.cardMeta}>
              {item.time} · {item.location}
            </Text>
            <Text style={s.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
          </Pressable>
          <View style={s.btnRow}>
            <Pressable
              style={[
                s.btnEdit,
                { borderColor: badge.text, backgroundColor: badge.bg },
              ]}
              onPress={() => openEdit(item)}
            >
              <Text style={[s.btnEditText, { color: badge.text }]}>Edit</Text>
            </Pressable>
            <Pressable
              style={[s.btnAttendance, { backgroundColor: badge.text }]}
              onPress={() => goToAttendance(item)}
            >
              <Text style={s.btnAttendanceText}>Attendance</Text>
            </Pressable>
          </View>
        </View>
        <MusicTrace />
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
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: sp(1),
            }}
          >
            <View style={{ alignItems: "flex-start" }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: color,
                  marginBottom: 2,
                }}
              >
                {formatDisplayDate(item.date).split("/")[0]}
              </Text>
              <Text style={{ fontSize: 12, color: color, fontWeight: "500" }}>
                {formatDisplayDate(item.date).split("/").slice(1).join("/")}
              </Text>
            </View>
            <View style={[s.badge, { backgroundColor: color + "18" }]}>
              <Text style={[s.badgeText, { color }]}>{item.groupLabel}</Text>
            </View>
          </View>
          <Text style={s.calCardTitle}>{item.title}</Text>
          <Text
            style={{ fontSize: 13, color: T.textSub, marginBottom: sp(0.5) }}
          >
            {item.time} · {item.location}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.teal} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View
          style={{ flexDirection: "row", alignItems: "flex-end", gap: sp(1) }}
        >
          {/* Back button - only visible in Calendar tab */}
          {activeTab === "calendar" && (
            <Pressable onPress={() => setActiveTab("list")} style={s.backBtn}>
              <Text style={s.backBtnText}>←</Text>
            </Pressable>
          )}
          <View>
            <Text style={s.orgLabel}>🎵 Jerusalem Youth Chorus</Text>
            <Text style={s.pageTitle}>
              {activeTab === "calendar" ? "Calendar" : "Events"}
            </Text>
          </View>
        </View>

        {/* Tab toggle - only visible in List tab */}
        {activeTab === "list" && (
          <View style={s.tabToggle}>
            <Pressable
              style={[s.tabToggleBtn, s.tabToggleBtnActive]}
              onPress={() => setActiveTab("list")}
            >
              <Text style={[s.tabToggleText, s.tabToggleTextActive]}>List</Text>
            </Pressable>
            <Pressable
              style={s.tabToggleBtn}
              onPress={() => setActiveTab("calendar")}
            >
              <Text style={s.tabToggleText}>Calendar</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* ── LIST VIEW ── */}
      {activeTab === "list" && (
        <View style={{ flex: 1 }}>
          <View style={s.filtersWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
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
          </View>

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
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.eventsListContent}
            >
              {filtered.map((item) => (
                <View key={item.id}>{renderEventCard({ item })}</View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* ── CALENDAR VIEW ── */}
      {activeTab === "calendar" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={s.calendarScroll}
        >
          <View style={s.calendarContainer}>
            <View style={s.monthNavigation}>
              <Pressable onPress={goToPrevMonth} style={s.monthNavBtn}>
                <Text style={s.monthNavBtnText}>←</Text>
              </Pressable>
              <Text style={s.monthTitle}>
                {monthNames[currentMonth]} {currentYear}
              </Text>
              <Pressable onPress={goToNextMonth} style={s.monthNavBtn}>
                <Text style={s.monthNavBtnText}>→</Text>
              </Pressable>
            </View>

            <View style={s.weekHeaderRow}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <Text key={`header-${day}`} style={s.weekDayHeader}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={s.calendarGrid}>
              {calendarDays.map((day, idx) => {
                const dateStr = day
                  ? `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  : null;
                const hasEvent = dateStr && eventsByDate[dateStr];
                const eventColor = hasEvent
                  ? GROUP_COLORS[eventsByDate[dateStr][0]?.groupLabel] || T.teal
                  : null;
                const isSelected = dateStr === selectedDate;

                return (
                  <Pressable
                    key={idx}
                    style={[
                      s.calendarDay,
                      hasEvent && { borderColor: eventColor, borderWidth: 2.5 },
                      isSelected && s.calendarDaySelected,
                    ]}
                    onPress={() => {
                      if (day) setSelectedDate(isSelected ? null : dateStr);
                    }}
                  >
                    {day && (
                      <>
                        <Text
                          style={[
                            s.calendarDayNum,
                            isSelected && { color: T.white },
                          ]}
                        >
                          {day}
                        </Text>
                        {hasEvent && (
                          <Text
                            style={[s.calendarEventName, { color: eventColor }]}
                            numberOfLines={2}
                          >
                            {eventsByDate[dateStr][0]?.title}
                          </Text>
                        )}
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

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

  // Back button
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  backBtnText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
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
    marginTop: sp(1),
    marginBottom: sp(2.5),
    backgroundColor: T.white,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    justifyContent: "center",
  },
  filtersContent: {
    paddingHorizontal: sp(2),
    alignItems: "center",
    gap: sp(1.5),
    flexDirection: "row",
  },
  filterBtn: {
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 999,
    paddingHorizontal: sp(1.75),
    paddingVertical: 6,
    minWidth: 64,
    alignItems: "center",
  },
  filterBtnActive: { backgroundColor: T.teal, borderColor: T.teal },
  filterText: { color: T.textSub, fontSize: 13, fontWeight: "500" },
  filterTextActive: { color: "#fff", fontWeight: "700" },

  // Events list (ScrollView content)
  eventsListContent: {
    paddingHorizontal: sp(2),
    paddingBottom: 100,
    gap: sp(1.25),
  },

  // Event card
  card: {
    backgroundColor: T.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    shadowColor: T.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Side date block
  dateBlock: {
    width: 76,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: sp(2),
  },
  dateBlockDay: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 28,
  },
  dateBlockMonth: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginTop: 2,
  },

  cardInner: { flex: 1, minWidth: 0, padding: sp(1.75), zIndex: 1 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: sp(0.75),
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: T.text,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    color: T.textSub,
    marginBottom: sp(0.75),
  },
  cardDesc: {
    fontSize: 13,
    color: T.textSub,
    lineHeight: 20,
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

  // Decorative music-trace column (right edge of card)
  traceCol: {
    width: 60,
    flexShrink: 0,
    position: "relative",
  },
  traceNote: { position: "absolute", opacity: 0.32 },
  traceNoteTop: {
    top: "14%",
    left: 6,
    fontSize: 15,
    transform: [{ rotate: "-8deg" }],
  },
  traceNoteMid: {
    top: "40%",
    left: 30,
    fontSize: 23,
    transform: [{ rotate: "10deg" }],
  },
  traceNoteBottom: {
    top: "68%",
    left: 6,
    fontSize: 15,
    transform: [{ rotate: "-4deg" }],
  },

  // Calendar view
  calendarScroll: { backgroundColor: T.white },
  calendarContainer: { padding: sp(2), backgroundColor: T.white },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: sp(2),
  },
  monthNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: T.tealBg,
    alignItems: "center",
    justifyContent: "center",
  },
  monthNavBtnText: { fontSize: 18, fontWeight: "700", color: T.teal },
  monthTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: T.text,
    textAlign: "center",
  },
  weekHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: sp(1),
    paddingHorizontal: 2,
  },
  weekDayHeader: {
    flex: 1,
    textAlign: "center",
    color: T.textSub,
    fontSize: 12,
    fontWeight: "600",
  },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: sp(2) },
  weekDay: {
    width: "14.28%",
    textAlign: "center",
    color: T.textSub,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: sp(1),
  },
  calendarDay: {
    width: "14%",
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.white,
  },
  calendarDaySelected: { backgroundColor: T.teal, borderColor: T.teal },
  calendarDayNum: { fontSize: 13, fontWeight: "600", color: T.text },
  calendarEventName: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
    color: T.teal,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: sp(2),
    paddingVertical: sp(1.5),
    flexWrap: "wrap",
    backgroundColor: T.white,
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
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: sp(1),
  },
  calCardBar: { height: 4, width: "100%" },
  calCardContent: { padding: sp(1.5) },
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
