import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ds = {
  teal: "#039899",
  red: "#c56451",
  yellow: "#cfad5d",
  purple: "#6b5ce7",
  white: "#ffffff",
  bg: "#f5fafe",
  text: "#1a1a2e",
  subtext: "#5a6a7a",
  muted: "#9aa8b4",
  border: "#e8eef2",
} as const;

const SYSTEM_VOICES = ["Soprano", "Alto", "Tenor", "Bass"];
const SYSTEM_JOIN_YEARS = [2024, 2025, 2026];
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

const MIN_JOIN_YEAR = 2000;
const MAX_JOIN_YEAR = 2100;

export default function ManageYearsScreen() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [groups, setGroups] = useState<any[]>([]);
  const [voices, setVoices] = useState<any[]>([]);
  const [joinYears, setJoinYears] = useState<any[]>([]);

  const [newYear, setNewYear] = useState("");
  const [newVoice, setNewVoice] = useState("");
  const [newJoinYear, setNewJoinYear] = useState("");

  const [adding, setAdding] = useState({ y: false, v: false, j: false });

  // ── Live listeners ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubG = onSnapshot(
      query(collection(db, "groups"), orderBy("year_id")),
      (s) => setGroups(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubV = onSnapshot(collection(db, "voice_types"), (s) =>
      setVoices(s.docs.map((d) => ({ id: d.id, name: d.data().name }))),
    );
    const unsubJ = onSnapshot(
      query(collection(db, "join_years"), orderBy("year")),
      (s) =>
        setJoinYears(
          s.docs.map((d) => ({
            id: d.id,
            year: (d.data().year ?? d.data().year_joined) as number,
            custom: d.data().custom === true,
          })),
        ),
    );
    return () => {
      unsubG();
      unsubV();
      unsubJ();
    };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddYear = async () => {
    const num = parseInt(newYear.replace(/\D/g, ""), 10);
    if (!num || groups.some((g) => g.year_id === num)) return;
    setAdding((p) => ({ ...p, y: true }));
    await addDoc(collection(db, "groups"), {
      name: `Year ${num}`,
      year_id: num,
    });
    setNewYear("");
    setAdding((p) => ({ ...p, y: false }));
  };

  const handleAddVoice = async () => {
    const voice = newVoice.trim();
    if (!voice) return;
    if (
      SYSTEM_VOICES.some((v) => v.toLowerCase() === voice.toLowerCase()) ||
      voices.some((v) => v.name.toLowerCase() === voice.toLowerCase())
    ) {
      Alert.alert("Voice already exists");
      return;
    }
    setAdding((p) => ({ ...p, v: true }));
    await addDoc(collection(db, "voice_types"), { name: voice });
    setNewVoice("");
    setAdding((p) => ({ ...p, v: false }));
  };

  const handleAddJoinYear = async () => {
    const raw = newJoinYear.trim();
    const year = parseInt(raw, 10);

    if (isNaN(year) || year < MIN_JOIN_YEAR || year > MAX_JOIN_YEAR) {
      Alert.alert(
        "Invalid year",
        `Please enter a year between ${MIN_JOIN_YEAR} and ${MAX_JOIN_YEAR}.`,
      );
      return;
    }

    if (
      SYSTEM_JOIN_YEARS.includes(year) ||
      joinYears.some((j) => j.year === year)
    ) {
      Alert.alert("Year already exists", `${year} is already in the list.`);
      return;
    }

    setAdding((p) => ({ ...p, j: true }));
    try {
      await addDoc(collection(db, "join_years"), {
        year,
        custom: true,
      });
      setNewJoinYear("");
    } catch (err) {
      Alert.alert("Error", "Failed to add year. Please try again.");
    } finally {
      setAdding((p) => ({ ...p, j: false }));
    }
  };

  // ── Combine hardcoded system years with Firestore documents ────────────────
  const displayedJoinYears = [
    ...SYSTEM_JOIN_YEARS.filter(
      (sysYear) => !joinYears.some((j) => j.year === sysYear),
    ).map((year) => ({
      id: `sys-${year}`,
      year,
    })),
    ...joinYears.map((j) => ({
      ...j,
    })),
  ].sort((a, b) => a.year - b.year);

  // ── Render system voices first, custom voices appended at the bottom ───────
  const displayedVoices = [
    ...SYSTEM_VOICES.map((name) => ({
      id: `sys-${name}`,
      name,
    })),
    ...voices.filter(
      (v) =>
        !SYSTEM_VOICES.some(
          (sysVoice) => sysVoice.toLowerCase() === v.name.toLowerCase(),
        ),
    ),
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={[]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={ds.white} />
        </Pressable>
        <View>
          <Text style={s.orgLabel}>🎵 Jerusalem Youth Chorus</Text>
          <Text style={s.pageTitle}>Manage Years & Voices</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* ── Section 1: Program Years (Year 1, 2, 3…) ─────────────────────── */}
        <Text style={s.sectionHeader}>Program Years</Text>
        <Text style={s.sectionSubtitle}>
          Cohort years singers are assigned to (Year 1 / Year 2 / Year 3…).
        </Text>

        <View style={s.addCard}>
          <View style={s.addCardBar} />
          <View style={s.addCardBody}>
            <Text style={s.cardTitle}>Add a Program Year</Text>
            <View style={s.addRow}>
              <TextInput
                style={s.addInput}
                placeholder="e.g. 4"
                value={newYear}
                onChangeText={setNewYear}
                keyboardType="numeric"
                maxLength={3}
              />
              <Pressable style={s.addBtn} onPress={handleAddYear}>
                {adding.y ? (
                  <ActivityIndicator color={ds.white} />
                ) : (
                  <Text style={s.addBtnText}>Add</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {groups.map((g) => (
          <View key={g.id} style={s.itemCard}>
            <View
              style={[s.itemStrip, { backgroundColor: yearAccent(g.year_id) }]}
            />
            <View style={s.itemBody}>
              <View
                style={[
                  s.itemBadge,
                  { backgroundColor: yearAccent(g.year_id) + "18" },
                ]}
              >
                <Text
                  style={[s.itemBadgeText, { color: yearAccent(g.year_id) }]}
                >
                  {g.year_id}
                </Text>
              </View>
              <Text style={s.itemName}>{g.name}</Text>
            </View>

            <View style={s.lockedBadge}>
              <Ionicons name="lock-closed-outline" size={14} color={ds.muted} />
            </View>
          </View>
        ))}

        {/* ── Section 2: Join Years (2024, 2025, 2027…) ────────────────────── */}
        <Text style={[s.sectionHeader, { marginTop: 28 }]}>Join Years</Text>
        <Text style={s.sectionSubtitle}>
          Calendar years shown in the Statistics filter (Row 1). Years already
          present in your singers&apos; data appear automatically — add future
          years like 2027 here so admins can filter for them in advance.
        </Text>

        <View style={[s.addCard, { borderColor: ds.purple + "40" }]}>
          <View style={[s.addCardBar, { backgroundColor: ds.purple }]} />
          <View style={s.addCardBody}>
            <Text style={s.cardTitle}>Add a Join Year</Text>
            <View style={s.addRow}>
              <TextInput
                style={s.addInput}
                placeholder="e.g. 2027"
                value={newJoinYear}
                onChangeText={setNewJoinYear}
                keyboardType="numeric"
                maxLength={4}
              />
              <Pressable
                style={[s.addBtn, { backgroundColor: ds.purple }]}
                onPress={handleAddJoinYear}
              >
                {adding.j ? (
                  <ActivityIndicator color={ds.white} />
                ) : (
                  <Text style={s.addBtnText}>Add</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {displayedJoinYears.map((j) => (
          <View key={j.id} style={s.itemCard}>
            <View style={[s.itemStrip, { backgroundColor: ds.purple }]} />

            <View style={s.itemBody}>
              <View
                style={[s.itemBadge, { backgroundColor: ds.purple + "18" }]}
              >
                <Ionicons name="calendar-outline" size={18} color={ds.purple} />
              </View>

              <Text style={s.itemName}>{j.year}</Text>
            </View>

            <View style={s.lockedBadge}>
              <Ionicons name="lock-closed-outline" size={14} color={ds.muted} />
            </View>
          </View>
        ))}

        {/* ── Section 3: Voice Types ────────────────────────────────────────── */}
        <Text style={[s.sectionHeader, { marginTop: 28 }]}>Voice Types</Text>
        <Text style={s.sectionSubtitle}>
          Soprano, Alto, Tenor, and Bass are built-in. Add custom voice types
          below — they&apos;ll appear in the singer signup form and profiles.
        </Text>

        <View style={[s.addCard, { borderColor: ds.yellow + "40" }]}>
          <View style={[s.addCardBar, { backgroundColor: ds.yellow }]} />
          <View style={s.addCardBody}>
            <Text style={s.cardTitle}>Add a Voice Type</Text>
            <View style={s.addRow}>
              <TextInput
                style={s.addInput}
                placeholder="e.g. Baritone"
                value={newVoice}
                onChangeText={setNewVoice}
              />
              <Pressable
                style={[s.addBtn, { backgroundColor: ds.yellow }]}
                onPress={handleAddVoice}
              >
                {adding.v ? (
                  <ActivityIndicator color={ds.white} />
                ) : (
                  <Text style={s.addBtnText}>Add</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {displayedVoices.map((v) => (
          <View key={v.id} style={s.itemCard}>
            <View style={[s.itemStrip, { backgroundColor: ds.yellow }]} />
            <View style={s.itemBody}>
              <View
                style={[s.itemBadge, { backgroundColor: ds.yellow + "18" }]}
              >
                <Ionicons name="mic-outline" size={18} color={ds.yellow} />
              </View>
              <Text style={s.itemName}>{v.name}</Text>
            </View>

            <View style={s.lockedBadge}>
              <Ionicons name="lock-closed-outline" size={14} color={ds.muted} />
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ds.teal },
  header: {
    backgroundColor: ds.teal,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  orgLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  pageTitle: { fontSize: 28, fontWeight: "900", color: ds.white },

  scroll: { backgroundColor: ds.bg, padding: 16, paddingTop: 20 },

  // Section headers
  sectionHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: ds.text,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: ds.muted,
    lineHeight: 17,
    marginBottom: 12,
  },

  // Add card
  addCard: {
    backgroundColor: ds.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ds.border,
    overflow: "hidden",
    elevation: 2,
    marginBottom: 10,
  },
  addCardBar: { height: 4, backgroundColor: ds.teal },
  addCardBody: { padding: 16 },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
    color: ds.text,
  },
  addRow: { flexDirection: "row", gap: 10 },
  addInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: ds.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: ds.text,
  },
  addBtn: {
    backgroundColor: ds.teal,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: "center",
    minWidth: 60,
    alignItems: "center",
  },
  addBtnText: { color: ds.white, fontWeight: "700", fontSize: 14 },

  // Item rows
  itemCard: {
    flexDirection: "row",
    backgroundColor: ds.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ds.border,
    marginBottom: 8,
    alignItems: "center",
    paddingRight: 12,
    overflow: "hidden",
  },
  itemStrip: { width: 4, alignSelf: "stretch" },
  itemBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  itemBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  itemBadgeText: { fontSize: 18, fontWeight: "900" },
  itemName: { fontSize: 15, fontWeight: "700", color: ds.text },

  // Controls
  lockedBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ds.muted + "18",
    alignItems: "center",
    justifyContent: "center",
  },
});
