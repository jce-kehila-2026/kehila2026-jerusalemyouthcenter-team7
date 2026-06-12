import { NotificationBell } from "@/src/components/NotificationBell";
import { useAuth } from "@/src/context/AuthContext";
import { FirestoreMsg, messageService } from "@/src/data/messageService";
import {
  events as mockEvents,
  forms as mockForms,
  messages as mockMessages,
  students as mockStudents,
} from "@/src/data/mockData";
import { notificationService } from "@/src/data/notificationService";
import { db } from "@/src/firebase/firebase";
import { notifColor, notifIcon } from "@/src/utils/notifMeta";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Brand Design System ────────────────────────────────────────────────────────
const B = {
  teal:       '#039899',
  red:        '#c56451',
  yellow:     '#cfad5d',
  purple:     '#6b5ce7',
  text:       '#1a1a2e',
  sub:        '#5a6a7a',
  muted:      '#9aa8b4',
  bg:         '#f5fafe',
  card:       '#ffffff',
  border:     '#e8eef2',
} as const;

// ── Types ──────────────────────────────────────────────────────────────────────
type DashEvent     = { id: string | number; title: string; date: string; location: string; registered: number; capacity: number };
type DashMsg       = { id: string; sender_name: string; content: string; timestamp: string; is_read: boolean };
type DashNotif     = { id: string | number; title: string; body: string; timestamp: string; is_read: boolean; type: string };

// ── Shared card wrapper (4px colour bar + teal shadow) ────────────────────────
function BrandCard({
  barColor = B.teal,
  style,
  padStyle,
  children,
}: {
  barColor?: string;
  style?: object;
  padStyle?: object;
  children: React.ReactNode;
}) {
  return (
    <View style={[st.shadow, style]}>
      <View style={st.cardOuter}>
        <View style={[st.colorBar, { backgroundColor: barColor }]} />
        <View style={[st.cardPad, padStyle]}>{children}</View>
      </View>
    </View>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  barColor,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  barColor: string;
}) {
  return (
    <BrandCard barColor={barColor} style={st.statWrap}>
      <View style={[st.statIconWrap, { backgroundColor: barColor + "22" }]}>
        <Ionicons name={icon} size={18} color={barColor} />
      </View>
      <Text style={st.statValue}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </BrandCard>
  );
}

// ── Section label (uppercase) ──────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return <Text style={st.sectionLabel}>{children.toUpperCase()}</Text>;
}

// ── Event row ──────────────────────────────────────────────────────────────────
function EventRow({ event, onPress }: { event: DashEvent; onPress: () => void }) {
  const d = new Date(event.date);
  return (
    <Pressable onPress={onPress}>
      <BrandCard barColor={B.teal} style={st.rowCard}>
        <View style={st.rowInner}>
          <View style={st.dateBox}>
            <Text style={st.dateDay}>{d.getDate()}</Text>
            <Text style={st.dateMon}>{d.toLocaleString("en", { month: "short" }).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.rowTitle} numberOfLines={1}>{event.title}</Text>
            <Text style={st.rowSub} numberOfLines={1}>📍 {event.location}</Text>
          </View>
          <View style={st.capBadge}>
            <Text style={st.capText}>{event.registered}/{event.capacity}</Text>
          </View>
        </View>
      </BrandCard>
    </Pressable>
  );
}

