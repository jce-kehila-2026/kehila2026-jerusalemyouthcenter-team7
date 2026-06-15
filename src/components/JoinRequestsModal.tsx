import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
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

// ── Colors (match ManageAdminsModal exactly) ──────────────────────────────────
const C = {
  teal: "#039899",
  tealLight: "#e0f5f5",
  red: "#c56451",
  purple: "#6b5ce7",
  dark: "#1a1a2e",
  sub: "#5a6a7a",
  muted: "#9aa8b4",
  border: "#e8eef2",
  bg: "#f5fafe",
  white: "#ffffff",
} as const;

const VOICE_COLORS: Record<string, string> = {
  bass: "#6366f1",
  tenor: C.teal,
  alto: "#f59e0b",
  soprano: "#ec4899",
};

// ── Type ──────────────────────────────────────────────────────────────────────
type JoinRequest = {
  uid: string;
  full_name: string;
  phone: string;
  email?: string | null;
  voice_type?: string | null;
  school_name?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  gender?: string;
  nationality?: string;
  birth_date?: string;
  age?: number;
  shirt_size?: string;
  year_joined?: number;
  food_notes?: string;
  parent_relation?: string;
  parent_name?: string;
  parent_phone?: string;
  medical_situation?: string;
  createdAt?: any;
};

type Props = { visible: boolean; onClose: () => void };

