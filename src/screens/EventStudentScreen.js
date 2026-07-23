// src/screens/EventStudentScreen.js
import { useState } from "react";
import {
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEvents } from "../context/EventsContext";

const T = {
  teal: "#039899",
  tealBg: "#f0fafa",
  red: "#c56451",
  yellow: "#cfad5d",
  white: "#ffffff",
  bg: "#f5fafe",
  card: "#ffffff",
  border: "#e8eef2",
  text: "#1a1a2e",
  textSub: "#5a6a7a",
  muted: "#9aa8b4",
};

const sp = (n) => n * 8;

// The calendar's secret iCal (.ics) feed — meant to be pasted into a
// calendar app's "Subscribe by URL" / "From URL" option, not opened
// directly as a webpage (that requires the calendar to be public, which
// we deliberately avoid for privacy).
const GOOGLE_CALENDAR_ICS_URL =
  "https://calendar.google.com/calendar/ical/6ee65334f0a4c98b5d09abd1f1f2e38c42a93f8ce246d56fb0e9041f0ed7fa4d%40group.calendar.google.com/private-956d897f3255c9d53850f11442e4b179/basic.ics";

const CALENDAR_ID =
  "6ee65334f0a4c98b5d09abd1f1f2e38c42a93f8ce246d56fb0e9041f0ed7fa4d@group.calendar.google.com";

// Opens a specific event's page directly on calendar.google.com, using
// Google's eid-link format (base64 of "<eventId> <calendarId>"). Only
// works for events that already have a googleCalendarEventId.
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

const GROUP_COLORS = {
  "All Groups": T.teal,
  "Year 1": T.yellow,
  "Year 2": T.red,
  "Year 3": "#8b5cf6",
};

