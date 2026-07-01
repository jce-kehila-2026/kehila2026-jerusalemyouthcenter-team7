import { useAuth } from "@/src/context/AuthContext";
import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Design tokens ──────────────────────────────────────────────────────────────
const ds = {
  teal: "#039899",
  red: "#c56451",
  yellow: "#cfad5d",
  white: "#ffffff",
  bg: "#f5fafe",
  text: "#1a1a2e",
  subtext: "#5a6a7a",
  border: "#e8eef2",
  muted: "#9aa8b4",
} as const;

const CARD_COLORS = [ds.teal, ds.red, ds.yellow] as const;

const typeIcons: Record<string, React.ComponentProps<typeof Ionicons>["name"]> =
  {
    text: "text-outline",
    multiple_choice: "radio-button-on-outline",
    yes_no: "checkmark-circle-outline",
    range: "options-outline",
    scale: "options-outline",
  };

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function PendingFormsScreen() {
  const { user } = useAuth() as any;
  const router = useRouter();

  const [allForms, setAllForms] = useState<any[]>([]);
  const [submittedFormIds, setSubmittedFormIds] = useState<Set<string>>(
    new Set(),
  );
  const [formsLoading, setFormsLoading] = useState(true);
  const [subsLoading, setSubsLoading] = useState(true);

  // ── Fetch all forms ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "forms")),
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(
            (f: any) =>
              typeof f.title !== "string" ||
              !f.title.toLowerCase().includes("new student"),
          )
          .filter((f: any) => {
            const audience =
              typeof f.target_audience === "string"
                ? f.target_audience
                : "both";
            return audience === "student" || audience === "both";
          });
        setAllForms(data);
        setFormsLoading(false);
      },
      (err) => {
        console.error("pending-forms: forms snapshot error:", err);
        setFormsLoading(false);
      },
    );
    return unsub;
  }, []);

  // ── Fetch this student's submissions ────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(
      query(
        collection(db, "form_submissions"),
        where("student_id", "==", user.uid),
      ),
      (snap) => {
        setSubmittedFormIds(
          new Set(snap.docs.map((d) => d.data().form_id as string)),
        );
        setSubsLoading(false);
      },
      (err) => {
        console.error("pending-forms: submissions snapshot error:", err);
        setSubsLoading(false);
      },
    );
    return unsub;
  }, [user?.uid]);

  const loading = formsLoading || subsLoading;
  const pendingForms = allForms.filter((f) => !submittedFormIds.has(f.id));

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={ds.teal} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Pending Forms</Text>
          <Text style={s.headerSub}>{"Forms you haven't filled yet"}</Text>
        </View>
        {!loading && (
          <View style={s.countBadge}>
            <Text style={s.countBadgeText}>{pendingForms.length}</Text>
          </View>
        )}
      </View>

      {/* ── Content ──────────────────────────────────────────────────── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={ds.teal} />
        </View>
      ) : (
        <FlatList
          data={pendingForms}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🎉</Text>
              <Text style={s.emptyTitle}>All caught up!</Text>
              <Text style={s.emptySub}>
                {"You've filled all available forms."}
              </Text>
            </View>
          )}
          renderItem={({ item, index }) => {
            const activeColor = CARD_COLORS[index % CARD_COLORS.length];
            const safeTitle =
              typeof item.title === "string" ? item.title : "Form Title";
            const safeDescription =
              typeof item.description === "string" ? item.description : null;
            const safeDate =
              typeof item.date === "string" ? item.date : "Recently";
            const questions = Array.isArray(item.questions)
              ? item.questions
              : [];

            return (
              <Pressable
                style={({ pressed }) => [
                  s.card,
                  Platform.OS === "ios" && pressed && { opacity: 0.85 },
                ]}
                onPress={() => router.push(`/form/${item.id}` as any)}
                android_ripple={{ color: ds.teal + "20" }}
              >
                <View
                  style={[s.cardTopBar, { backgroundColor: activeColor }]}
                />
                <View style={s.cardBody}>
                  {/* Header */}
                  <View style={s.cardHeader}>
                    <View
                      style={[
                        s.iconBox,
                        { backgroundColor: activeColor + "22" },
                      ]}
                    >
                      <Ionicons
                        name="document-text"
                        size={22}
                        color={activeColor}
                      />
                    </View>
                    <View style={s.cardInfo}>
                      <Text
                        style={[s.cardTitle, { color: activeColor }]}
                        numberOfLines={1}
                      >
                        {safeTitle}
                      </Text>
                      <Text style={s.cardDate}>Created {safeDate}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={ds.muted}
                    />
                  </View>

                  {/* Description */}
                  {safeDescription && (
                    <Text style={s.description} numberOfLines={2}>
                      {safeDescription}
                    </Text>
                  )}

                  {/* Question preview */}
                  {questions.length > 0 && (
                    <View style={s.questionsList}>
                      {questions.slice(0, 2).map((q: any, i: number) => {
                        const qText =
                          typeof q.text === "string"
                            ? q.text
                            : typeof q.question_text === "string"
                              ? q.question_text
                              : `Question ${i + 1}`;
                        const qType =
                          typeof q.answer_type === "string"
                            ? q.answer_type
                            : "text";
                        return (
                          <View key={q.id || i} style={s.questionRow}>
                            <Ionicons
                              name={typeIcons[qType] || "document-outline"}
                              size={13}
                              color={activeColor}
                            />
                            <Text style={s.questionText} numberOfLines={1}>
                              {qText}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Footer */}
                  <View style={s.cardFooter}>
                    <Pressable
                      style={[s.fillBtn, { backgroundColor: activeColor }]}
                      onPress={() => router.push(`/form/${item.id}` as any)}
                    >
                      <Text style={s.fillBtnText}>Fill out</Text>
                    </Pressable>
                    <View
                      style={[s.badge, { backgroundColor: activeColor + "22" }]}
                    >
                      <Text style={[s.badgeText, { color: activeColor }]}>
                        {questions.length} qs
                      </Text>
                      <Ionicons
                        name="help-circle-outline"
                        size={12}
                        color={activeColor}
                      />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ds.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: ds.white,
    borderBottomWidth: 1,
    borderBottomColor: ds.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ds.teal + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: ds.text },
  headerSub: { fontSize: 11, color: ds.muted, marginTop: 1 },
  countBadge: {
    backgroundColor: ds.teal,
    borderRadius: 12,
    minWidth: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countBadgeText: { fontSize: 13, fontWeight: "800", color: ds.white },

  list: { padding: 16, gap: 16, paddingBottom: 48 },

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
  cardTopBar: { height: 4 },
  cardBody: { padding: 16, gap: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 16 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: "800" },
  cardDate: { fontSize: 11, color: ds.subtext, marginTop: 4 },
  description: { fontSize: 13, color: ds.subtext, lineHeight: 19 },
  questionsList: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: ds.border,
  },
  questionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  questionText: { fontSize: 13, color: ds.subtext, flex: 1 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fillBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  fillBtnText: { color: ds.white, fontSize: 14, fontWeight: "700" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },

  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: ds.text, marginTop: 4 },
  emptySub: { fontSize: 14, color: ds.muted, textAlign: "center" },
});
