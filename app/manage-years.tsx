import { Group } from "@/src/data/mockData";
import { studentService } from "@/src/data/studentService";
import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import {
    collection,
    onSnapshot,
    orderBy,
    query
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
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

// ── Design tokens (match app palette) ─────────────────────────────────────────
const ds = {
  teal: "#039899",
  red: "#c56451",
  yellow: "#cfad5d",
  white: "#ffffff",
  bg: "#f5fafe",
  text: "#1a1a2e",
  subtext: "#5a6a7a",
  muted: "#9aa8b4",
  border: "#e8eef2",
} as const;

// Color accent per year number (cycles after 6)
const YEAR_ACCENTS = [
  ds.teal,
  "#c56451",
  "#cfad5d",
  "#6b5ce7",
  "#ec4899",
  "#f59e0b",
];
const yearAccent = (yearId: number) =>
  YEAR_ACCENTS[(yearId - 1) % YEAR_ACCENTS.length];

export default function ManageYearsScreen() {
  const router = useRouter();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [newYearLabel, setNewYearLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Real-time listener on groups collection ────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "groups"), orderBy("year_id"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: Group[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Group, "id">),
        }));
        setGroups(data);
        setLoading(false);
      },
      (err) => {
        console.warn("groups snapshot error:", err);
        // Fallback: one-time fetch
        studentService.getGroups().then((g) => {
          setGroups(g);
          setLoading(false);
        });
      },
    );
    return unsub;
  }, []);

  // ── Add year ───────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const trimmed = newYearLabel.trim();
    if (!trimmed) return;

    // Accept plain number ("4") or label ("Year 4")
    const numStr = trimmed.replace(/^year\s*/i, "");
    const yearNum = parseInt(numStr, 10);

    if (isNaN(yearNum) || yearNum < 1 || yearNum > 99) {
      Alert.alert(
        "Invalid Year",
        "Please enter a valid year number (e.g. 4 or Year 4).",
      );
      return;
    }

    const name = `Year ${yearNum}`;

    if (groups.some((g) => g.year_id === yearNum)) {
      Alert.alert("Already Exists", `${name} is already in the list.`);
      return;
    }

    setAdding(true);
    try {
      await studentService.addGroup(name, yearNum);
      setNewYearLabel("");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not add year.");
    } finally {
      setAdding(false);
    }
  };

  // ── Delete year ────────────────────────────────────────────────────────────
  const handleDelete = async (group: Group) => {
    const confirmed = window.confirm(
      `Remove ${group.name}?\n\nStudents assigned to this year will keep their current year — they just won't appear in this filter. You can re-add the year at any time.`,
    );
    if (!confirmed) return;

    setDeletingId(group.id);
    try {
      await studentService.deleteGroup(group.id);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not remove year.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Teal Header ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={ds.white} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.orgLabel}>🎵 Jerusalem Youth Chorus</Text>
          <Text style={s.pageTitle}>Manage Years</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Add Year Card ────────────────────────────────────────────────── */}
          <View style={s.addCard}>
            <View style={s.addCardBar} />
            <View style={s.addCardBody}>
              <Text style={s.sectionTitle}>Add a New Year</Text>
              <Text style={s.hint}>
                Type a year number (e.g. 4) or label (e.g. Year 4) and press
                Add.
              </Text>
              <View style={s.addRow}>
                <TextInput
                  style={s.addInput}
                  placeholder="e.g.  4  or  Year 4"
                  placeholderTextColor={ds.muted}
                  value={newYearLabel}
                  onChangeText={setNewYearLabel}
                  keyboardType="default"
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                  autoCapitalize="words"
                />
                <Pressable
                  style={[s.addBtn, adding && { opacity: 0.6 }]}
                  onPress={handleAdd}
                  disabled={adding}
                >
                  {adding ? (
                    <ActivityIndicator color={ds.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="add" size={18} color={ds.white} />
                      <Text style={s.addBtnText}>Add</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>

          {/* ── Current Years ────────────────────────────────────────────────── */}
          <Text style={s.listHeader}>Current Years</Text>

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator color={ds.teal} size="large" />
            </View>
          ) : groups.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="calendar-outline" size={48} color={ds.muted} />
              <Text style={s.emptyText}>No years added yet</Text>
              <Text style={s.emptyHint}>Use the form above to add Year 1</Text>
            </View>
          ) : (
            groups.map((group) => {
              const accent = yearAccent(group.year_id);
              const isDeleting = deletingId === group.id;
              return (
                <View key={group.id} style={s.yearCard}>
                  {/* Left accent strip */}
                  <View style={[s.yearStrip, { backgroundColor: accent }]} />

                  <View style={s.yearCardBody}>
                    {/* Year badge */}
                    <View
                      style={[s.yearBadge, { backgroundColor: accent + "18" }]}
                    >
                      <Text style={[s.yearNum, { color: accent }]}>
                        {group.year_id}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={s.yearName}>{group.name}</Text>
                      <Text style={s.yearSub}>
                        Tap students in the Students tab to assign to this year
                      </Text>
                    </View>

                    {/* Delete button */}
                    <Pressable
                      style={[s.deleteBtn, isDeleting && { opacity: 0.5 }]}
                      onPress={() => handleDelete(group)}
                      disabled={isDeleting}
                      hitSlop={8}
                    >
                      {isDeleting ? (
                        <ActivityIndicator color={ds.red} size="small" />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={ds.red}
                        />
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}

          {/* ── Info note ────────────────────────────────────────────────────── */}
          <View style={s.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={ds.teal}
            />
            <Text style={s.infoText}>
              Years added here appear automatically in the Students list filters
              and in each student's "Change Group" modal.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ds.teal },

  // Header
  header: {
    backgroundColor: ds.teal,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  orgLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 4,
  },
  pageTitle: { fontSize: 32, fontWeight: "900", color: ds.white },

  // Scroll
  scroll: { backgroundColor: ds.bg, padding: 16, paddingTop: 20 },
  center: { paddingVertical: 40, alignItems: "center" },

  // Add Card
  addCard: {
    backgroundColor: ds.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ds.border,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: ds.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  addCardBar: { height: 4, backgroundColor: ds.teal },
  addCardBody: { padding: 16 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: ds.text,
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: ds.subtext,
    marginBottom: 14,
    lineHeight: 18,
  },
  addRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  addInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: ds.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: ds.text,
    backgroundColor: ds.bg,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: ds.teal,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: ds.teal,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addBtnText: { color: ds.white, fontSize: 15, fontWeight: "700" },

  // List header
  listHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: ds.muted,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  // Year card
  yearCard: {
    flexDirection: "row",
    backgroundColor: ds.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ds.border,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  yearStrip: { width: 4 },
  yearCardBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
  },
  yearBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  yearNum: { fontSize: 20, fontWeight: "900" },
  yearName: { fontSize: 15, fontWeight: "700", color: ds.text },
  yearSub: { fontSize: 11, color: ds.muted, marginTop: 2 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ds.red + "15",
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty state
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: { fontSize: 15, fontWeight: "600", color: ds.subtext },
  emptyHint: { fontSize: 13, color: ds.muted },

  // Info box
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: ds.teal + "12",
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: ds.teal + "30",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: ds.subtext,
    lineHeight: 18,
  },
});