const BADGE_STYLES = {
  all: { bg: T.tealBg, text: T.teal },
  year1: { bg: "#fffbf0", text: "#9a7b20" },
  year2: { bg: "#fff1ee", text: T.red },
  year3: { bg: "#f3f0ff", text: "#6b5ce7" },
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

export default function EventStudentScreen({
  studentYear = 1,
  studentVoiceType = "",
  studentName = "Student",
  isAdmin = false,
  onEventPress,
}) {
  const { events } = useEvents();
  const [activeTab, setActiveTab] = useState("list");
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [gcalMenuTarget, setGcalMenuTarget] = useState(null);

  // ── Hide events whose date has already passed (kept in Firestore for
  // attendance history — only filtered out of what's displayed here) ─────
  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;

  // Full history for this student's group/voice (used by the Calendar tab,
  // which keeps past events when scrolling back through months).
  const myEventsAll = events.filter((e) => {
    const yearMatch =
      e.group === "all" ||
      e.group_name === "All Groups" ||
      e.groupLabel === "All Groups" ||
      e.group === `year${studentYear}` ||
      e.group_name === `Year ${studentYear}` ||
      e.groupLabel === `Year ${studentYear}`;

    const voiceMatch =
      !e.voiceSection ||
      e.voiceSection === "all_voices" ||
      e.voiceSection === studentVoiceType;

    return yearMatch && voiceMatch;
  });

  // Upcoming-only — used by the List tab and the "You have X upcoming
  // events" count.
  const myEvents = myEventsAll.filter((e) => {
    const eventDateOnly = (e.date || "").split("T")[0];
    return !eventDateOnly || eventDateOnly >= todayStr;
  });

  const getGroupColor = (item) =>
    GROUP_COLORS[item.groupLabel] || GROUP_COLORS[item.group_name] || T.teal;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const clean = dateStr.split("T")[0];
    if (clean.includes("-")) {
      return clean.split("-").reverse().join("/");
    }
    return clean;
  };

  // ── Calendar helpers ────────────────────────────────────────────────
  const eventsByDate = {};
  myEventsAll.forEach((event) => {
    const date = (event.date || "").split("T")[0];
    if (!date) return;
    if (!eventsByDate[date]) {
      eventsByDate[date] = [];
    }
    eventsByDate[date].push(event);
  });

  // Generate calendar grid
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

  const calendarEvents = selectedDate
    ? myEventsAll.filter((e) => (e.date || "").split("T")[0] === selectedDate)
    : myEventsAll;

  // ── Render list card (matches the admin Events card design) ─────────
  const renderEvent = ({ item }) => {
    const badge = BADGE_STYLES[item.group] || BADGE_STYLES.all;
    const color = getGroupColor(item);
    const { day, month } = getDateParts(item.date);
    return (
      <View style={s.card}>
        <View style={[s.dateBlock, { backgroundColor: color }]}>
          <Text style={s.dateBlockDay}>{day}</Text>
          <Text style={s.dateBlockMonth}>{month}</Text>
        </View>
        <View style={s.cardInner}>
          <View style={s.cardTopRow}>
            <View style={[s.badge, s.badgeTop, { backgroundColor: badge.bg }]}>
              <Text style={[s.badgeText, { color: badge.text }]}>
                {item.groupLabel || item.group_name}
              </Text>
            </View>
            {item.googleCalendarEventId && (
              <Pressable
                style={s.gcalSyncedIcon}
                onPress={() => setGcalMenuTarget(item)}
              >
                <Text style={s.gcalSyncedIconText}>📅</Text>
              </Pressable>
            )}
          </View>
          <Pressable onPress={() => onEventPress && onEventPress(item)}>
            <Text style={s.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={s.cardMeta} numberOfLines={1}>
              {item.time} · {item.location}
            </Text>
            <Text style={s.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
          </Pressable>
        </View>
        <MusicTrace />
      </View>
    );
  };

  // ── Render calendar card ────────────────────────────────────────────
  const renderCalendarEvent = ({ item }) => {
    const color = getGroupColor(item);
    return (
      <View style={s.calCard}>
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
                {formatDate(item.date).split("/")[0]}
              </Text>
              <Text style={{ fontSize: 12, color: color, fontWeight: "500" }}>
                {formatDate(item.date).split("/").slice(1).join("/")}
              </Text>
            </View>
            <View style={[s.badge, { backgroundColor: color + "18" }]}>
              <Text style={[s.badgeText, { color }]}>
                {item.groupLabel || item.group_name}
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
      </View>
    );
  };

  return (
    <View style={s.safe}>
      {/* Sub-header: year badge + List/Calendar toggle */}
      <View style={s.toggleBar}>
        <View style={s.yearBadge}>
          <Text style={s.yearBadgeText}>Year {studentYear}</Text>
        </View>
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

      {/* Welcome */}
      <View style={s.welcomeBox}>
        <Text style={s.welcomeText}>
          {isAdmin
            ? `There ${myEvents.length !== 1 ? "are" : "is"} ${myEvents.length} upcoming event${myEvents.length !== 1 ? "s" : ""}.`
            : `Hello, ${studentName}! You have ${myEvents.length} upcoming event${myEvents.length !== 1 ? "s" : ""}.`}
        </Text>
      </View>

      {/* ── LIST VIEW ── */}
      {activeTab === "list" &&
        (myEvents.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 48 }}>🎵</Text>
            <Text style={s.emptyText}>
              {isAdmin
                ? "No upcoming events."
                : "No upcoming events for your group."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={myEvents}
            keyExtractor={(item) => String(item.id ?? item.event_id)}
            renderItem={renderEvent}
            contentContainerStyle={{
              padding: sp(2),
              gap: sp(1.5),
              paddingBottom: 100,
            }}
            showsVerticalScrollIndicator={false}
          />
        ))}

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

            {/* Week day headers */}
            <View style={s.weekHeaderRow}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <Text key={`header-${day}`} style={s.weekDayHeader}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={s.calendarGrid}>
              {/* Calendar days */}
              {calendarDays.map((day, idx) => {
                const dateStr = day
                  ? `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  : null;
                const hasEvent = dateStr && eventsByDate[dateStr];
                const eventColor = hasEvent
                  ? GROUP_COLORS[eventsByDate[dateStr][0]?.groupLabel] || T.teal
                  : null;
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;

                return (
                  <Pressable
                    key={idx}
                    style={[
                      s.calendarDay,
                      hasEvent && {
                        borderColor: eventColor,
                        borderWidth: 2.5,
                      },
                      isToday && s.calendarDayToday,
                      isSelected && s.calendarDaySelected,
                    ]}
                    onPress={() => {
                      if (day) {
                        setSelectedDate(isSelected ? null : dateStr);
                      }
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
                            numberOfLines={1}
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
              ? `Events on ${formatDate(selectedDate)}`
              : "All Events"}
          </Text>

          {calendarEvents.length === 0 ? (
            <Text style={s.noEvents}>No events on this day</Text>
          ) : (
            <FlatList
              data={calendarEvents}
              keyExtractor={(i) => String(i.id ?? i.event_id)}
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

      {/* GOOGLE CALENDAR ACTIONS — small menu opened from the 📅 icon */}
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
                  View &quot;{gcalMenuTarget?.title}&quot; directly
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

      {/* GOOGLE CALENDAR SUBSCRIBE INSTRUCTIONS — opened from the menu above */}
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
            <Text style={s.label}>Link</Text>
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
              1. Next to &quot;Other calendars&quot;, tap +{"\n"}
              2. Choose &quot;From URL&quot;{"\n"}
              3. Paste the link, then &quot;Add calendar&quot;
            </Text>
            <Text style={[s.label, { marginTop: sp(2) }]}>
              On iPhone (Apple Calendar)
            </Text>
            <Text style={s.icsStep}>
              Settings → Calendar → Accounts → Add Account → Other →{"\n"}
              Add Subscribed Calendar → paste the link
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
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  toggleBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: sp(2),
    paddingVertical: sp(1),
    backgroundColor: T.bg,
    borderBottomWidth: 1,
    borderBottomColor: "#e8eef2",
  },
  orgLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  pageTitle: { fontSize: 28, fontWeight: "900", color: "#fff", marginTop: 4 },

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
  yearBadge: {
    alignSelf: "flex-start",
    backgroundColor: T.teal + "18",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.teal + "40",
  },
  yearBadgeText: { color: T.teal, fontSize: 13, fontWeight: "700" },

  tabToggle: {
    backgroundColor: T.teal + "12",
    borderRadius: 10,
    flexDirection: "row",
    padding: 3,
  },
  tabToggleBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
  tabToggleBtnActive: { backgroundColor: T.teal },
  tabToggleText: {
    color: T.teal,
    fontWeight: "600",
    fontSize: 13,
  },
  tabToggleTextActive: { color: "#fff", fontWeight: "700" },

  welcomeBox: {
    margin: sp(2),
    backgroundColor: T.tealBg,
    borderRadius: 12,
    padding: sp(1.75),
    borderLeftWidth: 3,
    borderLeftColor: T.teal,
  },
  welcomeText: { color: "#333", fontSize: 14, lineHeight: 20 },

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

  // Modal (Google Calendar subscribe instructions)
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
  label: {
    color: T.textSub,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
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
  btnPrimary: {
    backgroundColor: T.teal,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnLight: { color: "#fff", fontWeight: "700", fontSize: 14 },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: sp(4),
  },
  emptyText: {
    color: T.text,
    fontSize: 16,
    fontWeight: "600",
    marginTop: sp(1.5),
    textAlign: "center",
  },

  // Event cards (list view) — side date block + content + trace,
  // matching the admin EventsScreen design (read-only: no edit/attendance
  // buttons and no delete button for students).
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
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: sp(0.75),
  },
  badgeTop: { alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontWeight: "700" },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: T.text,
    marginBottom: 4,
  },
  cardMeta: { fontSize: 13, color: T.textSub, marginBottom: sp(0.75) },
  cardDesc: { fontSize: 13, color: T.textSub, lineHeight: 19 },

  // Decorative music-note triangle (right edge of card)
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

  // Calendar view
  calendarScroll: { backgroundColor: T.white },
  calendarContainer: {
    padding: sp(2),
    backgroundColor: T.white,
  },
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
  monthNavBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: T.teal,
  },
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
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: sp(2),
  },
  calendarDay: {
    width: "13.8%",
    aspectRatio: 0.9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.white,
  },
  calendarDaySelected: {
    backgroundColor: T.teal,
    borderColor: T.teal,
  },
  calendarDayToday: {
    backgroundColor: T.tealBg,
    borderColor: T.teal,
    borderWidth: 2,
  },
  calendarDayNumToday: { color: T.teal, fontWeight: "800" },
  calendarDayNum: {
    fontSize: 13,
    fontWeight: "600",
    color: T.text,
  },
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

  // Calendar event cards
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
});
