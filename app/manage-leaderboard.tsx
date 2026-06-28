import { COLORS } from "@/src/data/mockData";
import { db } from "@/src/firebase/firebase";
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
  {
    id: "open_sheet_music",
    category: "🎵 Music & Practice",
    label: "Open this week's sheet music",
  },
  {
    id: "listen_track",
    category: "🎵 Music & Practice",
    label: "Listen to a practice track",
  },
  {
    id: "visit_library",
    category: "🎵 Music & Practice",
    label: "Visit the library",
  },
  {
    id: "attend_rehearsal",
    category: "📅 Attendance & Events",
    label: "Attend a rehearsal",
  },
  {
    id: "register_event",
    category: "📅 Attendance & Events",
    label: "Register for an event",
  },
  {
    id: "on_time",
    category: "📅 Attendance & Events",
    label: "Be on time to rehearsal",
  },
  { id: "submit_form", category: "📋 Forms & Admin", label: "Submit a form" },
  {
    id: "complete_profile",
    category: "📋 Forms & Admin",
    label: "Complete your profile",
  },
  {
    id: "update_contact",
    category: "📋 Forms & Admin",
    label: "Update your contact info",
  },
  {
    id: "help_member",
    category: "🌟 Behaviour & Participation",
    label: "Help a fellow choir member",
  },
  {
    id: "active_rehearsal",
    category: "🌟 Behaviour & Participation",
    label: "Participate actively in rehearsal",
  },
  {
    id: "bring_friend",
    category: "🌟 Behaviour & Participation",
    label: "Bring a friend to an event",
  },
  {
    id: "perfect_attendance",
    category: "🏆 Achievements",
    label: "Perfect attendance this week",
  },
  {
    id: "all_forms",
    category: "🏆 Achievements",
    label: "All forms submitted",
  },
  {
    id: "first_register",
    category: "🏆 Achievements",
    label: "First to register for next event",
  },
];

// Ordered list of category names, derived from the catalogue above.
// Used so "+ Add Challenge" always offers the same category choices,
// in the same order they appear on screen.
const CHALLENGE_CATEGORIES = Array.from(
  new Set(CHALLENGE_CATALOGUE.map((c) => c.category)),
);

