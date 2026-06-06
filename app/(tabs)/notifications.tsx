import { AppColors, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/context/AuthContext';
import { FirestoreNotification, notificationService } from '@/src/data/notificationService';
import { notifColor, notifIcon } from '@/src/utils/notifMeta';
import { timeAgo } from '@/src/utils/timeUtils';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'alerts' | 'messages';

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const [items, setItems] = useState<FirestoreNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('alerts');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const unsub = notificationService.subscribe(
      notifs => {
        setItems(notifs);
        setLoading(false);
      },
      isAdmin ? undefined : user.uid,
    );

    return unsub;
  }, [user?.uid]);

  // Split by type
  const alertItems = items.filter(n => n.type !== 'message');
  const messageItems = items.filter(n => n.type === 'message');

  const visibleItems = activeTab === 'alerts' ? alertItems : messageItems;
  const alertUnread = alertItems.filter(n => !n.is_read).length;
  const msgUnread = messageItems.filter(n => !n.is_read).length;
  const activeUnread = activeTab === 'alerts' ? alertUnread : msgUnread;

  async function markRead(id: string) {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await notificationService.markRead(id);
    } catch (e) {
      console.error('markRead failed:', e);
    }
  }

  async function markAllRead() {
    const ids = visibleItems.filter(n => !n.is_read).map(n => n.id);
    setItems(prev => prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n));
    try {
      await notificationService.markAllRead(ids);
    } catch (e) {
      console.error('markAllRead failed:', e);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
        {activeUnread > 0 && (
          <Pressable style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {/* Segmented tabs */}
      <View style={[styles.tabBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Pressable
          style={[styles.tabPill, activeTab === 'alerts' && styles.tabPillActive]}
          onPress={() => setActiveTab('alerts')}
        >
          <Ionicons
            name="notifications-outline"
            size={15}
            color={activeTab === 'alerts' ? '#fff' : theme.subtext}
          />
          <Text style={[styles.tabLabel, activeTab === 'alerts' && styles.tabLabelActive]}>
            Alerts
          </Text>
          {alertUnread > 0 && (
            <View style={[styles.tabBadge, activeTab === 'alerts' ? styles.tabBadgeActive : styles.tabBadgeInactive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'alerts' && { color: AppColors.primary }]}>
                {alertUnread}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={[styles.tabPill, activeTab === 'messages' && styles.tabPillMessages]}
          onPress={() => setActiveTab('messages')}
        >
          <Ionicons
            name="chatbubble-outline"
            size={15}
            color={activeTab === 'messages' ? '#fff' : theme.subtext}
          />
          <Text style={[styles.tabLabel, activeTab === 'messages' && styles.tabLabelActive]}>
            Messages
          </Text>
          {msgUnread > 0 && (
            <View style={[styles.tabBadge, activeTab === 'messages' ? styles.tabBadgeActiveMsg : styles.tabBadgeInactive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'messages' && { color: AppColors.purple }]}>
                {msgUnread}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* List */}
      <FlatList
        data={visibleItems}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const color = notifColor(item.type);
          return (
            <Pressable
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
                !item.is_read && [styles.cardUnread, { borderLeftColor: activeTab === 'messages' ? AppColors.purple : AppColors.primary }],
              ]}
              onPress={() => markRead(item.id)}
            >
              <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
                <Ionicons name={notifIcon(item.type)} size={18} color={color} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: theme.text },
                      !item.is_read && styles.cardTitleBold,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={[styles.cardTime, { color: theme.subtext }]}>
                    {timeAgo(item.timestamp)}
                  </Text>
                </View>
                <Text style={[styles.cardBodyText, { color: theme.subtext }]} numberOfLines={2}>
                  {item.body}
                </Text>
              </View>
              {!item.is_read && (
                <View style={[styles.unreadDot, { backgroundColor: activeTab === 'messages' ? AppColors.purple : AppColors.primary }]} />
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name={activeTab === 'alerts' ? 'notifications-off-outline' : 'chatbubble-ellipses-outline'}
              size={48}
              color={theme.subtext}
            />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {activeTab === 'alerts' ? 'No alerts' : 'No message notifications'}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.subtext }]}>
              {activeTab === 'alerts'
                ? 'Event and form notifications will appear here'
                : 'Notifications from messages will appear here'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '800' },
  markAllBtn: {
    backgroundColor: AppColors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: { color: AppColors.primary, fontSize: 13, fontWeight: '600' },

  // Segmented tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabPillActive: {
    backgroundColor: AppColors.primary,
  },
  tabPillMessages: {
    backgroundColor: AppColors.purple,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#687076',
  },
  tabLabelActive: {
    color: '#fff',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeActiveMsg: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeInactive: {
    backgroundColor: AppColors.primaryLight,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },

  // Notification cards
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  cardUnread: { borderLeftWidth: 3 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3, gap: 8 },
  cardTitle: { fontSize: 14, flex: 1 },
  cardTitleBold: { fontWeight: '700' },
  cardTime: { fontSize: 11, flexShrink: 0 },
  cardBodyText: { fontSize: 13, lineHeight: 18 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },

  // Empty state
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtext: { fontSize: 13, textAlign: 'center', lineHeight: 18, paddingHorizontal: 32 },
});
