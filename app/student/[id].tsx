import { attendance, events, groups, students } from '@/src/data/mockData';
import { AppColors, Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

const groupColors: Record<number, string> = {
  1: AppColors.primary,
  2: AppColors.secondary,
  3: AppColors.success,
};

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const student = students.find(s => s.id === Number(id));

  if (!student) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.notFound}>
          <Text style={{ color: theme.text }}>Student not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const group = groups.find(g => g.id === student.group_id);
  const color = groupColors[student.group_id] ?? AppColors.primary;
  const studentAttendance = attendance.filter(a => a.student_id === student.id);
  const attendedEvents = studentAttendance.map(a => ({
    ...a,
    event: events.find(e => e.id === a.event_id),
  })).filter(a => a.event);

  const statusColors: Record<string, string> = {
    attended: AppColors.success,
    registered: AppColors.primary,
    absent: AppColors.danger,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: theme.card }]}>
          <View style={[styles.avatar, { backgroundColor: color + '20' }]}>
            <Text style={[styles.avatarText, { color }]}>{student.full_name.charAt(0)}</Text>
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{student.full_name}</Text>
          <View style={[styles.groupBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.groupBadgeText, { color }]}>{group?.name ?? 'Unknown'} Group</Text>
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact Info</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <InfoRow icon="mail-outline" label="Email" value={student.email} theme={theme} />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <InfoRow icon="call-outline" label="Phone" value={student.phone} theme={theme} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Program Info</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <InfoRow icon="people-outline" label="Group" value={group?.name ?? 'Unknown'} theme={theme} />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <InfoRow icon="school-outline" label="Year" value={`Year ${student.year_id}`} theme={theme} />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <InfoRow icon="ribbon-outline" label="Program" value={`Program ${student.program_id}`} theme={theme} />
          </View>
        </View>

        {/* Attendance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Event Attendance ({attendedEvents.length})
          </Text>
          {attendedEvents.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={{ color: theme.subtext }}>No events recorded</Text>
            </View>
          ) : (
            attendedEvents.map(a => (
              <View key={a.event_id} style={[styles.attendanceRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.attendanceInfo}>
                  <Text style={[styles.eventTitle, { color: theme.text }]}>{a.event?.title}</Text>
                  <Text style={[styles.eventDate, { color: theme.subtext }]}>
                    {new Date(a.event!.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColors[a.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColors[a.status] }]}>
                    {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  theme,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  theme: any;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={AppColors.primary} style={styles.infoIcon} />
      <View>
        <Text style={[styles.infoLabel, { color: theme.subtext }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  profileHeader: {
    alignItems: 'center', padding: 32,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 36, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  groupBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  groupBadgeText: { fontSize: 13, fontWeight: '700' },
  section: { padding: 20, paddingBottom: 0 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  infoCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  infoIcon: { marginRight: 12 },
  infoLabel: { fontSize: 11, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginLeft: 44 },
  emptyCard: {
    borderRadius: 12, borderWidth: 1, padding: 20, alignItems: 'center',
  },
  attendanceRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    borderWidth: 1, padding: 12, marginBottom: 8,
  },
  attendanceInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '600' },
  eventDate: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
});
