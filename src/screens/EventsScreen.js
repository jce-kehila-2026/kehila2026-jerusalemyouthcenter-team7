import { db } from "@/src/firebase/firebase";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
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

// ─── Design System ─────────────────────────────────────────────────────────
const T = {
  teal: "#039899",
  tealDark: "#027a7b",
  tealBg: "#f0fafa",
  red: "#c56451",
  redBg: "#fff1ee",
  yellow: "#cfad5d",
  yellowBg: "#fffbf0",
  purple: "#8b5cf6",
  purpleDark: "#6d28d9",
  white: "#ffffff",
  bg: "#f5fafe",
  card: "#ffffff",
  border: "#e8eef2",
  text: "#1a1a2e",
  textSub: "#5a6a7a",
  muted: "#9aa8b4",
};
const sp = (n) => n * 8;

const CALENDAR_ID =
  "6ee65334f0a4c98b5d09abd1f1f2e38c42a93f8ce246d56fb0e9041f0ed7fa4d@group.calendar.google.com";

const GOOGLE_CALENDAR_ICS_URL =
  "https://calendar.google.com/calendar/ical/6ee65334f0a4c98b5d09abd1f1f2e38c42a93f8ce246d56fb0e9041f0ed7fa4d%40group.calendar.google.com/private-956d897f3255c9d53850f11442e4b179/basic.ics";

const openEventInGoogleCalendar = (googleEventId) => {
  if (!googleEventId) return;
  let eid;
  try {
    eid = btoa(`${googleEventId} ${CALENDAR_ID}`);
  } catch {
    return;
  }
  const url = `https://calendar.google.com/calendar/event?eid=${eid}`;
  if (Platform.OS === "web") {
    window.open(url, "_blank");
  } else {
    Linking.openURL(url).catch(() => {});
  }
};

const getFixedColor = (groupName) => {
  if (!groupName) return T.teal;
  const standard = groupName.trim().toLowerCase();
  if (standard === "all groups" || standard === "all") return T.teal;
  if (standard === "year 1") return T.yellow;
  if (standard === "year 2") return T.red;
  if (standard === "year 3") return T.purple;
  return T.teal;
};

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
  return {
    day: String(parseInt(day, 10)),
    month: MONTH_ABBR[parseInt(month, 10) - 1] || "",
  };
};

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
  voiceSection: "all_voices",
  voiceSectionLabel: "All",
};
const emptyErrors = { title: "", date: "", time: "", location: "" };
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

