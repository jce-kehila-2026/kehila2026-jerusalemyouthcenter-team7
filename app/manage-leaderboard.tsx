import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/src/firebase/firebase";
import { COLORS } from "@/src/data/mockData";

// ── Types ──────────────────────────────────────────────────────────────────────
type Challenge = {
  id: string;
  category: string;
  label: string;
  points: number;
  active: boolean;
};

type LeaderboardEntry = {
  uid: string;
  name: string;
  voice_type: string;
  points: number;
};

// ── Predefined challenge catalogue ─────────────────────────────────────────────
const CHALLENGE_CATALOGUE: Omit<Challenge, "points" | "active">[] = [
  { id: "open_sheet_music",   category: "🎵 Music & Practice",              label: "Open this week's sheet music"      },
  { id: "listen_track",       category: "🎵 Music & Practice",              label: "Listen to a practice track"        },
  { id: "visit_library",      category: "🎵 Music & Practice",              label: "Visit the library"                 },
  { id: "attend_rehearsal",   category: "📅 Attendance & Events",           label: "Attend a rehearsal"                },
  { id: "register_event",     category: "📅 Attendance & Events",           label: "Register for an event"             },
  { id: "on_time",            category: "📅 Attendance & Events",           label: "Be on time to rehearsal"           },
  { id: "submit_form",        category: "📋 Forms & Admin",                 label: "Submit a form"                     },
  { id: "complete_profile",   category: "📋 Forms & Admin",                 label: "Complete your profile"             },
  { id: "update_contact",     category: "📋 Forms & Admin",                 label: "Update your contact info"          },
  { id: "help_member",        category: "🌟 Behaviour & Participation",     label: "Help a fellow choir member"        },
  { id: "active_rehearsal",   category: "🌟 Behaviour & Participation",     label: "Participate actively in rehearsal" },
  { id: "bring_friend",       category: "🌟 Behaviour & Participation",     label: "Bring a friend to an event"       },
  { id: "perfect_attendance", category: "🏆 Achievements",                  label: "Perfect attendance this week"      },
  { id: "all_forms",          category: "🏆 Achievements",                  label: "All forms submitted"               },
  { id: "first_register",     category: "🏆 Achievements",                  label: "First to register for next event"  },
];

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function ManageLeaderboardScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab]     = useState<"rankings" | "challenges" | "adjust">("rankings");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [allSingers, setAllSingers]   = useState<{ uid: string; name: string; voice_type: string }[]>([]);
  const [challenges, setChallenges]   = useState<Challenge[]>([]);
  const [lastReset, setLastReset]     = useState("Never");
  const [saving, setSaving]           = useState(false);
  const [resetting, setResetting]     = useState(false);
  const [search, setSearch]           = useState("");
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [customDelta, setCustomDelta] = useState("");

  // ── Live data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubLb = onSnapshot(
      query(collection(db, "leaderboard"), orderBy("points", "desc")),
      (snap) => {
        setLeaderboard(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) })));
      },
      (err) => console.error("leaderboard listener:", err),
    );

    const unsubCfg = onSnapshot(
      doc(db, "leaderboard_config", "active"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          const saved: Challenge[] = data.challenges ?? [];
          setChallenges(
            CHALLENGE_CATALOGUE.map((c) => {
              const found = saved.find((s: Challenge) => s.id === c.id);
              return { ...c, points: found?.points ?? 10, active: found?.active ?? false };
            }),
          );
          if (data.last_reset) {
            setLastReset(new Date(data.last_reset).toLocaleDateString());
          }
        } else {
          setChallenges(CHALLENGE_CATALOGUE.map((c) => ({ ...c, points: 10, active: false })));
        }
      },
      (err) => console.error("leaderboard_config listener:", err),
    );

    return () => {
      unsubLb();
      unsubCfg();
    };
  }, []);

  // ── Reset all points ──────────────────────────────────────────────────────
  async function handleReset() {
    Alert.alert(
      "Reset Leaderboard",
      "This will set ALL singers' points to 0. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset All",
          style: "destructive",
          onPress: async () => {
            setResetting(true);
            try {
              const batch = writeBatch(db);
              leaderboard.forEach((entry) => {
                const ref = doc(db, "leaderboard", entry.uid);
                batch.update(ref, { points: 0 });
              });
              await batch.commit();
              await setDoc(
                doc(db, "leaderboard_config", "active"),
                { last_reset: new Date().toISOString() },
                { merge: true },
              );
              setLastReset(new Date().toLocaleDateString());
            } catch {
              Alert.alert("Error", "Failed to reset leaderboard.");
            }
            setResetting(false);
          },
        },
      ],
    );
  }

  // ── Save weekly challenges ────────────────────────────────────────────────
  async function handleSaveChallenges() {
    setSaving(true);
    try {
      await setDoc(
        doc(db, "leaderboard_config", "active"),
        { challenges },
        { merge: true },
      );
      Alert.alert("Saved ✓", "Weekly challenges updated successfully.");
    } catch {
      Alert.alert("Error", "Failed to save challenges.");
    }
    setSaving(false);
  }

  // ── Challenge helpers ─────────────────────────────────────────────────────
  function toggleChallenge(id: string) {
    setChallenges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
    );
  }

  function updateChallengePoints(id: string, value: string) {
    const pts = parseInt(value, 10);
    if (isNaN(pts) || pts < 0) return;
    setChallenges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, points: pts } : c)),
    );
  }

  // ── Adjust individual singer points ───────────────────────────────────────
  async function adjustPoints(uid: string, delta: number) {
    const entry = leaderboard.find((e) => e.uid === uid);
    if (!entry) return;
    const newPoints = Math.max(0, (entry.points ?? 0) + delta);
    try {
      await updateDoc(doc(db, "leaderboard", uid), { points: newPoints });
    } catch {
      Alert.alert("Error", "Failed to update points.");
    }
  }

  async function applyCustomDelta(uid: string) {
    const delta = parseInt(customDelta, 10);
    if (isNaN(delta)) return;
    await adjustPoints(uid, delta);
    setCustomDelta("");
    setExpandedUid(null);
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const grouped = CHALLENGE_CATALOGUE.reduce<Record<string, Challenge[]>>((acc, item) => {
    const ch = challenges.find((c) => c.id === item.id) ?? { ...item, points: 10, active: false };
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(ch);
    return acc;
  }, {});

  const filteredLb = search.trim()
    ? leaderboard.filter((e) =>
        e.name?.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : leaderboard;

  const voiceEmoji: Record<string, string> = {
    soprano: "🎤", alto: "🎶", tenor: "🎺", bass: "🥁",
  };
  const podium = ["🥇", "🥈", "🥉"];

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Screen header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.teal} />
        </Pressable>
        <Text style={styles.headerTitle}>Manage Leaderboard</Text>
      </View>

      {/* ── Internal tab bar ──────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        {(["rankings", "challenges", "adjust"] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === "rankings"
                ? "🏆 Rankings"
                : tab === "challenges"
                  ? "🎯 Challenges"
                  : "⚙️ Adjust"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ══════════════ TAB 1 — RANKINGS ══════════════ */}
      {activeTab === "rankings" && (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.rankingsHeader}>
              <View>
                <Text style={styles.rankingsTitle}>Current Rankings</Text>
                <Text style={styles.rankingsSub}>Last reset: {lastReset}</Text>
              </View>
              <Pressable
                style={[styles.resetBtn, resetting && { opacity: 0.5 }]}
                onPress={handleReset}
                disabled={resetting}
              >
                <Ionicons name="refresh" size={14} color="#fff" />
                <Text style={styles.resetBtnText}>Reset All</Text>
              </Pressable>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="trophy-outline" size={48} color={COLORS.muted} />
              <Text style={styles.emptyText}>
                No rankings yet — activate some challenges!
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={styles.rankRow}>
              <Text style={styles.rankPodium}>
                {index < 3 ? podium[index] : `#${index + 1}`}
              </Text>
              <View
                style={[
                  styles.rankAvatar,
                  index === 0 && { borderColor: COLORS.yellow, borderWidth: 2 },
                ]}
              >
                <Text style={styles.rankAvatarText}>
                  {item.name?.charAt(0)?.toUpperCase() ?? "?"}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.rankName}>{item.name ?? item.uid}</Text>
                <Text style={styles.rankVoice}>
                  {voiceEmoji[item.voice_type?.toLowerCase()] ?? "🎵"}{" "}
                  {item.voice_type ?? ""}
                </Text>
              </View>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsValue}>{item.points ?? 0}</Text>
                <Text style={styles.pointsLabel}>pts</Text>
              </View>
            </View>
          )}
        />
      )}

      {/* ══════════════ TAB 2 — CHALLENGES ══════════════ */}
      {activeTab === "challenges" && (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.challengesIntro}>
            Choose which activities earn points this week. Toggle on to activate,
            then set the points value.
          </Text>

          {Object.entries(grouped).map(([category, items]) => (
            <View key={category}>
              <Text style={styles.categoryLabel}>{category}</Text>
              {items.map((ch) => (
                <View key={ch.id} style={styles.challengeRow}>
                  <Switch
                    value={ch.active}
                    onValueChange={() => toggleChallenge(ch.id)}
                    trackColor={{ false: COLORS.border, true: COLORS.teal + "80" }}
                    thumbColor={ch.active ? COLORS.teal : "#f4f3f4"}
                  />
                  <Text
                    style={[
                      styles.challengeLabel,
                      !ch.active && { color: COLORS.muted },
                    ]}
                  >
                    {ch.label}
                  </Text>
                  <View style={styles.ptsInputWrap}>
                    <TextInput
                      style={[
                        styles.ptsInput,
                        !ch.active && {
                          backgroundColor: COLORS.grayLight,
                          color: COLORS.muted,
                        },
                      ]}
                      value={String(ch.points)}
                      onChangeText={(v) => updateChallengePoints(ch.id, v)}
                      keyboardType="numeric"
                      editable={ch.active}
                      maxLength={3}
                    />
                    <Text style={styles.ptsInputLabel}>pts</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}

          <Pressable
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSaveChallenges}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? "Saving…" : "Save Weekly Challenges"}
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {/* ══════════════ TAB 3 — ADJUST POINTS ══════════════ */}
      {activeTab === "adjust" && (
        <FlatList
          data={filteredLb}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={[styles.searchWrap, { backgroundColor: "#fff", borderColor: COLORS.border }]}>
              <Ionicons name="search" size={16} color={COLORS.muted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search singers…"
                placeholderTextColor={COLORS.muted}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={COLORS.muted} />
                </Pressable>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={COLORS.muted} />
              <Text style={styles.emptyText}>No singers found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.adjustCard}>
              <Pressable
                style={styles.adjustRow}
                onPress={() =>
                  setExpandedUid(expandedUid === item.uid ? null : item.uid)
                }
              >
                <View style={styles.rankAvatar}>
                  <Text style={styles.rankAvatarText}>
                    {item.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.rankName}>{item.name ?? item.uid}</Text>
                  <Text style={styles.rankVoice}>{item.voice_type ?? ""}</Text>
                </View>
                <View style={styles.pointsBadge}>
                  <Text style={styles.pointsValue}>{item.points ?? 0}</Text>
                  <Text style={styles.pointsLabel}>pts</Text>
                </View>
                <Ionicons
                  name={expandedUid === item.uid ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={COLORS.muted}
                  style={{ marginLeft: 8 }}
                />
              </Pressable>

              {expandedUid === item.uid && (
                <View style={styles.adjustControls}>
                  <View style={styles.quickBtns}>
                    {([-10, -5, 5, 10] as const).map((delta) => (
                      <Pressable
                        key={delta}
                        style={[
                          styles.quickBtn,
                          {
                            backgroundColor: delta < 0 ? COLORS.red + "15" : COLORS.teal + "15",
                            borderColor: delta < 0 ? COLORS.red : COLORS.teal,
                          },
                        ]}
                        onPress={() => adjustPoints(item.uid, delta)}
                      >
                        <Text
                          style={[
                            styles.quickBtnText,
                            { color: delta < 0 ? COLORS.red : COLORS.teal },
                          ]}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.customRow}>
                    <TextInput
                      style={styles.customInput}
                      value={customDelta}
                      onChangeText={setCustomDelta}
                      placeholder="Custom (e.g. -3 or 15)"
                      placeholderTextColor={COLORS.muted}
                      keyboardType="numbers-and-punctuation"
                    />
                    <Pressable
                      style={styles.applyBtn}
                      onPress={() => applyCustomDelta(item.uid)}
                    >
                      <Text style={styles.applyBtnText}>Apply</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },

  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: COLORS.teal },
  tabLabel: { fontSize: 12, fontWeight: "600", color: COLORS.muted },
  tabLabelActive: { color: COLORS.teal, fontWeight: "800" },

  list: { padding: 16, gap: 8, paddingBottom: 40 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.muted, textAlign: "center", maxWidth: 260 },

  // Rankings
  rankingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rankingsTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  rankingsSub: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.red,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resetBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rankPodium: { fontSize: 18, width: 32, textAlign: "center" },
  rankAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.teal + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  rankAvatarText: { fontSize: 16, fontWeight: "800", color: COLORS.teal },
  rankName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  rankVoice: { fontSize: 11, color: COLORS.sub, marginTop: 2 },
  pointsBadge: {
    alignItems: "center",
    backgroundColor: COLORS.yellow + "18",
    borderWidth: 1.5,
    borderColor: COLORS.yellow,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pointsValue: { fontSize: 16, fontWeight: "900", color: COLORS.yellow },
  pointsLabel: { fontSize: 8, fontWeight: "700", color: COLORS.yellow },

  // Challenges
  challengesIntro: { fontSize: 13, color: COLORS.sub, marginBottom: 8, lineHeight: 18 },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.teal,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 6,
  },
  challengeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
    gap: 10,
  },
  challengeLabel: { flex: 1, fontSize: 13, fontWeight: "600", color: COLORS.text },
  ptsInputWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  ptsInput: {
    width: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    paddingVertical: 6,
    backgroundColor: COLORS.card,
  },
  ptsInputLabel: { fontSize: 11, color: COLORS.muted, fontWeight: "600" },
  saveBtn: {
    backgroundColor: COLORS.teal,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  // Adjust Points
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  adjustCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  adjustRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  adjustControls: {
    padding: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  quickBtns: { flexDirection: "row", gap: 8 },
  quickBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  quickBtnText: { fontSize: 14, fontWeight: "800" },
  customRow: { flexDirection: "row", gap: 8 },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
  },
  applyBtn: {
    backgroundColor: COLORS.teal,
    borderRadius: 10,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