// ── Notification row ───────────────────────────────────────────────────────────
function NotifRow({ notif }: { notif: DashNotif }) {
  const color = notifColor(notif.type as Parameters<typeof notifColor>[0]);
  const icon  = notifIcon(notif.type as Parameters<typeof notifIcon>[0]);
  return (
    <BrandCard barColor={color} style={st.rowCard}>
      <View style={st.rowInner}>
        <View style={[st.notifIconWrap, { backgroundColor: color + "22" }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.rowTitle}>{notif.title}</Text>
          <Text style={st.rowSub} numberOfLines={1}>{notif.body}</Text>
        </View>
        {!notif.is_read && <View style={st.unreadDot} />}
      </View>
    </BrandCard>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user }  = useAuth();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const isAdmin   = user?.role === "admin";

  const [loading, setLoading]                   = useState(true);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [studentCount, setStudentCount]         = useState((mockStudents || []).length);
  const [eventList, setEventList]               = useState<DashEvent[]>(mockEvents || []);
  const [formCount, setFormCount]               = useState((mockForms || []).length);
  const [notifList, setNotifList]               = useState<DashNotif[]>([]);
  const [messageList, setMessageList]           = useState<DashMsg[]>(
    (mockMessages || []).map((m) => ({ ...m, id: String(m.id) })),
  );
  const [myRegisteredEventIds, setMyRegisteredEventIds] = useState<(string | number)[]>([]);

  // ── Derived values ────────────────────────────────────────────────────────
  const now               = new Date();
  const unreadNotifications = notifList.filter((n) => !n.is_read).length;
  const unreadMessages    = isAdmin
    ? messageList.filter((m) => !m.is_read).length
    : messageList.filter((m) => !m.is_read && (m as any).receiver_id === user?.uid).length;
  const myUpcomingEvents = eventList.filter(
    (e) => myRegisteredEventIds.includes(e.id) && new Date(e.date) >= now,
  );

  // ── Firebase loading ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    let unsubRequests = () => {};
    if (isAdmin) {
      const reqQ = query(collection(db, "join_requests"), where("status", "==", "pending"));
      unsubRequests = onSnapshot(reqQ, (snap) => setPendingRequestCount(snap.size));
    }

    const fetchStatic = async () => {
      try {
        const [studsSnap, evtsSnap, formsSnap, esSnap] = await Promise.allSettled([
          getDocs(collection(db, "students")),
          getDocs(collection(db, "events")),
          getDocs(collection(db, "forms")),
          getDocs(collection(db, "event_students")),
        ]);

        if (studsSnap.status === "fulfilled" && studsSnap.value.size > 0)
          setStudentCount(studsSnap.value.size);

        if (evtsSnap.status === "fulfilled" && evtsSnap.value.size > 0)
          setEventList(evtsSnap.value.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DashEvent, "id">) })));

        if (formsSnap.status === "fulfilled" && formsSnap.value.size > 0)
          setFormCount(formsSnap.value.size);

        if (esSnap.status === "fulfilled" && esSnap.value.size > 0) {
          const myIds = esSnap.value.docs
            .filter((d) => d.data().student_id === user.uid)
            .map((d) => d.data().event_id as string);
          if (myIds.length > 0) setMyRegisteredEventIds(myIds);
        }
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchStatic();

    const unsubNotif = notificationService.subscribe(
      (notifs) => { if (notifs.length > 0 || !loading) setNotifList(notifs); },
      user.uid,
      isAdmin ? "admin" : "singer",
    );

    const unsubMessages = messageService.subscribe((msgs: FirestoreMsg[]) => {
      if (msgs.length > 0) {
        const relevant = isAdmin
          ? msgs.filter((m) => m.receiver_id === "admin")
          : msgs.filter((m) => m.receiver_id === user.uid || m.sender_id === user.uid);
        setMessageList(relevant.slice().reverse());
      }
    });

    return () => { unsubNotif(); unsubMessages(); unsubRequests(); };
  }, [user?.uid]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[st.screen, st.center]}>
        <ActivityIndicator size="large" color={B.teal} />
      </View>
    );
  }

  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  return (
    <View style={st.screen}>
      {/* ── Teal Brand Header ─────────────────────────────────────────────── */}
      <View style={[st.header, { paddingTop: insets.top + 16 }]}>
        <View style={{ flex: 1 }}>
          <Text style={st.headerSub}>🎵 Jerusalem Youth Chorus</Text>
          <Text style={st.headerTitle}>
            {isAdmin ? "Dashboard" : `Hey, ${firstName} 👋`}
          </Text>
        </View>
        <View style={st.headerActions}>
          <Pressable
            onPress={() => router.push("/(tabs)/messages" as any)}
            style={st.headerIconWrap}
            hitSlop={8}
          >
            <Ionicons name="chatbubbles-outline" size={22} color="#fff" />
            {unreadMessages > 0 && (
              <View style={st.badge}>
                <Text style={st.badgeText}>{unreadMessages > 9 ? "9+" : unreadMessages}</Text>
              </View>
            )}
          </Pressable>
          <NotificationBell
            unreadCount={unreadNotifications}
            color="#fff"
            onPress={() => router.push("/(tabs)/notifications" as any)}
          />
          <Pressable onPress={() => router.push("/profile" as any)}>
            <View style={st.avatar}>
              <Text style={st.avatarText}>{user?.full_name?.charAt(0) ?? "?"}</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>

        {isAdmin ? (
          /* ── ADMIN VIEW ─────────────────────────────────────────────────── */
          <>
            <SectionLabel>Overview</SectionLabel>
            <View style={st.grid}>
              <StatCard label="Students"     value={studentCount}      icon="people"          barColor={B.teal}   />
              <StatCard label="Events"        value={eventList.length}  icon="calendar"        barColor={B.yellow} />
              <StatCard label="Forms"         value={formCount}         icon="document-text"   barColor={B.teal}   />
              <StatCard label="Notifications" value={unreadNotifications} icon="notifications" barColor={B.red}    />
            </View>

            {/* Our Statistics button */}
            <Pressable
              style={st.statsBtn}
              onPress={() => router.push("/statistics" as any)}
            >
              <View style={st.statsBtnIcon}>
                <Ionicons name="bar-chart" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.statsBtnTitle}>Our Statistics</Text>
                <Text style={st.statsBtnSub}>Attendance · Growth · Demographics</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </Pressable>

            <SectionLabel>Upcoming Events</SectionLabel>
            {eventList.filter((e) => new Date(e.date) >= now).slice(0, 3).length === 0 ? (
              <View style={st.emptyBox}>
                <Ionicons name="calendar-outline" size={40} color={B.muted} />
                <Text style={st.emptyText}>No upcoming events</Text>
              </View>
            ) : (
              eventList
                .filter((e) => new Date(e.date) >= now)
                .slice(0, 3)
                .map((event) => (
                  <EventRow
                    key={String(event.id)}
                    event={event}
                    onPress={() => router.push(`/event/${event.id}` as any)}
                  />
                ))
            )}
          </>
        ) : (
          /* ── STUDENT VIEW ───────────────────────────────────────────────── */
          <>
            <SectionLabel>Overview</SectionLabel>
            <View style={st.grid}>
              <StatCard label="My Events"     value={myRegisteredEventIds.length} icon="calendar"      barColor={B.teal}   />
              <StatCard label="Forms"          value={formCount}                   icon="document-text" barColor={B.yellow} />
              <StatCard label="Unread Notifs"  value={unreadNotifications}         icon="notifications" barColor={B.red}    />
            </View>

            <SectionLabel>My Upcoming Events</SectionLabel>
            {myUpcomingEvents.length === 0 ? (
              <View style={st.emptyBox}>
                <Ionicons name="calendar-outline" size={40} color={B.muted} />
                <Text style={st.emptyText}>No upcoming events</Text>
              </View>
            ) : (
              myUpcomingEvents.map((event) => (
                <EventRow
                  key={String(event.id)}
                  event={event}
                  onPress={() => router.push(`/event/${event.id}` as any)}
                />
              ))
            )}

            <SectionLabel>Recent Notifications</SectionLabel>
            {notifList.slice(0, 3).map((notif) => (
              <NotifRow key={String(notif.id)} notif={notif} />
            ))}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  // ── Layout
  screen:   { flex: 1, backgroundColor: B.bg },
  center:   { flex: 1, alignItems: "center", justifyContent: "center" },

  // ── Teal header
  header: {
    backgroundColor: B.teal,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  headerSub:  { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "500" },
  headerTitle:{ color: "#fff", fontSize: 32, fontWeight: "900", marginTop: 4 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 4 },
  headerIconWrap: { position: "relative", padding: 6 },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: B.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText:  { color: "#fff", fontSize: 9, fontWeight: "800" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // ── Scroll
  scroll: { padding: 16, paddingTop: 8 },

  // ── Section label
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: B.muted,
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 8,
  },

  // ── BrandCard structure
  shadow: {
    shadowColor: B.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    borderRadius: 16,
    marginBottom: 8,
  },
  cardOuter: {
    backgroundColor: B.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: B.border,
    overflow: "hidden",
  },
  colorBar: { height: 4 },
  cardPad:  { padding: 16 },

  // ── Stats grid (2-column wrap)
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statWrap: { flex: 1, minWidth: "45%", marginBottom: 0 },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: { fontSize: 28, fontWeight: "900", color: B.text },
  statLabel: { fontSize: 12, fontWeight: "600", color: B.sub, marginTop: 2 },

  // ── Our Statistics button
  statsBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    backgroundColor: B.teal,
    gap: 16,
    marginTop: 24,
    marginBottom: 8,
    shadowColor: B.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 5,
  },
  statsBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsBtnTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },
  statsBtnSub:   { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },

  // ── Event / notif rows
  rowCard:  { marginBottom: 8 },
  rowInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  dateBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: B.teal + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  dateDay: { fontSize: 18, fontWeight: "900", color: B.teal },
  dateMon: { fontSize: 9, fontWeight: "700", color: B.teal, letterSpacing: 0.5 },
  rowTitle:{ fontSize: 14, fontWeight: "700", color: B.text, marginBottom: 3 },
  rowSub:  { fontSize: 12, color: B.sub },
  capBadge:{ backgroundColor: B.teal + "18", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  capText: { fontSize: 11, fontWeight: "700", color: B.teal },

  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: B.teal },

  // ── Empty state
  emptyBox:  { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 14, color: B.muted },
});
