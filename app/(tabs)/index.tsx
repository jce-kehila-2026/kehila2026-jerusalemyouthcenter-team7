import { NotificationBell } from "@/src/components/NotificationBell";
import { useAuth } from "@/src/context/AuthContext";
import { FirestoreMsg, messageService } from "@/src/data/messageService";
import {
  COLORS,
  events as mockEvents,
  forms as mockForms,
  students as mockStudents,
} from "@/src/data/mockData";
import { notificationService } from "@/src/data/notificationService";
import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
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

// ── Types ──────────────────────────────────────────────────────────────────────
type DashEvent = {
  id: string | number;
  title: string;
  date: string;
  location: string;
  registered: number;
  capacity: number;
  group_ids?: string[];
};
type DashMsg   = { id: string; sender_name: string; content: string; timestamp: string; is_read: boolean };
type DashNotif = { id: string | number; title: string; body: string; timestamp: string; is_read: boolean; type: string };

// ── Static music library highlights (mock until library service is wired up) ──
const MUSIC_HIGHLIGHTS = [
  { id: "1", name: "Baruch Hashem — Full Score",       ext: "PDF", color: COLORS.red  },
  { id: "2", name: "Shabbat Medley — Rehearsal Track", ext: "MP3", color: COLORS.teal },
  { id: "3", name: "Jerusalem Song — Choir Parts",     ext: "PDF", color: COLORS.red  },
] as const;

