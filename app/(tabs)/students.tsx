import { groups, students } from '@/src/data/mockData';
import { AppColors, Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function StudentsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

  const filtered = students.filter(s => {
    const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchGroup = selectedGroup === null || s.group_id === selectedGroup;
    return matchSearch && matchGroup;
  });

  const getGroupName = (id: number) => groups.find(g => g.id === id)?.name ?? 'Unknown';

  const groupColors: Record<number, string> = {
    1: AppColors.primary,
    2: AppColors.secondary,
    3: AppColors.success,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Students</Text>
        <Text style={[styles.subtitle, { color: theme.subtext }]}>{filtered.length} members</Text>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="search-outline" size={18} color={theme.subtext} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search students..."
          placeholderTextColor={theme.subtext}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={theme.subtext} />
          </Pressable>
        ) : null}
      </View>

      {/* Group Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        <Pressable
          style={[styles.filterChip, selectedGroup === null && styles.filterChipActive]}
          onPress={() => setSelectedGroup(null)}
        >
          <Text style={[styles.filterChipText, selectedGroup === null && styles.filterChipTextActive]}>
            All
          </Text>
        </Pressable>
        {groups.map(g => (
          <Pressable
            key={g.id}
            style={[styles.filterChip, selectedGroup === g.id && styles.filterChipActive]}
            onPress={() => setSelectedGroup(g.id)}
          >
            <Text style={[styles.filterChipText, selectedGroup === g.id && styles.filterChipTextActive]}>
              {g.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const color = groupColors[item.group_id] ?? AppColors.primary;
          return (
            <Pressable
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => router.push(`/student/${item.id}` as any)}
            >
              <View style={[styles.avatar, { backgroundColor: color + '20' }]}>
                <Text style={[styles.avatarText, { color }]}>{item.full_name.charAt(0)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: theme.text }]}>{item.full_name}</Text>
                <Text style={[styles.email, { color: theme.subtext }]}>{item.email}</Text>
              </View>
              <View style={[styles.groupBadge, { backgroundColor: color + '15' }]}>
                <Text style={[styles.groupBadgeText, { color }]}>{getGroupName(item.group_id)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={theme.subtext} />
            <Text style={[styles.emptyText, { color: theme.subtext }]}>No students found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginVertical: 12, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterRow: { marginBottom: 8 },
  filterContent: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#e8e8e8',
  },
  filterChipActive: { backgroundColor: AppColors.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  filterChipTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    padding: 12, borderWidth: 1, gap: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  email: { fontSize: 12, marginTop: 2 },
  groupBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  groupBadgeText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
