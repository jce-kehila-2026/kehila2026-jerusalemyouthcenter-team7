import { AppColors, Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/src/context/AuthContext";
import { FirestoreMsg, messageService } from "@/src/data/messageService";
import { Student } from "@/src/data/mockData";
import { notificationService } from "@/src/data/notificationService";
import { studentService } from "@/src/data/studentService";
import { timeAgo } from "@/src/utils/timeUtils";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
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

// ── Types ─────────────────────────────────────────────────────────────────────
type ThreadMsg = {
  id: string;
  content: string;
  timestamp: string;
  fromMe: boolean;
  senderName: string;
};

type Conversation = {
  otherPartyId: string;
  otherName: string;
  unread: boolean;
  thread: ThreadMsg[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function groupConversations(
  msgs: FirestoreMsg[],
  currentUid: string,
  isAdmin: boolean,
): Conversation[] {
  const map = new Map<string, Conversation>();

  msgs.forEach((msg) => {
    // Determine if message is from current user (use actual UID, not "admin")
    const fromMe = msg.sender_id === currentUid;

    const otherPartyId = fromMe ? msg.receiver_id : msg.sender_id;
    const otherName = fromMe
      ? (map.get(otherPartyId)?.otherName ?? otherPartyId)
      : msg.sender_name;

    if (!map.has(otherPartyId)) {
      map.set(otherPartyId, {
        otherPartyId,
        otherName,
        unread: false,
        thread: [],
      });
    }

    const conv = map.get(otherPartyId)!;
    if (!fromMe) conv.otherName = msg.sender_name;

    conv.thread.push({
      id: msg.id,
      content: msg.content,
      timestamp: msg.timestamp,
      fromMe,
      senderName: msg.sender_name,
    });

    if (!fromMe && !msg.is_read) conv.unread = true;
  });

  return Array.from(map.values());
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const scrollRef = useRef<ScrollView>(null);

  const router = useRouter();
  const { studentId, studentName } = useLocalSearchParams<{ studentId: string; studentName: string }>();

  const isAdmin = user?.role === "admin";
  const currentUid = user?.uid ?? "";

  const [loading, setLoading] = useState(true);
  const [allMessages, setAllMessages] = useState<FirestoreMsg[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");

  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // ── Fetch student directory ───────────────────────────────────────────────
  useEffect(() => {
    studentService
      .getAllStudents()
      .then((s) => {
        if (s.length > 0) setAllStudents(s);
      })
      .catch(() => {});
  }, []);

  // ── Firestore real-time subscription ─────────────────────────────────────
  useEffect(() => {
    if (!currentUid) {
      setLoading(false);
      return;
    }

    const unsub = messageService.subscribe((msgs) => {
      setLoading(false);

      const forUser = isAdmin
        ? msgs
        : msgs.filter(
            (m) => m.sender_id === currentUid || m.receiver_id === currentUid,
          );

      setAllMessages(msgs);
      setConversations(groupConversations(forUser, currentUid, isAdmin));
    });

    return unsub;
  }, [currentUid, isAdmin]);

  // Keep active thread in sync when conversations update
  useEffect(() => {
    if (!activeConv) return;
    const updated = conversations.find(
      (c) => c.otherPartyId === activeConv.otherPartyId,
    );
    if (updated) setActiveConv(updated);
  }, [conversations]);

  // Auto-open chat when arriving from the students screen via URL params
  useEffect(() => {
    if (!studentId) return;
    const sid = String(studentId);
    const existing = conversations.find((c) => c.otherPartyId === sid);
    if (existing) {
      openConversation(existing);
    } else {
      setActiveConv({
        otherPartyId: sid,
        otherName: String(studentName ?? sid),
        unread: false,
        thread: [],
      });
      setSearch("");
    }
    // Clear params so re-visiting the screen doesn't re-open the same chat
    router.setParams({ studentId: "", studentName: "" });
  }, [studentId]);

  // ── Search state ──────────────────────────────────────────────────────────
  const searchTrimmed = search.trim().toLowerCase();
  const filteredStudents = searchTrimmed
    ? allStudents.filter(
        (s) =>
          s.full_name.toLowerCase().includes(searchTrimmed) &&
          s.id !== currentUid,
      )
    : allStudents.filter((s) => s.id !== currentUid);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function openConversation(conv: Conversation) {
    setActiveConv(conv);
    setSearch("");
    const unread = allMessages.filter((m) => {
      return (
        m.receiver_id === currentUid &&
        m.sender_id === conv.otherPartyId &&
        !m.is_read
      );
    });
    await Promise.all(unread.map((m) => messageService.markRead(m.id)));
  }

  function openStudentConversation(student: Student) {
    const existing = conversations.find((c) => c.otherPartyId === student.id);
    if (existing) {
      openConversation(existing);
    } else {
      setActiveConv({
        otherPartyId: student.id,
        otherName: student.full_name,
        unread: false,
        thread: [],
      });
      setSearch("");
    }
  }

  async function sendMessage() {
    if (!draft.trim() || !activeConv || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");

    const senderName = user?.full_name ?? "Unknown";
    const receiverId = activeConv.otherPartyId;

    try {
      await messageService.send({
        sender_id: currentUid,
        sender_name: senderName,
        receiver_id: receiverId,
        content: text,
        timestamp: new Date().toISOString(),
        is_read: false,
      });

      // Write a notification for the receiver so it appears in their notification centre.
      // If receiver is 'admin', omit target_uid so all admins see it.
      await notificationService.create({
        title: "New Message",
        body: `${senderName} sent you a message`,
        type: "message",
        is_read: false,
        timestamp: new Date().toISOString(),
        ...(receiverId !== "admin" ? { target_uid: receiverId } : {}),
      });
    } catch (e) {
      console.error("Send failed:", e);
    }

    setSending(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }

  const totalUnread = conversations.filter((c) => c.unread).length;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Thread view ───────────────────────────────────────────────────────────
  if (activeConv) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Thread header */}
          <View
            style={[
              styles.threadHeader,
              { backgroundColor: theme.card, borderBottomColor: theme.border },
            ]}
          >
            <Pressable
              onPress={() => setActiveConv(null)}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color={AppColors.primary} />
            </Pressable>
            <View
              style={[
                styles.convAvatar,
                { backgroundColor: AppColors.primary + "20" },
              ]}
            >
              <Text
                style={[styles.convAvatarText, { color: AppColors.primary }]}
              >
                {activeConv.otherName.charAt(0)}
              </Text>
            </View>
            <View>
              <Text style={[styles.threadName, { color: theme.text }]}>
                {activeConv.otherName}
              </Text>
            </View>
          </View>

          {/* Bubbles */}
          <ScrollView
            ref={scrollRef}
            style={styles.threadScroll}
            contentContainerStyle={styles.threadContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: false })
            }
          >
            {activeConv.thread.length === 0 && (
              <View style={styles.emptyThread}>
                <Ionicons
                  name="chatbubble-outline"
                  size={36}
                  color={theme.subtext}
                />
                <Text
                  style={[styles.emptyThreadText, { color: theme.subtext }]}
                >
                  Start the conversation
                </Text>
              </View>
            )}
            {activeConv.thread.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.bubbleRow,
                  msg.fromMe ? styles.bubbleRight : styles.bubbleLeft,
                ]}
              >
                {!msg.fromMe && (
                  <Text style={[styles.senderLabel, { color: theme.subtext }]}>
                    {msg.senderName}
                  </Text>
                )}
                <View
                  style={[
                    styles.bubble,
                    msg.fromMe
                      ? styles.bubbleSent
                      : [
                          styles.bubbleReceived,
                          {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                          },
                        ],
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      { color: msg.fromMe ? "#fff" : theme.text },
                    ]}
                  >
                    {msg.content}
                  </Text>
                  <Text
                    style={[
                      styles.bubbleTime,
                      {
                        color: msg.fromMe
                          ? "rgba(255,255,255,0.7)"
                          : theme.subtext,
                      },
                    ]}
                  >
                    {timeAgo(msg.timestamp)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Compose bar */}
          <View
            style={[
              styles.composeBar,
              { backgroundColor: theme.card, borderTopColor: theme.border },
            ]}
          >
            <TextInput
              style={[
                styles.composeInput,
                {
                  color: theme.text,
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              value={draft}
              onChangeText={setDraft}
              placeholder="Type a message…"
              placeholderTextColor={theme.subtext}
              multiline
              maxLength={500}
            />
            <Pressable
              style={[
                styles.sendBtn,
                (!draft.trim() || sending) && styles.sendBtnDisabled,
              ]}
              onPress={sendMessage}
              disabled={!draft.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Inbox ─────────────────────────────────────────────────────────────────
  const showingSearch = searchTrimmed.length > 0 || conversations.length === 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <View style={styles.inboxHeader}>
        <Text style={[styles.inboxTitle, { color: theme.text }]}>Messages</Text>
        {totalUnread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{totalUnread}</Text>
          </View>
        )}
      </View>

      {/* Search bar */}
      <View
        style={[
          styles.searchWrap,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Ionicons name="search" size={16} color={theme.subtext} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search students…"
          placeholderTextColor={theme.subtext}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={theme.subtext} />
          </Pressable>
        )}
      </View>

      {showingSearch ? (
        /* Student directory */
        <FlatList
          data={filteredStudents}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.listHeader, { color: theme.subtext }]}>
              {searchTrimmed
                ? `Results for "${search.trim()}"`
                : "All Students"}
            </Text>
          }
          renderItem={({ item }) => {
            const existing = conversations.find(
              (c) => c.otherPartyId === item.id,
            );
            const lastMsg = existing?.thread[existing.thread.length - 1];
            return (
              <Pressable
                style={[
                  styles.convCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  existing?.unread && styles.convCardUnread,
                ]}
                onPress={() => openStudentConversation(item)}
              >
                <View
                  style={[
                    styles.convAvatar,
                    { backgroundColor: AppColors.primary + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.convAvatarText,
                      { color: AppColors.primary },
                    ]}
                  >
                    {item.full_name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.convBody}>
                  <Text
                    style={[
                      styles.convName,
                      { color: theme.text },
                      existing?.unread && styles.convNameBold,
                    ]}
                  >
                    {item.full_name}
                  </Text>
                  <Text
                    style={[styles.convPreview, { color: theme.subtext }]}
                    numberOfLines={1}
                  >
                    {lastMsg
                      ? (lastMsg.fromMe ? "You: " : "") + lastMsg.content
                      : "Tap to start a conversation"}
                  </Text>
                </View>
                <View style={styles.convRight}>
                  {lastMsg && (
                    <Text style={[styles.convTime, { color: theme.subtext }]}>
                      {timeAgo(lastMsg.timestamp)}
                    </Text>
                  )}
                  {existing?.unread && <View style={styles.unreadDot} />}
                  {!existing && (
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color={AppColors.primary}
                    />
                  )}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={theme.subtext} />
              <Text style={[styles.emptyText, { color: theme.subtext }]}>
                No students found
              </Text>
            </View>
          }
        />
      ) : (
        /* Conversation list */
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.otherPartyId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.listHeader, { color: theme.subtext }]}>
              Conversations
            </Text>
          }
          renderItem={({ item }) => {
            const lastMsg = item.thread[item.thread.length - 1];
            return (
              <Pressable
                style={[
                  styles.convCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  item.unread && styles.convCardUnread,
                ]}
                onPress={() => openConversation(item)}
              >
                <View
                  style={[
                    styles.convAvatar,
                    { backgroundColor: AppColors.primary + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.convAvatarText,
                      { color: AppColors.primary },
                    ]}
                  >
                    {item.otherName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.convBody}>
                  <Text
                    style={[
                      styles.convName,
                      { color: theme.text },
                      item.unread && styles.convNameBold,
                    ]}
                  >
                    {item.otherName}
                  </Text>
                  {lastMsg && (
                    <Text
                      style={[styles.convPreview, { color: theme.subtext }]}
                      numberOfLines={1}
                    >
                      {lastMsg.fromMe ? "You: " : ""}
                      {lastMsg.content}
                    </Text>
                  )}
                </View>
                <View style={styles.convRight}>
                  {lastMsg && (
                    <Text style={[styles.convTime, { color: theme.subtext }]}>
                      {timeAgo(lastMsg.timestamp)}
                    </Text>
                  )}
                  {item.unread && <View style={styles.unreadDot} />}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  inboxHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 10,
  },
  inboxTitle: { fontSize: 24, fontWeight: "800" },
  unreadBadge: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  unreadBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  list: { padding: 16, gap: 8, paddingTop: 4 },
  listHeader: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  convCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  convCardUnread: { borderLeftWidth: 3, borderLeftColor: AppColors.primary },
  convAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  convAvatarText: { fontSize: 20, fontWeight: "700" },
  convBody: { flex: 1 },
  convName: { fontSize: 15, color: "#11181C", marginBottom: 2 },
  convNameBold: { fontWeight: "700" },
  convPreview: { fontSize: 13 },
  convRight: { alignItems: "flex-end", gap: 4 },
  convTime: { fontSize: 11 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppColors.primary,
  },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
  threadHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  threadName: { fontSize: 16, fontWeight: "700" },
  threadScroll: { flex: 1 },
  threadContent: { padding: 16, gap: 4, paddingBottom: 8 },
  emptyThread: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyThreadText: { fontSize: 14 },
  bubbleRow: { marginBottom: 8 },
  bubbleLeft: { alignItems: "flex-start" },
  bubbleRight: { alignItems: "flex-end" },
  senderLabel: { fontSize: 11, marginBottom: 3, marginLeft: 4 },
  bubble: { maxWidth: "78%", borderRadius: 16, padding: 12 },
  bubbleReceived: { borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleSent: {
    backgroundColor: AppColors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 10, marginTop: 4, textAlign: "right" },
  composeBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  composeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#ccc" },
});
