import { AppColors, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/context/AuthContext';
import { db } from '@/src/firebase/firebase';
import { FirestoreNotification, notificationService } from '@/src/data/notificationService';
import { notifColor, notifIcon } from '@/src/utils/notifMeta';
import { timeAgo } from '@/src/utils/timeUtils';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  addDoc,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Types ──────────────────────────────────────────────────────────────────────
type JoinRequest = {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  birth_date: string;
  age: number;
  gender: string;
  nationality: string;
  address: string;
  neighborhood: string;
  school_name: string;
  shirt_size: string;
  voice_type: string;
  year_joined: number;
  food_notes: string;
  parent_relation: string;
  parent_name: string;
  parent_phone: string;
  medical_situation: string;
  _tempPassword: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
};

const phoneToEmail = (phone: string) => `${phone.replace(/\D/g, '')}@kehila.app`;

const VOICE_COLORS: Record<string, string> = {
  bass: '#6366f1',
  tenor: AppColors.primary,
  alto: '#f59e0b',
  soprano: '#ec4899',
};

// ── Detail Modal ───────────────────────────────────────────────────────────────
function RequestDetailModal({
  request, visible, onClose, onApprove, onReject, processing,
}: {
  request: JoinRequest | null;
  visible: boolean;
  onClose: () => void;
  onApprove: (r: JoinRequest) => void;
  onReject: (r: JoinRequest) => void;
  processing: boolean;
}) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  if (!request) return null;

  const rows: [string, string][] = [
    ['📞 Phone', request.phone],
    ['📧 Email', request.email || '—'],
    ['🎂 Date of Birth', request.birth_date],
    ['🔢 Age', String(request.age)],
    ['⚧ Gender', request.gender],
    ['🌍 Nationality', request.nationality],
    ['🏠 Address', request.address],
    ['🏘 Neighborhood', request.neighborhood],
    ['🏫 School', request.school_name],
    ['👕 Shirt Size', request.shirt_size],
    ['🎵 Voice Type', request.voice_type],
    ['📅 Year Joined', String(request.year_joined)],
    ['🍽 Food Notes', request.food_notes || '—'],
    ['👨‍👩‍👧 Parent', `${request.parent_relation} — ${request.parent_name}`],
    ['📱 Parent Phone', request.parent_phone],
    ['🏥 Medical', request.medical_situation || '—'],
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[md.container, { backgroundColor: theme.background }]}>
        <View style={[md.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={onClose} style={md.closeBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[md.title, { color: theme.text }]} numberOfLines={1}>{request.full_name}</Text>
          <View style={{ width: 32 }} />
        </View>
        <ScrollView contentContainerStyle={md.body} showsVerticalScrollIndicator={false}>
          {rows.map(([label, value]) => (
            <View key={label} style={[md.row, { borderBottomColor: theme.border }]}>
              <Text style={[md.rowLabel, { color: theme.subtext }]}>{label}</Text>
              <Text style={[md.rowValue, { color: theme.text }]}>{value}</Text>
            </View>
          ))}
          <View style={md.actions}>
            <Pressable style={md.rejectBtn} onPress={() => onReject(request)} disabled={processing}>
              {processing ? <ActivityIndicator size="small" color="#ef4444" /> : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                  <Text style={md.rejectTxt}>Reject</Text>
                </>
              )}
            </Pressable>
            <Pressable style={[md.approveBtn, { backgroundColor: AppColors.primary }]} onPress={() => onApprove(request)} disabled={processing}>
              {processing ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={md.approveTxt}>Approve</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const md = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  closeBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  body: { padding: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1 },
  rowLabel: { fontSize: 13, flex: 1 },
  rowValue: { fontSize: 13, fontWeight: '600', flex: 2, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 28 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: '#ef4444' },
  rejectTxt: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
  approveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12 },
  approveTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ── Request Card ───────────────────────────────────────────────────────────────
function RequestCard({ item, theme, processing, onPress, onApprove, onReject }: {
  item: JoinRequest; theme: typeof Colors.light; processing: boolean;
  onPress: () => void; onApprove: () => void; onReject: () => void;
}) {
  const voiceColor = VOICE_COLORS[item.voice_type?.toLowerCase()] ?? AppColors.primary;
  return (
    <Pressable onPress={onPress} style={[rc.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[rc.accent, { backgroundColor: voiceColor }]} />
      <View style={rc.body}>
        <View style={rc.top}>
          <Text style={[rc.name, { color: theme.text }]} numberOfLines={1}>{item.full_name}</Text>
          <View style={[rc.badge, { backgroundColor: voiceColor + '22' }]}>
            <Text style={[rc.badgeTxt, { color: voiceColor }]}>
              {item.voice_type ? item.voice_type.charAt(0).toUpperCase() + item.voice_type.slice(1) : '—'}
            </Text>
          </View>
        </View>
        <Text style={[rc.detail, { color: theme.subtext }]}>📞 {item.phone}</Text>
        <Text style={[rc.detail, { color: theme.subtext }]}>🏫 {item.school_name}</Text>
        <Text style={[rc.detail, { color: theme.subtext }]}>🏘 {item.neighborhood}</Text>
        <View style={rc.actions}>
          <Pressable style={rc.rejectBtn} onPress={onReject} disabled={processing}>
            {processing ? <ActivityIndicator size="small" color="#ef4444" /> : (
              <><Ionicons name="close-circle-outline" size={15} color="#ef4444" /><Text style={rc.rejectTxt}>Reject</Text></>
            )}
          </Pressable>
          <Pressable style={[rc.approveBtn, { backgroundColor: AppColors.primary }]} onPress={onApprove} disabled={processing}>
            {processing ? <ActivityIndicator size="small" color="#fff" /> : (
              <><Ionicons name="checkmark-circle-outline" size={15} color="#fff" /><Text style={rc.approveTxt}>Approve</Text></>
            )}
          </Pressable>
        </View>
        <Text style={[rc.tapHint, { color: theme.subtext }]}>Tap card to see full details →</Text>
      </View>
    </Pressable>
  );
}

const rc = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  accent: { width: 4 },
  body: { flex: 1, padding: 14 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  name: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  detail: { fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 9, borderWidth: 1.5, borderColor: '#ef4444' },
  rejectTxt: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  approveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 9 },
  approveTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  tapHint: { fontSize: 11, marginTop: 8, textAlign: 'right' },
});

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'notifications' | 'requests'>('notifications');
  const [notifs, setNotifs] = useState<FirestoreNotification[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(true);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);

  // Notifications: exclude admin-targeted singer-request notifs (those live in Join Requests tab)
  useEffect(() => {
    if (!user) { setNotifsLoading(false); return; }
    const unsub = notificationService.subscribe(
      items => {
        const filtered = isAdmin
          ? items.filter(n => n.target_uid !== 'admin')
          : items;
        setNotifs(filtered);
        setNotifsLoading(false);
      },
      isAdmin ? undefined : user.uid,
    );
    return unsub;
  }, [user?.uid]);

  // Pending join requests (admin only, real-time)
  useEffect(() => {
    if (!isAdmin) { setRequestsLoading(false); return; }
    const q = query(
      collection(db, 'join_requests'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, snap => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<JoinRequest, 'id'>) })));
      setRequestsLoading(false);
    });
    return unsub;
  }, [isAdmin]);

  const unreadCount = notifs.filter(n => !n.is_read).length;
  const pendingCount = requests.length;

  async function markRead(id: string) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try { await notificationService.markRead(id); } catch (e) { console.error(e); }
  }

  async function markAllRead() {
    const ids = notifs.filter(n => !n.is_read).map(n => n.id);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    try { await notificationService.markAllRead(ids); } catch (e) { console.error(e); }
  }

  async function handleApprove(req: JoinRequest) {
    Alert.alert(
      'Approve Singer',
      `Create an account for ${req.full_name} and notify them?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessingId(req.id);
            setSelectedRequest(null);
            try {
              // 1. Create Firebase Auth account
              const credential = await createUserWithEmailAndPassword(
                getAuth(), phoneToEmail(req.phone), req._tempPassword,
              );
              const uid = credential.user.uid;

              // 2. Save singer to Firestore
              await setDoc(doc(db, 'singers', uid), {
                uid, role: 'singer',
                full_name: req.full_name, email: req.email || null, phone: req.phone,
                birth_date: req.birth_date, age: req.age, gender: req.gender,
                nationality: req.nationality, address: req.address, neighborhood: req.neighborhood,
                school_name: req.school_name, shirt_size: req.shirt_size, voice_type: req.voice_type,
                year_joined: req.year_joined, food_notes: req.food_notes,
                parent_relation: req.parent_relation, parent_name: req.parent_name,
                parent_phone: req.parent_phone, medical_situation: req.medical_situation,
                year_id: 1, group_id: null, createdAt: serverTimestamp(),
              });

              // 3. Mark request as approved (removes it from pending list immediately)
              await updateDoc(doc(db, 'join_requests', req.id), { status: 'approved' });

              // 4. Send approval notification to the singer (informational only)
              await addDoc(collection(db, 'notifications'), {
                title: '🎉 Welcome to Jerusalem Youth Chorus!',
                body: 'Your request to join has been approved. You can now log in with your phone number.',
                type: 'general',
                is_read: false,
                target_uid: uid,
                timestamp: new Date().toISOString(),
              });
            } catch (e: any) {
              console.error('Approve error:', e);
              Alert.alert('Error', e.message || 'Could not approve request.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  }

  async function handleReject(req: JoinRequest) {
    Alert.alert(
      'Reject Request',
      `Reject ${req.full_name}'s request? They will not be able to log in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(req.id);
            setSelectedRequest(null);
            try {
              // Update status — request disappears from pending list immediately
              await updateDoc(doc(db, 'join_requests', req.id), { status: 'rejected' });
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  }

  if (notifsLoading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: theme.background }]}>
        <View style={s.center}><ActivityIndicator size="large" color={AppColors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.background }]}>

      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: theme.text }]}>Notifications</Text>
        {activeTab === 'notifications' && unreadCount > 0 && (
          <Pressable style={s.markAllBtn} onPress={markAllRead}>
            <Text style={s.markAllTxt}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {/* Tab bar — admin only */}
      {isAdmin && (
        <View style={[s.tabBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Pressable
            style={[s.tabPill, activeTab === 'notifications' && { backgroundColor: AppColors.primary }]}
            onPress={() => setActiveTab('notifications')}
          >
            <Ionicons name="notifications-outline" size={15} color={activeTab === 'notifications' ? '#fff' : theme.subtext} />
            <Text style={[s.tabTxt, activeTab === 'notifications' && { color: '#fff' }]}>
              {`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            </Text>
          </Pressable>
          <Pressable
            style={[s.tabPill, activeTab === 'requests' && { backgroundColor: AppColors.primary }]}
            onPress={() => setActiveTab('requests')}
          >
            <Ionicons name="person-add-outline" size={15} color={activeTab === 'requests' ? '#fff' : theme.subtext} />
            <Text style={[s.tabTxt, activeTab === 'requests' && { color: '#fff' }]}>
              {`Join Requests${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
            </Text>
            {pendingCount > 0 && activeTab !== 'requests' && (
              <View style={s.tabBadge}><Text style={s.tabBadgeTxt}>{pendingCount}</Text></View>
            )}
          </Pressable>
        </View>
      )}

      {/* Notifications list */}
      {activeTab === 'notifications' && (
        <FlatList
          data={notifs}
          keyExtractor={item => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const color = notifColor(item.type);
            // Approval/welcome notifs are informational — cannot be tapped
            const isInfoOnly = item.title.includes('Welcome') || item.title.includes('approved');
            return (
              <Pressable
                style={[
                  s.card,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  !item.is_read && !isInfoOnly && [s.cardUnread, { borderLeftColor: AppColors.primary }],
                  isInfoOnly && s.cardInfoOnly,
                ]}
                onPress={isInfoOnly ? undefined : () => markRead(item.id)}
                disabled={isInfoOnly}
              >
                <View style={[s.iconWrap, { backgroundColor: color + '20' }]}>
                  <Ionicons name={notifIcon(item.type)} size={18} color={color} />
                </View>
                <View style={s.cardBody}>
                  <View style={s.cardTop}>
                    <Text style={[s.cardTitle, { color: theme.text }, !item.is_read && !isInfoOnly && s.cardTitleBold]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[s.cardTime, { color: theme.subtext }]}>{timeAgo(item.timestamp)}</Text>
                  </View>
                  <Text style={[s.cardBodyTxt, { color: theme.subtext }]} numberOfLines={2}>{item.body}</Text>
                </View>
                {!item.is_read && !isInfoOnly && <View style={s.unreadDot} />}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={theme.subtext} />
              <Text style={[s.emptyTxt, { color: theme.subtext }]}>No notifications</Text>
            </View>
          }
        />
      )}

      {/* Join Requests list — admin only */}
      {activeTab === 'requests' && isAdmin && (
        requestsLoading ? (
          <View style={s.center}><ActivityIndicator size="large" color={AppColors.primary} /></View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={item => item.id}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <RequestCard
                item={item}
                theme={theme}
                processing={processingId === item.id}
                onPress={() => setSelectedRequest(item)}
                onApprove={() => handleApprove(item)}
                onReject={() => handleReject(item)}
              />
            )}
            ListEmptyComponent={
              <View style={s.empty}>
                <Ionicons name="checkmark-done-circle-outline" size={52} color={theme.subtext} />
                <Text style={[s.emptyTxt, { color: theme.subtext }]}>No pending requests</Text>
                <Text style={[s.emptySubtxt, { color: theme.subtext }]}>All caught up! 🎉</Text>
              </View>
            }
          />
        )
      )}

      {/* Full-detail modal */}
      <RequestDetailModal
        request={selectedRequest}
        visible={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        processing={processingId === selectedRequest?.id}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: '800' },
  markAllBtn: { backgroundColor: AppColors.primaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  markAllTxt: { color: AppColors.primary, fontSize: 13, fontWeight: '600' },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  tabPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 9, position: 'relative' },
  tabTxt: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabBadge: { position: 'absolute', top: 3, right: 6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: AppColors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  tabBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  list: { padding: 16, gap: 10, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1, gap: 12 },
  cardUnread: { borderLeftWidth: 3 },
  cardInfoOnly: { opacity: 0.85 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  cardTitle: { fontSize: 14, color: '#11181C', flex: 1, marginRight: 8 },
  cardTitleBold: { fontWeight: '700' },
  cardTime: { fontSize: 11 },
  cardBodyTxt: { fontSize: 13, lineHeight: 18 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: AppColors.primary, flexShrink: 0 },
  empty: { alignItems: 'center', paddingTop: 70, gap: 10 },
  emptyTxt: { fontSize: 16, fontWeight: '600' },
  emptySubtxt: { fontSize: 13 },
});
