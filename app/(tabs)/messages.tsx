import { AppColors, Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/src/context/AuthContext";
import { FirestoreMsg, messageService } from "@/src/data/messageService";
import {
  messages as mockMessages,
  students as mockStudents,
  Student,
} from "@/src/data/mockData";
import { studentService } from "@/src/data/studentService";
import { timeAgo } from "@/src/utils/timeUtils";
import { Ionicons } from "@expo/vector-icons";
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
  fromStudent: boolean; // false = sent by the current user
  senderName: string;
};

type Conversation = {
  otherPartyId: string;
  studentName: string;
  unread: boolean;
  thread: ThreadMsg[];
};

// ── Data model convention ─────────────────────────────────────────────────────
// Admin sends with sender_id: 'admin'. Students send with sender_id: their UID.
// Messages TO admin have receiver_id: 'admin'.
// ─────────────────────────────────────────────────────────────────────────────

function groupConversations(
  msgs: FirestoreMsg[],
  currentUid: string,
  isAdmin: boolean,
): Conversation[] {
  const map = new Map<string, Conversation>();

  msgs.forEach((msg) => {
    const fromMe = isAdmin
      ? msg.sender_id === "admin" || msg.sender_id === currentUid
      : msg.sender_id === currentUid;

    const otherPartyId = fromMe ? msg.receiver_id : msg.sender_id;
    const otherName = fromMe
      ? (map.get(otherPartyId)?.studentName ?? otherPartyId)
      : msg.sender_name;

    if (!map.has(otherPartyId)) {
      map.set(otherPartyId, {
        otherPartyId,
        studentName: otherName,
        unread: false,
        thread: [],
      });
    }

    const conv = map.get(otherPartyId)!;
    if (!fromMe) conv.studentName = msg.sender_name;

    conv.thread.push({
      id: msg.id,
      content: msg.content,
      timestamp: msg.timestamp,
      fromStudent: !fromMe,
      senderName: msg.sender_name,
    });

    if (!fromMe && !msg.is_read) conv.unread = true;
  });

  return Array.from(map.values());
}