function LocalFormFields({ values, setValues, errors, groups, voiceFilters }) {
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
        <Pressable
          style={[s.groupPill, values.group === "all" && s.groupPillActive]}
          onPress={() =>
            setValues((p) => ({ ...p, group: "all", groupLabel: "All Groups" }))
          }
        >
          <Text
            style={[
              s.groupPillText,
              values.group === "all" && { color: "#fff" },
            ]}
          >
            All Groups
          </Text>
        </Pressable>

        {groups.map((g) => {
          const groupName = g.name || g.label || g.id;
          const groupKey = groupName.toLowerCase().replace(/[\s_]+/g, "_");
          return (
            <Pressable
              key={g.id}
              style={[
                s.groupPill,
                values.group === groupKey && s.groupPillActive,
              ]}
              onPress={() =>
                setValues((p) => ({
                  ...p,
                  group: groupKey,
                  groupLabel: groupName,
                }))
              }
            >
              <Text
                style={[
                  s.groupPillText,
                  values.group === groupKey && { color: "#fff" },
                ]}
              >
                {groupName}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={s.label}>Voice Section</Text>
      <View style={s.groupRow}>
        {voiceFilters.map((f) => (
          <Pressable
            key={f.key}
            style={[
              s.groupPill,
              values.voiceSection === f.key && s.groupPillActive,
            ]}
            onPress={() =>
              setValues((p) => ({
                ...p,
                voiceSection: f.key,
                voiceSectionLabel: f.label,
              }))
            }
          >
            <Text
              style={[
                s.groupPillText,
                values.voiceSection === f.key && { color: "#fff" },
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

// ─── MAIN SCREEN COMPONENT ─────────────────────────────────────────────────
export default function EventsScreen() {
  const router = useRouter();
  const { action } = useLocalSearchParams();
  const [events, setEvents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");
  const [activeFilter, setFilter] = useState("all_events");
  const [activeVoiceFilter, setVoiceFilter] = useState("all_voices");
  const [selectedDate, setSelectedDate] = useState(null);
  const [editVisible, setEditVisible] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState(emptyErrors);
  const [addVisible, setAddVisible] = useState(false);
  const [newForm, setNewForm] = useState(emptyForm);
  const [newErrors, setNewErrors] = useState(emptyErrors);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [gcalMenuTarget, setGcalMenuTarget] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [voiceFilters, setVoiceFilters] = useState([
    { key: "all_voices", label: "All" },
  ]);

  useEffect(() => {
    if (action === "add") {
      setAddVisible(true);
      router.setParams({ action: "" });
    }
  }, [action]);

  // ── Data loading — direct Firestore, no backend service ────────────────
  useEffect(() => {
    const loadEvents = async () => {
      try {
        // Google Calendar sync runs in background — does NOT block loading
        fetch(
          "https://us-central1-fullstack-team-7.cloudfunctions.net/getGoogleCalendarEvents",
        ).catch((syncErr) =>
          console.error("Google Calendar sync error:", syncErr),
        );

        // Direct Firestore query using the shared db instance
        const snapshot = await getDocs(collection(db, "events"));
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEvents(data);
      } catch (e) {
        console.error("Error loading events:", e);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();

    const unsubscribeVoices = onSnapshot(
      collection(db, "voice_types"),
      (snapshot) => {
        const standardOrder = ["bass", "tenor", "alto", "soprano"];
        const voices = snapshot.docs.map((d) => ({
          key: d.data().name.toLowerCase(),
          label: d.data().name,
        }));
        const standardVoices = [];
        const customVoices = [];
        voices.forEach((voice) => {
          if (standardOrder.includes(voice.key)) standardVoices.push(voice);
          else customVoices.push(voice);
        });
        standardVoices.sort(
          (a, b) => standardOrder.indexOf(a.key) - standardOrder.indexOf(b.key),
        );
        customVoices.sort((a, b) => a.label.localeCompare(b.label));
        setVoiceFilters([
          { key: "all_voices", label: "All" },
          ...standardVoices,
          ...customVoices,
        ]);
      },
      (error) => console.error("Voice types listener failed:", error),
    );

    const unsubscribeGroups = onSnapshot(
      collection(db, "groups"),
      (snapshot) => {
        const groupsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        groupsList.sort((a, b) => {
          const nameA = a.name || a.label || a.id;
          const nameB = b.name || b.label || b.id;
          return nameA.localeCompare(nameB, undefined, { numeric: true });
        });
        setGroups(groupsList);
      },
      (error) => console.error("Groups subscription listener failed:", error),
    );

    return () => {
      unsubscribeGroups();
      unsubscribeVoices();
    };
  }, []);

  const uniqueGroupLabels = Array.from(
    new Set(
      events.map(
        (e) => e.groupLabel || (e.group === "all" ? "All Groups" : e.group),
      ),
    ),
  ).filter(Boolean);

  const baseLabels = ["All Groups", "Year 1", "Year 2", "Year 3"];
  const finalGroupLabels = Array.from(
    new Set([...baseLabels, ...uniqueGroupLabels]),
  )
    .filter((label) => {
      if (label === "All Groups") return true;
      if (["Year 1", "Year 2", "Year 3"].includes(label)) return true;
      const normalizedLabel = label.toLowerCase().replace(/[\s_]+/g, "");
      return events.some((e) => {
        const eventLabel = (e.groupLabel || e.group || "")
          .toLowerCase()
          .replace(/[\s_]+/g, "");
        return eventLabel === normalizedLabel;
      });
    })
    .sort((a, b) => {
      if (a === "All Groups") return -1;
      if (b === "All Groups") return 1;
      return a.localeCompare(b, undefined, { numeric: true });
    });

  const dynamicFilters = [
    { key: "all_events", label: "All" },
    ...finalGroupLabels.map((label) => {
      let key = label.toLowerCase().replace(/[\s_]+/g, "");
      if (label === "All Groups") key = "all";
      return { key, label };
    }),
  ];

  const matchesYearFilter = (e) => {
    if (activeFilter === "all_events") return true;
    const itemKey = (e.groupLabel || e.group || "")
      .toLowerCase()
      .replace(/[\s_]+/g, "");
    if (activeFilter === "all" || itemKey === "allgroups")
      return e.group === "all" || itemKey === "allgroups";
    return itemKey === activeFilter || e.group === "all";
  };

  const matchesVoiceFilter = (e) =>
    activeVoiceFilter === "all_voices"
      ? true
      : !e.voiceSection ||
        e.voiceSection === "all_voices" ||
        e.voiceSection === activeVoiceFilter;

  const filtered = events.filter(
    (e) => matchesYearFilter(e) && matchesVoiceFilter(e),
  );

  const formatDisplayDate = (date) =>
    date && date.includes("-") ? date.split("-").reverse().join("/") : date;

  const eventsByDate = {};
  events.forEach((event) => {
    const date = (event.date || "").split("T")[0];
    if (!date) return;
    if (!eventsByDate[date]) eventsByDate[date] = [];
    eventsByDate[date].push(event);
  });

  const calendarEvents = selectedDate
    ? events.filter((e) => (e.date || "").split("T")[0] === selectedDate)
    : events;

  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;

  const calendarDays = [];
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

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
    } else setCurrentMonth(currentMonth - 1);
  };
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else setCurrentMonth(currentMonth + 1);
  };

  // ── CRUD — direct Firestore calls ──────────────────────────────────────
  const saveNew = async () => {
    const { errors, valid } = validateForm(newForm);
    setNewErrors(errors);
    if (!valid) return;
    try {
      const [day, month, year] = newForm.date.split("/");
      const isoDate = `${year}-${month}-${day}`;
      const matchingGroupObj = groups.find((g) => {
        const normDb = (g.name || g.label || g.id)
          .toLowerCase()
          .replace(/[\s_]+/g, "");
        const normForm = newForm.group.toLowerCase().replace(/[\s_]+/g, "");
        return normDb === normForm;
      });
      const computedLabel = matchingGroupObj
        ? matchingGroupObj.name || matchingGroupObj.label
        : "Year 4";
      const eventPayload = {
        ...newForm,
        date: isoDate,
        groupLabel: computedLabel,
      };
      const clientSideEvent = {
        ...eventPayload,
        id: "temp-" + Date.now().toString(),
      };
      setEvents((p) => [clientSideEvent, ...p]);

      // Direct Firestore addDoc
      const docRef = await addDoc(collection(db, "events"), eventPayload);
      setEvents((p) =>
        p.map((e) =>
          e.id === clientSideEvent.id ? { ...e, id: docRef.id } : e,
        ),
      );
    } catch (e) {
      console.error(e);
    }
    setAddVisible(false);
    setNewForm(emptyForm);
    setNewErrors(emptyErrors);
  };

  const saveEdit = async () => {
    const { errors, valid } = validateForm(form);
    setFormErrors(errors);
    if (!valid) return;
    try {
      const [day, month, year] = form.date.split("/");
      const isoDate = `${year}-${month}-${day}`;
      const matchingGroupObj = groups.find((g) => {
        const normDb = (g.name || g.label || g.id)
          .toLowerCase()
          .replace(/[\s_]+/g, "");
        const normForm = form.group.toLowerCase().replace(/[\s_]+/g, "");
        return normDb === normForm;
      });
      const computedLabel = matchingGroupObj
        ? matchingGroupObj.name || matchingGroupObj.label
        : form.groupLabel;
      const formWithIso = { ...form, date: isoDate, groupLabel: computedLabel };
      setEvents((p) =>
        p.map((e) => (e.id === editTarget.id ? { ...e, ...formWithIso } : e)),
      );

      // Direct Firestore updateDoc
      await updateDoc(doc(db, "events", editTarget.id), formWithIso);
    } catch (e) {
      console.error(e);
    }
    setEditVisible(false);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    const googleEventId = deleteTarget.googleCalendarEventId;
    try {
      setEvents((prev) => prev.filter((e) => e.id !== targetId));
      setDeleteTarget(null);

      // Direct Firestore deleteDoc
      await deleteDoc(doc(db, "events", targetId));
      try {
        await deleteDoc(doc(db, "attendance", targetId));
      } catch (err) {
        console.error(err);
      }

      if (googleEventId) {
        try {
          await fetch(
            `https://us-central1-fullstack-team-7.cloudfunctions.net/deleteGoogleCalendarEvent?eventId=${encodeURIComponent(googleEventId)}`,
          );
        } catch (gErr) {
          console.error("Failed to delete Google Calendar event:", gErr);
        }
      }
    } catch (e) {
      console.error(e);
    }
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
      groupLabel: item.groupLabel || "All Groups",
      voiceSection: item.voiceSection || "all_voices",
      voiceSectionLabel: item.voiceSectionLabel || "All",
    });
    setFormErrors(emptyErrors);
    setEditVisible(true);
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
    const groupDisplay = item.groupLabel || "All Groups";
    const groupColor = getFixedColor(groupDisplay);
    const { day, month } = getDateParts(item.date);
    return (
      <View style={s.card}>
        <View style={[s.dateBlock, { backgroundColor: groupColor }]}>
          <Text style={s.dateBlockDay}>{day}</Text>
          <Text style={s.dateBlockMonth}>{month}</Text>
        </View>
        <View style={s.cardInner}>
          <View style={s.cardTop}>
            <View style={{ flexDirection: "row", gap: 6, flexShrink: 1 }}>
              <View style={[s.badge, { backgroundColor: groupColor + "15" }]}>
                <Text style={[s.badgeText, { color: groupColor }]}>
                  {groupDisplay}
                </Text>
              </View>
              {item.voiceSectionLabel && item.voiceSection !== "all_voices" && (
                <View style={[s.badge, s.voiceBadge]}>
                  <Text style={[s.badgeText, s.voiceBadgeText]}>
                    {item.voiceSectionLabel}
                  </Text>
                </View>
              )}
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {item.googleCalendarEventId && (
                <Pressable
                  style={s.gcalSyncedIcon}
                  onPress={() => setGcalMenuTarget(item)}
                >
                  <Text style={s.gcalSyncedIconText}>📅</Text>
                </Pressable>
              )}
              <Pressable
                style={s.deleteSmall}
                onPress={() => setDeleteTarget(item)}
              >
                <Text style={s.deleteSmallText}>🗑</Text>
              </Pressable>
            </View>
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
                { borderColor: groupColor, backgroundColor: groupColor + "08" },
              ]}
              onPress={() => openEdit(item)}
            >
              <Text style={[s.btnEditText, { color: groupColor }]}>Edit</Text>
            </Pressable>
            <Pressable
              style={[s.btnAttendance, { backgroundColor: groupColor }]}
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
    const color = getFixedColor(item.groupLabel);
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
              <Text style={[s.badgeText, { color }]}>
                {item.groupLabel || "All Groups"}
              </Text>
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

      <View style={s.toggleBar}>
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

      {activeTab === "list" && (
        <View style={{ flex: 1 }}>
          <View style={s.filtersWrap}>
            <Text style={s.filterSectionLabel}>Year</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filtersContent}
            >
              {dynamicFilters.map((f) => (
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
            <Text style={s.filterSectionLabel}>Voice Section</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filtersContent}
            >
              {voiceFilters.map((f) => (
                <Pressable
                  key={f.key}
                  style={[
                    s.filterBtn,
                    activeVoiceFilter === f.key && s.filterBtnActive,
                  ]}
                  onPress={() => setVoiceFilter(f.key)}
                >
                  <Text
                    style={[
                      s.filterText,
                      activeVoiceFilter === f.key && s.filterTextActive,
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
                  ? getFixedColor(eventsByDate[dateStr][0]?.groupLabel)
                  : null;
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;
                return (
                  <Pressable
                    key={idx}
                    style={[
                      s.calendarDay,
                      hasEvent && { borderColor: eventColor, borderWidth: 2.5 },
                      isToday && s.calendarDayToday,
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
                            isToday && s.calendarDayNumToday,
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
            {finalGroupLabels.map((label) => (
              <View key={label} style={s.legendItem}>
                <View
                  style={[
                    s.legendDot,
                    { backgroundColor: getFixedColor(label) },
                  ]}
                />
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

      {/* Google Calendar Menu */}
      <Modal
        visible={!!gcalMenuTarget && gcalMenuTarget !== "subscribe"}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View style={s.overlayBottom}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>📅 Google Calendar</Text>
            <Pressable
              style={s.modalClose}
              onPress={() => setGcalMenuTarget(null)}
            >
              <Text style={{ color: T.muted, fontSize: 22 }}>✕</Text>
            </Pressable>
            <Pressable
              style={s.gcalMenuOption}
              onPress={() => {
                openEventInGoogleCalendar(
                  gcalMenuTarget?.googleCalendarEventId,
                );
                setGcalMenuTarget(null);
              }}
            >
              <Text style={s.gcalMenuOptionIcon}>↗</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.gcalMenuOptionTitle}>
                  Open this event in Google Calendar
                </Text>
                <Text style={s.gcalMenuOptionSub}>
                  View or edit &quot;{gcalMenuTarget?.title}&quot; directly
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={s.gcalMenuOption}
              onPress={() => setGcalMenuTarget("subscribe")}
            >
              <Text style={s.gcalMenuOptionIcon}>＋</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.gcalMenuOptionTitle}>
                  Add our whole calendar to yours
                </Text>
                <Text style={s.gcalMenuOptionSub}>
                  Subscribe to see all events going forward
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Google Calendar Subscribe */}
      <Modal
        visible={gcalMenuTarget === "subscribe"}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View style={s.overlayBottom}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>📅 Add to Your Calendar</Text>
            <Pressable
              style={s.modalClose}
              onPress={() => setGcalMenuTarget(null)}
            >
              <Text style={{ color: T.muted, fontSize: 22 }}>✕</Text>
            </Pressable>
            <Text style={[s.label, { marginTop: 0 }]}>Link</Text>
            <Text selectable style={s.icsLinkBox}>
              {GOOGLE_CALENDAR_ICS_URL}
            </Text>
            <Text style={s.hintText}>
              Long-press the link above to copy it.
            </Text>
            <Text style={[s.label, { marginTop: sp(2) }]}>
              On Google Calendar (web)
            </Text>
            <Text style={s.icsStep}>
              1. Next to "Other calendars", tap +{"\n"}2. Choose "From URL"
              {"\n"}3. Paste the link, then "Add calendar"
            </Text>
            <Text style={[s.label, { marginTop: sp(2) }]}>
              On iPhone (Apple Calendar)
            </Text>
            <Text style={s.icsStep}>
              Settings → Calendar → Accounts → Add Account → Other →{"\n"}Add
              Subscribed Calendar → paste the link
            </Text>
            <Pressable
              style={[s.btnPrimary, { marginTop: sp(2) }]}
              onPress={() => setGcalMenuTarget(null)}
            >
              <Text style={s.btnLight}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Confirm Delete */}
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

      {/* Edit Modal */}
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
            <LocalFormFields
              values={form}
              setValues={setForm}
              errors={formErrors}
              groups={groups}
              voiceFilters={voiceFilters}
            />
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

      {/* Add Modal */}
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
            <LocalFormFields
              values={newForm}
              setValues={setNewForm}
              errors={newErrors}
              groups={groups}
              voiceFilters={voiceFilters}
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

// ─── Stylesheet ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  toggleBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: sp(2),
    paddingVertical: sp(1),
    backgroundColor: T.bg,
    borderBottomWidth: 1,
    borderBottomColor: "#e8eef2",
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
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  backBtnText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  tabToggle: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    flexDirection: "row",
    padding: 3,
  },
  tabToggleBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
  tabToggleBtnActive: { backgroundColor: "#fff" },
  tabToggleText: {
    color: "#666666",
    fontWeight: "600",
    fontSize: 13,
  },
  tabToggleTextActive: { color: T.teal, fontWeight: "700" },
  filtersWrap: {
    marginTop: sp(1),
    marginBottom: sp(2.5),
    backgroundColor: T.white,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    paddingBottom: sp(1.25),
  },
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: T.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: sp(2),
    marginTop: sp(1.25),
    marginBottom: sp(0.5),
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
  eventsListContent: {
    paddingHorizontal: sp(2),
    paddingBottom: 100,
    gap: sp(1.25),
  },
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
  voiceBadge: { backgroundColor: T.bg, borderWidth: 1, borderColor: T.border },
  voiceBadgeText: { color: T.textSub },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: T.text,
    marginBottom: 4,
  },
  cardMeta: { fontSize: 13, color: T.textSub, marginBottom: sp(0.75) },
  cardDesc: {
    fontSize: 13,
    color: T.textSub,
    lineHeight: 20,
    marginBottom: sp(1.5),
  },
  gcalSyncedIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: T.tealBg,
    alignItems: "center",
    justifyContent: "center",
  },
  gcalSyncedIconText: { fontSize: 13 },
  gcalMenuOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(1.5),
    backgroundColor: T.tealBg,
    borderRadius: 14,
    padding: sp(1.75),
    marginBottom: sp(1.25),
  },
  gcalMenuOptionIcon: {
    fontSize: 20,
    color: T.teal,
    width: 28,
    textAlign: "center",
  },
  gcalMenuOptionTitle: { color: T.text, fontWeight: "700", fontSize: 14 },
  gcalMenuOptionSub: { color: T.textSub, fontSize: 12, marginTop: 2 },
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
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnEditText: { fontWeight: "700", fontSize: 13 },
  btnAttendance: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnAttendanceText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  traceCol: { width: 60, flexShrink: 0, position: "relative" },
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
  calendarDayToday: {
    backgroundColor: T.tealBg,
    borderColor: T.teal,
    borderWidth: 2,
  },
  calendarDayNumToday: { color: T.teal, fontWeight: "800" },
  calendarDayNum: { fontSize: 13, fontWeight: "600", color: T.text },
  calendarEventName: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
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
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: {
    color: T.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: sp(1),
  },
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
  icsLinkBox: {
    backgroundColor: T.bg,
    borderRadius: 10,
    padding: 12,
    color: T.teal,
    fontSize: 12,
    borderWidth: 1.5,
    borderColor: T.border,
  },
  icsStep: { color: T.textSub, fontSize: 13, lineHeight: 20, marginTop: 4 },
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
