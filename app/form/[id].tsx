import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { forms } from "@/src/data/mockData";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
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

const themeColors = {
  teal: "#039899",
  red: "#c56451",
  yellow: "#cfad5d",
  bluishWhite: "#f5fafe",
  charcoal: "#353535",
  white: "#ffffff",
};

export default function FormScreen() {
  const userRole: string = "student";
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const form = forms.find((f) => f.id === Number(id));
  const colors = [themeColors.teal, themeColors.red, themeColors.yellow];
  const activeColor = colors[(Number(id) - 1) % 3];

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!form) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: themeColors.bluishWhite }]}
      >
        <View style={styles.centered}>
          <Text style={{ color: themeColors.charcoal }}>Form not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const visibleQuestions = form.questions.filter((q) => {
    if (userRole === "admin") return true;

    const isPrivate = q.is_private || q.options?.includes("is_private");

    return !isPrivate;
  });

  const setAnswer = (questionId: number, value: string) =>
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

  const handleSubmit = () => {
    const hasUnanswered = visibleQuestions.some((q) => {
      const answer = answers[q.id];
      if (!answer) return true;
      if (typeof answer === "string" && answer.trim() === "") return true;
      return false;
    });

    if (hasUnanswered) {
      setErrorMessage("⚠️ Please answer all questions before submitting.");
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1000);
  };

  if (submitted) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: themeColors.bluishWhite }]}
      >
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={72} color={activeColor} />
          </View>
          <Text style={[styles.successTitle, { color: themeColors.charcoal }]}>
            Submitted!
          </Text>
          <Text style={styles.successSub}>
            <Text
              style={styles.successSub}
            >{`Your answers for "${form.title}" have been saved.`}</Text>
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
      style={[styles.container, { backgroundColor: themeColors.bluishWhite }]}
      edges={["bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
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
              <View
                key={q.id}
                style={[
                  styles.questionCard,
                  { backgroundColor: themeColors.white },
                ]}
              >
                <View style={styles.questionHeader}>
                  <View
                    style={[
                      styles.qNumber,
                      {
                        backgroundColor: answers[q.id]
                          ? "#4CAF50"
                          : activeColor,
                      },
                    ]}
                  >
                    {answers[q.id] ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : (
                      <Text style={styles.qNumberText}>{idx + 1}</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.questionText,
                      { color: themeColors.charcoal },
                    ]}
                  >
                    {q.text}
                  </Text>
                </View>

                {q.type === "text" && (
                  <TextInput
                    style={[
                      styles.textAnswer,
                      { color: themeColors.charcoal, borderColor: "#e0e0e0" },
                    ]}
                    value={answers[q.id] ?? ""}
                    onChangeText={(v) => setAnswer(q.id, v)}
                    placeholder="Type your answer..."
                    placeholderTextColor="#999"
                  />
                )}

                {(q.type === "multiple_choice" || q.type === "yes_no") && (
                  <View style={styles.optionsList}>
                    {q.options?.map((opt) => {
                      const isSelected = answers[q.id] === opt;
                      return (
                        <Pressable
                          key={opt}
                          style={[
                            styles.optionRow,
                            isSelected && {
                              backgroundColor: activeColor + "15",
                              borderColor: activeColor,
                            },
                          ]}
                          onPress={() => setAnswer(q.id, opt)}
                        >
                          <Ionicons
                            name={
                              isSelected
                                ? "radio-button-on"
                                : "radio-button-off"
                            }
                            size={20}
                            color={isSelected ? activeColor : "#999"}
                          />
                          <Text
                            style={[
                              styles.optionText,
                              isSelected && {
                                color: activeColor,
                                fontWeight: "600",
                              },
                            ]}
                          >
                            {opt}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
        <View
          style={[styles.bottomBar, { backgroundColor: themeColors.white }]}
        >
          <Pressable
            style={[
              styles.submitBtn,
              { backgroundColor: activeColor },
              submitting && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Submit Form</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  formHeader: {
    padding: 24,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
  },
  formDesc: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 16 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  progressBg: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
  },
  progressFill: { height: "100%", backgroundColor: "#fff", borderRadius: 3 },
  progressText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  questions: { padding: 16, gap: 16, marginTop: -10 },
  errorBanner: {
    backgroundColor: "#ffebee",
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  errorText: { color: "#c56451", fontSize: 13, fontWeight: "500" },
  questionCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  questionHeader: { flexDirection: "row", gap: 12, marginBottom: 16 },
  qNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  qNumberText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  questionText: { flex: 1, fontSize: 15, fontWeight: "600", lineHeight: 22 },
  textAnswer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
  },
  optionsList: { gap: 8 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
  },
  optionText: { fontSize: 15, color: "#353535" },
  bottomBar: {
    padding: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
  successSub: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 32,
  },
  doneBtn: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10 },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
