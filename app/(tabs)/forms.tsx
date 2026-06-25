import { useAuth } from "@/src/context/AuthContext";
import { db } from "@/src/firebase/firebase";
import { getFormSubmissions } from "@/src/firebase/firestoreService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Design System ─────────────────────────────────────────────────────────────
const ds = {
  teal: "#039899",
  red: "#c56451",
  yellow: "#cfad5d",
  white: "#ffffff",
  bg: "#f5fafe",
  text: "#1a1a2e",
  subtext: "#5a6a7a",
  border: "#e8eef2",
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

// ── Screen ────────────────────────────────────────────────────────────────────
export default function FormsScreen() {
  const { user } = useAuth() as any;
  const userRole = user?.role || "student";
  const isAdmin = userRole === "admin" || userRole === "staff";
  const router = useRouter();

  const [formsList, setFormsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const [submissionCounts, setSubmissionCounts] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "forms"));
    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        const data = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(
            (f: any) =>
              typeof f.title !== "string" ||
              !f.title.toLowerCase().includes("new student"),
          );
        setFormsList(data);
        setLoading(false);

        if (isAdmin) {
          const allSubs = await getFormSubmissions();
          const counts: Record<string, number> = {};
          allSubs.forEach((sub) => {
            if (sub.form_id)
              counts[sub.form_id] = (counts[sub.form_id] ?? 0) + 1;
          });
          setSubmissionCounts(counts);
        }
      },
      (error) => {
        console.error("Forms listener error:", error);
        setLoading(false);
      },
    );
    return unsub;
  }, [isAdmin]);

  const visibleForms = formsList.filter((f) => {
    if (isAdmin) return true;
    const audience =
      typeof f.target_audience === "string" ? f.target_audience : "both";
    return audience === "student" || audience === "both";
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={[]}>
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <View style={s.toolbar}>
        <Text style={s.toolbarCount}>{visibleForms.length} active</Text>
        {isAdmin && (
          <Pressable
            style={s.manageBtn}
            onPress={() => router.push("/create-form" as any)}
          >
            <Ionicons name="add-circle-outline" size={18} color={ds.teal} />
            <Text style={s.manageBtnText}>Manage</Text>
          </Pressable>
        )}
      </View>

      {/* ── List ─────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={ds.teal} />
        </View>
      ) : (
        <FlatList
          data={visibleForms}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={s.empty}>
              <Ionicons name="document-outline" size={48} color={ds.border} />
              <Text style={s.emptyText}>No forms available</Text>
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
                {/* Colored top accent bar */}
                <View
                  style={[s.cardTopBar, { backgroundColor: activeColor }]}
                />

                <View style={s.cardBody}>
                  {/* Header row: icon + title + admin actions */}
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
                    {isAdmin ? (
                      <View style={s.adminActions}>
                        <Pressable
                          style={s.editBtn}
                          onPress={() =>
                            router.push({
                              pathname: "/create-form",
                              params: {
                                id: item.id,
                                isEditing: "true",
                                formData: JSON.stringify(item),
                              },
                            } as any)
                          }
                        >
                          <Ionicons
                            name="pencil-outline"
                            size={14}
                            color={ds.teal}
                          />
                        </Pressable>
                        <Pressable
                          style={s.deleteBtn}
                          onPress={() => setFormToDelete(item.id)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={14}
                            color={ds.white}
                          />
                        </Pressable>
                      </View>
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={ds.subtext}
                      />
                    )}
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
                    <View style={s.badgesRow}>
                      {isAdmin && (
                        <View
                          style={[
                            s.badge,
                            { backgroundColor: activeColor + "22" },
                          ]}
                        >
                          <Text style={[s.badgeText, { color: activeColor }]}>
                            {submissionCounts[item.id] ?? 0} responses
                          </Text>
                          <Ionicons
                            name="people-outline"
                            size={12}
                            color={activeColor}
                          />
                        </View>
                      )}
                      <View
                        style={[
                          s.badge,
                          { backgroundColor: activeColor + "22" },
                        ]}
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
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────── */}
      <Modal visible={!!formToDelete} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalIconWrap}>
              <Ionicons name="trash-outline" size={28} color={ds.red} />
            </View>
            <Text style={s.modalTitle}>Delete Form</Text>
            <Text style={s.modalMessage}>
              Are you sure you want to delete this form? This action cannot be
              undone.
            </Text>
            <View style={s.modalActions}>
              <Pressable
                style={s.cancelBtn}
                onPress={() => setFormToDelete(null)}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={s.confirmDeleteBtn}
                onPress={async () => {
                  if (formToDelete) {
                    try {
                      await deleteDoc(doc(db, "forms", formToDelete));
                    } catch (err) {
                      console.error("Delete failed:", err);
                    }
                    setFormToDelete(null);
                  }
                }}
              >
                <Ionicons name="trash-outline" size={16} color={ds.white} />
                <Text style={s.confirmDeleteBtnText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ds.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.bg,
  },

  // Toolbar (below GlobalHeader)
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: ds.bg,
    borderBottomWidth: 1,
    borderBottomColor: ds.border,
  },
  toolbarCount: {
    fontSize: 13,
    fontWeight: "600",
    color: ds.subtext,
  },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: ds.teal + "15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ds.teal + "40",
  },
  manageBtnText: { fontSize: 13, fontWeight: "700", color: ds.teal },

  // List
  list: { padding: 16, gap: 16, paddingBottom: 96, backgroundColor: ds.bg },

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
  adminActions: { flexDirection: "row", gap: 8 },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: ds.teal + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: ds.red,
    alignItems: "center",
    justifyContent: "center",
  },
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
  badgesRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },

  // Empty
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingTop: 64,
  },
  emptyText: { fontSize: 15, color: ds.subtext },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: ds.white,
    padding: 24,
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ds.red + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: ds.text,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    color: ds.subtext,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: { flexDirection: "row", gap: 16, width: "100%" },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: ds.bg,
    borderWidth: 1,
    borderColor: ds.border,
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: ds.text },
  confirmDeleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: ds.red,
  },
  confirmDeleteBtnText: { fontSize: 15, fontWeight: "700", color: ds.white },
});
