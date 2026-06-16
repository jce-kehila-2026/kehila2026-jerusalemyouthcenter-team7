import { useAuth } from "@/src/context/AuthContext";
import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import {
    addDoc,
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Colors (match ManageAdminsModal) ──────────────────────────────────────────
const C = {
  teal:      "#039899",
  tealLight: "#e0f5f5",
  red:       "#c56451",
  purple:    "#6b5ce7",
  dark:      "#1a1a2e",
  sub:       "#5a6a7a",
  muted:     "#9aa8b4",
  border:    "#e8eef2",
  bg:        "#f5fafe",
  white:     "#ffffff",
} as const;

const VOICE_COLORS: Record<string, string> = {
  bass:    "#6366f1",
  tenor:   C.teal,
  alto:    "#f59e0b",
  soprano: "#ec4899",
};

// ── Types ──────────────────────────────────────────────────────────────────────
export type JoinRequest = {
  id: string;
  target_uid: string;
  full_name: string;
  phone: string;
  email?: string | null;
  birth_date: string;
  age: number;
  gender: "male" | "female";
  nationality: string;
  address: string;
  neighborhood: string;
  school_name: string;
  shirt_size: string;
  voice_type: string;
  year_joined: number;
  food_notes: string;
  parent_relation: string;
  parent_name: string;
  parent_phone: string;
  medical_situation: string;
  _tempPassword: string;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
};

const phoneToEmail = (phone: string) =>
  `${phone.replace(/\D/g, "")}@kehila.app`;

// ── Detail Modal ───────────────────────────────────────────────────────────────
function RequestDetailModal({
  request,
  visible,
  onClose,
  onApprove,
  onReject,
  processing,
}: {
  request: JoinRequest | null;
  visible: boolean;
  onClose: () => void;
  onApprove: (r: JoinRequest) => void;
  onReject: (r: JoinRequest) => void;
  processing: boolean;
}) {
  if (!request) return null;

  const rows: [string, string][] = [
    ["📞 Phone",       request.phone],
    ["📧 Email",       request.email || "—"],
    ["🎂 Date of Birth", request.birth_date],
    ["🔢 Age",         String(request.age)],
    ["⚧ Gender",       request.gender],
    ["🌍 Nationality", request.nationality],
    ["🏠 Address",     request.address],
    ["🏘 Neighborhood", request.neighborhood],
    ["🏫 School",      request.school_name],
    ["👕 Shirt Size",  request.shirt_size],
    ["🎵 Voice Type",  request.voice_type],
    ["📅 Year Joined", String(request.year_joined)],
    ["🍽 Food Notes",  request.food_notes || "—"],
    ["👨‍👩‍👧 Parent",    `${request.parent_relation} — ${request.parent_name}`],
    ["📱 Parent Phone", request.parent_phone],
    ["🏥 Medical",     request.medical_situation || "—"],
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.white }} edges={["top"]}>
        {/* Header */}
        <View style={md.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={md.headerTitle} numberOfLines={1}>
            {request.full_name}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={md.body}
          showsVerticalScrollIndicator={false}
        >
          {rows.map(([label, value]) => (
            <View key={label} style={md.row}>
              <Text style={md.rowLabel}>{label}</Text>
              <Text style={md.rowValue}>{value}</Text>
            </View>
          ))}

          {request.status === "pending" && (
            <View style={md.actions}>
              <Pressable
                style={md.rejectBtn}
                onPress={() => onReject(request)}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={C.red} />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color={C.red} />
                    <Text style={md.rejectTxt}>Reject</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={md.approveBtn}
                onPress={() => onApprove(request)}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={md.approveTxt}>Approve</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const md = StyleSheet.create({
  header: {
    backgroundColor: C.teal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center" },
  body: { padding: 20, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  rowLabel: { fontSize: 13, flex: 1, color: C.sub },
  rowValue: { fontSize: 13, fontWeight: "600", flex: 2, textAlign: "right", color: C.dark },
  actions:   { flexDirection: "row", gap: 12, marginTop: 28 },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.red,
  },
  rejectTxt:  { color: C.red, fontSize: 15, fontWeight: "700" },
  approveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: C.teal,
  },
  approveTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function JoinRequestsScreen() {
  const { user } = useAuth();

  const [requests,    setRequests]    = useState<JoinRequest[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter,      setFilter]      = useState<"pending" | "approved">("pending");
  const [selected,    setSelected]    = useState<JoinRequest | null>(null);

  // Real-time subscription to join_requests
  useEffect(() => {
    const q = query(
      collection(db, "join_requests"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<JoinRequest, "id">) }))
        .filter((r) => r.status !== "rejected");
      setRequests(data as JoinRequest[]);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = requests.filter((r) => r.status === filter);
  const pendingCount  = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async (req: JoinRequest) => {
    Alert.alert(
      "Approve Singer",
      `Create an account for ${req.full_name} and notify them?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            setProcessingId(req.id);
            setSelected(null);
            try {
              const firebaseAuth = getAuth();
              const credential = await createUserWithEmailAndPassword(
                firebaseAuth,
                phoneToEmail(req.phone),
                req._tempPassword,
              );
              const uid = credential.user.uid;

              await setDoc(doc(db, "users", uid), {
                uid,
                role:              "singer",
                full_name:         req.full_name,
                email:             req.email || null,
                phone:             req.phone,
                birth_date:        req.birth_date,
                age:               req.age,
                gender:            req.gender,
                nationality:       req.nationality,
                address:           req.address,
                neighborhood:      req.neighborhood,
                school_name:       req.school_name,
                shirt_size:        req.shirt_size,
                voice_type:        req.voice_type,
                year_joined:       req.year_joined,
                food_notes:        req.food_notes,
                parent_relation:   req.parent_relation,
                parent_name:       req.parent_name,
                parent_phone:      req.parent_phone,
                medical_situation: req.medical_situation,
                year_id:           1,
                group_id:          null,
                createdAt:         serverTimestamp(),
              });

              // Fix: use req.id (the actual Firestore document ID)
              await updateDoc(doc(db, "join_requests", req.id), {
                status: "approved",
              });

              await addDoc(collection(db, "notifications"), {
                title:      "🎉 Welcome to Jerusalem Youth Chorus!",
                body:       "Your request to join has been approved. You can now log in with your phone number.",
                type:       "general",
                is_read:    false,
                target_uid: uid,
                timestamp:  new Date().toISOString(),
              });

              Alert.alert("✅ Approved", `${req.full_name}'s account has been created.`);
            } catch (e: any) {
              console.error("Approve error:", e);
              Alert.alert("Error", e.message || "Could not approve request.");
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  // ── Reject ─────────────────────────────────────────────────────────────────
  const handleReject = async (req: JoinRequest) => {
    Alert.alert(
      "Reject Request",
      `Reject ${req.full_name}'s request? They will not be able to log in.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setProcessingId(req.id);
            setSelected(null);
            try {
              // Fix: use req.id (the actual Firestore document ID), not req.target_uid
              await updateDoc(doc(db, "join_requests", req.id), {
                status: "rejected",
              });
            } catch (e: any) {
              console.error("Reject error:", e);
              Alert.alert("Error", e.message || "Could not reject request.");
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  // ── Card ───────────────────────────────────────────────────────────────────
  const renderCard = ({ item }: { item: JoinRequest }) => {
    const isProcessing = processingId === item.id;
    const voiceColor =
      VOICE_COLORS[item.voice_type?.toLowerCase()] ?? C.teal;
    const initial = item.full_name?.charAt(0).toUpperCase() ?? "?";

    return (
      <Pressable
        onPress={() => setSelected(item)}
        style={s.adminCard}
      >
        {/* Avatar circle */}
        <View style={[s.adminAvatar, { backgroundColor: voiceColor + "22" }]}>
          <Text style={[s.adminInitial, { color: voiceColor }]}>{initial}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={s.nameRow}>
            <Text style={s.adminName} numberOfLines={1}>{item.full_name}</Text>
            {/* Voice type badge */}
            <View style={[s.voiceBadge, { backgroundColor: voiceColor + "22" }]}>
              <Text style={[s.voiceText, { color: voiceColor }]}>
                {item.voice_type
                  ? item.voice_type.charAt(0).toUpperCase() + item.voice_type.slice(1)
                  : "—"}
              </Text>
            </View>
          </View>
          <Text style={s.adminMeta}>📞 {item.phone}</Text>
          <Text style={s.adminMeta}>🏫 {item.school_name}</Text>
          <Text style={s.adminMeta}>🏘 {item.neighborhood}</Text>

          {item.status === "pending" && (
            <View style={s.actions}>
              <Pressable
                style={s.rejectBtn}
                onPress={() => handleReject(item)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={C.red} />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={15} color={C.red} />
                    <Text style={s.rejectTxt}>Reject</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={s.approveBtn}
                onPress={() => handleApprove(item)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                    <Text style={s.approveTxt}>Approve</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {item.status === "approved" && (
            <View style={s.statusRow}>
              <Ionicons name="checkmark-circle" size={15} color="#22c55e" />
              <Text style={[s.statusTxt, { color: "#22c55e" }]}>Approved</Text>
            </View>
          )}

          <Text style={s.tapHint}>Tap to view full details →</Text>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["top"]}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Join Requests</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.teal} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["top"]}>
      {/* Teal header (matches ManageAdminsModal) */}
      <View style={s.header}>
        <View style={{ width: 32 }} />
        <Text style={s.headerTitle}>Join Requests</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Filter pills */}
      <View style={s.filterRow}>
        {(["pending", "approved"] as const).map((f) => {
          const count = f === "pending" ? pendingCount : approvedCount;
          const active = filter === f;
          return (
            <Pressable
              key={f}
              style={[s.filterPill, active && s.filterPillActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterTxt, active && s.filterTxtActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {count > 0 ? ` (${count})` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Ionicons name="people-outline" size={52} color={C.muted} />
            <Text style={s.emptyText}>No {filter} requests</Text>
          </View>
        }
      />

      {/* Detail modal */}
      <RequestDetailModal
        request={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        processing={processingId === selected?.id}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header (matches ManageAdminsModal)
  header: {
    backgroundColor: C.teal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center" },

  // Filter pills
  filterRow: {
    flexDirection: "row",
    margin: 16,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#fff",
    padding: 4,
    gap: 4,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: "center",
  },
  filterPillActive: { backgroundColor: C.teal },
  filterTxt:       { fontSize: 13, fontWeight: "600", color: C.muted },
  filterTxtActive: { color: "#fff" },

  // Admin card (matches ManageAdminsModal adminCard)
  adminCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f9fbfd",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  adminAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  adminInitial: { fontSize: 20, fontWeight: "700" },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
    flexWrap: "wrap",
  },
  adminName:  { fontSize: 15, fontWeight: "700", color: C.dark, flex: 1 },
  voiceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  voiceText:  { fontSize: 11, fontWeight: "700" },
  adminMeta:  { fontSize: 12, color: C.sub, marginTop: 2 },

  // Actions
  actions:    { flexDirection: "row", gap: 8, marginTop: 10 },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: C.red,
  },
  rejectTxt:  { color: C.red, fontSize: 13, fontWeight: "600" },
  approveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: C.teal,
  },
  approveTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },

  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  statusTxt: { fontSize: 13, fontWeight: "600" },
  tapHint:   { fontSize: 11, color: C.muted, marginTop: 6, textAlign: "right" },

  // Empty
  emptyBox:  { alignItems: "center", paddingTop: 64, gap: 12 },
  emptyText: { color: C.muted, fontSize: 15 },
});