function buildMockConversations(): Conversation[] {
  const map = new Map<string, Conversation>();
  [...(mockMessages || [])]
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    .forEach((m) => {
      const key = String(m.sender_id);
      if (!map.has(key)) {
        map.set(key, {
          otherPartyId: key,
          studentName: m.sender_name,
          unread: false,
          thread: [],
        });
      }
      const conv = map.get(key)!;
      conv.thread.push({
        id: String(m.id),
        content: m.content,
        timestamp: m.timestamp,
        fromStudent: true,
        senderName: m.sender_name,
      });
      if (!m.is_read) conv.unread = true;
    });
  return Array.from(map.values());
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const scrollRef = useRef<ScrollView>(null);

  const isAdmin = user?.role === "admin";
  const currentUid = user?.uid ?? "demo";

  const [loading, setLoading] = useState(true);
  const [allMessages, setAllMessages] = useState<FirestoreMsg[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [usingMock, setUsingMock] = useState(false);
  const [allStudents, setAllStudents] = useState<Student[]>(mockStudents || []);
  const [search, setSearch] = useState("");

  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // ── Fetch all students for search directory ───────────────────────────────
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
    const unsub = messageService.subscribe((msgs) => {
      setLoading(false);

      // Each user only sees messages they are part of
      const forUser = isAdmin
        ? msgs
        : msgs.filter(
            (m) => m.sender_id === currentUid || m.receiver_id === currentUid,
          );

      if (forUser.length === 0 && !usingMock) {
        setUsingMock(true);
        setConversations(buildMockConversations());
      } else if (forUser.length > 0) {
        setUsingMock(false);
        setAllMessages(msgs);
        setConversations(groupConversations(forUser, currentUid, isAdmin));
      }
    });
    return unsub;
  }, [currentUid, isAdmin]);

  // Keep active thread in sync with live updates
  useEffect(() => {
    if (!activeConv) return;
    const updated = conversations.find(
      (c) => c.otherPartyId === activeConv.otherPartyId,
    );
    if (updated) setActiveConv(updated);
  }, [conversations]);

  // ── Search state ──────────────────────────────────────────────────────────
  const searchTrimmed = search.trim().toLowerCase();
  const filteredStudents = searchTrimmed
    ? allStudents.filter(
        (s) =>
          s.full_name.toLowerCase().includes(searchTrimmed) &&
          s.id !== currentUid, // exclude yourself
      )
    : allStudents.filter((s) => s.id !== currentUid);

  function hasExistingConversation(studentId: string) {
    return conversations.some((c) => c.otherPartyId === studentId);
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  async function openConversation(conv: Conversation) {
    setActiveConv(conv);
    setSearch("");
    if (!usingMock) {
      const unread = allMessages.filter((m) => {
        if (isAdmin)
          return (
            m.receiver_id === "admin" &&
            m.sender_id === conv.otherPartyId &&
            !m.is_read
          );
        return m.receiver_id === currentUid && !m.is_read;
      });
      await Promise.all(unread.map((m) => messageService.markRead(m.id)));
    } else {
      setConversations((prev) =>
        prev.map((c) =>
          c.otherPartyId === conv.otherPartyId ? { ...c, unread: false } : c,
        ),
      );
    }
  }

  function openStudentConversation(student: Student) {
    const existing = conversations.find((c) => c.otherPartyId === student.id);
    if (existing) {
      openConversation(existing);
    } else {
      setActiveConv({
        otherPartyId: student.id,
        studentName: student.full_name,
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

    if (usingMock) {
      const newMsg: ThreadMsg = {
        id: `local-${Date.now()}`,
        content: text,
        timestamp: new Date().toISOString(),
        fromStudent: false,
        senderName: user?.full_name ?? "You",
      };
      setActiveConv((prev) =>
        prev ? { ...prev, thread: [...prev.thread, newMsg] } : prev,
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.otherPartyId === activeConv.otherPartyId
            ? { ...c, thread: [...c.thread, newMsg] }
            : c,
        ),
      );
    } else {
      await messageService.send({
        sender_id: isAdmin ? "admin" : currentUid,
        sender_name: user?.full_name ?? (isAdmin ? "Admin" : "Student"),
        receiver_id: activeConv.otherPartyId,
        content: text,
        timestamp: new Date().toISOString(),
        is_read: false,
      });
      // onSnapshot updates conversations automatically
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
                {activeConv.studentName.charAt(0)}
              </Text>
            </View>
            <View>
              <Text style={[styles.threadName, { color: theme.text }]}>
                {activeConv.studentName}
              </Text>
              <Text style={[styles.threadRole, { color: theme.subtext }]}>
                Student
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
                  msg.fromStudent ? styles.bubbleLeft : styles.bubbleRight,
                ]}
              >
                {msg.fromStudent && (
                  <Text style={[styles.senderLabel, { color: theme.subtext }]}>
                    {msg.senderName}
                  </Text>
                )}
                <View
                  style={[
                    styles.bubble,
                    msg.fromStudent
                      ? [
                          styles.bubbleReceived,
                          {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                          },
                        ]
                      : styles.bubbleSent,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      { color: msg.fromStudent ? theme.text : "#fff" },
                    ]}
                  >
                    {msg.content}
                  </Text>
                  <Text
                    style={[
                      styles.bubbleTime,
                      {
                        color: msg.fromStudent
                          ? theme.subtext
                          : "rgba(255,255,255,0.7)",
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
        /* ── Student directory (search mode or no conversations) ── */
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
                      ? (lastMsg.fromStudent ? "" : "You: ") + lastMsg.content
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
        /* ── Conversation list ── */
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
                    {item.studentName.charAt(0)}
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
                    {item.studentName}
                  </Text>
                  {lastMsg && (
                    <Text
                      style={[styles.convPreview, { color: theme.subtext }]}
                      numberOfLines={1}
                    >
                      {lastMsg.fromStudent ? "" : "You: "}
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
  // Inbox
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
  // Search
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
  // List
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
  // Thread
  threadHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  threadName: { fontSize: 16, fontWeight: "700" },
  threadRole: { fontSize: 12 },
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