// ── Detail modal ──────────────────────────────────────────────────────────────
function DetailModal({
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
    ["📞 Phone", request.phone],
    ["📧 Email", request.email || "—"],
    ["🎂 Date of Birth", request.birth_date || "—"],
    ["🔢 Age", String(request.age ?? "—")],
    ["⚧ Gender", request.gender || "—"],
    ["🌍 Nationality", request.nationality || "—"],
    ["🏠 Address", request.address || "—"],
    ["🏘 Neighborhood", request.neighborhood || "—"],
    ["🏫 School", request.school_name || "—"],
    ["👕 Shirt Size", request.shirt_size || "—"],
    ["🎵 Voice Type", request.voice_type || "—"],
    ["📅 Year Joined", String(request.year_joined ?? "—")],
    ["🍽 Food Notes", request.food_notes || "—"],
    [
      "👨‍👩‍👧 Parent",
      `${request.parent_relation ?? ""} — ${request.parent_name ?? ""}`,
    ],
    ["📱 Parent Phone", request.parent_phone || "—"],
    ["🏥 Medical", request.medical_situation || "—"],
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: C.white }}
        edges={["top"]}
      >
        <View style={dm.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={dm.headerTitle} numberOfLines={1}>
            {request.full_name}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={dm.body}
          showsVerticalScrollIndicator={false}
        >
          {rows.map(([label, value]) => (
            <View key={label} style={dm.row}>
              <Text style={dm.rowLabel}>{label}</Text>
              <Text style={dm.rowValue}>{value}</Text>
            </View>
          ))}

          <View style={dm.actions}>
            <Pressable
              style={dm.rejectBtn}
              onPress={() => onReject(request)}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color={C.red} />
              ) : (
                <>
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color={C.red}
                  />
                  <Text style={dm.rejectTxt}>Reject</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={dm.approveBtn}
              onPress={() => onApprove(request)}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#fff"
                  />
                  <Text style={dm.approveTxt}>Approve</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const dm = StyleSheet.create({
  header: {
    backgroundColor: C.teal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  body: { padding: 20, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  rowLabel: { fontSize: 13, flex: 1, color: C.sub },
  rowValue: {
    fontSize: 13,
    fontWeight: "600",
    flex: 2,
    textAlign: "right",
    color: C.dark,
  },
  actions: { flexDirection: "row", gap: 12, marginTop: 28 },
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
  rejectTxt: { color: C.red, fontSize: 15, fontWeight: "700" },
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

// ── Main component ────────────────────────────────────────────────────────────
export function JoinRequestsModal({ visible, onClose }: Props) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<JoinRequest | null>(null);

  // ── Live subscription: users with role "join-request" ─────────────────────
  useEffect(() => {
    if (!visible) return;
    setListLoading(true);

    const q = query(
      collection(db, "users"),
      where("role", "==", "join-request"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: JoinRequest[] = snap.docs.map((d) => ({
          uid: d.id,
          ...(d.data() as Omit<JoinRequest, "uid">),
        }));
        // Sort newest first client-side to avoid composite index requirement
        data.sort((a, b) => {
          const ta = a.createdAt?.seconds ?? 0;
          const tb = b.createdAt?.seconds ?? 0;
          return tb - ta;
        });
        setRequests(data);
        setListLoading(false);
      },
      (err) => {
        console.error("JoinRequestsModal subscription error:", err.message);
        setListLoading(false);
      },
    );
    return unsub;
  }, [visible]);

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  // ── Approve ───────────────────────────────────────────────────────────────
  const handleApprove = (req: JoinRequest) => {
    Alert.alert(
      "Approve Singer",
      `Approve ${req.full_name}? They will be able to log in immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            setProcessingId(req.uid);
            setSelected(null);
            try {
              await updateDoc(doc(db, "users", req.uid), {
                role: "singer",
                status: "approved",
                year_id: 1,
              });
            } catch (e: any) {
              console.error("Approve error:", e.message);
              Alert.alert("Error", e.message || "Could not approve request.");
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  // ── Reject ────────────────────────────────────────────────────────────────
  const handleReject = (req: JoinRequest) => {
    Alert.alert(
      "Reject Request",
      `Reject ${req.full_name}? They will not be able to log in and cannot re-register.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setProcessingId(req.uid);
            try {
              const phoneDigits = req.phone?.replace(/\D/g, "") ?? "";

              if (phoneDigits) {
                await setDoc(doc(db, "rejection", phoneDigits), {
                  uid: req.uid,
                  full_name: req.full_name,
                  phone: req.phone,
                  rejectedAt: serverTimestamp(),
                });
              }

              await updateDoc(doc(db, "users", req.uid), {
                role: "rejected",
                status: "rejected",
              });

              setSelected(null);
            } catch (e: any) {
              console.error("Reject error:", e.message);
              Alert.alert("Error", e.message || "Could not reject request.");
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  // ── Card (matches ManageAdminsModal adminCard) ────────────────────────────
  const renderCard = ({ item }: { item: JoinRequest }) => {
    const voiceColor =
      VOICE_COLORS[(item.voice_type ?? "").toLowerCase()] ?? C.teal;
    const initial = item.full_name?.charAt(0).toUpperCase() ?? "?";
    const isProcessing = processingId === item.uid;

    return (
      <Pressable onPress={() => setSelected(item)} style={s.adminCard}>
        {/* Avatar circle */}
        <View style={[s.adminAvatar, { backgroundColor: voiceColor + "22" }]}>
          <Text style={[s.adminInitial, { color: voiceColor }]}>{initial}</Text>
        </View>

        <View style={{ flex: 1 }}>
          {/* Name + voice badge row */}
          <View style={s.nameRow}>
            <Text style={s.adminName} numberOfLines={1}>
              {item.full_name}
            </Text>
            {item.voice_type ? (
              <View
                style={[s.voiceBadge, { backgroundColor: voiceColor + "22" }]}
              >
                <Text style={[s.voiceText, { color: voiceColor }]}>
                  {item.voice_type.charAt(0).toUpperCase() +
                    item.voice_type.slice(1)}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={s.adminMeta}>📞 {item.phone}</Text>
          {item.school_name ? (
            <Text style={s.adminMeta}>🏫 {item.school_name}</Text>
          ) : null}
          {item.neighborhood ? (
            <Text style={s.adminMeta}>🏘 {item.neighborhood}</Text>
          ) : null}

          {/* Action buttons */}
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
                  <Ionicons
                    name="close-circle-outline"
                    size={15}
                    color={C.red}
                  />
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
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={15}
                    color="#fff"
                  />
                  <Text style={s.approveTxt}>Approve</Text>
                </>
              )}
            </Pressable>
          </View>

          <Text style={s.tapHint}>Tap card to view full details →</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: C.white }}
        edges={["top"]}
      >
        {/* Header — identical to ManageAdminsModal */}
        <View style={s.header}>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <Text style={s.headerTitle}>Join Requests</Text>
          <View style={{ width: 60 }} />
        </View>

        {listLoading ? (
          <ActivityIndicator
            color={C.teal}
            size="large"
            style={{ marginTop: 48 }}
          />
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.uid}
            renderItem={renderCard}
            style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={s.emptyBox}>
                <Ionicons name="people-outline" size={52} color={C.muted} />
                <Text style={s.emptyText}>No pending requests</Text>
                <Text style={s.emptySubtext}>All caught up! 🎉</Text>
              </View>
            }
          />
        )}

        {/* Full-detail modal */}
        <DetailModal
          request={selected}
          visible={!!selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          processing={processingId === selected?.uid}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ── Styles (match ManageAdminsModal) ──────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    backgroundColor: C.teal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },

  emptyBox: { alignItems: "center", paddingTop: 64, gap: 12 },
  emptyText: { color: C.muted, fontSize: 15, fontWeight: "600" },
  emptySubtext: { color: C.muted, fontSize: 13 },

  // Admin card (identical to ManageAdminsModal)
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
  adminName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.dark,
    marginBottom: 2,
    flex: 1,
  },
  adminMeta: { fontSize: 12, color: C.sub, marginTop: 2 },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
    flexWrap: "wrap",
  },
  voiceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  voiceText: { fontSize: 11, fontWeight: "700" },

  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
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
  rejectTxt: { color: C.red, fontSize: 13, fontWeight: "600" },
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
  tapHint: { fontSize: 11, color: C.muted, marginTop: 6, textAlign: "right" },
});