// ── Shared BrandCard (4 px colour bar + teal shadow) ─────────────────────────
function BrandCard({
  barColor = COLORS.teal,
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

// ── Tappable KPI card ─────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  barColor,
  onPress,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  barColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={st.statWrap}>
      <BrandCard barColor={barColor} style={{ flex: 1, marginBottom: 0 }}>
        <View style={[st.statIconWrap, { backgroundColor: barColor + "22" }]}>
          <Ionicons name={icon} size={18} color={barColor} />
        </View>
        <Text style={st.statValue}>{value}</Text>
        <Text style={st.statLabel}>{label}</Text>
        <View style={st.statFooter}>
          <Text style={[st.statFooterText, { color: barColor }]}>View →</Text>
        </View>
      </BrandCard>
    </Pressable>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return <Text style={st.sectionLabel}>{children.toUpperCase()}</Text>;
}

// ── Widget header: title left, action link right ──────────────────────────────
function WidgetHeader({
  icon,
  title,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={st.widgetHeader}>
      <View style={st.widgetHeaderLeft}>
        <Ionicons name={icon} size={15} color={COLORS.teal} />
        <Text style={st.widgetTitle}>{title}</Text>
      </View>
      <Pressable onPress={onAction} hitSlop={12}>
        <Text style={st.widgetLink}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

// ── Card footer CTA ──────────────────────────────────────────────────────────
function CardFooter({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={st.cardFooter}>
      <Text style={st.cardFooterText}>{label}</Text>
      <Ionicons name="arrow-forward" size={13} color={COLORS.teal} />
    </Pressable>
  );
}

// ── Event row (lives inside zero-padded BrandCard) ────────────────────────────
function EventRow({ event, onPress }: { event: DashEvent; onPress: () => void }) {
  const d    = new Date(event.date);
  const fill = event.capacity > 0 ? Math.round((event.registered / event.capacity) * 100) : 0;
  return (
    <Pressable onPress={onPress} style={st.eventRow}>
      <View style={st.dateBox}>
        <Text style={st.dateDay}>{d.getDate()}</Text>
        <Text style={st.dateMon}>{d.toLocaleString("en", { month: "short" }).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.rowTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={st.rowSub}   numberOfLines={1}>📍 {event.location}</Text>
        {/* capacity progress bar */}
        <View style={st.fillTrack}>
          <View
            style={[
              st.fillBar,
              {
                width: `${Math.min(fill, 100)}%` as any,
                backgroundColor: fill > 80 ? COLORS.red : COLORS.teal,
              },
            ]}
          />
        </View>
      </View>
      <View style={st.eventRight}>
        <Text style={st.capText}>{event.registered}/{event.capacity}</Text>
        <Ionicons name="chevron-forward" size={14} color={COLORS.muted} />
      </View>
    </Pressable>
  );
}

// ── Music Library widget ──────────────────────────────────────────────────────
function MusicLibraryWidget({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  return (
    <BrandCard barColor={COLORS.teal} padStyle={{ padding: 0 }}>
      <WidgetHeader
        icon="musical-notes"
        title="Recently Added Music"
        actionLabel="Open Library →"
        onAction={onOpenLibrary}
      />

      {MUSIC_HIGHLIGHTS.map((item) => (
        <Pressable key={item.id} onPress={onOpenLibrary} style={st.musicRow}>
          <View style={[st.extBadge, { backgroundColor: item.color + "18" }]}>
            <Text style={[st.extText, { color: item.color }]}>{item.ext}</Text>
          </View>
          <Text style={st.musicName} numberOfLines={1}>{item.name}</Text>
          <Ionicons
            name={item.ext === "MP3" ? "play-circle-outline" : "download-outline"}
            size={20}
            color={COLORS.teal}
          />
        </Pressable>
      ))}

      <Pressable onPress={onOpenLibrary} style={st.musicFooterBtn}>
        <Ionicons name="library-outline" size={14} color="#fff" />
        <Text style={st.musicFooterBtnText}>Browse Full Library</Text>
      </Pressable>
    </BrandCard>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user }  = useAuth();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const isAdmin   = user?.role === "admin";

  const [loading, setLoading]                         = useState(true);
  const [studentCount, setStudentCount]               = useState((mockStudents || []).length);
  const [eventList, setEventList]                     = useState<DashEvent[]>((mockEvents as DashEvent[]) || []);
  const [formCount, setFormCount]                     = useState((mockForms || []).length);
  const [notifList, setNotifList]                     = useState<DashNotif[]>([]);
  const [messageList, setMessageList]                 = useState<DashMsg[]>([]);
  const [myRegisteredEventIds, setMyRegisteredEventIds] = useState<(string | number)[]>([]);

  const now                 = new Date();
  const unreadNotifications = notifList.filter((n) => !n.is_read).length;
  const unreadMessages      = isAdmin
    ? messageList.filter((m) => !m.is_read).length
    : messageList.filter((m) => !m.is_read && (m as any).receiver_id === user?.uid).length;

  const upcomingEvents = eventList
    .filter((e) => new Date(e.date) >= now)
    .sort((a, b) => a.date.localeCompare(b.date));

  const myUpcomingEvents = upcomingEvents.filter((e) =>
    myRegisteredEventIds.includes(e.id),
  );

  // ── Firebase load ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetchStatic = async () => {
      try {
        const [studsSnap, evtsSnap, formsSnap, esSnap] = await Promise.allSettled([
          getDocs(collection(db, "singer")),
          getDocs(collection(db, "events")),
          getDocs(collection(db, "forms")),
          getDocs(collection(db, "attendance")),
          getDocs(collection(db, "event_students")),
        ]);

        if (studsSnap.status === "fulfilled" && studsSnap.value.size > 0)
          setStudentCount(studsSnap.value.size);

        if (evtsSnap.status === "fulfilled" && evtsSnap.value.size > 0)
          setEventList(
            evtsSnap.value.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DashEvent, "id">) })),
          );

        if (formsSnap.status === "fulfilled" && formsSnap.value.size > 0)
          setFormCount(formsSnap.value.size);

        if (esSnap.status === "fulfilled" && esSnap.value.size > 0) {
          const myIds = esSnap.value.docs
            .filter((d) => d.data().student_id === user?.uid)
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
      (notifs) => { if (notifs.length > 0) setNotifList(notifs); },
      user?.uid,
      isAdmin ? "admin" : "singer",
    );

    const unsubMessages = messageService.subscribe((msgs: FirestoreMsg[]) => {
      if (msgs.length > 0) {
        const relevant = isAdmin
          ? msgs.filter((m) => m.receiver_id === "admin")
          : msgs.filter((m) => m.receiver_id === user?.uid || m.sender_id === user?.uid);
        setMessageList(relevant.slice().reverse());
      }
    });

    return () => { unsubNotif(); unsubMessages(); };
  }, [user?.uid]);

  if (loading) {
    return (
      <View style={[st.screen, st.center]}>
        <ActivityIndicator size="large" color={COLORS.teal} />
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
          <Text style={st.headerTitle}>{isAdmin ? "Dashboard" : `Hey, ${firstName} 👋`}</Text>
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
          /* ═══════════════════════ ADMIN VIEW ═══════════════════════════ */
          <>
            {/* ─ 1. Quick Actions launchpad ──────────────────────────── */}
            <SectionLabel>Quick Actions</SectionLabel>
            <View style={st.quickRow}>
              <Pressable style={st.quickBtn} onPress={() => router.push("/(tabs)/students?action=add" as any)}>
                <Ionicons name="person-add-outline"    size={22} color={COLORS.teal} />
                <Text style={st.quickLabel}>{"Add\nStudent"}</Text>
              </Pressable>
              <Pressable style={st.quickBtn} onPress={() => router.push("/(tabs)/events?action=add" as any)}>
                <Ionicons name="calendar-outline"      size={22} color={COLORS.teal} />
                <Text style={st.quickLabel}>{"New\nEvent"}</Text>
              </Pressable>
              <Pressable style={st.quickBtn} onPress={() => router.push("/create-form" as any)}>
                <Ionicons name="create-outline"        size={22} color={COLORS.teal} />
                <Text style={st.quickLabel}>{"New\nForm"}</Text>
              </Pressable>
              <Pressable style={st.quickBtn} onPress={() => router.push("/(tabs)/library?action=upload" as any)}>
                <Ionicons name="musical-notes-outline" size={22} color={COLORS.teal} />
                <Text style={st.quickLabel}>{"Upload\nMusic"}</Text>
              </Pressable>
            </View>

            {/* ─ 2. KPI Overview — every card is tappable ───────────── */}
            <SectionLabel>Overview</SectionLabel>
            <View style={st.grid}>
              <StatCard
                label="Students"  value={studentCount}
                icon="people"          barColor={COLORS.teal}
                onPress={() => router.push("/(tabs)/students" as any)}
              />
              <StatCard
                label="Events"    value={eventList.length}
                icon="calendar"        barColor={COLORS.yellow}
                onPress={() => router.push("/(tabs)/events" as any)}
              />
              <StatCard
                label="Forms"     value={formCount}
                icon="document-text"   barColor={COLORS.teal}
                onPress={() => router.push("/(tabs)/forms" as any)}
              />
              <StatCard
                label="Alerts"    value={unreadNotifications}
                icon="notifications"   barColor={COLORS.red}
                onPress={() => router.push("/(tabs)/notifications" as any)}
              />
            </View>

            {/* ─ 3. Our Statistics — full-width CTA banner ──────────── */}
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

            {/* ─ 4. Music Library widget (replaces Notifications) ───── */}
            <SectionLabel>Music Library</SectionLabel>
            <MusicLibraryWidget onOpenLibrary={() => router.push("/(tabs)/library" as any)} />

            {/* ─ 5. Upcoming Events — list + footer CTA ─────────────── */}
            <SectionLabel>Upcoming Events</SectionLabel>
            <BrandCard barColor={COLORS.yellow} padStyle={{ padding: 0 }}>
              <WidgetHeader
                icon="calendar"
                title="Next Rehearsals"
                actionLabel="All Events →"
                onAction={() => router.push("/(tabs)/events" as any)}
              />
              {upcomingEvents.length === 0 ? (
                <View style={st.emptyInCard}>
                  <Ionicons name="calendar-outline" size={36} color={COLORS.muted} />
                  <Text style={st.emptyText}>No upcoming events</Text>
                  <Pressable
                    style={[st.outlineBtn, { marginTop: 8 }]}
                    onPress={() => router.push("/(tabs)/events" as any)}
                  >
                    <Text style={st.outlineBtnText}>Create Event</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {upcomingEvents.slice(0, 3).map((event) => (
                    <EventRow
                      key={String(event.id)}
                      event={event}
                      onPress={() => router.push(`/event/${event.id}` as any)}
                    />
                  ))}
                  <CardFooter
                    label="View All Events"
                    onPress={() => router.push("/(tabs)/events" as any)}
                  />
                </>
              )}
            </BrandCard>
          </>
        ) : (
          /* ═══════════════════════ STUDENT VIEW ═════════════════════════ */
          <>
            {/* ─ 1. KPI Overview — tappable ─────────────────────────── */}
            <SectionLabel>Overview</SectionLabel>
            <View style={st.grid}>
              <StatCard
                label="My Events"  value={myRegisteredEventIds.length}
                icon="calendar"        barColor={COLORS.teal}
                onPress={() => router.push("/(tabs)/events" as any)}
              />
              <StatCard
                label="Forms"      value={formCount}
                icon="document-text"   barColor={COLORS.yellow}
                onPress={() => router.push("/(tabs)/forms" as any)}
              />
            </View>

            {/* ─ 2. Music Library widget (replaces Notifications) ───── */}
            <SectionLabel>Music Library</SectionLabel>
            <MusicLibraryWidget onOpenLibrary={() => router.push("/(tabs)/library" as any)} />

            {/* ─ 3. My Upcoming Events — list + footer CTA ──────────── */}
            <SectionLabel>My Upcoming Events</SectionLabel>
            <BrandCard barColor={COLORS.teal} padStyle={{ padding: 0 }}>
              <WidgetHeader
                icon="calendar"
                title="My Schedule"
                actionLabel="Browse Events →"
                onAction={() => router.push("/(tabs)/events" as any)}
              />
              {myUpcomingEvents.length === 0 ? (
                <View style={st.emptyInCard}>
                  <Ionicons name="calendar-outline" size={36} color={COLORS.muted} />
                  <Text style={st.emptyText}>No registered events</Text>
                  <Pressable
                    style={[st.outlineBtn, { marginTop: 8 }]}
                    onPress={() => router.push("/(tabs)/events" as any)}
                  >
                    <Text style={st.outlineBtnText}>Browse Events</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {myUpcomingEvents.slice(0, 3).map((event) => (
                    <EventRow
                      key={String(event.id)}
                      event={event}
                      onPress={() => router.push(`/event/${event.id}` as any)}
                    />
                  ))}
                  <CardFooter
                    label="Browse All Events"
                    onPress={() => router.push("/(tabs)/events" as any)}
                  />
                </>
              )}
            </BrandCard>

            {/* ─ 4. Student quick links ─────────────────────────────── */}
            <SectionLabel>Quick Links</SectionLabel>
            <View style={st.quickRow}>
              <Pressable style={st.quickBtn} onPress={() => router.push("/(tabs)/forms" as any)}>
                <Ionicons name="document-text-outline"  size={22} color={COLORS.teal} />
                <Text style={st.quickLabel}>{"My\nForms"}</Text>
              </Pressable>
              <Pressable style={st.quickBtn} onPress={() => router.push("/(tabs)/calendar" as any)}>
                <Ionicons name="calendar-outline"        size={22} color={COLORS.teal} />
                <Text style={st.quickLabel}>{"My\nCalendar"}</Text>
              </Pressable>
              <Pressable style={st.quickBtn} onPress={() => router.push("/(tabs)/messages" as any)}>
                <Ionicons name="chatbubbles-outline"     size={22} color={COLORS.teal} />
                <Text style={st.quickLabel}>Messages</Text>
              </Pressable>
              <Pressable style={st.quickBtn} onPress={() => router.push("/profile" as any)}>
                <Ionicons name="person-circle-outline"  size={22} color={COLORS.teal} />
                <Text style={st.quickLabel}>{"My\nProfile"}</Text>
              </Pressable>
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  // Layout
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // ── Teal header
  header: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  headerSub:   { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "500" },
  headerTitle: { color: "#fff", fontSize: 32, fontWeight: "900", marginTop: 4 },
  headerActions:  { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 4 },
  headerIconWrap: { position: "relative", padding: 6 },
  badge: {
    position: "absolute", top: 2, right: 2,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.red,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // ── Scroll
  scroll: { padding: 16, paddingTop: 8 },

  // ── Section label
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: COLORS.muted,
    letterSpacing: 1.1, marginTop: 24, marginBottom: 8,
  },

  // ── BrandCard base
  shadow: {
    shadowColor: COLORS.teal, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
    borderRadius: 16, marginBottom: 8,
  },
  cardOuter: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: "#e8eef2", overflow: "hidden",
  },
  colorBar: { height: 4 },
  cardPad:  { padding: 16 },

  // ── Quick Actions launchpad
  quickRow: { flexDirection: "row", gap: 8 },
  quickBtn: {
    flex: 1,
    alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.teal,
    backgroundColor: "#e0f5f5", gap: 5,
  },
  quickLabel: {
    fontSize: 10, fontWeight: "700", color: COLORS.teal,
    textAlign: "center", lineHeight: 13,
  },

  // ── KPI stat cards
  grid:    { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statWrap:{ flex: 1, minWidth: "45%", marginBottom: 0 },
  statIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  statValue:      { fontSize: 28, fontWeight: "900", color: COLORS.text },
  statLabel:      { fontSize: 12, fontWeight: "600", color: COLORS.sub, marginTop: 2 },
  statFooter:     {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e8eef2",
    paddingTop: 7,
  },
  statFooterText: { fontSize: 11, fontWeight: "700" },

  // ── Widget header (title + action link)
  widgetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  widgetHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  widgetTitle:      { fontSize: 14, fontWeight: "800", color: COLORS.text },
  widgetLink:       { fontSize: 12, fontWeight: "700", color: COLORS.teal },

  // ── Card footer CTA
  cardFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e8eef2",
  },
  cardFooterText: { fontSize: 13, fontWeight: "700", color: COLORS.teal },

  // ── Our Statistics banner
  statsBtn: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 16, padding: 16, backgroundColor: COLORS.teal,
    gap: 16, marginTop: 16, marginBottom: 8,
    shadowColor: COLORS.teal, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32, shadowRadius: 10, elevation: 5,
  },
  statsBtnIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  statsBtnTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },
  statsBtnSub:   { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },

  // ── Music Library widget
  musicRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e8eef2",
  },
  extBadge: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  extText:  { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  musicName:{ flex: 1, fontSize: 13, fontWeight: "600", color: COLORS.text },
  musicFooterBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    margin: 12, marginTop: 8,
    backgroundColor: COLORS.teal, borderRadius: 10, paddingVertical: 11,
  },
  musicFooterBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // ── Event rows (inside zero-padded BrandCard)
  eventRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e8eef2",
  },
  dateBox: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: COLORS.teal + "18",
    alignItems: "center", justifyContent: "center",
  },
  dateDay: { fontSize: 18, fontWeight: "900", color: COLORS.teal },
  dateMon: { fontSize: 9,  fontWeight: "700", color: COLORS.teal, letterSpacing: 0.5 },
  rowTitle: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginBottom: 2 },
  rowSub:   { fontSize: 11, color: COLORS.sub },
  fillTrack: {
    marginTop: 5, height: 3, borderRadius: 2,
    backgroundColor: "#e8eef2", overflow: "hidden",
  },
  fillBar: { height: 3, borderRadius: 2 },
  eventRight: { alignItems: "flex-end", gap: 4 },
  capText: { fontSize: 11, fontWeight: "700", color: COLORS.teal },

  // ── Empty state (inside card)
  emptyInCard: {
    alignItems: "center", paddingVertical: 24, paddingBottom: 20, gap: 6,
  },
  emptyText: { fontSize: 13, color: COLORS.muted },

  // ── Outline button (empty-state CTA)
  outlineBtn: {
    borderWidth: 1.5, borderColor: COLORS.teal, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  outlineBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.teal },
});
