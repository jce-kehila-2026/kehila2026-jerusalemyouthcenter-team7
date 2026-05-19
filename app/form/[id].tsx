import { currentUser, forms } from '@/src/data/mockData';
import { AppColors, Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
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
  const userRole = "student";
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    (q) => !(q.options?.includes("is_private") && userRole === "student"),
  );

  const setAnswer = (questionId: number, value: string) =>
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

  const handleSubmit = () => {
    const hasUnanswered = visibleQuestions.some((q) => {
      const answer = answers[q.id];
      if (!answer) return true;
      if (typeof answer === "string" && answer.trim() === "") return true;
      if (Array.isArray(answer) && answer.length === 0) return true;
      return false;
    });

    if (hasUnanswered) {
      setErrorMessage("⚠️ Please answer all questions before submitting.");
      return;
    }

    setErrorMessage(null);
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
            <Text style={styles.doneBtnText}>Done</Text>
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
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress * 100}%` as any },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {answeredCount}/{visibleQuestions.length}
              </Text>
            </View>
          </View>

          <View style={styles.questions}>
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
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
                  {/* Circle number color matches activeColor */}
                  <View
                    style={[
                      styles
