import { events, groups } from '@/src/data/mockData';
import { AppColors, Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function capacityColor(registered: number, capacity: number) {
  const pct = registered / capacity;
  if (pct >= 0.9) return AppColors.danger;
  if (pct >= 0.6) return AppColors.warning;
  return AppColors.success;
}

export default function EventsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const getGroupNames = (ids: number[]) =>
    ids.map(id => groups.find(g => g.id === id)?.name).filter(Boolean).join(', ');

  const isUpcoming = (iso: string) => new Date(iso) >= new Date();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Events</Text>
        <Text style={[styles.subtitle, { color: theme.subtext }]}>
          {events.filter(e => isUpcoming(e.date)).length} upcoming
        </Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const upcoming = isUpcoming(item.date);
          const capColor = capacityColor(item.registered, item.capacity);
          const pct = Math.round((item.registered / item.capacity) * 100);

          return (
            <Pressable
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => router.push(`/event/${item.id}` as any)}
            >
              {!upcoming && (
                <View style={styles.pastBanner}>
                  <Text style={styles.pastBannerText}>Past</Text>
                </View>
              )}
              <View style={styles.cardHeader}>
                <View style={[styles.dateBox, { backgroundColor: upcoming ? AppColors.primaryLight : '#eee' }]}>
                  <Text style={[styles.dateDay, { color: upcoming ? AppColors.primary : '#999' }]}>
                    {new Date(item.date).getDate()}
                  </Text>
                  <Text style={[styles.dateMonth, { color: upcoming ? AppColors.primary : '#999' }]}>
                    {new Date(item.date).toLocaleString('en', { month: 'short' })}
                  </Text>
                </View>
                <View style={styles.cardHeaderInfo}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                  <View style={styles.row}>
                    <Ionicons name="time-outline" size={12} color={theme.subtext} />
                    <Text style={[styles.meta, { color: theme.subtext }]}>{formatTime(item.date)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <Ionicons name="location-outline" size={13} color={theme.subtext} />
                <Text style={[styles.meta, { color: theme.subtext }]}>{item.location}</Text>
              </View>

              <View style={styles.row}>
                <Ionicons name="people-outline" size={13} color={theme.subtext} />
                <Text style={[styles.meta, { color: theme.subtext }]}>{getGroupNames(item.group_ids)}</Text>
              </View>

              {/* Capacity bar */}
              <View style={styles.capacityRow}>
                <View style={styles.capacityBarBg}>
                  <View style={[styles.capacityBarFill, { width: `${pct}%` as any, backgroundColor: capColor }]} />
                </View>
                <Text style={[styles.capacityText, { color: capColor }]}>
                  {item.registered}/{item.capacity}
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.description, { color: theme.subtext }]} numberOfLines={2}>
                  {item.description}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  list: { padding: 20, gap: 12 },
  card: {
    borderRadius: 14, padding: 16, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    overflow: 'hidden',
  },
  pastBanner: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#999', paddingHorizontal: 10, paddingVertical: 3,
    borderBottomLeftRadius: 8,
  },
  pastBannerText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  dateBox: {
    width: 52, height: 52, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  dateDay: { fontSize: 20, fontWeight: '800' },
  dateMonth: { fontSize: 10, fontWeight: '600' },
  cardHeaderInfo: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  meta: { fontSize: 12 },
  capacityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  capacityBarBg: { flex: 1, height: 6, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden' },
  capacityBarFill: { height: '100%', borderRadius: 3 },
  capacityText: { fontSize: 11, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  cardFooter: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 },
  description: { flex: 1, fontSize: 12, lineHeight: 18 },
});
