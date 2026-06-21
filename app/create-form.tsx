import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
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

// ── Design System ─────────────────────────────────────────────────────────────
const ds = {
  teal:    "#039899",
  red:     "#c56451",
  white:   "#ffffff",
  bg:      "#f5fafe",
  text:    "#1a1a2e",
  subtext: "#5a6a7a",
  border:  "#e8eef2",
} as const;

// ── Screen ────────────────────────────────────────────────────────────────────
export default function CreateFormScreen() {
  const router = useRouter();
  const { id, isEditing, formData } = useLocalSearchParams<{
    id?: string;
    isEditing?: string;
    formData?: string;
  }>();

  const [title, setTitle]         = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<
    { id: string; text: string; type: string; options?: string[]; scaleMin?: number; scaleMax?: number; minLabel?: string; maxLabel?: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const editing = isEditing === "true";

  useEffect(() => {
    if (editing && formData) {
      try {
        const parsed = JSON.parse(formData);
        setTitle(parsed.title || "");
        setDescription(parsed.description || "");
        setQuestions(parsed.questions || []);
      } catch (error) {
        console.error("Error parsing form data:", error);
      }
    }
  }, [editing, formData]);

  // ── Firebase actions ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Error", "Please provide a title and description.");
      return;
    }
    setLoading(true);
    try {
      if (editing && id) {
        await updateDoc(doc(db, "forms", id), {
          title: title.trim(),
          description: description.trim(),
          questions,
        });
        Alert.alert("Success", "Form updated successfully!");
      } else {
        await addDoc(collection(db, "forms"), {
          title: title.trim(),
          description: description.trim(),
          createdAt: new Date().toISOString(),
          target_audience: "both",
          questions,
        });
        Alert.alert("Success", "Form created successfully!");
      }
      router.back();
    } catch (error) {
      console.error("Error saving form:", error);
      Alert.alert("Error", "Failed to save the form. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Question helpers ──────────────────────────────────────────────────────
  const addQuestion = () => {
    setQuestions([
      ...questions,
      { id: Date.now().toString(), text: "", type: "text", options: [""] },
    ]);
  };

  const updateQuestionText = (qId: string, text: string) => {
    setQuestions(questions.map((q) => (q.id === qId ? { ...q, text } : q)));
  };

  const updateQuestionType = (qId: string, type: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        if (type === "scale") {
          return { ...q, type, scaleMin: q.scaleMin ?? 1, scaleMax: q.scaleMax ?? 10 };
        }
        return { ...q, type, options: q.options?.length ? q.options : [""] };
      }),
    );
  };

  const updateScaleMin = (qId: string, val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setQuestions(questions.map((q) => (q.id === qId ? { ...q, scaleMin: num } : q)));
    }
  };

  const updateScaleMax = (qId: string, val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setQuestions(questions.map((q) => (q.id === qId ? { ...q, scaleMax: num } : q)));
    }
  };

  const updateScaleMinLabel = (qId: string, val: string) => {
    setQuestions(questions.map((q) => (q.id === qId ? { ...q, minLabel: val } : q)));
  };

  const updateScaleMaxLabel = (qId: string, val: string) => {
    setQuestions(questions.map((q) => (q.id === qId ? { ...q, maxLabel: val } : q)));
  };

  const updateOption = (qId: string, optIndex: number, text: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        const newOptions = [...(q.options || [])];
        newOptions[optIndex] = text;
        return { ...q, options: newOptions };
      }),
    );
  };

  const addOption = (qId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === qId ? { ...q, options: [...(q.options || []), ""] } : q,
      ),
    );
  };

  const removeOption = (qId: string, optIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        const newOptions = [...(q.options || [])];
        newOptions.splice(optIndex, 1);
        return { ...q, options: newOptions };
      }),
    );
  };

  const removeQuestion = (qId: string) => {
    setQuestions(questions.filter((q) => q.id !== qId));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>

      {/* ── Teal Header ───────────────────────────────────────────────── */}
      <View style={s.headerBg}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={ds.white} />
        </Pressable>
        <View style={s.headerText}>
          <Text style={s.orgLabel}>🎵 Jerusalem Youth Chorus</Text>
          <Text style={s.pageTitle} numberOfLines={1}>
            {editing ? "Edit Form" : "Create New Form"}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Form Details Card ────────────────────────────────────── */}
          <View style={s.card}>
            <View style={s.cardTopBar} />
            <View style={s.cardBody}>
              <Text style={s.fieldLabel}>Form Title</Text>
              <TextInput
                style={s.input}
                placeholder="Enter form title..."
                placeholderTextColor={ds.subtext}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={[s.fieldLabel, { marginTop: 16 }]}>
                Form Description
              </Text>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Enter form description..."
                placeholderTextColor={ds.subtext}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {/* ── Question Cards ───────────────────────────────────────── */}
          {questions.map((q, index) => (
            <View key={q.id} style={s.card}>
              <View style={s.cardTopBar} />
              <View style={s.cardBody}>
                {/* Question header */}
                <View style={s.questionHeader}>
                  <View style={s.questionNumberBadge}>
                    <Text style={s.questionNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={s.questionHeaderLabel}>Question {index + 1}</Text>
                  <Pressable
                    style={s.deleteBtn}
                    onPress={() => removeQuestion(q.id)}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={14} color={ds.white} />
                  </Pressable>
                </View>

                {/* Question text input */}
                <TextInput
                  style={s.input}
                  placeholder="Enter question text..."
                  placeholderTextColor={ds.subtext}
                  value={q.text}
                  onChangeText={(text) => updateQuestionText(q.id, text)}
                />

                {/* Type selector */}
                <View style={s.typeSelector}>
                  <Pressable
                    style={[
                      s.typeBtn,
                      q.type === "text" && s.typeBtnActive,
                    ]}
                    onPress={() => updateQuestionType(q.id, "text")}
                  >
                    <Ionicons
                      name="text-outline"
                      size={16}
                      color={q.type === "text" ? ds.teal : ds.subtext}
                    />
                    <Text
                      style={[
                        s.typeBtnText,
                        q.type === "text" && s.typeBtnTextActive,
                      ]}
                    >
                      Text Answer
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      s.typeBtn,
                      q.type === "multiple_choice" && s.typeBtnActive,
                    ]}
                    onPress={() => updateQuestionType(q.id, "multiple_choice")}
                  >
                    <Ionicons
                      name="list-outline"
                      size={16}
                      color={
                        q.type === "multiple_choice" ? ds.teal : ds.subtext
                      }
                    />
                    <Text
                      style={[
                        s.typeBtnText,
                        q.type === "multiple_choice" && s.typeBtnTextActive,
                      ]}
                    >
                      Multiple Choice
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      s.typeBtn,
                      q.type === "scale" && s.typeBtnActive,
                    ]}
                    onPress={() => updateQuestionType(q.id, "scale")}
                  >
                    <Ionicons
                      name="options-outline"
                      size={16}
                      color={q.type === "scale" ? ds.teal : ds.subtext}
                    />
                    <Text
                      style={[
                        s.typeBtnText,
                        q.type === "scale" && s.typeBtnTextActive,
                      ]}
                    >
                      Scale
                    </Text>
                  </Pressable>
                </View>

                {/* Scale min/max config */}
                {q.type === "scale" && (
                  <View style={s.scaleConfig}>
                    <View style={s.scaleNumRow}>
                      <View style={s.scaleField}>
                        <Text style={s.scaleLabel}>Min</Text>
                        <TextInput
                          style={s.scaleInput}
                          keyboardType="number-pad"
                          value={String(q.scaleMin ?? 1)}
                          onChangeText={(v) => updateScaleMin(q.id, v)}
                          maxLength={3}
                        />
                      </View>
                      <View style={s.scaleDivider} />
                      <View style={s.scaleField}>
                        <Text style={s.scaleLabel}>Max</Text>
                        <TextInput
                          style={s.scaleInput}
                          keyboardType="number-pad"
                          value={String(q.scaleMax ?? 10)}
                          onChangeText={(v) => updateScaleMax(q.id, v)}
                          maxLength={3}
                        />
                      </View>
                      <View style={s.scalePreview}>
                        <Text style={s.scalePreviewText}>
                          {q.scaleMin ?? 1} → {q.scaleMax ?? 10}
                        </Text>
                      </View>
                    </View>
                    <View style={s.scaleLabelRow}>
                      <View style={s.scaleLabelField}>
                        <Text style={s.scaleLabel}>Min Label</Text>
                        <TextInput
                          style={s.scaleLabelInput}
                          placeholder="e.g. Not at all"
                          placeholderTextColor={ds.subtext}
                          value={q.minLabel ?? ""}
                          onChangeText={(v) => updateScaleMinLabel(q.id, v)}
                        />
                      </View>
                      <View style={s.scaleLabelField}>
                        <Text style={s.scaleLabel}>Max Label</Text>
                        <TextInput
                          style={s.scaleLabelInput}
                          placeholder="e.g. Extremely"
                          placeholderTextColor={ds.subtext}
                          value={q.maxLabel ?? ""}
                          onChangeText={(v) => updateScaleMaxLabel(q.id, v)}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Options (multiple choice) */}
                {q.type === "multiple_choice" && (
                  <View style={s.optionsContainer}>
                    {(q.options || []).map((opt, optIdx) => (
                      <View key={optIdx} style={s.optionRow}>
                        <Ionicons
                          name="radio-button-off"
                          size={18}
                          color={ds.subtext}
                        />
                        <TextInput
                          style={s.optionInput}
                          placeholder={`Option ${optIdx + 1}`}
                          placeholderTextColor={ds.subtext}
                          value={opt}
                          onChangeText={(txt) =>
                            updateOption(q.id, optIdx, txt)
                          }
                        />
                        {(q.options || []).length > 1 && (
                          <Pressable
                            style={s.removeOptionBtn}
                            onPress={() => removeOption(q.id, optIdx)}
                            hitSlop={8}
                          >
                            <Ionicons name="close" size={18} color={ds.red} />
                          </Pressable>
                        )}
                      </View>
                    ))}
                    <Pressable
                      style={s.addOptionBtn}
                      onPress={() => addOption(q.id)}
                    >
                      <Ionicons name="add" size={16} color={ds.teal} />
                      <Text style={s.addOptionText}>Add Option</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* ── Add Question Button ──────────────────────────────────── */}
          <Pressable style={s.addQuestionBtn} onPress={addQuestion}>
            <Ionicons name="add-circle-outline" size={20} color={ds.teal} />
            <Text style={s.addQuestionText}>Add Question</Text>
          </Pressable>
        </ScrollView>

        {/* ── Save Footer ──────────────────────────────────────────────── */}
        <View style={s.footer}>
          <Pressable
            style={[s.saveBtn, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {!loading && (
              <Ionicons name="checkmark-circle-outline" size={20} color={ds.white} />
            )}
            <Text style={s.saveBtnText}>
              {loading ? "Saving..." : "Save Form"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ds.teal },
  flex: { flex: 1, backgroundColor: ds.bg },

  // Header
  headerBg: {
    backgroundColor: ds.teal,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backBtn: {
    marginTop: 16,
  },
  headerText: { flex: 1 },
  orgLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: ds.white,
  },

  // Scroll
  scrollContent: { padding: 16, gap: 16, paddingBottom: 24 },

  // Card
  card: {
    backgroundColor: ds.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ds.border,
    overflow: "hidden",
    shadowColor: ds.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTopBar: { height: 4, backgroundColor: ds.teal },
  cardBody:   { padding: 16, gap: 8 },

  // Fields
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: ds.subtext,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: ds.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: ds.text,
    backgroundColor: ds.bg,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top",
  },

  // Question header
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  questionNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ds.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  questionNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: ds.white,
  },
  questionHeaderLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: ds.text,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: ds.red,
    alignItems: "center",
    justifyContent: "center",
  },

  // Type selector
  typeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ds.border,
    backgroundColor: ds.bg,
  },
  typeBtnActive: {
    borderColor: ds.teal,
    backgroundColor: ds.teal + "12",
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: ds.subtext,
  },
  typeBtnTextActive: { color: ds.teal },

  // Options
  optionsContainer: { gap: 8, marginTop: 8 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: ds.border,
    paddingVertical: 8,
    fontSize: 15,
    color: ds.text,
  },
  removeOptionBtn: { padding: 4 },
  addOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 8,
    paddingVertical: 8,
  },
  addOptionText: { fontSize: 14, fontWeight: "600", color: ds.teal },

  // Scale config
  scaleConfig: {
    gap: 12,
    marginTop: 8,
    padding: 12,
    backgroundColor: ds.teal + "0d",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ds.teal + "30",
  },
  scaleNumRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scaleLabelRow: {
    flexDirection: "row",
    gap: 12,
  },
  scaleLabelField: {
    flex: 1,
    gap: 4,
  },
  scaleLabelInput: {
    borderWidth: 1,
    borderColor: ds.teal + "60",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: ds.text,
    backgroundColor: ds.white,
  },
  scaleField: { alignItems: "center", gap: 4 },
  scaleLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: ds.teal,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  scaleInput: {
    width: 56,
    borderWidth: 1,
    borderColor: ds.teal + "60",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 16,
    fontWeight: "700",
    color: ds.text,
    textAlign: "center",
    backgroundColor: ds.white,
  },
  scaleDivider: {
    flex: 1,
    height: 1,
    backgroundColor: ds.teal + "40",
    marginHorizontal: 4,
  },
  scalePreview: {
    backgroundColor: ds.teal,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scalePreviewText: { fontSize: 13, fontWeight: "700", color: ds.white },

  // Add Question button
  addQuestionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: ds.teal,
    backgroundColor: ds.white,
  },
  addQuestionText: { fontSize: 15, fontWeight: "700", color: ds.teal },

  // Footer / Save
  footer: {
    backgroundColor: ds.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: ds.border,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: ds.teal,
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: ds.white },
});
