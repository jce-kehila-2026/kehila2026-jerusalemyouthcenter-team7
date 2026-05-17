import { currentUser, forms } from '@/src/data/mockData';
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
<<<<<<< HEAD
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
=======
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Official JYC Color Palette
const themeColors = {
  teal: "#039899",
  red: "#c56451",
  yellow: "#cfad5d",
  bluishWhite: "#f5fafe",
  charcoal: "#353535",
  white: "#ffffff",
};

export default function FormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const form = forms.find((f) => f.id === Number(id));

  // Dynamic color logic to match the main screen
  const colors = [themeColors.teal, themeColors.red, themeColors.yellow];
  // Using (id - 1) to align with the array index (0, 1, 2)
  const activeColor = colors[(Number(id) - 1) % 3];

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!form) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <Text style={{ color: theme.text }}>
            النموذج غير موجود / Form not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const visibleQuestions = form.questions.filter(
    (q) =>
      !(q.options?.includes("is_private") && currentUser.role === "student"),
  );

  const setAnswer = (questionId: number, value: string) =>
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

  const handleSubmit = async () => {
    const unanswered = visibleQuestions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      Alert.alert(
        "تنبيه",
        `الرجاء الإجابة على ${unanswered.length} أسئلة متبقية.`,
      );
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={72} color={activeColor} />
          </View>
          <Text style={[styles.successTitle, { color: theme.text }]}>
            تم الإرسال! / Submitted!
          </Text>
          <Text style={[styles.successSub, { color: theme.subtext }]}>
            تم حفظ إجاباتك لنموذج "{form.title}" بنجاح.
          </Text>
          <Pressable
            style={[styles.doneBtn, { backgroundColor: activeColor }]}
            onPress={() => router.back()}
          >
            <Text style={styles.doneBtnText}>عودة / Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progress = answeredCount / (visibleQuestions.length || 1);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header color now matches the activeColor */}
          <View style={[styles.formHeader, { backgroundColor: activeColor }]}>
            <Text style={styles.formTitle}>{form.title}</Text>
            <Text style={styles.formDesc}>{form.description}</Text>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                {answeredCount}/{visibleQuestions.length}
              </Text>
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress * 100}%` as any },
                  ]}
                />
              </View>
            </View>
          </View>

          <View style={styles.questions}>
            {visibleQuestions.map((q, idx) => (
              <View key={q.id} style={[styles.questionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.questionHeader}>
                  <View style={[styles.qNumber, { backgroundColor: answers[q.id] ? AppColors.success : activeColor }]}>
                    {answers[q.id] ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : (
                      <Text style={[styles.qNumberText, { color: "#ffffff" }]}>{idx + 1}</Text>
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
=======
            {visibleQuestions.map((q, idx) => (
              <View
                key={q.id}
                style={[
                  styles.questionCard,
                  { backgroundColor: themeColors.white },
                ]}
              >
                <View style={styles.questionHeader}>
                  <Text
                    style={[
                      styles.questionText,
                      { color: themeColors.charcoal },
                    ]}
                  >
                    {q.text}
                  </Text>
                  {/* Circle number color matches activeColor */}
                  <View
                    style={[
                      styles