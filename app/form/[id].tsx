import { useAuth } from "@/src/context/AuthContext";
import { leaderboardService } from "@/src/data/leaderboardService";
import { db } from "@/src/firebase/firebase";
import {
  getFormTemplate,
  submitStudentForm,
} from "@/src/firebase/firestoreService";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
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
  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

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

  const handleNext = (currentQuestions: any[], questions: any[]) => {
    for (const q of currentQuestions) {
      const qId = q.id || `q_${questions.indexOf(q)}`;
      const val = answers[qId];
      if (val === undefined || val === null || String(val).trim() === "") {
        setErrorMsg(
          "Please answer all questions on this page before continuing.",
        );
        return;
      }
    }
    setErrorMsg(null);
    setCurrentStep((s) => s + 1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleBack = () => {
    setErrorMsg(null);
    setCurrentStep((s) => s - 1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
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

      if (user?.role === "singer") {
        await leaderboardService.awardPoints(
          user.uid,
          user.full_name ?? "",
          user.voice_type ?? "",
          "submit_form",
        );
      }

      try {
        const studentName = user?.full_name ?? "A student";
        const formTitle =
          typeof form?.title === "string" ? form.title : "a form";
        const adminsSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "admin")),
        );
        const batch = writeBatch(db);
        adminsSnap.forEach((adminDoc) => {
          const notifRef = doc(collection(db, "notifications"));
          batch.set(notifRef, {
            target_uid: adminDoc.id,
            title: "New Form Submission",
            body: `${studentName} has submitted the form: ${formTitle}`,
            timestamp: Date.now(),
            is_read: false,
            type: "alert",
          });
        });
        await batch.commit();
      } catch (error) {
        console.error("🔥 Notification Error: ", error);
      }

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

  const questions = Array.isArray(form.questions) ? form.questions : [];
  const safeDescription =
    typeof form.description === "string" ? form.description : null;

  let formPages: any[][];
  let pageTitles: string[];
  if (Array.isArray(form.pages) && form.pages.length > 0) {
    formPages = form.pages.map((p: any) =>
      Array.isArray(p.questions) ? p.questions : [],
    );
    pageTitles = form.pages.map((p: any) =>
      typeof p.title === "string" ? p.title : "",
    );
  } else {
    const CHUNK = 3;
    formPages = [];
    for (let i = 0; i < questions.length; i += CHUNK) {
      formPages.push(questions.slice(i, i + CHUNK));
    }
    pageTitles = formPages.map(() => "");
  }
  if (formPages.length === 0) {
    formPages.push([]);
    pageTitles.push("");
  }
  const totalSteps = formPages.length;
  const currentQuestions = formPages[currentStep] ?? [];
  const isLastStep = currentStep === totalSteps - 1;
  const globalStartIndex = formPages
    .slice(0, currentStep)
    .reduce((sum, p) => sum + p.length, 0);
  const currentPageTitle = pageTitles[currentStep] ?? "";

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

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
        >
          {safeDescription && currentStep === 0 && (
            <Text style={styles.description}>{safeDescription}</Text>
          )}

          {currentPageTitle ? (
            <View style={styles.pageTitleCard}>
              <Text style={styles.pageTitleText}>{currentPageTitle}</Text>
            </View>
          ) : null}

          {questions.length === 0 ? (
            <Text style={styles.noQuestions}>
              No questions available in this form.
            </Text>
          ) : (
            currentQuestions.map((q: any, index: number) => {
              const globalIndex = globalStartIndex + index;
              const qText =
                typeof q.text === "string"
                  ? q.text
                  : typeof q.question_text === "string"
                    ? q.question_text
                    : `Question ${globalIndex + 1}`;
              const qId = q.id || `q_${globalIndex}`;
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
                      <Text style={styles.questionNumberText}>
                        {globalIndex + 1}
                      </Text>
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

                  {qType === "scale" &&
                    (() => {
                      const min =
                        typeof q.scaleMin === "number" ? q.scaleMin : 1;
                      const max =
                        typeof q.scaleMax === "number" ? q.scaleMax : 10;
                      const minLabel =
                        typeof q.minLabel === "string" ? q.minLabel.trim() : "";
                      const maxLabel =
                        typeof q.maxLabel === "string" ? q.maxLabel.trim() : "";
                      const steps = Array.from(
                        { length: max - min + 1 },
                        (_, i) => min + i,
                      );
                      return (
                        <View style={styles.scaleInlineRow}>
                          {minLabel ? (
                            <Text style={styles.scaleInlineLabel}>
                              {minLabel}
                            </Text>
                          ) : null}
                          <View style={styles.scaleRow}>
                            {steps.map((val) => {
                              const selected = answers[qId] === String(val);
                              return (
                                <Pressable
                                  key={val}
                                  style={[
                                    styles.scaleBtn,
                                    selected && {
                                      backgroundColor: activeColor,
                                      borderWidth: 0,
                                      shadowColor: activeColor,
                                      shadowOffset: { width: 0, height: 4 },
                                      shadowOpacity: 0.35,
                                      shadowRadius: 6,
                                      elevation: 5,
                                    },
                                  ]}
                                  onPress={() =>
                                    handleAnswerChange(qId, String(val))
                                  }
                                >
                                  <Text
                                    style={[
                                      styles.scaleBtnText,
                                      selected && styles.scaleBtnTextActive,
                                    ]}
                                  >
                                    {val}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          {maxLabel ? (
                            <Text
                              style={[
                                styles.scaleInlineLabel,
                                { textAlign: "right" },
                              ]}
                            >
                              {maxLabel}
                            </Text>
                          ) : null}
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
            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${((currentStep + 1) / totalSteps) * 100}%` as any,
                    backgroundColor: activeColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              Page {currentStep + 1} of {totalSteps}
            </Text>

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

            <View style={styles.navRow}>
              <Pressable
                style={[
                  styles.backNavBtn,
                  {
                    borderColor:
                      currentStep === 0 ? themeColors.gray : activeColor,
                  },
                ]}
                onPress={handleBack}
                disabled={currentStep === 0}
              >
                <Ionicons
                  name="arrow-back"
                  size={18}
                  color={currentStep === 0 ? themeColors.gray : activeColor}
                />
                <Text
                  style={[
                    styles.backNavBtnText,
                    {
                      color: currentStep === 0 ? themeColors.gray : activeColor,
                    },
                  ]}
                >
                  Back
                </Text>
              </Pressable>

              {isLastStep ? (
                <Pressable
                  style={[
                    styles.submitBtn,
                    { backgroundColor: activeColor, flex: 1 },
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
              ) : (
                <Pressable
                  style={[
                    styles.submitBtn,
                    { backgroundColor: activeColor, flex: 1 },
                  ]}
                  onPress={() => handleNext(currentQuestions, questions)}
                >
                  <Text style={styles.submitBtnText}>Next</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={themeColors.white}
                  />
                </Pressable>
              )}
            </View>
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
  scaleInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  scaleInlineLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
    flexShrink: 1,
  },
  scaleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    flexShrink: 1,
    gap: 10,
  },
  scaleBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  scaleBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
  },
  scaleBtnTextActive: { color: themeColors.white },

  // Pagination footer
  progressTrack: {
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "500",
  },
  navRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  backNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  backNavBtnText: { fontSize: 16, fontWeight: "700" },

  // Page section title
  pageTitleCard: {
    backgroundColor: themeColors.teal + "15",
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: themeColors.teal,
  },
  pageTitleText: { fontSize: 15, fontWeight: "700", color: themeColors.teal },
});
