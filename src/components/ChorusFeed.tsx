import { feedService, nameToColor, Post } from "@/src/data/feedService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// ── Tokens ────────────────────────────────────────────────────────────────────
const TEAL = "#039899";
const RED = "#c56451";
const AMBER = "#cfad5d";
const DARK = "#1a1a2e";
const SUB = "#5a6a7a";
const MUTED = "#9aa8b4";
const BORDER = "#e8eef2";
const BG = "#f5fafe";

// ── Helpers ───────────────────────────────────────────────────────────────────
function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function Avatar({ name, color, size = 38 }: { name: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: size * 0.42 }}>
        {name.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function BoldText({ text, style }: { text: string; style?: object }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <Text style={style} numberOfLines={2}>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <Text key={i} style={{ fontWeight: "800", color: DARK }}>{part}</Text>
          : <Text key={i}>{part}</Text>
      )}
    </Text>
  );
}

function badgeBg(type: Post["postType"]) {
  if (type === "badge") return AMBER + "30";
  if (type === "streak") return RED + "25";
  if (type === "shoutout") return TEAL + "25";
  return MUTED + "20";
}

// ── Compact post row (Twitter style) ─────────────────────────────────────────
function PostRow({
  post,
  onLike,
  isSeed,
}: {
  post: Post;
  onLike: (id: string, liked: boolean) => void;
  isSeed: boolean;
}) {
  return (
    <View style={fc.postRow}>
      {/* Left: avatar + thread line */}
      <View style={fc.postLeft}>
        <Avatar name={post.authorName} color={post.avatarColor} size={38} />
        <View style={fc.threadLine} />
      </View>

      {/* Right: content */}
      <View style={fc.postRight}>
        {/* Name + badge + time */}
        <View style={fc.metaRow}>
          <Text style={fc.authorName}>{post.authorName}</Text>
          {post.badgeTag ? (
            <View style={[fc.badgePill, { backgroundColor: badgeBg(post.postType) }]}>
              <Text style={fc.badgeText}>{post.badgeTag}</Text>
            </View>
          ) : null}
          <Text style={fc.time}>· {relTime(post.timestamp)}</Text>
        </View>

        {/* Post text */}
        <BoldText text={post.text} style={fc.postText} />

        {/* Inline photo thumbnail if any */}
        {post.photoUrls && post.photoUrls.length > 0 && (
          <Image
            source={{ uri: post.photoUrls[0] }}
            style={fc.photoThumb}
            resizeMode="cover"
          />
        )}

        {/* Actions */}
        <View style={fc.actions}>
          <Pressable
            style={fc.actionBtn}
            onPress={() => !isSeed && onLike(post.id, post.likedByCurrentUser)}
            hitSlop={8}
          >
            <Ionicons
              name={post.likedByCurrentUser ? "heart" : "heart-outline"}
              size={15}
              color={post.likedByCurrentUser ? RED : MUTED}
            />
            <Text style={[fc.actionCount, post.likedByCurrentUser && { color: RED }]}>
              {post.likeCount}
            </Text>
          </Pressable>

          <View style={fc.actionBtn}>
            <Ionicons name="chatbubble-outline" size={14} color={MUTED} />
            <Text style={fc.actionCount}>{post.commentCount}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── ChorusFeed widget ─────────────────────────────────────────────────────────
export function ChorusFeed({
  currentUserId,
  currentUserName = "",
}: {
  currentUserId: string;
  currentUserName?: string;
}) {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isSeed, setIsSeed] = useState(false);

  useEffect(() => {
    const unsub = feedService.subscribe(currentUserId, 4, (fetched) => {
      setPosts(fetched);
      setIsSeed(fetched.length > 0 && fetched[0].id.startsWith("seed-"));
    });
    return unsub;
  }, [currentUserId]);

  const handleLike = async (postId: string, isLiked: boolean) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likedByCurrentUser: !isLiked, likeCount: p.likeCount + (isLiked ? -1 : 1) }
          : p
      )
    );
    try {
      await feedService.toggleLike(postId, currentUserId, isLiked);
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likedByCurrentUser: isLiked, likeCount: p.likeCount + (isLiked ? 1 : -1) }
            : p
        )
      );
    }
  };

  const avatarColor = currentUserName ? nameToColor(currentUserName) : TEAL;

  return (
    <View style={fc.container}>
      {/* Header */}
      <View style={fc.header}>
        <View style={fc.headerLeft}>
          <Text style={fc.title}>Chorus Feed</Text>
          {isSeed && (
            <View style={fc.livePill}>
              <View style={fc.liveDot} />
              <Text style={fc.liveText}>LIVE</Text>
            </View>
          )}
        </View>
        <Pressable onPress={() => router.push("/feed" as any)} hitSlop={10}>
          <Text style={fc.seeAll}>See all →</Text>
        </Pressable>
      </View>

      {/* Compose tap row */}
      <Pressable
        style={fc.composeTap}
        onPress={() => router.push("/feed" as any)}
        activeOpacity={0.75}
      >
        {currentUserName ? (
          <Avatar name={currentUserName} color={avatarColor} size={34} />
        ) : (
          <View style={[fc.avatarPlaceholder, { backgroundColor: avatarColor }]}>
            <Ionicons name="person" size={16} color="#fff" />
          </View>
        )}
        <Text style={fc.composePlaceholder}>Share a moment with your choir... 🎵</Text>
        <Pressable
          style={fc.cameraBtn}
          onPress={() => router.push("/feed" as any)}
          hitSlop={8}
        >
          <Ionicons name="camera-outline" size={20} color={TEAL} />
        </Pressable>
      </Pressable>

      <View style={fc.divider} />

      {/* Posts */}
      {posts.length === 0 ? (
        <View style={fc.empty}>
          <Text style={fc.emptyText}>Be the first to post! 🎵</Text>
        </View>
      ) : (
        posts.map((post, i) => (
          <View key={post.id}>
            {i > 0 && <View style={fc.divider} />}
            <PostRow post={post} onLike={handleLike} isSeed={isSeed} />
          </View>
        ))
      )}

      {/* Footer tap */}
      <Pressable
        style={fc.footer}
        onPress={() => router.push("/feed" as any)}
      >
        <Text style={fc.footerText}>See all posts in Chorus Feed →</Text>
      </Pressable>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const fc = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
    overflow: "hidden",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "800", color: DARK },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: RED + "15",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: RED },
  liveText: { fontSize: 10, fontWeight: "800", color: RED, letterSpacing: 0.8 },
  seeAll: { fontSize: 13, fontWeight: "600", color: TEAL },

  // Compose tap row
  composeTap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  avatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  composePlaceholder: {
    flex: 1,
    fontSize: 14,
    color: MUTED,
  },
  cameraBtn: { padding: 4 },

  divider: { height: 1, backgroundColor: BORDER },

  // Post row (Twitter style)
  postRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  postLeft: { alignItems: "center", marginRight: 10, width: 38 },
  threadLine: { flex: 1, width: 2, backgroundColor: BORDER, marginTop: 5, borderRadius: 1 },
  postRight: { flex: 1 },

  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, marginBottom: 3 },
  authorName: { fontSize: 13, fontWeight: "700", color: DARK },
  time: { fontSize: 12, color: MUTED },
  badgePill: { borderRadius: 20, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 10, fontWeight: "700", color: SUB },

  postText: { fontSize: 13, color: SUB, lineHeight: 19, marginBottom: 6 },

  photoThumb: {
    width: "100%",
    height: 110,
    borderRadius: 10,
    backgroundColor: BG,
    marginBottom: 6,
  },

  actions: { flexDirection: "row", gap: 16, marginTop: 2 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionCount: { fontSize: 12, fontWeight: "600", color: MUTED },

  empty: { alignItems: "center", paddingVertical: 24 },
  emptyText: { fontSize: 14, color: MUTED },

  footer: {
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: BG,
  },
  footerText: { fontSize: 13, color: TEAL, fontWeight: "600" },
});
