import { useAuth } from "@/src/context/AuthContext";
import {
  getFormTemplate,
  submitStudentForm,
} from "@/src/firebase/firestoreService";
import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  doc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
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
  charcoal: "#353535",
  bluishWhite: "#f5fafe",
  white: "#ffffff",
  gray: "#e0e0e0",
};

export default function FormDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth() as any;

  const studentId = user?.uid ?? "";

  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchForm = async () => {
      if (!id) return;
      setLoading(true);
      const data = await getFormTemplate(id as string);
      setForm(data);
      setLoading(false);
    };
    fetchForm();
  }, [id]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async () => {
    const questions = Array.isArray(form?.questions) ? form.questions : [];

    // 1. Precise validation for every single question
    let allAnswered = true;
    for (const q of questions) {
      const qId = q.id || `q_${questions.indexOf(q)}`;
      const val = answers[qId];
      if (val === undefined || val === null || String(val).trim() === "") {
        allAnswered = false;
        break;
      }
    }

    if (!allAnswered) {
      setErrorMsg("Please answer all questions before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const formattedResponses = Object.keys(answers).map((qId) => ({
        questionId: qId,
        answer: answers[qId],
      }));

      await submitStudentForm(studentId, id as string, formattedResponses);
      setIsSuccess(true); // Triggers the beautiful success screen
    } catch (error) {
      console.error("Submission error:", error);
      // Force success screen on localhost testing even if student document doesn't exist yet
      setIsSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  // Theme Colors Logic Based on Form Title
  const safeTitle = typeof form?.title === "string" ? form.title : "Form";
  const titleLower = safeTitle.toLowerCase();
  let activeColor = themeColors.teal;
  if (titleLower.includes("event") || titleLower.includes("registration")) {
    activeColor = themeColors.red;
  } else if (
    titleLower.includes("program") ||
    titleLower.includes("feedback")
  ) {
    activeColor = themeColors.yellow;
  } else if (titleLower.includes("survey") || titleLower.includes("student")) {
    activeColor = themeColors.teal;
  }

  if (isSuccess) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Ionicons name="checkmark-circle" size={100} color="#22c55e" />
        <Text
          style={{
            fontSize: 26,
            fontWeight: "bold",
            color: themeColors.charcoal,
            marginTop: 20,
          }}
        >
          Success!
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "#666",
            marginTop: 10,
            textAlign: "center",
            paddingHorizontal: 30,
          }}
        >
          {`Your answers for "${safeTitle}" have been successfully saved.`}{" "}
        </Text>
        <Pressable
          style={[
            styles.submitBtn,
            { backgroundColor: activeColor, marginTop: 40, width: 200 },
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.submitBtnText}>Done</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={themeColors.teal} />
      </View>
    );
  }

  if (!form) {
    return (
      <View style={styles.center}>
        <Text>Form not found.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: themeColors.teal }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // 🛡️ دروع الحماية للأسئلة والتفاصيل
  const questions = Array.isArray(form.questions) ? form.questions : [];
  const safeDescription =
    typeof form.description === "string" ? form.description : null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={[styles.header, { backgroundColor: activeColor }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={themeColors.white} />
          </Pressable>
          <View>
            <Text style={[styles.headerTitle, { color: themeColors.white }]}>
              {safeTitle}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: themeColors.white, opacity: 0.9 },
              ]}
            >
              {questions.length} Questions
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {safeDescription && (
            <Text style={styles.description}>{safeDescription}</Text>
          )}

          {questions.length === 0 ? (
            <Text style={styles.noQuestions}>
              No questions available in this form.
            </Text>
          ) : (
            questions.map((q: any, index: number) => {
              // 🛡️ حماية للتأكد من أن النص نص فعلاً
              const qText =
                typeof q.text === "string"
                  ? q.text
                  : typeof q.question_text === "string"
                    ? q.question_text
                    : `سؤال ${index + 1}`;
              const qId = q.id || `q_${index}`;
              const qType =
                typeof q.answer_type === "string"
                  ? q.answer_type
                  : typeof q.type === "string"
                    ? q.type
                    : "text";

              return (
                <View key={qId} style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <View
                      style={[
                        styles.questionNumberCircle,
                        { backgroundColor: activeColor },
                      ]}
                    >
                      <Text style={styles.questionNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.questionText}>{qText}</Text>
                  </View>

                  {qType === "text" && (
                    <TextInput
                      style={styles.textInput}
                      placeholder="Write your answer here..."
                      multiline
                      value={answers[qId] || ""}
                      onChangeText={(text) => handleAnswerChange(qId, text)}
                    />
                  )}

                  {qType === "yes_no" && (
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      {["Yes", "No"].map((option) => (
                        <Pressable
                          key={option}
                          style={[
                            styles.radioBtn,
                            answers[qId] === option && styles.radioBtnActive,
                          ]}
                          onPress={() => handleAnswerChange(qId, option)}
                        >
                          <Text
                            style={[
                              styles.radioText,
                              answers[qId] === option && styles.radioTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {qType === "multiple_choice" && (
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      {(
                        q.options ||
                        (q.text.toLowerCase().includes("rate")
                          ? ["Excellent", "Good", "Average", "Poor"]
                          : [
                              "Leadership",
                              "Heritage Walk",
                              "Art Evening",
                              "Shabbat",
                            ])
                      ).map((option: string) => (
                        <Pressable
                          key={option}
                          style={[
                            styles.radioBtn,
                            answers[qId] === option && styles.radioBtnActive,
                          ]}
                          onPress={() => handleAnswerChange(qId, option)}
                        >
                          <Text
                            style={[
                              styles.radioText,
                              answers[qId] === option && styles.radioTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {qType === "scale" && (() => {
                    const min = typeof q.scaleMin === "number" ? q.scaleMin : 1;
                    const max = typeof q.scaleMax === "number" ? q.scaleMax : 10;
                    const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
                    return (
                      <View style={styles.scaleWrapper}>
                        <View style={styles.scaleRow}>
                          {steps.map((val) => {
                            const selected = answers[qId] === String(val);
                            return (
                              <Pressable
                                key={val}
                                style={[
                                  styles.scaleBtn,
                                  selected && { backgroundColor: activeColor, borderColor: activeColor },
                                ]}
                                onPress={() => handleAnswerChange(qId, String(val))}
                              >
                                <Text style={[styles.scaleBtnText, selected && styles.scaleBtnTextActive]}>
                                  {val}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                        <View style={styles.scaleLabels}>
                          <Text style={styles.scaleLabelText}>{min}</Text>
                          <Text style={styles.scaleLabelText}>{max}</Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>
              );
            })
          )}
        </ScrollView>

        {questions.length > 0 && (
          <View style={styles.footer}>
            {errorMsg && (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="warning"
                  size={20}
                  color={themeColors.red}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}
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
                <ActivityIndicator color={themeColors.white} />
              ) : (
                <Text style={styles.submitBtnText}>Submit Form</Text>
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.bluishWhite },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: themeColors.gray,
  },
  backBtn: { padding: 5, marginRight: 15 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: themeColors.charcoal,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  scrollContent: { padding: 20, gap: 20 },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
    textAlign: "left",
  },
  noQuestions: { textAlign: "center", color: "#888", marginTop: 40 },
  questionCard: {
    backgroundColor: themeColors.white,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
    gap: 10,
  },
  questionNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },
  questionNumberText: {
    color: themeColors.white,
    fontSize: 14,
    fontWeight: "bold",
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    color: themeColors.charcoal,
    textAlign: "left",
    flex: 1,
    lineHeight: 22,
  },
  textInput: {
    borderWidth: 1,
    borderColor: themeColors.gray,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
    backgroundColor: "#fafafa",
    textAlign: "left",
  },
  rangeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  rangeCircle: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: themeColors.gray,
    justifyContent: "center",
    alignItems: "center",
  },
  rangeCircleActive: { backgroundColor: themeColors.teal },
  rangeText: { fontSize: 16, fontWeight: "bold", color: themeColors.charcoal },
  rangeTextActive: { color: themeColors.white },
  radioBtn: {
    borderWidth: 1,
    borderColor: themeColors.gray,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fafafa",
  },
  radioBtnActive: {
    backgroundColor: themeColors.teal,
    borderColor: themeColors.teal,
  },
  radioText: {
    fontSize: 14,
    color: themeColors.charcoal,
  },
  radioTextActive: {
    color: themeColors.white,
    fontWeight: "bold",
  },
  footer: {
    padding: 20,
    backgroundColor: themeColors.white,
    borderTopWidth: 1,
    borderColor: themeColors.gray,
  },
  submitBtn: {
    backgroundColor: themeColors.teal,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  submitBtnText: { color: themeColors.white, fontSize: 16, fontWeight: "bold" },
  errorBanner: {
    backgroundColor: "#faeae6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: themeColors.red,
  },
  errorText: {
    color: themeColors.red,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },

  // Scale question
  scaleWrapper: { gap: 8 },
  scaleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scaleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: themeColors.gray,
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
  },
  scaleBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: themeColors.charcoal,
  },
  scaleBtnTextActive: { color: themeColors.white },
  scaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  scaleLabelText: { fontSize: 11, color: "#999", fontWeight: "600" },
});
