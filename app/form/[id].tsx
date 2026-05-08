import { forms } from '@/src/data/mockData';
import { AppColors, Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function FormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const form = forms.find(f => f.id === Number(id));
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!form) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centered}><Text style={{ color: theme.text }}>Form not found</Text></View>
      </SafeAreaView>
    );
  }

  const setAnswer = (questionId: number, value: string) =>
    setAnswers(prev => ({ ...prev, [questionId]: value }));

  const handleSubmit = async () => {
    const unanswered = form.questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      Alert.alert('Incomplete', `Please answer all ${unanswered.length} remaining questions.`);
      return;
    }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={72} color={AppColors.success} />
          </View>
          <Text style={[styles.successTitle, { color: theme.text }]}>Submitted!</Text>
          <Text style={[styles.successSub, { color: theme.subtext }]}>
            Your responses for "{form.title}" have been recorded.
          </Text>
          <Pressable style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progress = answeredCount / form.questions.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Form header */}
          <View style={[styles.formHeader, { backgroundColor: AppColors.primary }]}>
            <Text style={styles.formTitle}>{form.title}</Text>
            <Text style={styles.formDesc}>{form.description}</Text>
            <View style={styles.progressRow}>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
              </View>
              <Text style={styles.progressText}>{answeredCount}/{form.questions.length}</Text>
            </View>
          </View>

          <View style={styles.questions}>
            {form.questions.map((q, idx) => (
              <View key={q.id} style={[styles.questionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.questionHeader}>
                  <View style={[styles.qNumber, { backgroundColor: answers[q.id] ? AppColors.success : AppColors.primaryLight }]}>
                    {answers[q.id] ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : (
                      <Text style={[styles.qNumberText, { color: AppColors.primary }]}>{idx + 1}</Text>
                    )}
                  </View>
                  <Text style={[styles.questionText, { color: theme.text }]}>{q.text}</Text>
                </View>

                {q.type === 'text' && (
                  <TextInput
                    style={[styles.textAnswer, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    value={answers[q.id] ?? ''}
                    onChangeText={v => setAnswer(q.id, v)}
                    placeholder="Type your answer..."
                    placeholderTextColor={theme.subtext}
                    multiline
                    numberOfLines={3}
                  />
                )}

                {q.type === 'yes_no' && (
                  <View style={styles.yesNoRow}>
                    {['Yes', 'No'].map(opt => (
                      <Pressable
                        key={opt}
                        style={[
                          styles.optionBtn,
                          { borderColor: theme.border },
                          answers[q.id] === opt && { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
                        ]}
                        onPress={() => setAnswer(q.id, opt)}
                      >
                        <Text style={[styles.optionText, answers[q.id] === opt && styles.optionTextSelected]}>
                          {opt}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {q.type === 'multiple_choice' && q.options && (
                  <View style={styles.optionsGrid}>
                    {q.options.map(opt => (
                      <Pressable
                        key={opt}
                        style={[
                          styles.optionBtn,
                          { borderColor: theme.border },
                          answers[q.id] === opt && { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
                        ]}
                        onPress={() => setAnswer(q.id, opt)}
                      >
                        <Text style={[styles.optionText, answers[q.id] === opt && styles.optionTextSelected]}>
                          {opt}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={[styles.submitBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <Pressable
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Submit Form</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  formHeader: { padding: 24 },
  formTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  formDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 14 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBg: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  progressText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  questions: { padding: 16, gap: 12 },
  questionCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  questionHeader: { flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'flex-start' },
  qNumber: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  qNumberText: { fontSize: 12, fontWeight: '800' },
  questionText: { flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 22 },
  textAnswer: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    fontSize: 14, minHeight: 80, textAlignVertical: 'top',
  },
  yesNoRow: { flexDirection: 'row', gap: 10 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5, backgroundColor: 'transparent',
  },
  optionText: { fontSize: 14, fontWeight: '600', color: '#555' },
  optionTextSelected: { color: '#fff' },
  submitBar: { padding: 16, borderTopWidth: 1 },
  submitBtn: {
    backgroundColor: AppColors.primary, borderRadius: 12,
    padding: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  successSub: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  doneBtn: {
    backgroundColor: AppColors.primary, borderRadius: 12,
    paddingHorizontal: 40, paddingVertical: 14,
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
