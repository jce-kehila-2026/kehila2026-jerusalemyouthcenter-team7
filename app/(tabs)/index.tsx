import { NotificationBell } from "@/src/components/NotificationBell";
import { ManageAdminsModal } from "@/src/components/ManageAdminsModal";
import { useAuth } from "@/src/context/AuthContext";
import { FirestoreMsg, messageService } from "@/src/data/messageService";
import { notificationService } from "@/src/data/notificationService";
import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
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

// ── Design tokens ─────────────────────────────────────────────────────────────
const TEAL   = "#039899";
const RED    = "#c56451";
const AMBER  = "#cfad5d";
const ORANGE = "#e07050";
const DARK   = "#1a1a2e";
const SUB    = "#5a6a7a";
const MUTED  = "#9aa8b4";
const BORDER = "#e8eef2";
const BG     = "#f5fafe";

// ── Weekly attendance mock data (replace with real Firestore query if needed) ─
const WEEKLY = [
  { day: "Sun", pct: 35 },
  { day: "Mon", pct: 85 },
  { day: "Tue", pct: 70 },
  { day: "Wed", pct: 90 },
  { day: "Thu", pct: 45 },
  { day: "Fri", pct: 95 },
  { day: "Sat", pct: 40 },
];
const AVG_PCT = 82;
const BAR_MAX = 72; // px — tallest possible bar

// ── Types ──────────────────────────────────────────────────────────────────────
type DashEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  registered?: number;
  capacity?: number;
};
type DashNotif = {
  id: string | number;
  title: string;
  body: string;
  timestamp: string;
  is_read: boolean;
  type: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysUntil(dateStr: string) {
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function notifDotColor(n: DashNotif) {
  const t = (n.title + " " + n.body).toLowerCase();
  if (t.includes("request") || t.includes("join")) return TEAL;
  if (t.includes("overdue") || t.includes("form"))  return RED;
  return AMBER;
}

function todayString() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[st.card, style]}>{children}</View>;
}

function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <View style={st.secHeader}>
      <Text style={st.secTitle}>{title}</Text>
      <Pressable onPress={onAction} hitSlop={10}>
        <Text style={st.secAction}>{action}</Text>
      </Pressable>
    </View>
  );
}

function StatBox({
  value,
  label,
  sub,
  valueColor,
  subColor,
  icon,
  onPress,
  last,
}: {
  value: number | string;
  label: string;
  sub: string;
  valueColor: string;
  subColor: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[st.statBox, !last && st.statBoxBorder]}
    >
      <View style={st.statIconRow}>
        <Ionicons name={icon} size={11} color={MUTED} />
        <Text style={[st.statValue, { color: valueColor }]}>{value}</Text>
      </View>
      <View style={st.statLabelRow}>
        <Ionicons name="checkbox-outline" size={10} color={MUTED} />
        <Text style={st.statLabel}>{label}</Text>
      </View>
      <Text style={[st.statSub, { color: subColor }]}>{sub}</Text>
    </Pressable>
  );
}

function WeeklyChart() {
  const low  = Math.min(...WEEKLY.map((d) => d.pct));
  const high = Math.max(...WEEKLY.map((d) => d.pct));

  return (
    <View>
      <View style={st.chartRow}>
        {WEEKLY.map((item) => (
          <View key={item.day} style={st.barCol}>
            <View
              style={[
                st.bar,
                {
                  height: Math.max(6, (item.pct / 100) * BAR_MAX),
                  backgroundColor:
                    item.pct >= AVG_PCT ? TEAL : TEAL + "55",
                },
              ]}
            />
            <Text style={st.barLabel}>{item.day}</Text>
          </View>
        ))}
      </View>
      <View style={st.chartFooter}>
        <Text style={st.chartStat}>
          <Text style={st.chartStatMuted}>Low </Text>
          {low}%
        </Text>
        <Text style={[st.chartStat, { color: TEAL }]}>
          Avg {AVG_PCT}%
        </Text>
        <Text style={st.chartStat}>
          <Text style={st.chartStatMuted}>High </Text>
          {high}%
        </Text>
      </View>
    </View>
  );
}

