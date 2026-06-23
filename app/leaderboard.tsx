import { useAuth } from "@/src/context/AuthContext";
import { leaderboardService, LeaderboardEntry } from "@/src/data/leaderboardService";
import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TEAL  = "#039899";
const AMBER = "#cfad5d";
const DARK  = "#1a1a2e";
const SUB   = "#5a6a7a";
const MUTED = "#9aa8b4";
const BORDER = "#e8eef2";
const BG    = "#f5fafe";

type Challenge = { label: string; points: number };

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const myUid = user?.uid ?? "";

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    const unsubLb = leaderboardService.subscribe(setLeaderboard);

    const unsubCfg = onSnapshot(doc(db, "leaderboard_config", "active"), (snap) => {
      if (snap.exists()) {
        const all: any[] = (snap.data() as any).challenges ?? [];
        setChallenges(all.filter((c) => c.active).map((c) => ({ label: c.label, points: c.points ?? 0 })));
      } else {
        setChallenges([]);
      }
    });

    return () => { unsubLb(); unsubCfg(); };
  }, []);

  const myRank = leaderboard.findIndex((e) => e.uid === myUid);
  const myEntry = leaderboard.find((e) => e.uid === myUid);
  const podium = ["🥇", "🥈", "🥉"];

  return (
    <SafeAreaView style={s.screen} edges={["bottom"]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View>
          <Text style={s.headerSub}>🎵 Jerusalem Youth Chorus</Text>
          <Text style={s.headerTitle}>Leaderboard</Text>
        </View>
        {/* My rank badge top-right */}
        {myEntry && (
          <View style={s.myRankBadge}>
            <Text style={s.myRankNum}>#{myRank + 1}</Text>
            <Text style={s.myRankLabel}>{myEntry.points} pts</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Full Rankings ──────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>RANKINGS</Text>
        {leaderboard.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="trophy-outline" size={48} color={MUTED} />
            <Text style={s.emptyText}>No rankings yet — complete challenges to earn points!</Text>
          </View>
        ) : (
          leaderboard.map((entry, i) => {
            const isMe = entry.uid === myUid;
            return (
              <View
                key={entry.uid}
                style={[
                  s.rankRow,
                  isMe && s.rankRowMe,
                  i === 0 && s.rankRowFirst,
                ]}
              >
                <Text style={s.rankPos}>
                  {i < 3 ? podium[i] : `#${i + 1}`}
                </Text>
                <View style={[s.avatar, i === 0 && { borderColor: AMBER, borderWidth: 2 }]}>
                  <Text style={s.avatarText}>
                    {entry.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.rankName} numberOfLines={1}>
                    {isMe ? `${entry.name} (You)` : entry.name}
                  </Text>
                  <Text style={s.rankVoice}>{entry.voice_type ?? ""}</Text>
                </View>
                <View style={[s.ptsBadge, isMe && { backgroundColor: TEAL + "18", borderColor: TEAL }]}>
                  <Text style={[s.ptsValue, isMe && { color: TEAL }]}>{entry.points ?? 0}</Text>
                  <Text style={[s.ptsLabel, isMe && { color: TEAL }]}>pts</Text>
                </View>
              </View>
            );
          })
        )}

        {/* ── This Week's Challenges ─────────────────────────────────── */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>THIS WEEK'S CHALLENGES</Text>
        {challenges.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="flag-outline" size={36} color={MUTED} />
            <Text style={s.emptyText}>No active challenges this week yet.</Text>
          </View>
        ) : (
          <View style={s.challengeCard}>
            {challenges.map((ch, i) => (
              <View
                key={i}
                style={[s.challengeRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER }]}
              >
                <View style={s.challengeDot} />
                <Text style={s.challengeLabel} numberOfLines={2}>{ch.label}</Text>
                <View style={s.challengePtsBadge}>
                  <Text style={s.challengePts}>+{ch.points}</Text>
                  <Text style={s.challengePtsLabel}>pts</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  header: {
    backgroundColor: TEAL,
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "600" },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#fff" },
  myRankBadge: {
    marginLeft: "auto",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  myRankNum: { fontSize: 16, fontWeight: "900", color: "#fff" },
  myRankLabel: { fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: "600" },

  scroll: { padding: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: MUTED,
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  empty: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13, color: MUTED, textAlign: "center", maxWidth: 240, lineHeight: 18 },

  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  rankRowMe: { borderColor: TEAL, borderWidth: 1.5, backgroundColor: TEAL + "04" },
  rankRowFirst: { backgroundColor: AMBER + "06", borderColor: AMBER },
  rankPos: { fontSize: 18, width: 32, textAlign: "center" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AMBER + "25",
    borderWidth: 1.5,
    borderColor: AMBER,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "800", color: AMBER },
  rankName: { fontSize: 14, fontWeight: "700", color: DARK },
  rankVoice: { fontSize: 11, color: SUB, marginTop: 1 },
  ptsBadge: {
    alignItems: "center",
    backgroundColor: AMBER + "18",
    borderWidth: 1.5,
    borderColor: AMBER,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ptsValue: { fontSize: 16, fontWeight: "900", color: AMBER },
  ptsLabel: { fontSize: 8, fontWeight: "700", color: AMBER },

  challengeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  challengeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  challengeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEAL,
    flexShrink: 0,
  },
  challengeLabel: { flex: 1, fontSize: 13, fontWeight: "600", color: DARK, lineHeight: 18 },
  challengePtsBadge: {
    alignItems: "center",
    backgroundColor: TEAL + "15",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  challengePts: { fontSize: 13, fontWeight: "900", color: TEAL },
  challengePtsLabel: { fontSize: 8, fontWeight: "700", color: TEAL },
});
