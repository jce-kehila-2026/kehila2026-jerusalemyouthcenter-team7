import { useAuth } from '@/src/context/AuthContext';
import { events, forms, messages, notifications, students } from '@/src/data/mockData';
import { AppColors, Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const unreadMessages = messages.filter(m => !m.is_read).length;
  const unreadNotifications = notifications.filter(n => !n.is_read).length;
  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date()).length;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

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
            {unreadNotifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotifications}</Text>
              </View>
            )}
            <Pressable onPress={() => router.push('/profile')}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.full_name?.charAt(0)}</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Students" value={students.length} icon="people" color={AppColors.primary} />
          <StatCard label="Events" value={upcomingEvents} icon="calendar" color={AppColors.secondary} />
          <StatCard label="Forms" value={forms.length} icon="document-text" color={AppColors.success} />
          <StatCard label="Messages" value={unreadMessages} icon="chatbubbles" color={AppColors.purple} />
        </View>

        {/* Upcoming Events */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Upcoming Events</Text>
          <Pressable onPress={() => router.push('/(tabs)/events')}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>
        {events.slice(0, 3).map(event => (
          <Pressable
            key={event.id}
            style={[styles.eventRow, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push(`/event/${event.id}` as any)}
          >
            <View style={styles.eventDate}>
              <Text style={styles.eventDay}>{new Date(event.date).getDate()}</Text>
              <Text style={styles.eventMonth}>
                {new Date(event.date).toLocaleString('en', { month: 'short' })}
              </Text>
            </View>
            <View style={styles.eventInfo}>
              <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={[styles.eventLocation, { color: theme.subtext }]} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
            <View style={[styles.eventBadge, { backgroundColor: AppColors.primaryLight }]}>
              <Text style={styles.eventBadgeText}>{event.registered}/{event.capacity}</Text>
            </View>
          </Pressable>
        ))}

        {/* Recent Messages */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Messages</Text>
          <Pressable onPress={() => router.push('/(tabs)/messages')}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>
        {messages.slice(0, 3).map(msg => (
          <Pressable
            key={msg.id}
            style={[styles.messageRow, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push('/(tabs)/messages')}
          >
            <View style={[styles.msgAvatar, { backgroundColor: AppColors.primary + '20' }]}>
              <Text style={[styles.msgAvatarText, { color: AppColors.primary }]}>
                {msg.sender_name.charAt(0)}
              </Text>
            </View>
            <View style={styles.msgContent}>
              <Text style={[styles.msgSender, { color: theme.text }]}>{msg.sender_name}</Text>
              <Text style={[styles.msgText, { color: theme.subtext }]} numberOfLines={1}>
                {msg.content}
              </Text>
            </View>
            {!msg.is_read && <View style={styles.unreadDot} />}
          </Pressable>
        ))}

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingBottom: 8,
  },
  greeting: { fontSize: 13 },
  name: { fontSize: 20, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: AppColors.danger, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: AppColors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginHorizontal: 20, marginTop: 16, marginBottom: 10 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginRight: 20,
  },
  seeAll: { color: AppColors.primary, fontSize: 13, fontWeight: '600' },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10,
  },
  statCard: {
    flex: 1, minWidth: '44%', backgroundColor: '#fff',
    borderRadius: 12, padding: 14, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#11181C' },
  statLabel: { fontSize: 12, color: '#687076', marginTop: 2 },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20,
    marginBottom: 8, borderRadius: 12, padding: 12,
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  eventDate: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: AppColors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  eventDay: { fontSize: 16, fontWeight: '800', color: AppColors.primary },
  eventMonth: { fontSize: 10, color: AppColors.primary, fontWeight: '600' },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  eventLocation: { fontSize: 12 },
  eventBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  eventBadgeText: { fontSize: 11, color: AppColors.primary, fontWeight: '600' },
  messageRow: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20,
    marginBottom: 8, borderRadius: 12, padding: 12, borderWidth: 1,
  },
  msgAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  msgAvatarText: { fontSize: 16, fontWeight: '700' },
  msgContent: { flex: 1 },
  msgSender: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  msgText: { fontSize: 12 },
  unreadDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: AppColors.primary,
  },
  spacer: { height: 20 },
});
