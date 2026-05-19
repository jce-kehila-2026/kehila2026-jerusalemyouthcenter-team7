import { AppColors, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { notifications as initialNotifications, Notification } from '@/src/data/mockData';
import { notifColor, notifIcon } from '@/src/utils/notifMeta';
import { timeAgo } from '@/src/utils/timeUtils';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [items, setItems] = useState<Notification[]>(initialNotifications || []);

  const unreadCount = items.filter(n => !n.is_read).length;
  const hasUnread = unreadCount > 0;

  function markRead(id: number) {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
  }

  function markAllRead() {
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={[styles.subtitle, { color: theme.subtext }]}>
              {unreadCount} unread
            </Text>
          )}
        </View>
        {hasUnread && (
          <Pressable style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const color = notifColor(item.type);
          return (
            <Pressable
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
                !item.is_read && [styles.cardUnread, { borderLeftColor: AppColors.primary }],
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
                  >
                    {item.title}
                  </Text>
                  <Text style={[styles.cardTime, { color: theme.subtext }]}>
                    {timeAgo(item.timestamp)}
                  </Text>
                </View>
                <Text style={[styles.cardBody2, { color: theme.subtext }]} numberOfLines={2}>
                  {item.body}
                </Text>
              </View>
              {!item.is_read && (
                <View style={styles.unreadDot} />
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={theme.subtext} />
            <Text style={[styles.emptyText, { color: theme.subtext }]}>No notifications</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  markAllBtn: {
    backgroundColor: AppColors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: { color: AppColors.primary, fontSize: 13, fontWeight: '600' },
  list: { padding: 16, gap: 8 },
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
  },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  cardTitle: { fontSize: 14, color: '#11181C' },
  cardTitleBold: { fontWeight: '700' },
  cardTime: { fontSize: 11 },
  cardBody2: { fontSize: 13, lineHeight: 18 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: AppColors.primary },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
