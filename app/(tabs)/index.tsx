import { useAuth } from '@/src/context/AuthContext';
import {
  attendance as mockAttendance,
  eventStudents as mockEventStudents,
  events as mockEvents,
  forms as mockForms,
  messages as mockMessages,
  notifications as mockNotifications,
  students as mockStudents,
} from '@/src/data/mockData';
import { FirestoreMsg, messageService } from '@/src/data/messageService';
import { db } from '@/src/firebase/firebase';
import { notifColor, notifIcon } from '@/src/utils/notifMeta';
import { timeAgo } from '@/src/utils/timeUtils';
import { NotificationBell } from '@/src/components/NotificationBell';
import { AppColors, Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

const DEMO_STUDENT_ID = '1';
const CHART_H = 130; // pixel height of the bar area

// ── Shared lightweight types ──────────────────────────────────────────────────
type DashEvent = { id: string | number; title: string; date: string; location: string; registered: number; capacity: number };
type DashMsg = { id: string; sender_name: string; content: string; timestamp: string; is_read: boolean };
type DashNotif = { id: string | number; title: string; body: string; timestamp: string; is_read: boolean; type: string };
type DashAttendance = { status: 'attended' | 'absent' | 'registered' };

// ── Column chart (admin overview) ─────────────────────────────────────────────
type ChartItem = {
  label: string;
  value: number;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

function ColumnChart({ items, theme }: { items: ChartItem[]; theme: typeof Colors.light }) {
  const maxVal = Math.max(...items.map(i => i.value), 1);

  return (
    <View style={[chartSt.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Baseline */}
      <View style={[chartSt.baseline, { borderColor: theme.border }]} />

      <View style={chartSt.barsRow}>
        {items.map(item => {
          const barH = Math.max((item.value / maxVal) * CHART_H, 6);
          return (
            <View key={item.label} style={chartSt.barCol}>
              {/* Value on top */}
              <Text style={[chartSt.valLabel, { color: item.color }]}>{item.value}</Text>
              {/* Track: bars grow from the bottom */}
              <View style={chartSt.barTrack}>
                <View style={[chartSt.bar, { height: barH, backgroundColor: item.color }]} />
              </View>
              {/* Icon + label below */}
              <Ionicons name={item.icon} size={13} color={item.color} style={chartSt.barIcon} />
              <Text style={[chartSt.barLabel, { color: theme.subtext }]}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Stat card (student overview) ──────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isAdmin = user?.role === 'admin';

  // Initialised with mock data so UI renders immediately
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(mockStudents.length);
  const [eventList, setEventList] = useState<DashEvent[]>(mockEvents);
  const [formCount, setFormCount] = useState(mockForms.length);
  const [notifList, setNotifList] = useState<DashNotif[]>(mockNotifications);
  const [attendanceData, setAttendanceData] = useState<DashAttendance[]>(mockAttendance);
  const [messageList, setMessageList] = useState<DashMsg[]>(
    mockMessages.map(m => ({ ...m, id: String(m.id) }))
  );
  const [myRegisteredEventIds, setMyRegisteredEventIds] = useState<(string | number)[]>(
    mockEventStudents.filter(es => es.student_id === DEMO_STUDENT_ID).map(es => es.event_id)
  );

  // Derived values
  const now = new Date();
  const unreadNotifications = notifList.filter(n => !n.is_read).length;
  const presentCount = attendanceData.filter(a => a.status === 'attended').length;
  const absentCount = attendanceData.filter(a => a.status === 'absent').length;
  const pendingCount = attendanceData.filter(a => a.status === 'registered').length;
  const totalAttendance = attendanceData.length;
  const myUpcomingEvents = eventList.filter(
    e => myRegisteredEventIds.includes(e.id) && new Date(e.date) >= now
  );

  // ── Firebase loading ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetchStatic = async () => {
      try {
        const [studsSnap, evtsSnap, formsSnap, notifSnap, attSnap, esSnap] =
          await Promise.allSettled([
            getDocs(collection(db, 'students')),
            getDocs(collection(db, 'events')),
            getDocs(collection(db, 'forms')),
            getDocs(collection(db, 'notifications')),
            getDocs(collection(db, 'attendance')),
            getDocs(collection(db, 'event_students')),
          ]);

        if (studsSnap.status === 'fulfilled' && studsSnap.value.size > 0)
          setStudentCount(studsSnap.value.size);

        if (evtsSnap.status === 'fulfilled' && evtsSnap.value.size > 0)
          setEventList(evtsSnap.value.docs.map(d => ({ id: d.id, ...(d.data() as Omit<DashEvent, 'id'>) })));

        if (formsSnap.status === 'fulfilled' && formsSnap.value.size > 0)
          setFormCount(formsSnap.value.size);

        if (notifSnap.status === 'fulfilled' && notifSnap.value.size > 0)
          setNotifList(notifSnap.value.docs.map(d => ({ id: d.id, ...(d.data() as Omit<DashNotif, 'id'>) })));

        if (attSnap.status === 'fulfilled' && attSnap.value.size > 0)
          setAttendanceData(attSnap.value.docs.map(d => d.data() as DashAttendance));

        if (esSnap.status === 'fulfilled' && esSnap.value.size > 0) {
          const myIds = esSnap.value.docs
            .filter(d => d.data().student_id === user.uid)
            .map(d => d.data().event_id as string);
          if (myIds.length > 0) setMyRegisteredEventIds(myIds);
        }
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchStatic();

    const unsubMessages = messageService.subscribe((msgs: FirestoreMsg[]) => {
      if (msgs.length > 0) {
        const relevant = isAdmin
          ? msgs.filter(m => m.receiver_id === 'admin')
          : msgs.filter(m => m.receiver_id === user.uid || m.sender_id === user.uid);
        setMessageList(relevant.slice().reverse());
      }
    });

    return () => unsubMessages();
  }, [user?.uid]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Chart data for admin
  const adminChartItems: ChartItem[] = [
    { label: 'Students', value: studentCount, color: AppColors.primary, icon: 'people' },
    { label: 'Events', value: eventList.length, color: AppColors.secondary, icon: 'calendar' },
    { label: 'Forms', value: formCount, color: AppColors.success, icon: 'document-text' },
    { label: 'Notifications', value: unreadNotifications, color: AppColors.danger, icon: 'notifications' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.subtext }]}>Good day,</Text>
            <Text style={[styles.name, { color: theme.text }]}>{user?.full_name}</Text>
          </View>
          <View style={styles.headerActions}>
            <NotificationBell
              unreadCount={unreadNotifications}
              color={theme.icon}
              onPress={() => router.push('/(tabs)/notifications' as any)}
            />
            <Pressable onPress={() => router.push('/profile')}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.full_name?.charAt(0) ?? '?'}</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* ── ADMIN VIEW ── */}
        {isAdmin ? (
          <>
            {/* Column chart stats */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Overview</Text>
            <ColumnChart items={adminChartItems} theme={theme} />

            {/* Attendance bar */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Attendance</Text>
            <View style={[styles.attCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.attBar}>
                {totalAttendance > 0 && (
                  <>
                    <View style={[styles.attSeg, { flex: presentCount || 0.01, backgroundColor: AppColors.success, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }]} />
                    <View style={[styles.attSeg, { flex: absentCount || 0.01, backgroundColor: AppColors.danger }]} />
                    <View style={[styles.attSeg, { flex: pendingCount || 0.01, backgroundColor: AppColors.warning, borderTopRightRadius: 4, borderBottomRightRadius: 4 }]} />
                  </>
                )}
              </View>
              <View style={styles.legend}>
                {[
                  { label: `${presentCount} Present`, color: AppColors.success },
                  { label: `${absentCount} Absent`, color: AppColors.danger },
                  { label: `${pendingCount} Pending`, color: AppColors.warning },
                ].map(l => (
                  <View key={l.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                    <Text style={[styles.legendText, { color: theme.subtext }]}>{l.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Recent Messages */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Messages</Text>
              <Pressable onPress={() => router.push('/(tabs)/messages')}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {messageList.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={[styles.emptyText, { color: theme.subtext }]}>No messages yet</Text>
              </View>
            ) : (
              messageList.slice(0, 3).map(msg => (
                <Pressable
                  key={msg.id}
                  style={[styles.activityRow, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => router.push('/(tabs)/messages')}
                >
                  <View style={[styles.activityAvatar, { backgroundColor: AppColors.primary + '20' }]}>
                    <Text style={[styles.activityAvatarText, { color: AppColors.primary }]}>{msg.sender_name.charAt(0)}</Text>
                  </View>
                  <View style={styles.activityBody}>
                    <Text style={[styles.activityTitle, { color: theme.text }]}>{msg.sender_name}</Text>
                    <Text style={[styles.activitySub, { color: theme.subtext }]} numberOfLines={1}>{msg.content}</Text>
                  </View>
                  <View style={styles.activityRight}>
                    <Text style={[styles.activityTime, { color: theme.subtext }]}>{timeAgo(msg.timestamp)}</Text>
                    {!msg.is_read && <View style={styles.unreadDot} />}
                  </View>
                </Pressable>
              ))
            )}

            {/* Upcoming Events */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Upcoming Events</Text>
              <Pressable onPress={() => router.push('/(tabs)/events')}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {eventList.filter(e => new Date(e.date) >= now).slice(0, 3).map(event => (
              <EventRow key={String(event.id)} event={event} theme={theme} onPress={() => router.push(`/event/${event.id}` as any)} />
            ))}
          </>
        ) : (
          /* ── STUDENT VIEW ── */
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard label="My Events" value={myRegisteredEventIds.length} icon="calendar" color={AppColors.primary} />
              <StatCard label="Forms" value={formCount} icon="document-text" color={AppColors.success} />
              <StatCard label="Unread Notifs" value={unreadNotifications} icon="notifications" color={AppColors.danger} />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>My Upcoming Events</Text>
              <Pressable onPress={() => router.push('/(tabs)/events')}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {myUpcomingEvents.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="calendar-outline" size={32} color={theme.subtext} />
                <Text style={[styles.emptyText, { color: theme.subtext }]}>No upcoming events</Text>
              </View>
            ) : (
              myUpcomingEvents.map(event => (
                <EventRow key={String(event.id)} event={event} theme={theme} onPress={() => router.push(`/event/${event.id}` as any)} />
              ))
            )}

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Notifications</Text>
              <Pressable onPress={() => router.push('/(tabs)/notifications' as any)}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {notifList.slice(0, 3).map(notif => (
              <NotifRow key={String(notif.id)} notif={notif} theme={theme} />
            ))}
          </>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function EventRow({ event, theme, onPress }: { event: DashEvent; theme: typeof Colors.light; onPress: () => void }) {
  return (
    <Pressable style={[styles.eventRow, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={onPress}>
      <View style={styles.eventDate}>
        <Text style={styles.eventDay}>{new Date(event.date).getDate()}</Text>
        <Text style={styles.eventMonth}>{new Date(event.date).toLocaleString('en', { month: 'short' })}</Text>
      </View>
      <View style={styles.eventInfo}>
        <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>{event.title}</Text>
        <Text style={[styles.eventLocation, { color: theme.subtext }]} numberOfLines={1}>{event.location}</Text>
      </View>
      <View style={[styles.eventCapBadge, { backgroundColor: AppColors.primaryLight }]}>
        <Text style={styles.eventCapText}>{event.registered}/{event.capacity}</Text>
      </View>
    </Pressable>
  );
}

function NotifRow({ notif, theme }: { notif: DashNotif; theme: typeof Colors.light }) {
  const color = notifColor(notif.type as Parameters<typeof notifColor>[0]);
  const icon = notifIcon(notif.type as Parameters<typeof notifIcon>[0]);
  return (
    <View style={[styles.notifRow, { backgroundColor: theme.card, borderColor: theme.border }, !notif.is_read && { borderLeftWidth: 3, borderLeftColor: AppColors.primary }]}>
      <View style={[styles.notifIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={styles.notifBody}>
        <Text style={[styles.notifTitle, { color: theme.text }]}>{notif.title}</Text>
        <Text style={[styles.notifSub, { color: theme.subtext }]} numberOfLines={1}>{notif.body}</Text>
      </View>
      {!notif.is_read && <View style={styles.unreadDot} />}
    </View>
  );
}

// ── Chart styles ───────────────────────────────────────────────────────────────
const chartSt = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingTop: 16,
    paddingBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
  },
  baseline: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 52,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  valLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  barTrack: {
    height: CHART_H,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  bar: {
    width: 32,
    borderRadius: 6,
  },
  barIcon: {
    marginTop: 8,
  },
  barLabel: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 13,
  },
});

// ── Screen styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 8 },
  greeting: { fontSize: 13 },
  name: { fontSize: 20, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
=======
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 8 },
  greeting: { fontSize: 13 },
  name: { fontSize: 20, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { backgroundColor: AppColors.danger, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
>>>>>>> d19a49f56894c5f15ce73bce2feff1db076471ba
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: AppColors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginHorizontal: 20, marginTop: 16, marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginRight: 20 },
  seeAll: { color: AppColors.primary, fontSize: 13, fontWeight: '600' },
<<<<<<< HEAD
  // Student stats grid
=======
>>>>>>> d19a49f56894c5f15ce73bce2feff1db076471ba
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#11181C' },
  statLabel: { fontSize: 12, color: '#687076', marginTop: 2 },
<<<<<<< HEAD
  // Attendance
  attCard: { marginHorizontal: 20, borderRadius: 14, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  attBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: '#eee', marginBottom: 12 },
  attSeg: { height: 10 },
  legend: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12 },
  // Activity rows
  activityRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 8, borderRadius: 12, padding: 12, borderWidth: 1, gap: 10 },
  activityAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  activityAvatarText: { fontSize: 16, fontWeight: '700' },
  activityBody: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  activitySub: { fontSize: 12 },
  activityRight: { alignItems: 'flex-end', gap: 4 },
  activityTime: { fontSize: 11 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: AppColors.primary },
  // Events
  eventRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 8, borderRadius: 12, padding: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  eventDate: { width: 44, height: 44, borderRadius: 10, backgroundColor: AppColors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  eventDay: { fontSize: 16, fontWeight: '800', color: AppColors.primary },
  eventMonth: { fontSize: 10, color: AppColors.primary, fontWeight: '600' },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  eventLocation: { fontSize: 12 },
  eventCapBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  eventCapText: { fontSize: 11, color: AppColors.primary, fontWeight: '600' },
  // Notifications
  notifRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 8, borderRadius: 12, padding: 12, borderWidth: 1, gap: 10 },
  notifIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  notifBody: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  notifSub: { fontSize: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 14 },
  spacer: { height: 24 },
});
