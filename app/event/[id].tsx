import { attendance, events, groups, students } from '@/src/data/mockData';
import { AppColors, Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [registered, setRegistered] = useState(false);

  const event = events.find(e => e.id === Number(id));

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centered}><Text style={{ color: theme.text }}>Event not found</Text></View>
      </SafeAreaView>
    );
  }

  const getGroupNames = (ids: number[]) =>
    ids.map(id => groups.find(g => g.id === id)?.name).filter(Boolean).join(', ');

  const eventAttendance = attendance.filter(a => a.event_id === event.id);
  const attendees = eventAttendance.map(a => students.find(s => s.id === a.student_id)).filter(Boolean);

  const pct = Math.round((event.registered / event.capacity) * 100);
  const isUpcoming = new Date(event.date) >= new Date();
  const isFull = event.registered >= event.capacity;

  const statusColors: Record<string, string> = {
    attended: AppColors.success,
    registered: AppColors.primary,
    absent: AppColors.danger,
  };

  const formatFullDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: isUpcoming ? AppColors.primary : '#888' }]}>
          <Text style={styles.heroTitle}>{event.title}</Text>
          <View style={styles.heroDate}>
            <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroDateText}>{formatFullDate(event.date)}</Text>
          </View>
          <View style={styles.heroDate}>
            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroDateText}>{formatTime(event.date)}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Info rows */}
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <DetailRow icon="location-outline" label="Location" value={event.location} theme={theme} />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <DetailRow icon="people-outline" label="Groups" value={getGroupNames(event.group_ids)} theme={theme} />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <DetailRow
              icon="person-outline"
              label="Capacity"
              value={`${event.registered} / ${event.capacity} registered`}
              theme={theme}
            />
          </View>

          {/* Capacity bar */}
          <View style={[styles.capacityCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.capacityHeader}>
              <Text style={[styles.capacityLabel, { color: theme.text }]}>Registration</Text>
              <Text style={[styles.capacityPct, { color: pct >= 90 ? AppColors.danger : AppColors.primary }]}>
                {pct}% full
              </Text>
            </View>
            <View style={styles.barBg}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${pct}%` as any,
                    backgroundColor: pct >= 90 ? AppColors.danger : pct >= 60 ? AppColors.warning : AppColors.success,
                  },
                ]}
              />
            </View>
          </View>

          {/* Description */}
          <View style={[styles.descCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.descTitle, { color: theme.text }]}>About this event</Text>
            <Text style={[styles.descText, { color: theme.subtext }]}>{event.description}</Text>
          </View>

          {/* Attendees */}
          {attendees.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Registered Attendees ({attendees.length})
              </Text>
              {attendees.map(student => {
                const att = eventAttendance.find(a => a.student_id === student!.id);
                return (
                  <View key={student!.id} style={[styles.attendeeRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={[styles.attAvatar, { backgroundColor: AppColors.primary + '20' }]}>
                      <Text style={[styles.attAvatarText, { color: AppColors.primary }]}>
                        {student!.full_name.charAt(0)}
                      </Text>
                    </View>
                    <Text style={[styles.attName, { color: theme.text }]}>{student!.full_name}</Text>
                    {att && (
                      <View style={[styles.statusBadge, { backgroundColor: statusColors[att.status] + '20' }]}>
                        <Text style={[styles.statusText, { color: statusColors[att.status] }]}>
                          {att.status}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Register CTA */}
      {isUpcoming && (
        <View style={[styles.cta, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <Pressable
            style={[
              styles.registerBtn,
              { backgroundColor: registered ? AppColors.success : isFull ? '#ccc' : AppColors.primary },
            ]}
            onPress={() => !isFull && setRegistered(r => !r)}
            disabled={isFull && !registered}
          >
            <Ionicons
              name={registered ? 'checkmark-circle' : 'add-circle-outline'}
              size={20}
              color="#fff"
            />
            <Text style={styles.registerBtnText}>
              {registered ? 'Registered!' : isFull ? 'Event Full' : 'Register Now'}
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function DetailRow({
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
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={AppColors.primary} style={{ marginRight: 12 }} />
      <View>
        <Text style={[styles.detailLabel, { color: theme.subtext }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { padding: 28, paddingTop: 36 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 12 },
  heroDate: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  heroDateText: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  body: { padding: 20, gap: 14 },
  infoCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  detailLabel: { fontSize: 11, marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginLeft: 44 },
  capacityCard: { borderRadius: 12, borderWidth: 1, padding: 16 },
  capacityHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  capacityLabel: { fontSize: 14, fontWeight: '600' },
  capacityPct: { fontSize: 14, fontWeight: '700' },
  barBg: { height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  descCard: { borderRadius: 12, borderWidth: 1, padding: 16 },
  descTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  descText: { fontSize: 14, lineHeight: 22 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  attendeeRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10,
    borderWidth: 1, padding: 12, gap: 10,
  },
  attAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  attAvatarText: { fontSize: 14, fontWeight: '700' },
  attName: { flex: 1, fontSize: 14, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cta: { padding: 16, borderTopWidth: 1 },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, padding: 14, gap: 8,
  },
  registerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