function EventRow({ event, onPress }: { event: DashEvent; onPress: () => void }) {
  const d    = new Date(event.date);
  const days = daysUntil(event.date);
  const day  = d.getDate();
  const mon  = d.toLocaleString("en-US", { month: "short" }).toUpperCase();

  return (
    <Pressable onPress={onPress} style={st.eventRow}>
      <View style={st.eventDate}>
        <Text style={st.eventDay}>{day}</Text>
        <Text style={st.eventMon}>{mon}</Text>
      </View>
      <View style={st.eventDateBar} />
      <View style={{ flex: 1 }}>
        <Text style={st.eventTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={st.eventSub} numberOfLines={1}>
          {event.time ? `${event.time} · ` : ""}{event.location}
        </Text>
      </View>
      {days > 0 && (
        <View
          style={[
            st.eventBadge,
            days <= 7
              ? { backgroundColor: TEAL + "18" }
              : { backgroundColor: BORDER },
          ]}
        >
          <Text
            style={[
              st.eventBadgeText,
              { color: days <= 7 ? TEAL : MUTED },
            ]}
          >
            {days <= 7 ? `${days} days` : "Upcoming"}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function ActivityItem({ notif }: { notif: DashNotif }) {
  return (
    <View style={st.actRow}>
      <View style={[st.actDot, { backgroundColor: notifDotColor(notif) }]} />
      <View style={{ flex: 1 }}>
        <Text style={st.actTitle} numberOfLines={1}>{notif.title}</Text>
        <Text style={st.actTime}>{relativeTime(notif.timestamp)}</Text>
      </View>
      <View style={st.actCheck} />
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user }  = useAuth();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const isAdmin   = user?.role === "admin";

  const [loading, setLoading]               = useState(true);
  const [singerCount, setSingerCount]       = useState(0);
  const [adminCount, setAdminCount]         = useState(0);
  const [requestCount, setRequestCount]     = useState(0);
  const [eventList, setEventList]           = useState<DashEvent[]>([]);
  const [notifList, setNotifList]           = useState<DashNotif[]>([]);
  const [myEventIds, setMyEventIds]         = useState<string[]>([]);
  const [manageAdminsOpen, setManageAdminsOpen] = useState(false);

  const now            = new Date();
  const upcomingEvents = eventList
    .filter((e) => new Date(e.date) >= now)
    .sort((a, b) => a.date.localeCompare(b.date));

  const unreadNotifs = notifList.filter((n) => !n.is_read).length;
  const firstName    = user?.full_name?.split(" ")[0] ?? "there";

  // ── Data fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetch = async () => {
      try {
        const results = await Promise.allSettled([
          getDocs(query(collection(db, "users"), where("role", "==", "singer"))),
          getDocs(query(collection(db, "users"), where("role", "==", "admin"))),
          getDocs(query(collection(db, "users"), where("role", "==", "join-request"))),
          getDocs(collection(db, "events")),
          getDocs(collection(db, "event_students")),
        ]);

        const [singers, admins, requests, events, es] = results;

        if (singers.status   === "fulfilled") setSingerCount(singers.value.size);
        if (admins.status    === "fulfilled") setAdminCount(admins.value.size);
        if (requests.status  === "fulfilled") setRequestCount(requests.value.size);
        if (events.status    === "fulfilled")
          setEventList(
            events.value.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DashEvent, "id">) })),
          );
        if (es.status === "fulfilled") {
          const ids = es.value.docs
            .filter((d) => d.data().student_id === user.uid)
            .map((d) => String(d.data().event_id));
          setMyEventIds(ids);
        }
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetch();

    const unsubNotif = notificationService.subscribe(
      (ns) => setNotifList(ns),
      user.uid,
      isAdmin ? "admin" : "singer",
    );

    const unsubMsg = messageService.subscribe((_msgs: FirestoreMsg[]) => {});

    return () => { unsubNotif(); unsubMsg(); };
  }, [user?.uid]);

  if (loading) {
    return (
      <View style={[st.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ADMIN VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (isAdmin) {
    return (
      <View style={st.screen}>
        {/* ── Teal header ─────────────────────────────────────────────── */}
        <View style={[st.header, { paddingTop: insets.top + 12 }]}>
          <View style={st.headerTop}>
            <View style={st.headerLeft}>
              <Ionicons name="musical-notes" size={18} color="rgba(255,255,255,0.8)" />
              <Text style={st.headerAppName}>Jerusalem Youth Chorus</Text>
            </View>
            <View style={st.headerRight}>
              <Pressable
                onPress={() => router.push("/(tabs)/messages" as any)}
                style={st.headerIconBtn}
                hitSlop={8}
              >
                <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
                {/* unread badge if needed */}
              </Pressable>
              <NotificationBell
                unreadCount={unreadNotifs}
                color="#fff"
                onPress={() => router.push("/(tabs)/notifications" as any)}
              />
              <Pressable onPress={() => router.push("/profile" as any)}>
                <View style={st.avatar}>
                  <Text style={st.avatarText}>
                    {user?.full_name?.charAt(0) ?? "A"}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
          <Text style={st.headerWelcome}>Welcome back</Text>
          <Text style={st.headerTitle}>Dashboard</Text>
          <Text style={st.headerDate}>{todayString()}</Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Attendance + Stats card ─────────────────────────────── */}
          <SectionCard>
            {/* Attendance rate */}
            <Text style={st.attLabel}>ATTENDANCE RATE</Text>
            <View style={st.attRow}>
              <Text style={st.attNumber}>{AVG_PCT}</Text>
              <Text style={st.attPercent}>%</Text>
            </View>
            <Text style={st.attSub}>
              This week · 8 of 10 singers present
            </Text>
            <View style={st.progressTrack}>
              <View
                style={[st.progressFill, { width: `${AVG_PCT}%` as any }]}
              />
            </View>

            {/* Divider */}
            <View style={st.divider} />

            {/* 4 stat boxes */}
            <View style={st.statsRow}>
              <StatBox
                value={singerCount}
                label="Singers"
                sub="in app"
                valueColor={TEAL}
                subColor={TEAL}
                icon="people-outline"
                onPress={() => router.push("/(tabs)/students" as any)}
              />
              <StatBox
                value={upcomingEvents.length}
                label="Events"
                sub={`${upcomingEvents.length} upcoming`}
                valueColor={AMBER}
                subColor={AMBER}
                icon="calendar-outline"
                onPress={() => router.push("/(tabs)/events" as any)}
              />
              <StatBox
                value={adminCount}
                label="Admins"
                sub="manage app"
                valueColor={DARK}
                subColor={SUB}
                icon="shield-checkmark-outline"
                onPress={() => setManageAdminsOpen(true)}
              />
              <StatBox
                value={requestCount}
                label="Requests"
                sub="pending"
                valueColor={ORANGE}
                subColor={ORANGE}
                icon="person-add-outline"
                onPress={() =>
                  router.push("/(tabs)/students?action=join-requests" as any)
                }
                last
              />
            </View>
          </SectionCard>

          {/* ── Weekly Attendance chart ─────────────────────────────── */}
          <SectionCard>
            <SectionHeader
              title="Weekly Attendance"
              action="Full stats →"
              onAction={() => router.push("/statistics" as any)}
            />
            <WeeklyChart />
          </SectionCard>

          {/* ── Upcoming Events ──────────────────────────────────────── */}
          <SectionCard>
            <SectionHeader
              title="Upcoming Events"
              action="View all →"
              onAction={() => router.push("/(tabs)/events" as any)}
            />
            {upcomingEvents.length === 0 ? (
              <View style={st.emptyInCard}>
                <Ionicons name="calendar-outline" size={36} color={MUTED} />
                <Text style={st.emptyText}>No upcoming events</Text>
              </View>
            ) : (
              upcomingEvents.slice(0, 2).map((e, i) => (
                <View key={e.id}>
                  {i > 0 && <View style={st.rowDivider} />}
                  <EventRow
                    event={e}
                    onPress={() => router.push(`/event/${e.id}` as any)}
                  />
                </View>
              ))
            )}
          </SectionCard>

          {/* ── Recent Activity ──────────────────────────────────────── */}
          {notifList.length > 0 && (
            <SectionCard>
              <SectionHeader
                title="Recent Activity"
                action="See all →"
                onAction={() => router.push("/(tabs)/notifications" as any)}
              />
              {notifList.slice(0, 3).map((n, i) => (
                <View key={String(n.id)}>
                  {i > 0 && <View style={st.rowDivider} />}
                  <ActivityItem notif={n} />
                </View>
              ))}
            </SectionCard>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* ── Manage Admins Modal ──────────────────────────────────── */}
        <ManageAdminsModal
          visible={manageAdminsOpen}
          onClose={() => setManageAdminsOpen(false)}
        />
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SINGER VIEW
  // ══════════════════════════════════════════════════════════════════════════
  const myUpcoming = upcomingEvents.filter((e) => myEventIds.includes(e.id));

  return (
    <View style={st.screen}>
      {/* ── Teal header ───────────────────────────────────────────────── */}
      <View style={[st.header, { paddingTop: insets.top + 12 }]}>
        <View style={st.headerTop}>
          <View style={st.headerLeft}>
            <Ionicons name="musical-notes" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={st.headerAppName}>Jerusalem Youth Chorus</Text>
          </View>
          <View style={st.headerRight}>
            <Pressable
              onPress={() => router.push("/(tabs)/messages" as any)}
              style={st.headerIconBtn}
              hitSlop={8}
            >
              <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
            </Pressable>
            <NotificationBell
              unreadCount={unreadNotifs}
              color="#fff"
              onPress={() => router.push("/(tabs)/notifications" as any)}
            />
            <Pressable onPress={() => router.push("/profile" as any)}>
              <View style={st.avatar}>
                <Text style={st.avatarText}>
                  {user?.full_name?.charAt(0) ?? "S"}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
        <Text style={st.headerWelcome}>Welcome back</Text>
        <Text style={st.headerTitle}>Hey, {firstName} 👋</Text>
        <Text style={st.headerDate}>{todayString()}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Quick stats ─────────────────────────────────────────────── */}
        <SectionCard>
          <View style={st.statsRow}>
            <StatBox
              value={myEventIds.length}
              label="My Events"
              sub="registered"
              valueColor={TEAL}
              subColor={TEAL}
              icon="calendar-outline"
              onPress={() => router.push("/(tabs)/events" as any)}
            />
            <StatBox
              value={eventList.length}
              label="All Events"
              sub="available"
              valueColor={AMBER}
              subColor={AMBER}
              icon="calendar-outline"
              onPress={() => router.push("/(tabs)/events" as any)}
              last
            />
          </View>
        </SectionCard>

        {/* ── My Upcoming Events ─────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            title="My Schedule"
            action="Browse →"
            onAction={() => router.push("/(tabs)/events" as any)}
          />
          {myUpcoming.length === 0 ? (
            <View style={st.emptyInCard}>
              <Ionicons name="calendar-outline" size={36} color={MUTED} />
              <Text style={st.emptyText}>No registered events</Text>
              <Pressable
                style={st.emptyBtn}
                onPress={() => router.push("/(tabs)/events" as any)}
              >
                <Text style={st.emptyBtnText}>Browse Events</Text>
              </Pressable>
            </View>
          ) : (
            myUpcoming.slice(0, 3).map((e, i) => (
              <View key={e.id}>
                {i > 0 && <View style={st.rowDivider} />}
                <EventRow
                  event={e}
                  onPress={() => router.push(`/event/${e.id}` as any)}
                />
              </View>
            ))
          )}
        </SectionCard>

        {/* ── Recent Activity ────────────────────────────────────────── */}
        {notifList.length > 0 && (
          <SectionCard>
            <SectionHeader
              title="Recent Activity"
              action="See all →"
              onAction={() => router.push("/(tabs)/notifications" as any)}
            />
            {notifList.slice(0, 3).map((n, i) => (
              <View key={String(n.id)}>
                {i > 0 && <View style={st.rowDivider} />}
                <ActivityItem notif={n} />
              </View>
            ))}
          </SectionCard>
        )}

        {/* ── Quick links ────────────────────────────────────────────── */}
        <SectionCard style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[
            { icon: "document-text-outline" as const, label: "Forms",    route: "/(tabs)/forms" },
            { icon: "calendar-outline"      as const, label: "Calendar", route: "/(tabs)/calendar" },
            { icon: "chatbubbles-outline"   as const, label: "Messages", route: "/(tabs)/messages" },
            { icon: "person-circle-outline" as const, label: "Profile",  route: "/profile" },
          ].map((q) => (
            <Pressable
              key={q.label}
              style={st.quickLink}
              onPress={() => router.push(q.route as any)}
            >
              <Ionicons name={q.icon} size={20} color={TEAL} />
              <Text style={st.quickLinkText}>{q.label}</Text>
            </Pressable>
          ))}
        </SectionCard>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // ── Header
  header: {
    backgroundColor: TEAL,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerAppName: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "600" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerIconBtn: { position: "relative", padding: 4 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  headerWelcome: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500" },
  headerTitle:   { color: "#fff", fontSize: 34, fontWeight: "900", marginTop: 2 },
  headerDate:    { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 3 },

  // ── Scroll content
  scroll: { padding: 14, paddingTop: 16 },

  // ── Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },

  // ── Section header
  secHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  secTitle:  { fontSize: 16, fontWeight: "800", color: DARK },
  secAction: { fontSize: 13, fontWeight: "700", color: TEAL },

  // ── Attendance
  attLabel:  { fontSize: 11, fontWeight: "700", color: MUTED, letterSpacing: 1, marginBottom: 8 },
  attRow:    { flexDirection: "row", alignItems: "flex-start", gap: 2 },
  attNumber: { fontSize: 64, fontWeight: "900", color: TEAL, lineHeight: 70 },
  attPercent:{ fontSize: 28, fontWeight: "700", color: TEAL, marginTop: 12 },
  attSub:    { fontSize: 13, color: MUTED, marginTop: 4, marginBottom: 12 },
  progressTrack: {
    height: 8,
    backgroundColor: BORDER,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: { height: 8, backgroundColor: TEAL, borderRadius: 4 },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 16 },

  // ── Stats row
  statsRow: { flexDirection: "row" },
  statBox: { flex: 1, paddingHorizontal: 6, paddingVertical: 2, alignItems: "flex-start" },
  statBoxBorder: { borderRightWidth: 1, borderRightColor: BORDER },
  statIconRow:  { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 2 },
  statValue:    { fontSize: 26, fontWeight: "900" },
  statLabel:    { fontSize: 11, fontWeight: "600", color: DARK },
  statSub:      { fontSize: 10, fontWeight: "600" },

  // ── Bar chart
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: BAR_MAX + 20,
    gap: 4,
    marginBottom: 12,
  },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", height: BAR_MAX + 20 },
  bar:    { width: "70%", borderRadius: 4 },
  barLabel: { fontSize: 9, fontWeight: "600", color: MUTED, marginTop: 5 },
  chartFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
  },
  chartStat:     { fontSize: 12, fontWeight: "700", color: SUB },
  chartStatMuted:{ fontWeight: "400", color: MUTED },

  // ── Event row
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  eventDate: { alignItems: "center", minWidth: 36 },
  eventDay:  { fontSize: 22, fontWeight: "900", color: TEAL, lineHeight: 24 },
  eventMon:  { fontSize: 9,  fontWeight: "700", color: TEAL, letterSpacing: 0.5 },
  eventDateBar: {
    width: 2,
    height: 36,
    backgroundColor: AMBER,
    borderRadius: 1,
  },
  eventTitle: { fontSize: 14, fontWeight: "700", color: DARK, marginBottom: 3 },
  eventSub:   { fontSize: 12, color: SUB },
  eventBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  eventBadgeText: { fontSize: 11, fontWeight: "700" },

  // ── Activity item
  actRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  actDot:   { width: 10, height: 10, borderRadius: 5 },
  actTitle: { fontSize: 14, fontWeight: "600", color: DARK, marginBottom: 2 },
  actTime:  { fontSize: 12, color: MUTED },
  actCheck: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: BORDER,
  },

  // ── Row divider
  rowDivider: { height: 1, backgroundColor: BORDER },

  // ── Empty states
  emptyInCard: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText:   { fontSize: 13, color: MUTED },
  emptyBtn: {
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: TEAL,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  emptyBtnText: { fontSize: 13, fontWeight: "700", color: TEAL },

  // ── Quick links (singer)
  quickLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: "45%",
    borderWidth: 1.5,
    borderColor: TEAL + "44",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: TEAL + "08",
  },
  quickLinkText: { fontSize: 13, fontWeight: "700", color: TEAL },
});
