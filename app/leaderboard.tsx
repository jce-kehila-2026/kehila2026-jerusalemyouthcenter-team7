import { useAuth } from "@/src/context/AuthContext";
import {
  LeaderboardEntry,
  leaderboardService,
} from "@/src/data/leaderboardService";
import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Colours ────────────────────────────────────────────────────────────────────
const TEAL = "#039899";
const AMBER = "#cfad5d";
const GOLD = "#f59e0b";
const SILVER = "#94a3b8";
const BRONZE = "#cd7c3a";
const RED = "#c56451";
const PURPLE = "#7c3aed";
const DARK = "#1a1a2e";
const MUTED = "#9aa8b4";
const BG = "#f0fafb";

type Challenge = { label: string; points: number };

// ── Challenge card colours cycling ────────────────────────────────────────────
const CHALLENGE_COLORS = [
  "#039899",
  "#7c3aed",
  "#c56451",
  "#cfad5d",
  "#0891b2",
  "#059669",
  "#dc2626",
  "#7c3aed",
];

// ── Voice emoji map ────────────────────────────────────────────────────────────
const VOICE_EMOJI: Record<string, string> = {
  soprano: "🎤",
  alto: "🎶",
  tenor: "🎺",
  bass: "🥁",
};

// ── Podium component ───────────────────────────────────────────────────────────
function Podium({
  entry,
  rank,
  myUid,
}: {
  entry: LeaderboardEntry | null;
  rank: 1 | 2 | 3;
  myUid: string;
}) {
  const medals = ["🥇", "🥈", "🥉"];
  const medalColors = [GOLD, SILVER, BRONZE];
  const podiumHeights = [110, 80, 64];
  const avatarSizes = [70, 58, 52];
  const isMe = entry?.uid === myUid;

  return (
    <View style={[p.col, rank === 1 && p.colCenter]}>
      {/* Avatar above the block */}
      {entry ? (
        <View style={p.avatarWrap}>
          {isMe && <Text style={p.youTag}>YOU ⭐</Text>}
          <View
            style={[
              p.avatar,
              {
                width: avatarSizes[rank - 1],
                height: avatarSizes[rank - 1],
                borderRadius: avatarSizes[rank - 1] / 2,
                borderColor: medalColors[rank - 1],
              },
            ]}
          >
            <Text
              style={[p.avatarText, { fontSize: avatarSizes[rank - 1] * 0.38 }]}
            >
              {entry.name?.charAt(0)?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text style={p.medal}>{medals[rank - 1]}</Text>
          <Text style={p.name} numberOfLines={1}>
            {isMe ? "You!" : entry.name?.split(" ")[0]}
          </Text>
          <Text style={[p.pts, { color: medalColors[rank - 1] }]}>
            {entry.points ?? 0} pts
          </Text>
        </View>
      ) : (
        <View style={p.avatarWrap}>
          <View
            style={[
              p.avatar,
              {
                width: avatarSizes[rank - 1],
                height: avatarSizes[rank - 1],
                borderRadius: avatarSizes[rank - 1] / 2,
                borderColor: "#ddd",
              },
            ]}
          >
            <Text style={{ fontSize: 22 }}>?</Text>
          </View>
          <Text style={p.medal}>{medals[rank - 1]}</Text>
        </View>
      )}

      {/* Podium block */}
      <View
        style={[
          p.block,
          {
            height: podiumHeights[rank - 1],
            backgroundColor: medalColors[rank - 1],
          },
          rank === 1 && p.blockFirst,
        ]}
      >
        <Text style={p.blockRank}>#{rank}</Text>
      </View>
    </View>
  );
}

const p = StyleSheet.create({
  col: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 4,
  },
  colCenter: { marginTop: -20 },
  avatarWrap: { alignItems: "center", marginBottom: 6, gap: 2 },
  youTag: {
    fontSize: 9,
    fontWeight: "900",
    color: TEAL,
    backgroundColor: "#e0fafa",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginBottom: 2,
  },
  avatar: {
    borderWidth: 3,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: { fontWeight: "900", color: DARK },
  medal: { fontSize: 22, marginTop: 2 },
  name: { fontSize: 12, fontWeight: "800", color: DARK, textAlign: "center" },
  pts: { fontSize: 11, fontWeight: "700" },
  block: {
    width: "100%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  blockFirst: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  blockRank: {
    fontSize: 18,
    fontWeight: "900",
    color: "rgba(255,255,255,0.7)",
  },
});

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function LeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const myUid = user?.uid ?? "";

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    const unsubLb = leaderboardService.subscribe(setLeaderboard);

    const unsubCfg = onSnapshot(
      doc(db, "leaderboard_config", "active"),
      (snap) => {
        if (snap.exists()) {
          const all: any[] = (snap.data() as any).challenges ?? [];
          setChallenges(
            all
              .filter((c) => c.active)
              .map((c) => ({ label: c.label, points: c.points ?? 0 })),
          );
        } else {
          setChallenges([]);
        }
      },
    );

    return () => {
      unsubLb();
      unsubCfg();
    };
  }, []);

  const myRankIdx = leaderboard.findIndex((e) => e.uid === myUid);
  const myEntry = leaderboard.find((e) => e.uid === myUid);
  const restList = leaderboard.slice(3); // positions 4+
  const top3 = [
    leaderboard[1] ?? null,
    leaderboard[0] ?? null,
    leaderboard[2] ?? null,
  ]; // 2nd, 1st, 3rd

  return (
    <SafeAreaView style={s.screen} edges={["bottom"]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={s.header}>
        {/* Decorations */}
        <Text style={s.hDecor1}>⭐</Text>
        <Text style={s.hDecor2}>✨</Text>
        <Text style={s.hDecor3}>🌟</Text>

        <View style={s.headerRow}>
          <Pressable
            style={s.backBtn}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={s.headerCenter}>
            <Text style={s.headerEmoji}>🏆</Text>
            <Text style={s.headerTitle}>LEADERBOARD</Text>
            <Text style={s.headerSub}>Who&rsquo;s singing the most? 🎵</Text>
          </View>
          {/* My rank bubble */}
          <View style={s.myBubble}>
            <Text style={s.myBubbleRank}>
              {myRankIdx >= 0 ? `#${myRankIdx + 1}` : "—"}
            </Text>
            <Text style={s.myBubbleLabel}>You</Text>
          </View>
        </View>

        {/* My points strip */}
        {myEntry && (
          <View style={s.myStrip}>
            <Text style={s.myStripText}>
              🌟 You have{" "}
              <Text style={s.myStripPts}>{myEntry.points} points</Text> — keep
              going!
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Podium ──────────────────────────────────────────────────── */}
        {leaderboard.length > 0 && (
          <View style={s.podiumSection}>
            <View style={s.podiumRow}>
              <Podium entry={top3[0]} rank={2} myUid={myUid} />
              <Podium entry={top3[1]} rank={1} myUid={myUid} />
              <Podium entry={top3[2]} rank={3} myUid={myUid} />
            </View>
            <View style={s.podiumBase} />
          </View>
        )}

        {/* Empty state */}
        {leaderboard.length === 0 && (
          <View style={s.emptyHero}>
            <Text style={s.emptyBigEmoji}>🎤</Text>
            <Text style={s.emptyTitle}>No rankings yet!</Text>
            <Text style={s.emptySub}>
              Complete challenges below to be the first on the board 🚀
            </Text>
          </View>
        )}

        {/* ── Rest of rankings (4th+) ──────────────────────────────────── */}
        {restList.length > 0 && (
          <>
            <Text style={s.sectionLabel}>MORE SINGERS</Text>
            {restList.map((entry, i) => {
              const isMe = entry.uid === myUid;
              const rank = i + 4;
              return (
                <View key={entry.uid} style={[s.rankRow, isMe && s.rankRowMe]}>
                  <View
                    style={[s.rankNumBadge, isMe && { backgroundColor: TEAL }]}
                  >
                    <Text style={[s.rankNum, isMe && { color: "#fff" }]}>
                      #{rank}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.rankAvatar,
                      isMe && {
                        borderColor: TEAL,
                        backgroundColor: TEAL + "20",
                      },
                    ]}
                  >
                    <Text style={s.rankAvatarText}>
                      {entry.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.rankName} numberOfLines={1}>
                      {isMe ? `${entry.name} ⭐` : entry.name}
                    </Text>
                    <Text style={s.rankVoice}>
                      {VOICE_EMOJI[entry.voice_type?.toLowerCase()] ?? "🎵"}{" "}
                      {entry.voice_type ?? ""}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.ptsBadge,
                      isMe && {
                        backgroundColor: TEAL + "20",
                        borderColor: TEAL,
                      },
                    ]}
                  >
                    <Text style={[s.ptsValue, isMe && { color: TEAL }]}>
                      {entry.points ?? 0}
                    </Text>
                    <Text style={[s.ptsLabel, isMe && { color: TEAL }]}>
                      pts
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ── This week's challenges ───────────────────────────────────── */}
        <View style={s.challengesHeader}>
          <Text style={s.challengesEmoji}>🎯</Text>
          <View>
            <Text style={s.challengesTitle}>THIS WEEK&rsquo;S MISSIONS</Text>
            <Text style={s.challengesSub}>Complete them to earn points!</Text>
          </View>
        </View>

        {challenges.length === 0 ? (
          <View style={s.emptyChall}>
            <Text style={s.emptyChallEmoji}>💤</Text>
            <Text style={s.emptyChallText}>
              No active missions this week yet.
            </Text>
            <Text style={s.emptyChallSub}>Check back soon!</Text>
          </View>
        ) : (
          <View style={s.challengeGrid}>
            {challenges.map((ch, i) => (
              <View
                key={i}
                style={[
                  s.challengeCard,
                  {
                    backgroundColor:
                      CHALLENGE_COLORS[i % CHALLENGE_COLORS.length],
                  },
                ]}
              >
                <Text style={s.challengeCardDecor}>✦</Text>
                <Text style={s.challengeCardPts}>+{ch.points}</Text>
                <Text style={s.challengeCardPtsLabel}>pts</Text>
                <Text style={s.challengeCardLabel} numberOfLines={3}>
                  {ch.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    backgroundColor: TEAL,
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
    overflow: "hidden",
  },
  hDecor1: {
    position: "absolute",
    top: 12,
    right: 20,
    fontSize: 36,
    opacity: 0.18,
  },
  hDecor2: {
    position: "absolute",
    top: 48,
    right: 60,
    fontSize: 24,
    opacity: 0.15,
  },
  hDecor3: {
    position: "absolute",
    top: 20,
    left: 80,
    fontSize: 28,
    opacity: 0.12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center", marginHorizontal: 8 },
  headerEmoji: { fontSize: 38 },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1.5,
    marginTop: 2,
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    marginTop: 2,
  },
  myBubble: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    minWidth: 48,
  },
  myBubbleRank: { fontSize: 18, fontWeight: "900", color: "#fff" },
  myBubbleLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "700",
  },
  myStrip: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 12,
  },
  myStripText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
  myStripPts: { fontWeight: "900", fontSize: 13 },

  scroll: { paddingBottom: 20 },

  // Podium
  podiumSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 12,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    overflow: "hidden",
  },
  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 250,
    paddingBottom: 0,
  },
  podiumBase: {
    height: 10,
    backgroundColor: "#e8eef2",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  // Empty states
  emptyHero: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 30,
    gap: 8,
  },
  emptyBigEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 22, fontWeight: "900", color: DARK },
  emptySub: {
    fontSize: 14,
    color: MUTED,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },

  // Rest of rankings
  sectionLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: MUTED,
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#e8eef2",
  },
  rankRowMe: {
    borderColor: TEAL,
    backgroundColor: TEAL + "06",
  },
  rankNumBadge: {
    backgroundColor: "#f0f4f8",
    borderRadius: 10,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  rankNum: { fontSize: 13, fontWeight: "800", color: MUTED },
  rankAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: AMBER + "25",
    borderWidth: 2,
    borderColor: AMBER,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  rankAvatarText: { fontSize: 16, fontWeight: "900", color: AMBER },
  rankName: { fontSize: 14, fontWeight: "800", color: DARK },
  rankVoice: { fontSize: 11, color: MUTED, marginTop: 1 },
  ptsBadge: {
    backgroundColor: AMBER + "18",
    borderWidth: 1.5,
    borderColor: AMBER,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: "center",
  },
  ptsValue: { fontSize: 16, fontWeight: "900", color: AMBER },
  ptsLabel: { fontSize: 8, fontWeight: "700", color: AMBER },

  // Challenges
  challengesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 28,
    marginBottom: 14,
  },
  challengesEmoji: { fontSize: 36 },
  challengesTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: DARK,
    letterSpacing: 0.8,
  },
  challengesSub: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
    fontWeight: "600",
  },

  emptyChall: {
    alignItems: "center",
    paddingVertical: 24,
    marginHorizontal: 16,
    gap: 6,
  },
  emptyChallEmoji: { fontSize: 40 },
  emptyChallText: { fontSize: 15, fontWeight: "800", color: DARK },
  emptyChallSub: { fontSize: 12, color: MUTED },

  challengeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 16,
    gap: 10,
  },
  challengeCard: {
    width: "47%",
    borderRadius: 20,
    padding: 16,
    minHeight: 130,
    justifyContent: "flex-end",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  challengeCardDecor: {
    position: "absolute",
    top: 10,
    right: 12,
    fontSize: 40,
    color: "rgba(255,255,255,0.2)",
  },
  challengeCardPts: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 34,
  },
  challengeCardPtsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
    marginBottom: 6,
  },
  challengeCardLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.95)",
    lineHeight: 17,
  },
});