// Turns a free-text challenge label into a unique, Firestore-safe id.
function slugifyChallengeId(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `custom_${base || "challenge"}_${Date.now()}`;
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function ManageLeaderboardScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "rankings" | "challenges" | "adjust"
  >("rankings");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [allSingers, setAllSingers] = useState<
    { uid: string; name: string; voice_type: string }[]
  >([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [lastReset, setLastReset] = useState("Never");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [customDelta, setCustomDelta] = useState("");
  const [customChallenges, setCustomChallenges] = useState<Challenge[]>([]);
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newChallengeLabel, setNewChallengeLabel] = useState("");
  const [newChallengePoints, setNewChallengePoints] = useState("10");
  const [addingChallenge, setAddingChallenge] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(
    null,
  );
  const [editLabelText, setEditLabelText] = useState("");

  // ── Live data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubLb = onSnapshot(
      query(collection(db, "leaderboard"), orderBy("points", "desc")),
      (snap) => {
        setLeaderboard(
          snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) })),
        );
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
              return {
                ...c,
                points: found?.points ?? 10,
                active: found?.active ?? false,
              };
            }),
          );
          // Anything saved in Firestore that isn't part of the built-in
          // catalogue is a custom challenge an admin added — keep it
          // around so it survives reloads and shows up in its category.
          const catalogueIds = new Set(CHALLENGE_CATALOGUE.map((c) => c.id));
          setCustomChallenges(saved.filter((s) => !catalogueIds.has(s.id)));
          if (data.last_reset) {
            setLastReset(new Date(data.last_reset).toLocaleDateString());
          }
        } else {
          setChallenges(
            CHALLENGE_CATALOGUE.map((c) => ({
              ...c,
              points: 10,
              active: false,
            })),
          );
          setCustomChallenges([]);
        }
      },
      (err) => console.error("leaderboard_config listener:", err),
    );

    // Fetch all singers so the Adjust tab shows every singer, not just those with points
    getDocs(query(collection(db, "users"), where("role", "==", "singer")))
      .then((snap) => {
        setAllSingers(
          snap.docs.map((d) => ({
            uid: d.id,
            name: (d.data() as any).full_name ?? "",
            voice_type: (d.data() as any).voice_type ?? "",
          })),
        );
      })
      .catch((err) => console.error("singers fetch:", err));

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
        { challenges: [...challenges, ...customChallenges] },
        { merge: true },
      );
      Alert.alert("Saved ✓", "Weekly challenges updated successfully.");
    } catch {
      Alert.alert("Error", "Failed to save challenges.");
    }
    setSaving(false);
  }

  // ── Challenge helpers ─────────────────────────────────────────────────────
  // Each helper checks the catalogue list first, then falls back to the
  // custom list, so the same controls work for built-in and admin-added
  // challenges alike.
  function toggleChallenge(id: string) {
    if (challenges.some((c) => c.id === id)) {
      setChallenges((prev) =>
        prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
      );
    } else {
      setCustomChallenges((prev) =>
        prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
      );
    }
  }

  function updateChallengePoints(id: string, value: string) {
    const pts = parseInt(value, 10);
    if (isNaN(pts) || pts < 0) return;
    if (challenges.some((c) => c.id === id)) {
      setChallenges((prev) =>
        prev.map((c) => (c.id === id ? { ...c, points: pts } : c)),
      );
    } else {
      setCustomChallenges((prev) =>
        prev.map((c) => (c.id === id ? { ...c, points: pts } : c)),
      );
    }
  }

  // ── Add a brand-new challenge for a given category ────────────────────────
  // Writes straight to Firestore so it's saved immediately, without
  // waiting for the "Save Weekly Challenges" button.
  async function handleAddChallenge(category: string) {
    const label = newChallengeLabel.trim();
    if (!label) {
      Alert.alert("Missing name", "Please enter a name for the challenge.");
      return;
    }
    const pts = parseInt(newChallengePoints, 10);
    if (isNaN(pts) || pts < 0) {
      Alert.alert("Invalid points", "Please enter a valid points value.");
      return;
    }

    const newChallenge: Challenge = {
      id: slugifyChallengeId(label),
      category,
      label,
      points: pts,
      active: true,
    };

    setAddingChallenge(true);
    try {
      const updatedCustom = [...customChallenges, newChallenge];
      await setDoc(
        doc(db, "leaderboard_config", "active"),
        { challenges: [...challenges, ...updatedCustom] },
        { merge: true },
      );
      // Local state updates via the onSnapshot listener above, but we
      // also set it directly so the new row appears instantly even if
      // the snapshot callback takes a moment to fire.
      setCustomChallenges(updatedCustom);
      setNewChallengeLabel("");
      setNewChallengePoints("10");
      setAddingToCategory(null);
    } catch {
      Alert.alert("Error", "Failed to add challenge. Please try again.");
    }
    setAddingChallenge(false);
  }

  // ── Edit a challenge's label ──────────────────────────────────────────────
  // Works for built-in and custom challenges alike. Writes straight to
  // Firestore immediately, same as add/toggle/points.
  async function handleEditChallengeLabel(id: string, newLabel: string) {
    const label = newLabel.trim();
    if (!label) {
      Alert.alert("Missing name", "Challenge name can't be empty.");
      return;
    }

    const updatedChallenges = challenges.map((c) =>
      c.id === id ? { ...c, label } : c,
    );
    const updatedCustom = customChallenges.map((c) =>
      c.id === id ? { ...c, label } : c,
    );

    try {
      await setDoc(
        doc(db, "leaderboard_config", "active"),
        { challenges: [...updatedChallenges, ...updatedCustom] },
        { merge: true },
      );
      setChallenges(updatedChallenges);
      setCustomChallenges(updatedCustom);
      setEditingChallengeId(null);
    } catch {
      Alert.alert("Error", "Failed to update challenge name.");
    }
  }

  // ── Delete a custom challenge ─────────────────────────────────────────────
  // Built-in catalogue challenges can't be deleted — they're tied to real
  // app behavior (e.g. registering for an event awards "register_event"
  // points). Removing them here wouldn't break anything, but they'd just
  // reappear with default values, which would be confusing. Custom
  // challenges have no such code dependency, so they can be removed freely.
  function handleDeleteChallenge(id: string) {
    const target = customChallenges.find((c) => c.id === id);
    if (!target) return; // built-in — not deletable

    Alert.alert(
      "Delete Challenge",
      `Delete "${target.label}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedCustom = customChallenges.filter((c) => c.id !== id);
            try {
              await setDoc(
                doc(db, "leaderboard_config", "active"),
                { challenges: [...challenges, ...updatedCustom] },
                { merge: true },
              );
              setCustomChallenges(updatedCustom);
            } catch {
              Alert.alert("Error", "Failed to delete challenge.");
            }
          },
        },
      ],
    );
  }

  // ── Adjust individual singer points ───────────────────────────────────────
  async function adjustPoints(uid: string, delta: number) {
    const existing = leaderboard.find((e) => e.uid === uid);
    const singer = allSingers.find((s) => s.uid === uid);
    const currentPoints = existing?.points ?? 0;
    const newPoints = Math.max(0, currentPoints + delta);
    try {
      await setDoc(
        doc(db, "leaderboard", uid),
        {
          uid,
          name: existing?.name ?? singer?.name ?? "",
          voice_type: existing?.voice_type ?? singer?.voice_type ?? "",
          points: newPoints,
        },
        { merge: true },
      );
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
  const grouped = CHALLENGE_CATEGORIES.reduce<Record<string, Challenge[]>>(
    (acc, category) => {
      acc[category] = [];
      return acc;
    },
    {},
  );
  CHALLENGE_CATALOGUE.forEach((item) => {
    const ch = challenges.find((c) => c.id === item.id) ?? {
      ...item,
      points: 10,
      active: false,
    };
    grouped[item.category].push(ch);
  });
  customChallenges.forEach((ch) => {
    if (!grouped[ch.category]) grouped[ch.category] = [];
    grouped[ch.category].push(ch);
  });

  // Adjust tab list — all singers with their current points merged in
  const adjustList: LeaderboardEntry[] = allSingers.map((singer) => {
    const lb = leaderboard.find((e) => e.uid === singer.uid);
    return { ...singer, points: lb?.points ?? 0 };
  });

  const filteredLb = search.trim()
    ? adjustList.filter((e) =>
        e.name?.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : adjustList;

  const voiceEmoji: Record<string, string> = {
    soprano: "🎤",
    alto: "🎶",
    tenor: "🎺",
    bass: "🥁",
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
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab && styles.tabLabelActive,
              ]}
            >
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
            Choose which activities earn points this week. Toggle on to
            activate, then set the points value.
          </Text>

          {Object.entries(grouped).map(([category, items]) => (
            <View key={category}>
              <View style={styles.categoryHeaderRow}>
                <Text style={styles.categoryLabel}>{category}</Text>
                <Pressable
                  style={styles.addChallengeBtn}
                  onPress={() =>
                    setAddingToCategory(
                      addingToCategory === category ? null : category,
                    )
                  }
                >
                  <Ionicons
                    name={addingToCategory === category ? "close" : "add"}
                    size={14}
                    color={COLORS.teal}
                  />
                  <Text style={styles.addChallengeBtnText}>
                    {addingToCategory === category ? "Cancel" : "Add Challenge"}
                  </Text>
                </Pressable>
              </View>

              {items.map((ch) => {
                const isCustom = !CHALLENGE_CATALOGUE.some(
                  (c) => c.id === ch.id,
                );
                const isEditing = editingChallengeId === ch.id;
                return (
                  <View key={ch.id} style={styles.challengeRow}>
                    <Switch
                      value={ch.active}
                      onValueChange={() => toggleChallenge(ch.id)}
                      trackColor={{
                        false: COLORS.border,
                        true: COLORS.teal + "80",
                      }}
                      thumbColor={ch.active ? COLORS.teal : "#f4f3f4"}
                    />
                    <View style={{ flex: 1 }}>
                      {isEditing ? (
                        <TextInput
                          style={styles.editLabelInput}
                          value={editLabelText}
                          onChangeText={setEditLabelText}
                          autoFocus
                          onSubmitEditing={() =>
                            handleEditChallengeLabel(ch.id, editLabelText)
                          }
                        />
                      ) : (
                        <Text
                          style={[
                            styles.challengeLabel,
                            !ch.active && { color: COLORS.muted },
                          ]}
                        >
                          {ch.label}
                        </Text>
                      )}
                      {isCustom && !isEditing && (
                        <Text style={styles.customBadge}>
                          Custom — points must be awarded manually via Adjust
                        </Text>
                      )}
                    </View>
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

                    {isEditing ? (
                      <>
                        <Pressable
                          style={styles.rowIconBtn}
                          onPress={() =>
                            handleEditChallengeLabel(ch.id, editLabelText)
                          }
                          hitSlop={6}
                        >
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={COLORS.teal}
                          />
                        </Pressable>
                        <Pressable
                          style={styles.rowIconBtn}
                          onPress={() => setEditingChallengeId(null)}
                          hitSlop={6}
                        >
                          <Ionicons
                            name="close"
                            size={16}
                            color={COLORS.muted}
                          />
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <Pressable
                          style={styles.rowIconBtn}
                          onPress={() => {
                            setEditingChallengeId(ch.id);
                            setEditLabelText(ch.label);
                          }}
                          hitSlop={6}
                        >
                          <Ionicons
                            name="pencil-outline"
                            size={16}
                            color={COLORS.sub}
                          />
                        </Pressable>
                        {isCustom && (
                          <Pressable
                            style={styles.rowIconBtn}
                            onPress={() => handleDeleteChallenge(ch.id)}
                            hitSlop={6}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={16}
                              color={COLORS.red}
                            />
                          </Pressable>
                        )}
                      </>
                    )}
                  </View>
                );
              })}

              {addingToCategory === category && (
                <View style={styles.addChallengeForm}>
                  <TextInput
                    style={styles.addChallengeInput}
                    value={newChallengeLabel}
                    onChangeText={setNewChallengeLabel}
                    placeholder="Challenge name (e.g. Bring sheet music)"
                    placeholderTextColor={COLORS.muted}
                    autoFocus
                  />
                  <View style={styles.addChallengeRow}>
                    <View style={styles.ptsInputWrap}>
                      <TextInput
                        style={styles.ptsInput}
                        value={newChallengePoints}
                        onChangeText={setNewChallengePoints}
                        keyboardType="numeric"
                        maxLength={3}
                      />
                      <Text style={styles.ptsInputLabel}>pts</Text>
                    </View>
                    <Pressable
                      style={[
                        styles.addChallengeSubmit,
                        addingChallenge && { opacity: 0.6 },
                      ]}
                      onPress={() => handleAddChallenge(category)}
                      disabled={addingChallenge}
                    >
                      <Text style={styles.addChallengeSubmitText}>
                        {addingChallenge ? "Adding…" : "Add"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
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
            <View
              style={[
                styles.searchWrap,
                { backgroundColor: "#fff", borderColor: COLORS.border },
              ]}
            >
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
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={COLORS.muted}
                  />
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
                  name={
                    expandedUid === item.uid ? "chevron-up" : "chevron-down"
                  }
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
                            backgroundColor:
                              delta < 0
                                ? COLORS.red + "15"
                                : COLORS.teal + "15",
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
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    maxWidth: 260,
  },

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
  challengesIntro: {
    fontSize: 13,
    color: COLORS.sub,
    marginBottom: 8,
    lineHeight: 18,
  },
  categoryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.teal,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  addChallengeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.teal,
    backgroundColor: COLORS.teal + "10",
  },
  addChallengeBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.teal,
  },
  customBadge: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },
  editLabelInput: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.teal,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: COLORS.bg,
  },
  rowIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  addChallengeForm: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.teal,
    padding: 12,
    marginBottom: 6,
    gap: 8,
  },
  addChallengeInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
  },
  addChallengeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  addChallengeSubmit: {
    backgroundColor: COLORS.teal,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  addChallengeSubmitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
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
    gap: 6,
  },
  challengeLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
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
