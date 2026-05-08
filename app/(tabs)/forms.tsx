import { forms } from '@/src/data/mockData';
import { AppColors, Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

const typeIcons: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  text: 'text-outline',
  multiple_choice: 'radio-button-on-outline',
  yes_no: 'checkmark-circle-outline',
};

export default function FormsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Forms</Text>
        <Text style={[styles.subtitle, { color: theme.subtext }]}>{forms.length} active</Text>
      </View>

      <FlatList
        data={forms}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push(`/form/${item.id}` as any)}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: AppColors.primaryLight }]}>
                <Ionicons name="document-text" size={22} color={AppColors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.cardDate, { color: theme.subtext }]}>
                  Created {item.created_at}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
            </View>

            <Text style={[styles.description, { color: theme.subtext }]} numberOfLines={2}>
              {item.description}
            </Text>

            <View style={styles.questionsList}>
              {item.questions.slice(0, 2).map(q => (
                <View key={q.id} style={styles.questionRow}>
                  <Ionicons name={typeIcons[q.type]} size={13} color={AppColors.primary} />
                  <Text style={[styles.questionText, { color: theme.subtext }]} numberOfLines={1}>
                    {q.text}
                  </Text>
                </View>
              ))}
              {item.questions.length > 2 && (
                <Text style={[styles.moreText, { color: theme.subtext }]}>
                  +{item.questions.length - 2} more questions
                </Text>
              )}
            </View>

            <View style={styles.footer}>
              <View style={[styles.countBadge, { backgroundColor: AppColors.primaryLight }]}>
                <Ionicons name="help-circle-outline" size={13} color={AppColors.primary} />
                <Text style={styles.countText}>{item.questions.length} questions</Text>
              </View>
              <Pressable
                style={styles.fillButton}
                onPress={() => router.push(`/form/${item.id}` as any)}
              >
                <Text style={styles.fillButtonText}>Fill out</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
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
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardDate: { fontSize: 11, marginTop: 2 },
  description: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  questionsList: { gap: 4, marginBottom: 12 },
  questionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  questionText: { fontSize: 12, flex: 1 },
  moreText: { fontSize: 11, marginLeft: 19, fontStyle: 'italic' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  countText: { fontSize: 11, color: AppColors.primary, fontWeight: '600' },
  fillButton: {
    backgroundColor: AppColors.primary, paddingHorizontal: 16,
    paddingVertical: 6, borderRadius: 8,
  },
  fillButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
