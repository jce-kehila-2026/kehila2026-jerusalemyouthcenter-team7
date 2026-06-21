import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

const TEAL = "#039899";
const RED = "#c56451";
const AMBER = "#cfad5d";
const PURPLE = "#6b5ce7";
const DARK = "#1a1a2e";
const SUB = "#5a6a7a";
const MUTED = "#9aa8b4";
const BORDER = "#e8eef2";
const BG = "#f5fafe";
const WHITE = "#ffffff";

const PRESET_COLORS = [
  { label: "Teal", value: TEAL },
  { label: "Amber", value: AMBER },
  { label: "Red", value: RED },
  { label: "Purple", value: PURPLE },
];

export type CustomAchievement = {
  id: string;
  emoji: string;
  label: string;
  sublabel: string;
  color: string;
};

type Student = {
  id: string;
  full_name: string;
  awarded_achievements: string[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ManageAchievementsModal({ visible, onClose }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"definitions" | "award">("definitions");

  const [achievements, setAchievements] = useState<CustomAchievement[]>([]);
  const [achLoading, setAchLoading] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );

  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formEmoji, setFormEmoji] = useState("🏅");
  const [formLabel, setFormLabel] = useState("");
  const [formSublabel, setFormSublabel] = useState("");
  const [formColor, setFormColor] = useState(TEAL);
  const [formSaving, setFormSaving] = useState(false);

  const selectedStudent =
    students.find((s) => s.id === selectedStudentId) ?? null;

  useEffect(() => {
    if (visible) {
      loadAchievements();
      loadStudents();
    } else {
      setFormVisible(false);
      setSelectedStudentId(null);
      setTab("definitions");
    }
  }, [visible]);

  const loadAchievements = async () => {
    setAchLoading(true);
    try {
      const snap = await getDocs(collection(db, "achievements"));
      setAchievements(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CustomAchievement, "id">),
        })),
      );
    } catch (e) {
      console.error("Load achievements error:", e);
    } finally {
      setAchLoading(false);
    }
  };

  const loadStudents = async () => {
    setStudentsLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "==", "singer")),
      );
      setStudents(
        snap.docs.map((d) => ({
          id: d.id,
          full_name: d.data().full_name ?? "",
          awarded_achievements: d.data().awarded_achievements ?? [],
        })),
      );
    } catch (e) {
      console.error("Load students error:", e);
    } finally {
      setStudentsLoading(false);
    }
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormEmoji("🏅");
    setFormLabel("");
    setFormSublabel("");
    setFormColor(TEAL);
    setFormVisible(true);
  };

  const openEditForm = (ach: CustomAchievement) => {
    setEditingId(ach.id);
    setFormEmoji(ach.emoji);
    setFormLabel(ach.label);
    setFormSublabel(ach.sublabel);
    setFormColor(ach.color);
    setFormVisible(true);
  };

  const saveForm = async () => {
    if (!formLabel.trim()) {
      Alert.alert("Missing field", "Please enter a label for the achievement.");
      return;
    }
    setFormSaving(true);
    try {
      const data = {
        emoji: formEmoji.trim() || "🏅",
        label: formLabel.trim(),
        sublabel: formSublabel.trim(),
        color: formColor,
      };
      if (editingId) {
        await updateDoc(doc(db, "achievements", editingId), data);
        setAchievements((prev) =>
          prev.map((a) => (a.id === editingId ? { ...a, ...data } : a)),
        );
      } else {
        const ref = await addDoc(collection(db, "achievements"), {
          ...data,
          createdAt: serverTimestamp(),
          createdBy: user?.uid ?? "",
        });
        setAchievements((prev) => [...prev, { id: ref.id, ...data }]);
      }
      setFormVisible(false);
    } catch (e) {
      console.error("Save achievement error:", e);
      Alert.alert("Error", "Could not save the achievement.");
    } finally {
      setFormSaving(false);
    }
  };

  const confirmDelete = (ach: CustomAchievement) => {
    Alert.alert(
      "Delete achievement",
      `Delete "${ach.label}"? It will be removed from all students.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "achievements", ach.id));
              const studentsWithIt = students.filter((s) =>
                s.awarded_achievements.includes(ach.id),
              );
              await Promise.all(
                studentsWithIt.map((s) =>
                  updateDoc(doc(db, "users", s.id), {
                    awarded_achievements: arrayRemove(ach.id),
                  }),
                ),
              );
              setAchievements((prev) => prev.filter((a) => a.id !== ach.id));
              setStudents((prev) =>
                prev.map((s) => ({
                  ...s,
                  awarded_achievements: s.awarded_achievements.filter(
                    (id) => id !== ach.id,
                  ),
                })),
              );
            } catch (e) {
              console.error("Delete achievement error:", e);
              Alert.alert("Error", "Could not delete the achievement.");
            }
          },
        },
      ],
    );
  };

  const toggleAward = async (
    studentId: string,
    achievementId: string,
    currentlyAwarded: boolean,
  ) => {
    try {
      await updateDoc(doc(db, "users", studentId), {
        awarded_achievements: currentlyAwarded
          ? arrayRemove(achievementId)
          : arrayUnion(achievementId),
      });
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== studentId) return s;
          return {
            ...s,
            awarded_achievements: currentlyAwarded
              ? s.awarded_achievements.filter((id) => id !== achievementId)
              : [...s.awarded_achievements, achievementId],
          };
        }),
      );
    } catch (e) {
      console.error("Toggle award error:", e);
      Alert.alert("Error", "Could not update the achievement.");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Achievement Studio</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={DARK} />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          <Pressable
            style={[s.tab, tab === "definitions" && s.tabActive]}
            onPress={() => {
              setTab("definitions");
              setFormVisible(false);
            }}
          >
            <Text style={[s.tabText, tab === "definitions" && s.tabTextActive]}>
              Manage
            </Text>
          </Pressable>
          <Pressable
            style={[s.tab, tab === "award" && s.tabActive]}
            onPress={() => setTab("award")}
          >
            <Text style={[s.tabText, tab === "award" && s.tabTextActive]}>
              Award to Student
            </Text>
          </Pressable>
        </View>

        {/* ── DEFINITIONS TAB ─────────────────────────────────────────── */}
        {tab === "definitions" ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Add/Edit form */}
            {formVisible && (
              <View style={s.formCard}>
                <Text style={s.formTitle}>
                  {editingId ? "Edit Achievement" : "New Achievement"}
                </Text>

                <Text style={s.fieldLabel}>Emoji</Text>
                <TextInput
                  style={s.input}
                  value={formEmoji}
                  onChangeText={setFormEmoji}
                  placeholder="🏅"
                  maxLength={4}
                />

                <Text style={s.fieldLabel}>Label *</Text>
                <TextInput
                  style={s.input}
                  value={formLabel}
                  onChangeText={setFormLabel}
                  placeholder="e.g. Perfect Pitch"
                />

                <Text style={s.fieldLabel}>Description</Text>
                <TextInput
                  style={s.input}
                  value={formSublabel}
                  onChangeText={setFormSublabel}
                  placeholder="e.g. Awarded for excellent ear training"
                />

                <Text style={s.fieldLabel}>Colour</Text>
                <View style={s.colorRow}>
                  {PRESET_COLORS.map((c) => (
                    <Pressable
                      key={c.value}
                      onPress={() => setFormColor(c.value)}
                      style={[
                        s.colorSwatch,
                        { backgroundColor: c.value },
                        formColor === c.value && s.colorSwatchActive,
                      ]}
                    >
                      {formColor === c.value && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </Pressable>
                  ))}
                </View>

                {/* Preview */}
                <View style={s.previewRow}>
                  <View
                    style={[
                      s.previewCard,
                      {
                        backgroundColor: formColor + "18",
                        borderColor: formColor,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 28 }}>{formEmoji || "🏅"}</Text>
                    <Text
                      style={[s.previewLabel, { color: formColor }]}
                      numberOfLines={1}
                    >
                      {formLabel || "Label"}
                    </Text>
                    <Text style={s.previewSub} numberOfLines={1}>
                      {formSublabel || "Description"}
                    </Text>
                  </View>
                  <Text style={s.previewHint}>Preview</Text>
                </View>

                <View style={s.formBtns}>
                  <Pressable
                    style={s.cancelBtn}
                    onPress={() => setFormVisible(false)}
                  >
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={s.saveBtn}
                    onPress={saveForm}
                    disabled={formSaving}
                  >
                    {formSaving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={s.saveBtnText}>
                        {editingId ? "Save Changes" : "Create"}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {/* Add button */}
            {!formVisible && (
              <Pressable style={s.addBtn} onPress={openAddForm}>
                <Ionicons name="add-circle-outline" size={20} color={TEAL} />
                <Text style={s.addBtnText}>Add New Achievement</Text>
              </Pressable>
            )}

            {/* List */}
            {achLoading ? (
              <ActivityIndicator color={TEAL} style={{ marginTop: 24 }} />
            ) : achievements.length === 0 && !formVisible ? (
              <View style={s.emptyWrap}>
                <Text style={{ fontSize: 36 }}>🏅</Text>
                <Text style={s.emptyText}>No custom achievements yet.</Text>
                <Text style={[s.emptyText, { fontSize: 12 }]}>
                  Tap &&quot;Add New Achievement&rdquo; to create your first
                  one.
                </Text>
              </View>
            ) : (
              achievements.map((ach) => {
                const awardedCount = students.filter((s) =>
                  s.awarded_achievements.includes(ach.id),
                ).length;
                return (
                  <View
                    key={ach.id}
                    style={[s.achRow, { borderLeftColor: ach.color }]}
                  >
                    <Text style={s.achEmoji}>{ach.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.achLabel}>{ach.label}</Text>
                      {!!ach.sublabel && (
                        <Text style={s.achSub}>{ach.sublabel}</Text>
                      )}
                      <Text style={s.achCount}>
                        {awardedCount === 0
                          ? "Not awarded yet"
                          : `Awarded to ${awardedCount} singer${awardedCount === 1 ? "" : "s"}`}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => openEditForm(ach)}
                      hitSlop={8}
                      style={s.achAction}
                    >
                      <Ionicons name="pencil-outline" size={18} color={TEAL} />
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDelete(ach)}
                      hitSlop={8}
                      style={s.achAction}
                    >
                      <Ionicons name="trash-outline" size={18} color={RED} />
                    </Pressable>
                  </View>
                );
              })
            )}
          </ScrollView>
        ) : (
          /* ── AWARD TAB ──────────────────────────────────────────────── */
          <View style={{ flex: 1 }}>
            {studentsLoading ? (
              <ActivityIndicator color={TEAL} style={{ marginTop: 32 }} />
            ) : (
              <>
                {/* Student picker */}
                <View style={s.studentPickerWrap}>
                  <Text style={s.pickerLabel}>Select a singer</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.studentChips}
                  >
                    {students.map((st) => (
                      <Pressable
                        key={st.id}
                        style={[
                          s.studentChip,
                          selectedStudentId === st.id && s.studentChipActive,
                        ]}
                        onPress={() => setSelectedStudentId(st.id)}
                      >
                        <Text
                          style={[
                            s.studentChipText,
                            selectedStudentId === st.id &&
                              s.studentChipTextActive,
                          ]}
                        >
                          {st.full_name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* Achievement toggles */}
                {selectedStudent ? (
                  <ScrollView contentContainerStyle={s.scroll}>
                    {achievements.length === 0 ? (
                      <View style={s.emptyWrap}>
                        <Text style={s.emptyText}>
                          No achievements defined yet.
                        </Text>
                        <Text style={[s.emptyText, { fontSize: 12 }]}>
                          Go to the &quot;Manage&quot; tab to create some first.
                        </Text>
                      </View>
                    ) : (
                      achievements.map((ach) => {
                        const awarded =
                          selectedStudent.awarded_achievements.includes(ach.id);
                        return (
                          <Pressable
                            key={ach.id}
                            style={[
                              s.awardRow,
                              awarded && {
                                borderColor: ach.color,
                                backgroundColor: ach.color + "10",
                              },
                            ]}
                            onPress={() =>
                              toggleAward(selectedStudent.id, ach.id, awarded)
                            }
                          >
                            <Text style={s.achEmoji}>{ach.emoji}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={s.achLabel}>{ach.label}</Text>
                              {!!ach.sublabel && (
                                <Text style={s.achSub}>{ach.sublabel}</Text>
                              )}
                            </View>
                            <View
                              style={[
                                s.checkCircle,
                                awarded && {
                                  backgroundColor: ach.color,
                                  borderColor: ach.color,
                                },
                              ]}
                            >
                              {awarded && (
                                <Ionicons
                                  name="checkmark"
                                  size={14}
                                  color="#fff"
                                />
                              )}
                            </View>
                          </Pressable>
                        );
                      })
                    )}
                  </ScrollView>
                ) : (
                  <View style={s.noStudentMsg}>
                    <Ionicons name="person-outline" size={40} color={MUTED} />
                    <Text style={s.emptyText}>
                      Select a singer above to manage their achievements
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: DARK },

  tabRow: {
    flexDirection: "row",
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: TEAL },
  tabText: { fontSize: 14, fontWeight: "600", color: MUTED },
  tabTextActive: { color: TEAL, fontWeight: "800" },

  scroll: { padding: 16, paddingBottom: 48 },

  // Form
  formCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: DARK,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: MUTED,
    marginBottom: 6,
    marginTop: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: DARK,
    backgroundColor: WHITE,
  },
  colorRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatchActive: {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    transform: [{ scale: 1.2 }],
  },

  // Preview
  previewRow: { alignItems: "center", marginTop: 16, gap: 6 },
  previewCard: {
    width: 100,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    gap: 4,
    borderWidth: 2,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  previewSub: { fontSize: 9, color: MUTED, textAlign: "center" },
  previewHint: { fontSize: 11, color: MUTED, fontWeight: "600" },

  formBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: SUB },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: TEAL,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: WHITE },

  // Add button
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: TEAL + "55",
    marginBottom: 14,
  },
  addBtnText: { fontSize: 14, fontWeight: "700", color: TEAL },

  // Achievement row
  achRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderLeftWidth: 4,
  },
  achEmoji: { fontSize: 26 },
  achLabel: { fontSize: 14, fontWeight: "700", color: DARK },
  achSub: { fontSize: 12, color: MUTED, marginTop: 2 },
  achCount: { fontSize: 11, color: TEAL, marginTop: 4, fontWeight: "600" },
  achAction: { padding: 4, marginLeft: 2 },

  emptyWrap: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyText: {
    fontSize: 14,
    color: MUTED,
    textAlign: "center",
    lineHeight: 20,
  },

  // Student picker
  studentPickerWrap: {
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingTop: 12,
    paddingBottom: 4,
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  studentChips: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    flexDirection: "row",
  },
  studentChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  studentChipActive: { backgroundColor: TEAL, borderColor: TEAL },
  studentChipText: { fontSize: 13, fontWeight: "600", color: DARK },
  studentChipTextActive: { color: WHITE },

  // Award row
  awardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  noStudentMsg: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
});
