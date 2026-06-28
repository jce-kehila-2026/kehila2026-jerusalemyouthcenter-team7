import { db } from "@/src/firebase/firebase";
import {
  getFormSubmissions,
  getFormTemplate,
} from "@/src/firebase/firestoreService";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ds = {
  teal: "#039899",
  red: "#c56451",
  white: "#ffffff",
  bg: "#f5fafe",
  text: "#1a1a2e",
  subtext: "#5a6a7a",
  border: "#e8eef2",
} as const;

type Submission = {
  id: string;
  student_id: string;
  form_id: string;
  submitted_at: string;
  responses: { questionId: string; answer: string | number }[];
  studentName: string;
};

type Question = {
  id: string;
  text?: string;
  question_text?: string;
  answer_type?: string;
  type?: string;
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function getQuestionText(q: Question, index: number): string {
  if (typeof q.text === "string" && q.text) return q.text;
  if (typeof q.question_text === "string" && q.question_text)
    return q.question_text;
  return `Question ${index + 1}`;
}

export default function FormSubmissionsScreen() {
  const { id, formTitle } = useLocalSearchParams<{
    id: string;
    formTitle?: string;
  }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [title, setTitle] = useState(formTitle ?? "Form Submissions");
  const [selected, setSelected] = useState<Submission | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [rawSubs, formData] = await Promise.all([
        getFormSubmissions(id),
        getFormTemplate(id),
      ]);

      if (formData) {
        if (formData.title) setTitle(formData.title);
        const flatQs: Question[] = [];
        if (Array.isArray((formData as any).pages)) {
          (formData as any).pages.forEach((p: any) => {
            if (Array.isArray(p.questions)) flatQs.push(...p.questions);
          });
        }
        if (flatQs.length === 0 && Array.isArray(formData.questions)) {
          flatQs.push(...(formData.questions as Question[]));
        }
        setQuestions(flatQs);
      }

      // Batch-fetch student names (deduplicated)
      const uniqueIds = [...new Set(rawSubs.map((s: any) => s.student_id as string))];
      const nameMap: Record<string, string> = {};
      await Promise.all(
        uniqueIds.map(async (uid) => {
          try {
            const snap = await getDoc(doc(db, "users", uid));
            nameMap[uid] = snap.exists()
              ? (snap.data().full_name ?? "Unknown")
              : "Unknown Student";
          } catch {
            nameMap[uid] = "Unknown Student";
          }
        }),
      );

      const enriched: Submission[] = rawSubs.map((s: any) => ({
        ...s,
        studentName: nameMap[s.student_id] ?? "Unknown Student",
      }));

      // Newest first
      enriched.sort(
        (a, b) =>
          new Date(b.submitted_at).getTime() -
          new Date(a.submitted_at).getTime(),
      );

      setSubmissions(enriched);
      setLoading(false);
    })();
  }, [id]);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={ds.white} />
        </Pressable>
        <View style={s.headerText}>
          <Text style={s.orgLabel}>Submissions</Text>
          <Text style={s.pageTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      {/* Count bar */}
      {!loading && (
        <View style={s.countBar}>
          <Ionicons name="people-outline" size={14} color={ds.teal} />
          <Text style={s.countText}>
            {submissions.length}{" "}
            {submissions.length === 1 ? "response" : "responses"}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={ds.teal} />
        </View>
      ) : submissions.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="document-outline" size={56} color={ds.border} />
          <Text style={s.emptyTitle}>No submissions yet</Text>
          <Text style={s.emptySubtitle}>
            Responses will appear here once students fill out this form.
          </Text>
        </View>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
              onPress={() => setSelected(item)}
            >
              <View style={s.cardTopBar} />
              <View style={s.cardBody}>
                <View style={s.cardRow}>
                  <View style={s.avatarCircle}>
                    <Text style={s.avatarLetter}>
                      {item.studentName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={s.studentName}>{item.studentName}</Text>
                    <Text style={s.submittedAt}>
                      {formatDate(item.submitted_at)}
                    </Text>
                  </View>
                  <View style={s.responseCount}>
                    <Text style={s.responseCountNum}>
                      {Array.isArray(item.responses) ? item.responses.length : 0}
                    </Text>
                    <Text style={s.responseCountLabel}>answers</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={ds.subtext}
                  />
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            {/* Modal header */}
            <View style={s.modalHeader}>
              <View style={s.modalHeaderLeft}>
                <Text style={s.modalTitle}>
                  {selected?.studentName ?? "Submission"}
                </Text>
                <Text style={s.modalSubtitle}>
                  {selected ? formatDate(selected.submitted_at) : ""}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelected(null)}
                style={s.modalCloseBtn}
                hitSlop={8}
              >
                <Ionicons name="close" size={22} color={ds.text} />
              </Pressable>
            </View>

            <ScrollView
              style={s.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            >
              {selected && Array.isArray(selected.responses) ? (
                selected.responses.map((resp, idx) => {
                  const matchedQ = questions.find(
                    (q) => q.id === resp.questionId,
                  );
                  const qText = matchedQ
                    ? getQuestionText(matchedQ, idx)
                    : `Question ${idx + 1}`;
                  return (
                    <View key={resp.questionId ?? idx} style={s.qaCard}>
                      <View style={s.qaHeader}>
                        <View style={s.qaNum}>
                          <Text style={s.qaNumText}>{idx + 1}</Text>
                        </View>
                        <Text style={s.qaQuestion}>{qText}</Text>
                      </View>
                      <Text style={s.qaAnswer}>
                        {resp.answer !== undefined && resp.answer !== null
                          ? String(resp.answer)
                          : "—"}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={s.emptySubtitle}>No answers recorded.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ds.teal },

  header: {
    backgroundColor: ds.teal,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: { marginTop: 8 },
  headerText: { flex: 1 },
  orgLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  pageTitle: { fontSize: 28, fontWeight: "900", color: ds.white },

  countBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: ds.bg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: ds.border,
  },
  countText: { fontSize: 13, fontWeight: "600", color: ds.teal },

  center: {
    flex: 1,
    backgroundColor: ds.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: ds.text },
  emptySubtitle: {
    fontSize: 14,
    color: ds.subtext,
    textAlign: "center",
    lineHeight: 21,
  },

  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
    backgroundColor: ds.bg,
    flexGrow: 1,
  },

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
  cardTopBar: { height: 3, backgroundColor: ds.teal },
  cardBody: { padding: 14 },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ds.teal + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 18, fontWeight: "800", color: ds.teal },
  cardInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: "700", color: ds.text },
  submittedAt: { fontSize: 12, color: ds.subtext, marginTop: 2 },
  responseCount: { alignItems: "center" },
  responseCountNum: {
    fontSize: 18,
    fontWeight: "800",
    color: ds.teal,
  },
  responseCountLabel: { fontSize: 10, color: ds.subtext, fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: ds.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingTop: 0,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: ds.border,
  },
  modalHeaderLeft: { flex: 1 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: ds.text },
  modalSubtitle: { fontSize: 12, color: ds.subtext, marginTop: 3 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ds.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: { padding: 16 },

  qaCard: {
    backgroundColor: ds.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ds.border,
    overflow: "hidden",
  },
  qaHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: ds.teal + "12",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: ds.teal + "25",
  },
  qaNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ds.teal,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  qaNumText: { fontSize: 11, fontWeight: "800", color: ds.white },
  qaQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: ds.text,
    lineHeight: 20,
  },
  qaAnswer: {
    fontSize: 15,
    color: ds.text,
    padding: 12,
    lineHeight: 22,
  },
});
