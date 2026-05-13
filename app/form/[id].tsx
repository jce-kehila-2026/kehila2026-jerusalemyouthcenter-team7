import { currentUser, forms } from "@/src/data/mockData";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
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
      <SafeAreaView
        style={[styles.container, { backgroundColor: themeColors.bluishWhite }]}
      >
        <View style={styles.centered}>
          <Text style={{ color: themeColors.charcoal }}>
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
      <SafeAreaView
        style={[styles.container, { backgroundColor: themeColors.bluishWhite }]}
      >
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={72} color={activeColor} />
          </View>
          <Text style={[styles.successTitle, { color: themeColors.charcoal }]}>
            تم الإرسال!
          </Text>
          <Text style={[styles.successSub, { color: "#666" }]}>
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
      style={[styles.container, { backgroundColor: themeColors.bluishWhite }]}
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
                      styles.qNumber,
                      {
                        backgroundColor: answers[q.id]
                          ? activeColor
                          : "#e0e0e0",
                      },
                    ]}
                  >
                    {answers[q.id] ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : (
                      <Text
                        style={[
                          styles.qNumberText,
                          { color: themeColors.charcoal },
                        ]}
                      >
                        {idx + 1}
                      </Text>
                    )}
                  </View>
                </View>

                {q.type === "text" && (
                  <TextInput
                    style={[
                      styles.textAnswer,
                      {
                        color: themeColors.charcoal,
                        borderColor: "#ccc",
                        backgroundColor: "#fafafa",
                      },
                    ]}
                    value={answers[q.id] ?? ""}
                    onChangeText={(v) => setAnswer(q.id, v)}
                    placeholder="اكتب إجابتك هنا..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                  />
                )}

                {q.type === "yes_no" && (
                  <View style={styles.yesNoRow}>
                    {["Yes / نعم", "No / لا"].map((opt) => (
                      <Pressable
                        key={opt}
                        style={[
                          styles.optionBtn,
                          answers[q.id] === opt && {
                            backgroundColor: activeColor,
                            borderColor: activeColor,
                          },
                        ]}
                        onPress={() => setAnswer(q.id, opt)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            answers[q.id] === opt && styles.optionTextSelected,
                          ]}
                        >
                          {opt}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {q.type === "multiple_choice" && q.options && (
                  <View style={styles.optionsGrid}>
                    {q.options.map((opt) => (
                      <Pressable
                        key={opt}
                        style={[
                          styles.optionBtn,
                          answers[q.id] === opt && {
                            backgroundColor: activeColor,
                            borderColor: activeColor,
                          },
                        ]}
                        onPress={() => setAnswer(q.id, opt)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            answers[q.id] === opt && styles.optionTextSelected,
                          ]}
                        >
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

        <View
          style={[
            styles.submitBar,
            { backgroundColor: themeColors.white, borderTopColor: "#e0e0e0" },
          ]}
        >
          {/* Submit button matches activeColor */}
          <Pressable
            style={[
              styles.submitBtn,
              { backgroundColor: activeColor },
              submitting && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>إرسال / Submit Form</Text>
                <Ionicons
                  name="send-outline"
                  size={18}
                  color="#fff"
                  style={{ transform: [{ scaleX: -1 }] }}
                />
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  formHeader: { padding: 24, alignItems: "flex-end" },
  formTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
    textAlign: "right",
  },
  formDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 14,
    textAlign: "right",
  },
  progressRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  progressBg: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 3,
    position: "absolute",
    right: 0,
  },
  progressText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  questions: { padding: 16, gap: 12 },
  questionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    elevation: 1,
  },
  questionHeader: {
    flexDirection: "row-reverse",
    gap: 10,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  qNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  qNumberText: { fontSize: 12, fontWeight: "800" },
  questionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    textAlign: "right",
  },

  textAnswer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    textAlign: "right",
  },

  yesNoRow: { flexDirection: "row-reverse", gap: 10 },
  optionsGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  optionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "transparent",
  },
  optionText: { fontSize: 14, fontWeight: "600", color: "#555" },
  optionTextSelected: { color: "#fff" },

  submitBar: { padding: 16, borderTopWidth: 1 },
  submitBtn: {
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 28, fontWeight: "800", marginBottom: 8 },
  successSub: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  doneBtn: {
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
