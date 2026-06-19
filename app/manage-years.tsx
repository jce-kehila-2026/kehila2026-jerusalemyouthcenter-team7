import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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
  white: "#ffffff",
  bg: "#f5fafe",
  text: "#1a1a2e",
  subtext: "#5a6a7a",
  muted: "#9aa8b4",
  border: "#e8eef2",
} as const;

const SYSTEM_VOICES = ["Soprano", "Alto", "Tenor", "Bass"];
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
  const [groups, setGroups] = useState<any[]>([]);
  const [voices, setVoices] = useState<any[]>([]);
  const [newYear, setNewYear] = useState("");
  const [newVoice, setNewVoice] = useState("");
  const [adding, setAdding] = useState({ y: false, v: false });

  useEffect(() => {
    const unsubG = onSnapshot(
      query(collection(db, "groups"), orderBy("year_id")),
      (s) => setGroups(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubV = onSnapshot(collection(db, "voice_types"), (s) =>
      setVoices(s.docs.map((d) => ({ id: d.id, name: d.data().name }))),
    );
    return () => {
      unsubG();
      unsubV();
    };
  }, []);

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

    const exists = voices.some(
      (v) => v.name.toLowerCase() === voice.toLowerCase(),
    );

    if (exists) {
      Alert.alert("Voice already exists");
      return;
    }

    setAdding((p) => ({ ...p, v: true }));

    await addDoc(collection(db, "voice_types"), {
      name: voice,
    });

    setNewVoice("");
    setAdding((p) => ({ ...p, v: false }));
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
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
        {/* Years */}
        <View style={s.addCard}>
          <View style={s.addCardBar} />
          <View style={s.addCardBody}>
            <Text style={s.sectionTitle}>Add a New Year</Text>
            <View style={s.addRow}>
              <TextInput
                style={s.addInput}
                placeholder="e.g. 4"
                value={newYear}
                onChangeText={setNewYear}
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
          <View key={g.id} style={s.yearCard}>
            <View
              style={[s.yearStrip, { backgroundColor: yearAccent(g.year_id) }]}
            />
            <View style={s.yearCardBody}>
              <View
                style={[
                  s.yearBadge,
                  { backgroundColor: yearAccent(g.year_id) + "18" },
                ]}
              >
                <Text style={[s.yearNum, { color: yearAccent(g.year_id) }]}>
                  {g.year_id}
                </Text>
              </View>
              <Text style={s.yearName}>{g.name}</Text>
            </View>
            {g.year_id > 3 && (
              <Pressable
                style={s.deleteBtn}
                onPress={() => deleteDoc(doc(db, "groups", g.id))}
              >
                <Ionicons name="trash-outline" size={18} color={ds.red} />
              </Pressable>
            )}
          </View>
        ))}

        {/* Voices */}
        <View style={[s.addCard, { marginTop: 20 }]}>
          <View style={[s.addCardBar, { backgroundColor: ds.yellow }]} />
          <View style={s.addCardBody}>
            <Text style={s.sectionTitle}>Add a Voice Type</Text>
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

        {/* Filtered combined list to prevent duplicates */}
        {[
          ...SYSTEM_VOICES.map((n) => ({
            id: `sys-${n}`,
            name: n,
            isSys: true,
          })),
          ...voices.filter((v) => !SYSTEM_VOICES.includes(v.name)),
        ].map((v) => (
          <View key={v.id} style={s.yearCard}>
            <View style={[s.yearStrip, { backgroundColor: ds.yellow }]} />
            <View style={s.yearCardBody}>
              <View
                style={[s.yearBadge, { backgroundColor: ds.yellow + "18" }]}
              >
                <Ionicons name="mic-outline" size={18} color={ds.yellow} />
              </View>
              <Text style={s.yearName}>{v.name}</Text>
            </View>
            {!v.isSys && (
              <Pressable
                style={s.deleteBtn}
                onPress={() => deleteDoc(doc(db, "voice_types", v.id))}
              >
                <Ionicons name="trash-outline" size={18} color={ds.red} />
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ds.teal },
  header: {
    backgroundColor: ds.teal,
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  pageTitle: { fontSize: 32, fontWeight: "900", color: ds.white },
  scroll: { backgroundColor: ds.bg, padding: 16 },
  addCard: {
    backgroundColor: ds.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ds.border,
    overflow: "hidden",
    elevation: 3,
  },
  addCardBar: { height: 4, backgroundColor: ds.teal },
  addCardBody: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "800", marginBottom: 10 },
  addRow: { flexDirection: "row", gap: 10 },
  addInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: ds.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addBtn: {
    backgroundColor: ds.teal,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  addBtnText: { color: ds.white, fontWeight: "700" },
  yearCard: {
    flexDirection: "row",
    backgroundColor: ds.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ds.border,
    marginBottom: 10,
    alignItems: "center",
    paddingRight: 14,
  },
  yearStrip: { width: 4, height: 44, marginRight: 14 },
  yearCardBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
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
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ds.red + "15",
    alignItems: "center",
    justifyContent: "center",
  },
});
