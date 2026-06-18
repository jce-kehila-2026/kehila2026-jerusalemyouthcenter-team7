import { AppColors, Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/src/context/AuthContext";
import { FirestoreMsg, messageService } from "@/src/data/messageService";
import { Group, Student } from "@/src/data/mockData";
import { notificationService } from "@/src/data/notificationService";
import { studentService } from "@/src/data/studentService";
import { uploadToStorage } from "@/src/data/storageService";
import { db } from "@/src/firebase/firebase";
import { timeAgo } from "@/src/utils/timeUtils";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    addDoc,
    collection,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    where,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
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
  type: "text" | "image" | "file" | "audio" | "voice";
  fileName?: string;
  fileSize?: string;
  duration?: number;
  timestamp: string;
  fromMe: boolean;
  senderName: string;
  reactions?: Record<string, string>;
  is_read: boolean;
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
    const fromMe = msg.sender_id === currentUid;
    const otherPartyId = fromMe ? msg.receiver_id : msg.sender_id;
    const otherName = fromMe
      ? (map.get(otherPartyId)?.otherName ?? msg.receiver_name ?? otherPartyId)
      : msg.sender_name;

    if (!map.has(otherPartyId)) {
      map.set(otherPartyId, { otherPartyId, otherName, unread: false, thread: [] });
    }

    const conv = map.get(otherPartyId)!;
    if (!fromMe) conv.otherName = msg.sender_name;

    conv.thread.push({
      id: msg.id,
      content: msg.content,
      type: msg.type ?? "text",
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      duration: msg.duration,
      timestamp: msg.timestamp,
      fromMe,
      senderName: msg.sender_name,
      reactions: msg.reactions,
      is_read: msg.is_read,
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
  const { studentId, studentName } = useLocalSearchParams<{
    studentId: string;
    studentName: string;
  }>();

  const isAdmin = user?.role === "admin";
  const currentUid = user?.uid ?? "";

  const [loading, setLoading] = useState(true);
  const [allMessages, setAllMessages] = useState<FirestoreMsg[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");

  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Rich media
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<any>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Reply
  const [replyingTo, setReplyingTo] = useState<ThreadMsg | null>(null);

  // Selection mode
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Forward modal
  const [forwardingMsg, setForwardingMsg] = useState<ThreadMsg | null>(null);
  const [forwardTargets, setForwardTargets] = useState<Set<string>>(new Set());

  // Group management (admin only)
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [groupsData, setGroupsData] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null); // null = list view
  const [groupDraftName, setGroupDraftName] = useState("");
  const [groupDraftMembers, setGroupDraftMembers] = useState<Set<string>>(new Set());
  const [groupSaving, setGroupSaving] = useState(false);

  // Playback
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [sound, setSound] = useState<any>(null);

  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef<any>(null);

  const inSelectionMode = selectedIds.size > 0;

  // ── Fetch contacts directory (singers + admins) ───────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [singers, adminSnap] = await Promise.all([
          studentService.getAllStudents(),
          getDocs(query(collection(db, "users"), where("role", "==", "admin"))),
        ]);
        const admins: Student[] = adminSnap.docs.map((d) => {
          const data = d.data() as any;
          return {
            ...data,
            id: d.id,
            full_name: data.full_name ?? data.name ?? "Admin",
          } as Student;
        });
        const all = [...singers, ...admins];
        if (all.length > 0) setAllStudents(all);
      } catch {}
    })();
  }, []);

  // ── Firestore real-time subscription ─────────────────────────────────────
  useEffect(() => {
    if (!currentUid) {
      setLoading(false);
      return;
    }

    const unsub = messageService.subscribe((msgs) => {
      setLoading(false);
      const forUser = msgs.filter(
        (m) => m.sender_id === currentUid || m.receiver_id === currentUid,
      );
      setAllMessages(forUser);
      setConversations(groupConversations(forUser, currentUid, isAdmin));
    });

    return unsub;
  }, [currentUid, isAdmin]);

  // ── Per-conversation real-time listener ───────────────────────────────────
  useEffect(() => {
    if (!activeConv) {
      setThreadMessages([]);
      return;
    }
    const otherUid = activeConv.otherPartyId;
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: ThreadMsg[] = snapshot.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) } as FirestoreMsg))
        .filter(
          (m) =>
            (m.sender_id === currentUid && m.receiver_id === otherUid) ||
            (m.sender_id === otherUid && m.receiver_id === currentUid),
        )
        .map((m) => {
          const raw = (m as any).timestamp;
          const ts: string =
            raw && typeof raw === "object" && typeof raw.toDate === "function"
              ? raw.toDate().toISOString()
              : typeof raw === "string"
              ? raw
              : new Date().toISOString();
          return {
            id: m.id,
            content: m.content,
            type: m.type ?? "text",
            fileName: m.fileName,
            fileSize: m.fileSize,
            duration: m.duration,
            timestamp: ts,
            fromMe: m.sender_id === currentUid,
            senderName: m.sender_name,
            reactions: m.reactions,
            is_read: m.is_read,
          };
        });
      setThreadMessages(msgs);
    });
    return unsub;
  }, [activeConv?.otherPartyId, currentUid]);

  // ── Auto-open chat when arriving from students screen via URL params ───────
  useEffect(() => {
    if (!studentId) return;
    const sid = String(studentId);
    const resolvedName =
      (studentName ? String(studentName) : "") ||
      allStudents.find((s) => s.id === sid)?.full_name ||
      sid;
    const existing = conversations.find((c) => c.otherPartyId === sid);
    if (existing) {
      openConversation(existing);
    } else {
      setActiveConv({
        otherPartyId: sid,
        otherName: resolvedName,
        unread: false,
        thread: [],
      });
      setSearch("");
    }
    router.setParams({ studentId: "", studentName: "" });
  }, [studentId]);

  // ── Search state ──────────────────────────────────────────────────────────
  const searchTrimmed = search.trim().toLowerCase();
  const filteredStudents = searchTrimmed
    ? allStudents.filter(
        (s) =>
          (s.full_name ?? "").toLowerCase().includes(searchTrimmed) &&
          s.id !== currentUid,
      )
    : allStudents.filter((s) => s.id !== currentUid);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function openConversation(conv: Conversation) {
    setActiveConv(conv);
    setSearch("");
    const unread = allMessages.filter(
      (m) =>
        m.receiver_id === currentUid &&
        m.sender_id === conv.otherPartyId &&
        !m.is_read,
    );
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
      await addDoc(collection(db, "messages"), {
        sender_id: currentUid,
        sender_name: senderName,
        receiver_id: receiverId,
        receiver_name: activeConv.otherName,
        content: text,
        type: "text",
        // ISO string keeps ordering stable while the write is pending locally
        timestamp: new Date().toISOString(),
        is_read: false,
      });

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

    setReplyingTo(null);
    setSending(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }

  // ── Send image from gallery ───────────────────────────────────────────────
  async function pickAndSendImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    await sendMedia(
      result.assets[0].uri,
      "image",
      result.assets[0].fileName ?? "image.jpg",
    );
  }

  // ── Take photo and send ───────────────────────────────────────────────────
  async function takeAndSendPhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    await sendMedia(result.assets[0].uri, "image", "photo.jpg");
  }

  // ── Pick and send file ────────────────────────────────────────────────────
  async function pickAndSendFile() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const sizeStr = asset.size
      ? asset.size > 1024 * 1024
        ? `${(asset.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(asset.size / 1024)} KB`
      : "";
    setUploading(true);
    try {
      const url = await uploadToStorage(asset.uri, "files", asset.name);
      await messageService.send({
        sender_id: currentUid,
        sender_name: user?.full_name ?? "Unknown",
        receiver_id: activeConv!.otherPartyId,
        receiver_name: activeConv!.otherName,
        content: url,
        type: "file",
        fileName: asset.name,
        fileSize: sizeStr,
        timestamp: new Date().toISOString(),
        is_read: false,
      });
    } catch (e) {
      console.error("File send error:", e);
    }
    setUploading(false);
  }

  // ── Shared upload + send for images ──────────────────────────────────────
  async function sendMedia(uri: string, type: "image", name: string) {
    if (!activeConv) return;
    setUploading(true);
    try {
      const url = await uploadToStorage(uri, "images", name);
      await messageService.send({
        sender_id: currentUid,
        sender_name: user?.full_name ?? "Unknown",
        receiver_id: activeConv.otherPartyId,
        receiver_name: activeConv.otherName,
        content: url,
        type,
        timestamp: new Date().toISOString(),
        is_read: false,
      });
    } catch (e) {
      console.error("Media send error:", e);
    }
    setUploading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }

  // ── Voice recording ───────────────────────────────────────────────────────
  async function startRecording() {
    if (recordingRef.current) return;
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) return;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = rec;
      setRecording(rec);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimer.current = setInterval(
        () => setRecordingDuration((d) => d + 1),
        1000,
      );
    } catch (e) {
      console.error("Recording start error:", e);
    }
  }

  async function stopAndSendRecording() {
    const rec = recordingRef.current;
    if (!rec || !activeConv) return;

    recordingRef.current = null;
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    setIsRecording(false);
    setRecording(null);
    const dur = recordingDuration;
    setRecordingDuration(0);

    try {
      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });
      const uri = rec.getURI();
      if (!uri) return;
      setUploading(true);
      const url = await uploadToStorage(uri, "audio", `voice_${Date.now()}.m4a`);
      await messageService.send({
        sender_id: currentUid,
        sender_name: user?.full_name ?? "Unknown",
        receiver_id: activeConv.otherPartyId,
        receiver_name: activeConv.otherName,
        content: url,
        type: "voice",
        duration: dur,
        timestamp: new Date().toISOString(),
        is_read: false,
      });
      setUploading(false);
    } catch (e) {
      console.error("Recording stop error:", e);
      setUploading(false);
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }

  // ── Audio playback ────────────────────────────────────────────────────────
  async function playVoice(msgId: string, url: string) {
    if (playingId === msgId) {
      await sound?.stopAsync();
      setPlayingId(null);
      setSound(null);
      return;
    }
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    const { sound: newSound } = await Audio.Sound.createAsync({ uri: url });
    setSound(newSound);
    setPlayingId(msgId);
    await newSound.playAsync();
    newSound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.didJustFinish) {
        setPlayingId(null);
        setSound(null);
      }
    });
  }

  // ── Selection mode ────────────────────────────────────────────────────────
  function toggleSelection(msgId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    await Promise.all(ids.map((id) => messageService.deleteMessage(id)));
    clearSelection();
  }

  function handleReply() {
    const id = [...selectedIds][0];
    const msg = threadMessages.find((m) => m.id === id);
    if (msg) {
      setReplyingTo(msg);
      clearSelection();
    }
  }

  function handleForward() {
    const id = [...selectedIds][0];
    const msg = threadMessages.find((m) => m.id === id);
    if (msg) setForwardingMsg(msg);
  }

  function toggleForwardTarget(id: string) {
    setForwardTargets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function doForwardToAll() {
    if (!forwardingMsg || forwardTargets.size === 0) return;
    const targets = allStudents.filter((s) => forwardTargets.has(s.id));
    try {
      await Promise.all(
        targets.map((target) =>
          messageService.send({
            sender_id: currentUid,
            sender_name: user?.full_name ?? "Unknown",
            receiver_id: target.id,
            receiver_name: target.full_name,
            content: forwardingMsg.content,
            type: forwardingMsg.type,
            fileName: forwardingMsg.fileName,
            fileSize: forwardingMsg.fileSize,
            duration: forwardingMsg.duration,
            timestamp: new Date().toISOString(),
            is_read: false,
          }),
        ),
      );
    } catch (e) {
      console.error("Forward error:", e);
    }
    setForwardingMsg(null);
    setForwardTargets(new Set());
    clearSelection();
  }

  function closeForwardModal() {
    setForwardingMsg(null);
    setForwardTargets(new Set());
    clearSelection();
  }

  // ── Group management (admin only) ─────────────────────────────────────────
  async function loadGroups() {
    setGroupsLoading(true);
    try {
      const data = await studentService.getGroups();
      setGroupsData(data);
    } catch (e) {
      console.error("Load groups error:", e);
    }
    setGroupsLoading(false);
  }

  function openGroupsModal() {
    setShowGroupsModal(true);
    setEditingGroup(null);
    loadGroups();
  }

  function startCreateGroup() {
    setEditingGroup({ id: "", name: "" });
    setGroupDraftName("");
    setGroupDraftMembers(new Set());
  }

  function startEditGroup(group: Group) {
    setEditingGroup(group);
    setGroupDraftName(group.name);
    setGroupDraftMembers(new Set(group.member_ids ?? []));
  }

  function toggleGroupMember(uid: string) {
    setGroupDraftMembers((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  async function saveGroup() {
    if (!groupDraftName.trim() || !editingGroup) return;
    setGroupSaving(true);
    try {
      const memberIds = [...groupDraftMembers];
      if (editingGroup.id === "") {
        await studentService.createGroup(groupDraftName.trim(), memberIds);
      } else {
        await studentService.updateGroup(editingGroup.id, groupDraftName.trim(), memberIds);
      }
      await loadGroups();
      setEditingGroup(null);
    } catch (e) {
      console.error("Save group error:", e);
    }
    setGroupSaving(false);
  }

  function confirmDeleteGroup(group: Group) {
    Alert.alert(
      "Delete Group",
      `Delete "${group.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await studentService.deleteGroup(group.id);
              await loadGroups();
            } catch (e) {
              console.error("Delete group error:", e);
            }
          },
        },
      ],
    );
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
        {/* Forward-to modal */}
        <Modal
          visible={!!forwardingMsg}
          transparent
          animationType="slide"
          onRequestClose={closeForwardModal}
        >
          <View style={styles.forwardOverlay}>
            <Pressable style={styles.forwardBackdrop} onPress={closeForwardModal} />
            <View
              style={[styles.forwardSheet, { backgroundColor: theme.card }]}
            >
              <View
                style={[
                  styles.forwardSheetHeader,
                  { borderBottomColor: theme.border },
                ]}
              >
                <Text style={[styles.forwardSheetTitle, { color: theme.text }]}>
                  Forward to…
                </Text>
                <Pressable onPress={closeForwardModal} hitSlop={10}>
                  <Ionicons name="close" size={22} color={theme.subtext} />
                </Pressable>
              </View>
              <FlatList
                data={allStudents.filter((s) => s.id !== currentUid)}
                keyExtractor={(s) => s.id}
                renderItem={({ item }) => {
                  const targeted = forwardTargets.has(item.id);
                  return (
                    <Pressable
                      style={[
                        styles.forwardContact,
                        { borderBottomColor: theme.border },
                        targeted && { backgroundColor: AppColors.primary + "0d" },
                      ]}
                      onPress={() => toggleForwardTarget(item.id)}
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
                          {(item.full_name ?? "?").charAt(0)}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.forwardContactName,
                          { color: theme.text },
                          targeted && { fontWeight: "700" },
                        ]}
                      >
                        {item.full_name}
                      </Text>
                      <Ionicons
                        name={targeted ? "checkmark-circle" : "ellipse-outline"}
                        size={22}
                        color={targeted ? AppColors.primary : theme.subtext}
                      />
                    </Pressable>
                  );
                }}
                ListFooterComponent={
                  forwardTargets.size > 0 ? (
                    <Pressable
                      style={[
                        styles.forwardSendBtn,
                        { backgroundColor: AppColors.primary },
                      ]}
                      onPress={doForwardToAll}
                    >
                      <Ionicons name="send" size={16} color="#fff" />
                      <Text style={styles.forwardSendBtnText}>
                        Send to {forwardTargets.size}{" "}
                        {forwardTargets.size === 1 ? "person" : "people"}
                      </Text>
                    </Pressable>
                  ) : null
                }
              />
            </View>
          </View>
        </Modal>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header — normal or selection mode */}
          {inSelectionMode ? (
            <View
              style={[
                styles.selectionBar,
                { backgroundColor: theme.card, borderBottomColor: theme.border },
              ]}
            >
              <Pressable onPress={clearSelection} style={styles.backBtn}>
                <Ionicons name="close" size={22} color={theme.subtext} />
              </Pressable>
              <Text style={[styles.selectionCount, { color: theme.text }]}>
                {selectedIds.size} selected
              </Text>
              <View style={styles.selectionActions}>
                {selectedIds.size === 1 && (
                  <>
                    <Pressable
                      onPress={handleReply}
                      style={styles.selectionBtn}
                      hitSlop={6}
                    >
                      <Ionicons
                        name="return-down-back-outline"
                        size={22}
                        color={AppColors.primary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={handleForward}
                      style={styles.selectionBtn}
                      hitSlop={6}
                    >
                      <Ionicons
                        name="arrow-redo-outline"
                        size={22}
                        color={AppColors.primary}
                      />
                    </Pressable>
                  </>
                )}
                <Pressable
                  onPress={handleBulkDelete}
                  style={styles.selectionBtn}
                  hitSlop={6}
                >
                  <Ionicons name="trash-outline" size={22} color="#c56451" />
                </Pressable>
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.threadHeader,
                {
                  backgroundColor: theme.card,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <Pressable onPress={() => setActiveConv(null)} style={styles.backBtn}>
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
          )}

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
            {threadMessages.length === 0 && (
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

            {threadMessages.map((msg) => {
              const isSelected = selectedIds.has(msg.id);
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.bubbleRow,
                    // in selection mode the row becomes horizontal; otherwise use left/right alignment
                    inSelectionMode
                      ? styles.bubbleRowSelectable
                      : msg.fromMe
                      ? styles.bubbleRight
                      : styles.bubbleLeft,
                    inSelectionMode && isSelected && styles.bubbleRowSelected,
                  ]}
                >
                  {/* Checkbox shown only in selection mode */}
                  {inSelectionMode && (
                    <Pressable
                      onPress={() => toggleSelection(msg.id)}
                      style={styles.selectionCheck}
                      hitSlop={6}
                    >
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={24}
                        color={isSelected ? AppColors.primary : theme.subtext}
                      />
                    </Pressable>
                  )}

                  {/* Content: sender label + bubble + reactions */}
                  <View
                    style={[
                      styles.bubbleContent,
                      msg.fromMe
                        ? { alignItems: "flex-end" }
                        : { alignItems: "flex-start" },
                    ]}
                  >
                    {!msg.fromMe && (
                      <Text
                        style={[styles.senderLabel, { color: theme.subtext }]}
                      >
                        {msg.senderName}
                      </Text>
                    )}

                    {/* Bubble — long press enters selection, tap in selection mode toggles */}
                    <Pressable
                      onLongPress={() => toggleSelection(msg.id)}
                      onPress={() => inSelectionMode && toggleSelection(msg.id)}
                      delayLongPress={400}
                    >
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
                          msg.type !== "text" && { padding: 6 },
                        ]}
                      >
                        {/* TEXT */}
                        {(msg.type === "text" || !msg.type) && (
                          <>
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
                              {msg.fromMe && (
                                <Text> {msg.is_read ? " ✓✓" : " ✓"}</Text>
                              )}
                            </Text>
                          </>
                        )}

                        {/* IMAGE */}
                        {msg.type === "image" && (
                          <>
                            <Image
                              source={{ uri: msg.content }}
                              style={styles.msgImage}
                              resizeMode="cover"
                            />
                            <Text
                              style={[
                                styles.bubbleTime,
                                {
                                  color: msg.fromMe
                                    ? "rgba(255,255,255,0.7)"
                                    : theme.subtext,
                                  margin: 4,
                                },
                              ]}
                            >
                              {timeAgo(msg.timestamp)}
                            </Text>
                          </>
                        )}

                        {/* FILE */}
                        {msg.type === "file" && (
                          <View style={styles.fileRow}>
                            <View
                              style={[
                                styles.fileIconWrap,
                                {
                                  backgroundColor: msg.fromMe
                                    ? "rgba(255,255,255,0.2)"
                                    : AppColors.primary + "18",
                                },
                              ]}
                            >
                              <Ionicons
                                name="document-outline"
                                size={22}
                                color={msg.fromMe ? "#fff" : AppColors.primary}
                              />
                            </View>
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text
                                style={[
                                  styles.fileName,
                                  { color: msg.fromMe ? "#fff" : theme.text },
                                ]}
                                numberOfLines={1}
                              >
                                {msg.fileName ?? "File"}
                              </Text>
                              <Text
                                style={[
                                  styles.fileSize,
                                  {
                                    color: msg.fromMe
                                      ? "rgba(255,255,255,0.7)"
                                      : theme.subtext,
                                  },
                                ]}
                              >
                                {msg.fileSize ?? ""} · {timeAgo(msg.timestamp)}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* VOICE NOTE */}
                        {msg.type === "voice" && (
                          <View style={styles.voiceRow}>
                            <Pressable
                              style={[
                                styles.voicePlayBtn,
                                {
                                  backgroundColor: msg.fromMe
                                    ? "rgba(255,255,255,0.25)"
                                    : AppColors.primary + "18",
                                },
                              ]}
                              onPress={() =>
                                !inSelectionMode &&
                                playVoice(msg.id, msg.content)
                              }
                            >
                              <Ionicons
                                name={
                                  playingId === msg.id ? "pause" : "play"
                                }
                                size={18}
                                color={msg.fromMe ? "#fff" : AppColors.primary}
                              />
                            </Pressable>
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <View style={styles.voiceTrack}>
                                <View
                                  style={[
                                    styles.voiceFill,
                                    {
                                      backgroundColor: msg.fromMe
                                        ? "rgba(255,255,255,0.5)"
                                        : AppColors.primary,
                                    },
                                  ]}
                                />
                              </View>
                              <Text
                                style={[
                                  styles.voiceDuration,
                                  {
                                    color: msg.fromMe
                                      ? "rgba(255,255,255,0.7)"
                                      : theme.subtext,
                                  },
                                ]}
                              >
                                {msg.duration
                                  ? `${Math.floor(msg.duration / 60)}:${String(
                                      msg.duration % 60,
                                    ).padStart(2, "0")}`
                                  : "0:00"}{" "}
                                · {timeAgo(msg.timestamp)}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </Pressable>

                    {/* Reaction badges (display only — added via other means) */}
                    {msg.reactions &&
                      Object.keys(msg.reactions).length > 0 && (
                        <View
                          style={[
                            styles.reactionsRow,
                            msg.fromMe && { justifyContent: "flex-end" },
                          ]}
                        >
                          {Object.entries(
                            Object.values(msg.reactions).reduce<
                              Record<string, number>
                            >((acc, emoji) => {
                              acc[emoji] = (acc[emoji] ?? 0) + 1;
                              return acc;
                            }, {}),
                          ).map(([emoji, count]) => (
                            <View key={emoji} style={styles.reactionBadge}>
                              <Text style={styles.reactionEmoji}>{emoji}</Text>
                              {count > 1 && (
                                <Text style={styles.reactionCount}>{count}</Text>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Reply preview */}
          {replyingTo && (
            <View
              style={[
                styles.replyPreview,
                {
                  backgroundColor: AppColors.primary + "12",
                  borderLeftColor: AppColors.primary,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.replyPreviewLabel, { color: AppColors.primary }]}
                >
                  Replying to{" "}
                  {replyingTo.fromMe ? "yourself" : replyingTo.senderName}
                </Text>
                <Text
                  style={[styles.replyPreviewText, { color: theme.subtext }]}
                  numberOfLines={1}
                >
                  {replyingTo.type === "text"
                    ? replyingTo.content
                    : `[${replyingTo.type}]`}
                </Text>
              </View>
              <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
                <Ionicons name="close" size={18} color={theme.subtext} />
              </Pressable>
            </View>
          )}

          {/* Upload progress */}
          {uploading && (
            <View
              style={[
                styles.uploadingBar,
                { backgroundColor: AppColors.primary + "12" },
              ]}
            >
              <ActivityIndicator size="small" color={AppColors.primary} />
              <Text style={[styles.uploadingText, { color: AppColors.primary }]}>
                Uploading…
              </Text>
            </View>
          )}

          {/* Compose bar */}
          <View
            style={[
              styles.composeBar,
              { backgroundColor: theme.card, borderTopColor: theme.border },
            ]}
          >
            {!isRecording && (
              <View style={styles.mediaButtons}>
                <Pressable
                  onPress={pickAndSendImage}
                  style={styles.mediaBtn}
                  hitSlop={6}
                >
                  <Ionicons
                    name="image-outline"
                    size={22}
                    color={AppColors.primary}
                  />
                </Pressable>
                <Pressable
                  onPress={takeAndSendPhoto}
                  style={styles.mediaBtn}
                  hitSlop={6}
                >
                  <Ionicons
                    name="camera-outline"
                    size={22}
                    color={AppColors.primary}
                  />
                </Pressable>
                <Pressable
                  onPress={pickAndSendFile}
                  style={styles.mediaBtn}
                  hitSlop={6}
                >
                  <Ionicons
                    name="attach-outline"
                    size={22}
                    color={AppColors.primary}
                  />
                </Pressable>
              </View>
            )}

            {isRecording ? (
              <View style={styles.recordingRow}>
                <View style={styles.recordingDot} />
                <Text style={[styles.recordingTimer, { color: theme.text }]}>
                  {Math.floor(recordingDuration / 60)}:
                  {String(recordingDuration % 60).padStart(2, "0")}
                </Text>
                <Text
                  style={[styles.recordingHint, { color: theme.subtext }]}
                >
                  Recording… release to send
                </Text>
              </View>
            ) : (
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
            )}

            {draft.trim().length > 0 ? (
              <Pressable
                style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                onPress={sendMessage}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.sendBtn,
                  isRecording && { backgroundColor: "#c56451" },
                ]}
                onPressIn={startRecording}
                onPressOut={stopAndSendRecording}
              >
                <Ionicons
                  name={isRecording ? "stop" : "mic"}
                  size={18}
                  color="#fff"
                />
              </Pressable>
            )}
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
      {/* Groups management modal — admin only */}
      {isAdmin && (
        <Modal
          visible={showGroupsModal}
          animationType="slide"
          onRequestClose={() => {
            if (editingGroup) setEditingGroup(null);
            else setShowGroupsModal(false);
          }}
        >
          <SafeAreaView
            style={[styles.gmScreen, { backgroundColor: theme.background }]}
          >
            {editingGroup === null ? (
              /* ── Group list ── */
              <>
                <View
                  style={[
                    styles.gmHeader,
                    {
                      backgroundColor: theme.card,
                      borderBottomColor: theme.border,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => setShowGroupsModal(false)}
                    style={styles.gmHeaderBtn}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={22} color={theme.subtext} />
                  </Pressable>
                  <Text style={[styles.gmTitle, { color: theme.text }]}>
                    Groups
                  </Text>
                  <Pressable
                    onPress={startCreateGroup}
                    style={styles.gmHeaderBtn}
                    hitSlop={8}
                  >
                    <Ionicons name="add" size={26} color={AppColors.primary} />
                  </Pressable>
                </View>

                {groupsLoading ? (
                  <View style={styles.center}>
                    <ActivityIndicator size="large" color={AppColors.primary} />
                  </View>
                ) : groupsData.length === 0 ? (
                  <View style={styles.empty}>
                    <Ionicons
                      name="people-outline"
                      size={48}
                      color={theme.subtext}
                    />
                    <Text style={[styles.emptyText, { color: theme.subtext }]}>
                      No groups yet
                    </Text>
                    <Pressable
                      style={[
                        styles.gmCreateFirstBtn,
                        { backgroundColor: AppColors.primary },
                      ]}
                      onPress={startCreateGroup}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                      <Text style={styles.gmCreateFirstText}>
                        Create First Group
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <FlatList
                    data={groupsData}
                    keyExtractor={(g) => g.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                      <View
                        style={[
                          styles.gmGroupRow,
                          {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.gmGroupIcon,
                            { backgroundColor: AppColors.primary + "18" },
                          ]}
                        >
                          <Ionicons
                            name="people-outline"
                            size={22}
                            color={AppColors.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.gmGroupName, { color: theme.text }]}
                          >
                            {item.name}
                          </Text>
                          <Text
                            style={[
                              styles.gmGroupCount,
                              { color: theme.subtext },
                            ]}
                          >
                            {item.member_ids?.length ?? 0} members
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => startEditGroup(item)}
                          style={styles.gmActionBtn}
                          hitSlop={8}
                        >
                          <Ionicons
                            name="pencil-outline"
                            size={20}
                            color={AppColors.primary}
                          />
                        </Pressable>
                        <Pressable
                          onPress={() => confirmDeleteGroup(item)}
                          style={styles.gmActionBtn}
                          hitSlop={8}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={20}
                            color="#c56451"
                          />
                        </Pressable>
                      </View>
                    )}
                  />
                )}
              </>
            ) : (
              /* ── Create / edit form ── */
              <>
                <View
                  style={[
                    styles.gmHeader,
                    {
                      backgroundColor: theme.card,
                      borderBottomColor: theme.border,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => setEditingGroup(null)}
                    style={styles.gmHeaderBtn}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="arrow-back"
                      size={22}
                      color={theme.subtext}
                    />
                  </Pressable>
                  <Text style={[styles.gmTitle, { color: theme.text }]}>
                    {editingGroup.id === "" ? "New Group" : "Edit Group"}
                  </Text>
                  <Pressable
                    onPress={saveGroup}
                    style={[
                      styles.gmSaveBtn,
                      {
                        backgroundColor:
                          groupDraftName.trim() && !groupSaving
                            ? AppColors.primary
                            : theme.border,
                      },
                    ]}
                    disabled={groupSaving || !groupDraftName.trim()}
                  >
                    {groupSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.gmSaveBtnText}>Save</Text>
                    )}
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.gmNameWrap,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <TextInput
                    style={[styles.gmNameInput, { color: theme.text }]}
                    value={groupDraftName}
                    onChangeText={setGroupDraftName}
                    placeholder="Group name"
                    placeholderTextColor={theme.subtext}
                    autoFocus
                  />
                </View>

                <Text
                  style={[styles.gmSectionLabel, { color: theme.subtext }]}
                >
                  MEMBERS ({groupDraftMembers.size} selected)
                </Text>

                <FlatList
                  data={allStudents}
                  keyExtractor={(s) => s.id}
                  contentContainerStyle={{ paddingBottom: 24 }}
                  renderItem={({ item }) => {
                    const selected = groupDraftMembers.has(item.id);
                    return (
                      <Pressable
                        style={[
                          styles.gmMemberRow,
                          { borderBottomColor: theme.border },
                          selected && {
                            backgroundColor: AppColors.primary + "0d",
                          },
                        ]}
                        onPress={() => toggleGroupMember(item.id)}
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
                            {(item.full_name ?? "?").charAt(0)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.gmMemberName,
                            { color: theme.text },
                            selected && { fontWeight: "700" },
                          ]}
                        >
                          {item.full_name}
                        </Text>
                        <Ionicons
                          name={
                            selected ? "checkmark-circle" : "ellipse-outline"
                          }
                          size={22}
                          color={selected ? AppColors.primary : theme.subtext}
                        />
                      </Pressable>
                    );
                  }}
                />
              </>
            )}
          </SafeAreaView>
        </Modal>
      )}

      {/* Header */}
      <View style={styles.inboxHeader}>
        <Text style={[styles.inboxTitle, { color: theme.text, flex: 1 }]}>
          Messages
        </Text>
        {totalUnread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{totalUnread}</Text>
          </View>
        )}
        {isAdmin && (
          <Pressable onPress={openGroupsModal} hitSlop={8} style={styles.gmBtn}>
            <Ionicons
              name="people-circle-outline"
              size={28}
              color={AppColors.primary}
            />
          </Pressable>
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
                    {(item.full_name ?? "?").charAt(0)}
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
                      ? lastMsg.type !== "text"
                        ? (lastMsg.fromMe ? "You: " : "") +
                          `[${lastMsg.type}]`
                        : (lastMsg.fromMe ? "You: " : "") + lastMsg.content
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
                      {lastMsg.type !== "text"
                        ? `[${lastMsg.type}]`
                        : lastMsg.content}
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
  threadScroll: { flex: 1 },
  threadContent: { padding: 16, gap: 4, paddingBottom: 8 },
  emptyThread: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyThreadText: { fontSize: 14 },

  // Bubble rows
  bubbleRow: { marginBottom: 8 },
  bubbleLeft: { alignItems: "flex-start" },
  bubbleRight: { alignItems: "flex-end" },
  // In selection mode the row becomes horizontal (checkbox + content)
  bubbleRowSelectable: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  bubbleRowSelected: { backgroundColor: AppColors.primary + "14" },
  bubbleContent: { flex: 1 },

  senderLabel: { fontSize: 11, marginBottom: 3, marginLeft: 4 },
  bubble: { maxWidth: "85%", borderRadius: 16, padding: 12 },
  bubbleReceived: { borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleSent: {
    backgroundColor: AppColors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 10, marginTop: 4, textAlign: "right" },

  // Compose bar
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

  // Media message bubbles
  msgImage: { width: 200, height: 160, borderRadius: 12 },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    minWidth: 180,
  },
  fileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fileName: { fontSize: 13, fontWeight: "700" },
  fileSize: { fontSize: 11, marginTop: 2 },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    minWidth: 180,
  },
  voicePlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceTrack: {
    height: 4,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  voiceFill: { width: "60%", height: 4, borderRadius: 2 },
  voiceDuration: { fontSize: 10 },

  // Reaction badges (display only)
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
    marginHorizontal: 4,
  },
  reactionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 2,
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 11, fontWeight: "700", color: "#555" },

  // Reply preview bar
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    paddingHorizontal: 14,
    borderLeftWidth: 3,
    gap: 10,
  },
  replyPreviewLabel: { fontSize: 11, fontWeight: "700", marginBottom: 2 },
  replyPreviewText: { fontSize: 12 },

  // Upload indicator
  uploadingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    paddingHorizontal: 16,
  },
  uploadingText: { fontSize: 13, fontWeight: "600" },

  // Media buttons in compose bar
  mediaButtons: { flexDirection: "row", alignItems: "center", gap: 2 },
  mediaBtn: { padding: 6 },

  // Recording state
  recordingRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#c56451",
  },
  recordingTimer: { fontSize: 16, fontWeight: "700", minWidth: 40 },
  recordingHint: { fontSize: 12, flex: 1 },

  // Selection mode header
  selectionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  selectionCount: { flex: 1, fontSize: 16, fontWeight: "600" },
  selectionActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  selectionBtn: { padding: 8 },
  selectionCheck: { paddingRight: 8, paddingLeft: 4 },

  // Forward modal
  forwardOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  forwardBackdrop: { flex: 1 },
  forwardSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  forwardSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  forwardSheetTitle: { fontSize: 16, fontWeight: "700" },
  forwardContact: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  forwardContactName: { flex: 1, fontSize: 15, fontWeight: "500" },
  forwardSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  forwardSendBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Group management
  gmBtn: { padding: 4 },
  gmScreen: { flex: 1 },
  gmHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  gmHeaderBtn: { padding: 4, minWidth: 40, alignItems: "center" },
  gmTitle: { fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  gmSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  gmSaveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  gmGroupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  gmGroupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  gmGroupName: { fontSize: 15, fontWeight: "600" },
  gmGroupCount: { fontSize: 12, marginTop: 2 },
  gmActionBtn: { padding: 6 },
  gmNameWrap: {
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 14,
  },
  gmNameInput: { fontSize: 16, paddingVertical: 12 },
  gmSectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  gmMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  gmMemberName: { flex: 1, fontSize: 15 },
  gmCreateFirstBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
  },
  gmCreateFirstText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
