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
  teal: "#039899",
  red: "#c56451",
  white: "#ffffff",
  bg: "#f5fafe",
  text: "#1a1a2e",
  subtext: "#5a6a7a",
  border: "#e8eef2",
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────
type QuestionDef = {
  id: string;
  text: string;
  type: string;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  minLabel?: string;
  maxLabel?: string;
};

type PageDef = {
  id: string;
  title: string;
  questions: QuestionDef[];
};

const makeQuestion = (): QuestionDef => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  text: "",
  type: "text",
  options: [""],
});

const makePage = (): PageDef => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  title: "",
  questions: [],
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function CreateFormScreen() {
  const router = useRouter();
  const { id, isEditing, formData } = useLocalSearchParams<{
    id?: string;
    isEditing?: string;
    formData?: string;
  }>();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pages, setPages] = useState<PageDef[]>([makePage()]);
  const [loading, setLoading] = useState(false);

  const editing = isEditing === "true";

  useEffect(() => {
    if (editing && formData) {
      try {
        const parsed = JSON.parse(formData);
        setTitle(parsed.title || "");
        setDescription(parsed.description || "");
        if (Array.isArray(parsed.pages) && parsed.pages.length > 0) {
          setPages(parsed.pages);
        } else if (
          Array.isArray(parsed.questions) &&
          parsed.questions.length > 0
        ) {
          // Legacy flat-question format: wrap in a single page
          setPages([
            { id: "page_legacy", title: "", questions: parsed.questions },
          ]);
        }
      } catch (error) {
        console.error("Error parsing form data:", error);
      }
    }
  }, [editing, formData]);

  // ── Firebase actions ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Error", "Please provide a title and description.");
      return;
    }
    setLoading(true);
    const flatQuestions = pages.flatMap((p) => p.questions);
    try {
      if (editing && id) {
        await updateDoc(doc(db, "forms", id), {
          title: title.trim(),
          description: description.trim(),
          pages,
          questions: flatQuestions,
        });
        Alert.alert("Success", "Form updated successfully!");
      } else {
        await addDoc(collection(db, "forms"), {
          title: title.trim(),
          description: description.trim(),
          createdAt: new Date().toISOString(),
          target_audience: "both",
          pages,
          questions: flatQuestions,
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

  // ── Page helpers ──────────────────────────────────────────────────────────
  const addPage = () => setPages((prev) => [...prev, makePage()]);

  const removePage = (pageId: string) =>
    setPages((prev) => prev.filter((p) => p.id !== pageId));

  const updatePageTitle = (pageId: string, val: string) =>
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, title: val } : p)),
    );

  // ── Question helpers ──────────────────────────────────────────────────────
  const updatePage = (
    pageId: string,
    fn: (qs: QuestionDef[]) => QuestionDef[],
  ) =>
    setPages((prev) =>
      prev.map((p) =>
        p.id === pageId ? { ...p, questions: fn(p.questions) } : p,
      ),
    );

  const addQuestion = (pageId: string) =>
    updatePage(pageId, (qs) => [...qs, makeQuestion()]);

  const removeQuestion = (pageId: string, qId: string) =>
    updatePage(pageId, (qs) => qs.filter((q) => q.id !== qId));

  const updateQuestionText = (pageId: string, qId: string, text: string) =>
    updatePage(pageId, (qs) =>
      qs.map((q) => (q.id === qId ? { ...q, text } : q)),
    );

  const updateQuestionType = (pageId: string, qId: string, type: string) =>
    updatePage(pageId, (qs) =>
      qs.map((q) => {
        if (q.id !== qId) return q;
        if (type === "scale")
          return {
            ...q,
            type,
            scaleMin: q.scaleMin ?? 1,
            scaleMax: q.scaleMax ?? 10,
          };
        return { ...q, type, options: q.options?.length ? q.options : [""] };
      }),
    );

  const updateScaleMin = (pageId: string, qId: string, val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num))
      updatePage(pageId, (qs) =>
        qs.map((q) => (q.id === qId ? { ...q, scaleMin: num } : q)),
      );
  };

  const updateScaleMax = (pageId: string, qId: string, val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num))
      updatePage(pageId, (qs) =>
        qs.map((q) => (q.id === qId ? { ...q, scaleMax: num } : q)),
      );
  };

  const updateScaleMinLabel = (pageId: string, qId: string, val: string) =>
    updatePage(pageId, (qs) =>
      qs.map((q) => (q.id === qId ? { ...q, minLabel: val } : q)),
    );

  const updateScaleMaxLabel = (pageId: string, qId: string, val: string) =>
    updatePage(pageId, (qs) =>
      qs.map((q) => (q.id === qId ? { ...q, maxLabel: val } : q)),
    );

  const updateOption = (
    pageId: string,
    qId: string,
    optIndex: number,
    text: string,
  ) =>
    updatePage(pageId, (qs) =>
      qs.map((q) => {
        if (q.id !== qId) return q;
        const opts = [...(q.options || [])];
        opts[optIndex] = text;
        return { ...q, options: opts };
      }),
    );

  const addOption = (pageId: string, qId: string) =>
    updatePage(pageId, (qs) =>
      qs.map((q) =>
        q.id === qId ? { ...q, options: [...(q.options || []), ""] } : q,
      ),
    );

  const removeOption = (pageId: string, qId: string, optIndex: number) =>
    updatePage(pageId, (qs) =>
      qs.map((q) => {
        if (q.id !== qId) return q;
        const opts = [...(q.options || [])];
        opts.splice(optIndex, 1);
        return { ...q, options: opts };
      }),
    );

  // ── Question card ─────────────────────────────────────────────────────────
  const renderQuestion = (
    pageId: string,
    q: QuestionDef,
    globalIndex: number,
  ) => (
    <View key={q.id} style={s.qCard}>
      <View style={s.questionHeader}>
        <View style={s.questionNumberBadge}>
          <Text style={s.questionNumberText}>{globalIndex + 1}</Text>
        </View>
        <Text style={s.questionHeaderLabel}>Question {globalIndex + 1}</Text>
        <Pressable
          style={s.deleteBtn}
          onPress={() => removeQuestion(pageId, q.id)}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={14} color={ds.white} />
        </Pressable>
      </View>

      <TextInput
        style={s.input}
        placeholder="Enter question text..."
        placeholderTextColor={ds.subtext}
        value={q.text}
        onChangeText={(text) => updateQuestionText(pageId, q.id, text)}
      />

      <View style={s.typeSelector}>
        {(["text", "multiple_choice", "scale"] as const).map((t) => (
          <Pressable
            key={t}
            style={[s.typeBtn, q.type === t && s.typeBtnActive]}
            onPress={() => updateQuestionType(pageId, q.id, t)}
          >
            <Ionicons
              name={
                t === "text"
                  ? "text-outline"
                  : t === "multiple_choice"
                    ? "list-outline"
                    : "options-outline"
              }
              size={16}
              color={q.type === t ? ds.teal : ds.subtext}
            />
            <Text style={[s.typeBtnText, q.type === t && s.typeBtnTextActive]}>
              {t === "text"
                ? "Text"
                : t === "multiple_choice"
                  ? "Choice"
                  : "Scale"}
            </Text>
          </Pressable>
        ))}
      </View>

      {q.type === "scale" && (
        <View style={s.scaleConfig}>
          <View style={s.scaleNumRow}>
            <View style={s.scaleField}>
              <Text style={s.scaleLabel}>Min</Text>
              <TextInput
                style={s.scaleInput}
                keyboardType="number-pad"
                value={String(q.scaleMin ?? 1)}
                onChangeText={(v) => updateScaleMin(pageId, q.id, v)}
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
                onChangeText={(v) => updateScaleMax(pageId, q.id, v)}
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
                onChangeText={(v) => updateScaleMinLabel(pageId, q.id, v)}
              />
            </View>
            <View style={s.scaleLabelField}>
              <Text style={s.scaleLabel}>Max Label</Text>
              <TextInput
                style={s.scaleLabelInput}
                placeholder="e.g. Extremely"
                placeholderTextColor={ds.subtext}
                value={q.maxLabel ?? ""}
                onChangeText={(v) => updateScaleMaxLabel(pageId, q.id, v)}
              />
            </View>
          </View>
        </View>
      )}

      {q.type === "multiple_choice" && (
        <View style={s.optionsContainer}>
          {(q.options || []).map((opt, optIdx) => (
            <View key={optIdx} style={s.optionRow}>
              <Ionicons name="radio-button-off" size={18} color={ds.subtext} />
              <TextInput
                style={s.optionInput}
                placeholder={`Option ${optIdx + 1}`}
                placeholderTextColor={ds.subtext}
                value={opt}
                onChangeText={(txt) => updateOption(pageId, q.id, optIdx, txt)}
              />
              {(q.options || []).length > 1 && (
                <Pressable
                  style={s.removeOptionBtn}
                  onPress={() => removeOption(pageId, q.id, optIdx)}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={18} color={ds.red} />
                </Pressable>
              )}
            </View>
          ))}
          <Pressable
            style={s.addOptionBtn}
            onPress={() => addOption(pageId, q.id)}
          >
            <Ionicons name="add" size={16} color={ds.teal} />
            <Text style={s.addOptionText}>Add Option</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  // ── Cumulative question index offsets per page ────────────────────────────
  const pageOffsets = pages.reduce<number[]>((acc, _, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + pages[i - 1].questions.length);
    return acc;
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* ── Teal Header ─────────────────────────────────────────────────── */}
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
          {/* ── Form Details ──────────────────────────────────────────── */}
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

          {/* ── Pages ─────────────────────────────────────────────────── */}
          {pages.map((page, pageIndex) => (
            <View key={page.id} style={s.pageContainer}>
              {/* Page header */}
              <View style={s.pageHeader}>
                <View style={s.pageBadge}>
                  <Text style={s.pageBadgeText}>Page {pageIndex + 1}</Text>
                </View>
                <TextInput
                  style={s.pageTitleInput}
                  placeholder="Section title (optional)"
                  placeholderTextColor={ds.subtext}
                  value={page.title}
                  onChangeText={(v) => updatePageTitle(page.id, v)}
                />
                {pageIndex > 0 && (
                  <Pressable
                    style={s.deletePageBtn}
                    hitSlop={8}
                    onPress={() =>
                      Alert.alert(
                        "Delete Page",
                        "Remove this page and all its questions?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => removePage(page.id),
                          },
                        ],
                      )
                    }
                  >
                    <Ionicons name="trash-outline" size={15} color={ds.red} />
                  </Pressable>
                )}
              </View>

              {/* Questions */}
              {page.questions.map((q, qIndex) =>
                renderQuestion(page.id, q, pageOffsets[pageIndex] + qIndex),
              )}

              {/* Add question to this page */}
              <Pressable style={s.addQBtn} onPress={() => addQuestion(page.id)}>
                <Ionicons name="add-circle-outline" size={18} color={ds.teal} />
                <Text style={s.addQBtnText}>
                  Add Question to Page {pageIndex + 1}
                </Text>
              </Pressable>
            </View>
          ))}

          {/* ── Add New Page ───────────────────────────────────────────── */}
          <Pressable style={s.addPageBtn} onPress={addPage}>
            <Ionicons name="albums-outline" size={20} color={ds.teal} />
            <Text style={s.addPageBtnText}>Add New Page / Section</Text>
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
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color={ds.white}
              />
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
  backBtn: { marginTop: 16 },
  headerText: { flex: 1 },
  orgLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 4,
  },
  pageTitle: { fontSize: 32, fontWeight: "900", color: ds.white },

  // Scroll
  scrollContent: { padding: 16, gap: 16, paddingBottom: 24 },

  // Form details card
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
  cardBody: { padding: 16, gap: 8 },

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
  textArea: { minHeight: 96, textAlignVertical: "top" },

  // Page container
  pageContainer: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: ds.teal + "50",
    backgroundColor: ds.white,
    overflow: "hidden",
    shadowColor: ds.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: ds.teal + "0e",
    borderBottomWidth: 1,
    borderBottomColor: ds.teal + "30",
  },
  pageBadge: {
    backgroundColor: ds.teal,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pageBadgeText: { fontSize: 12, fontWeight: "700", color: ds.white },
  pageTitleInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: ds.text,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ds.teal + "40",
    backgroundColor: ds.white,
  },
  deletePageBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: ds.red + "60",
    alignItems: "center",
    justifyContent: "center",
  },

  // Question card (inside a page)
  qCard: {
    margin: 12,
    marginBottom: 0,
    backgroundColor: ds.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ds.border,
    padding: 14,
    gap: 8,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  questionNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ds.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  questionNumberText: { fontSize: 12, fontWeight: "700", color: ds.white },
  questionHeaderLabel: {
    flex: 1,
    fontSize: 14,
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
  typeSelector: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ds.border,
    backgroundColor: ds.white,
  },
  typeBtnActive: { borderColor: ds.teal, backgroundColor: ds.teal + "12" },
  typeBtnText: { fontSize: 12, fontWeight: "600", color: ds.subtext },
  typeBtnTextActive: { color: ds.teal },

  // Options
  optionsContainer: { gap: 8, marginTop: 4 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
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
    marginTop: 4,
    paddingVertical: 6,
  },
  addOptionText: { fontSize: 13, fontWeight: "600", color: ds.teal },

  // Scale config
  scaleConfig: {
    gap: 12,
    marginTop: 4,
    padding: 12,
    backgroundColor: ds.teal + "0d",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ds.teal + "30",
  },
  scaleNumRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  scaleLabelRow: { flexDirection: "row", gap: 12 },
  scaleLabelField: { flex: 1, gap: 4 },
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

  // Add Question to page
  addQBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    margin: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: ds.teal + "80",
    backgroundColor: ds.teal + "08",
  },
  addQBtnText: { fontSize: 14, fontWeight: "600", color: ds.teal },

  // Add New Page
  addPageBtn: {
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
  addPageBtnText: { fontSize: 15, fontWeight: "700", color: ds.teal },

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
