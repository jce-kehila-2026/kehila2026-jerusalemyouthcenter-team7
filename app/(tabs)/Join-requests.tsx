import { AppColors, Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/src/context/AuthContext";
import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
} from "react-native";
import { notificationService } from "@/src/data/notificationService";

// ── Types ──────────────────────────────────────────────────────────────────────
export type JoinRequest = {
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
function RequestDetail({
  request,
  visible,
  onClose,
}: {
  request: JoinRequest | null;
  visible: boolean;
  onClose: () => void;
}) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  if (!request) return null;

  const rows = [
    ["📞 Phone", request.phone],
    ["📧 Email", request.email || "—"],
    ["🎂 Date of Birth", request.birth_date],
    ["🔢 Age", String(request.age)],
    ["⚧ Gender", request.gender],
    ["🌍 Nationality", request.nationality],
    ["🏠 Address", request.address],
    ["🏘 Neighborhood", request.neighborhood],
    ["🏫 School", request.school_name],
    ["👕 Shirt Size", request.shirt_size],
    ["🎵 Voice Type", request.voice_type],
    ["📅 Year Joined", String(request.year_joined)],
    ["🍽 Food Notes", request.food_notes || "—"],
    ["👨‍👩‍👧 Parent", `${request.parent_relation} — ${request.parent_name}`],
    ["📱 Parent Phone", request.parent_phone],
    ["🏥 Medical", request.medical_situation || "—"],
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[m.container, { backgroundColor: theme.background }]}>
        <View style={m.header}>
          <Text style={[m.title, { color: theme.text }]}>{request.full_name}</Text>
          <Pressable onPress={onClose} style={m.closeBtn}>
            <Ionicons name="close" size={22} color={theme.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={m.body}>
          {rows.map(([label, value]) => (
            <View key={label} style={[m.row, { borderBottomColor: theme.border }]}>
              <Text style={[m.rowLabel, { color: theme.subtext }]}>{label}</Text>
              <Text style={[m.rowValue, { color: theme.text }]}>{value}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const m = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: { fontSize: 20, fontWeight: "800" },
  closeBtn: { padding: 4 },
  body: { padding: 20, gap: 2 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rowLabel: { fontSize: 13, flex: 1 },
  rowValue: { fontSize: 13, fontWeight: "600", flex: 2, textAlign: "right" },
});

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function JoinRequestsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { user } = useAuth();

  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved">("pending");
  const [selected, setSelected] = useState<JoinRequest | null>(null);

  // Real-time subscription to join_requests
  useEffect(() => {
    const q = query(collection(db, "join_requests"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<JoinRequest, "id">)}))
          .filter((r) => r.status !== "rejected");
      setRequests(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = requests.filter((r) => r.status === filter);

  const counts = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
  };

  // ── Approve ──────────────────────────────────────────────────────────────────
  const handleApprove = async (req: JoinRequest) => {
    Alert.alert(
      "Approve Singer",
      `Accept ${req.full_name} and create their account?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            
            setProcessingId(req.target_uid);
            try {
              const firebaseAuth = getAuth();
              const credential = await createUserWithEmailAndPassword(
                firebaseAuth,
                phoneToEmail(req.phone),
                req._tempPassword,
              );
              const uid = credential.user.uid;

              // Create singer document
              await setDoc(doc(db, "singers", uid), {
                uid,
                role: "singer",
                full_name: req.full_name,
                email: req.email || null,
                phone: req.phone,
                birth_date: req.birth_date,
                age: req.age,
                gender: req.gender,
                nationality: req.nationality,
                address: req.address,
                neighborhood: req.neighborhood,
                school_name: req.school_name,
                shirt_size: req.shirt_size,
                voice_type: req.voice_type,
                year_joined: req.year_joined,
                food_notes: req.food_notes,
                parent_relation: req.parent_relation,
                parent_name: req.parent_name,
                parent_phone: req.parent_phone,
                medical_situation: req.medical_situation,
                year_id: 1,
                group_id: null,
                createdAt: serverTimestamp(),
              });

              // Update request status
              await updateDoc(doc(db, "join_requests", req.target_uid), {
                status: "approved",
              });

              // Send notification to all admins
              await notificationService.create({
                title: "Singer Approved ✅",
                body: `${req.full_name} has been approved and can now log in.`,
                type: "general",
                target_uid: req.target_uid, // send to the new singer
                is_read: false,
                timestamp: serverTimestamp() as any,
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

  // ── Reject ───────────────────────────────────────────────────────────────────
  const handleReject = async (req: JoinRequest) => {
    Alert.alert(
      "Reject Request",
      `Reject ${req.full_name}'s join request?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setProcessingId(req.target_uid);
            try {
              await updateDoc(doc(db, "join_requests", req.target_uid), {
                status: "rejected",
              });
            } catch (e: any) {
              Alert.alert("Error", e.message);
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  // ── Card ─────────────────────────────────────────────────────────────────────
  const renderCard = ({ item }: { item: JoinRequest }) => {
    const isProcessing = processingId === item.target_uid;
    const voiceColors: Record<string, string> = {
      bass: "#6366f1",
      tenor: AppColors.primary,
      alto: "#f59e0b",
      soprano: "#ec4899",
    };
    const voiceColor = voiceColors[item.voice_type?.toLowerCase()] ?? AppColors.primary;

    return (
      <Pressable
        onPress={() => setSelected(item)}
        style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <View style={[s.cardAccent, { backgroundColor: voiceColor }]} />
        <View style={s.cardBody}>
          <View style={s.cardTop}>
            <Text style={[s.name, { color: theme.text }]}>{item.full_name}</Text>
            <View style={[s.voiceBadge, { backgroundColor: voiceColor + "22" }]}>
              <Text style={[s.voiceText, { color: voiceColor }]}>
                {item.voice_type ? item.voice_type.charAt(0).toUpperCase() + item.voice_type.slice(1) : "—"}
              </Text>
            </View>
          </View>

          <Text style={[s.detail, { color: theme.subtext }]}>📞 {item.phone}</Text>
          <Text style={[s.detail, { color: theme.subtext }]}>🏫 {item.school_name}</Text>
          <Text style={[s.detail, { color: theme.subtext }]}>🏘 {item.neighborhood}</Text>

          {item.status === "pending" && (
            <View style={s.actions}>
              <Pressable
                style={[s.rejectBtn, { borderColor: theme.border }]}
                onPress={() => handleReject(item)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                    <Text style={s.rejectTxt}>Reject</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={[s.approveBtn, { backgroundColor: AppColors.primary }]}
                onPress={() => handleApprove(item)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                    <Text style={s.approveTxt}>Approve</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {item.status === "approved" && (
            <View style={s.statusRow}>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <Text style={[s.statusTxt, { color: "#22c55e" }]}>Approved</Text>
            </View>
          )}

          {item.status === "rejected" && (
            <View style={s.statusRow}>
              <Ionicons name="close-circle" size={16} color="#ef4444" />
              <Text style={[s.statusTxt, { color: "#ef4444" }]}>Rejected</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.orgName, { color: AppColors.primary }]}>Jerusalem Youth Chorus</Text>
        <Text style={[s.pageTitle, { color: theme.text }]}>Join Requests</Text>
      </View>

      {/* Filter Tabs */}
      <View style={[s.filterRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {(["pending", "approved"] as const).map((f) => (
          <Pressable
            key={f}
            style={[s.filterPill, filter === f && { backgroundColor: AppColors.primary }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterTxt, filter === f && { color: "#fff" }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {counts[f] > 0 ? ` (${counts[f]})` : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.target_uid}
        renderItem={renderCard}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color={theme.subtext} />
            <Text style={[s.emptyTxt, { color: theme.subtext }]}>
              No {filter} requests
            </Text>
          </View>
        }
      />

      <RequestDetail
        request={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  orgName: { fontSize: 13, fontWeight: "600" },
  pageTitle: { fontSize: 28, fontWeight: "800", marginTop: 2 },

  filterRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: "center",
  },
  filterTxt: { fontSize: 13, fontWeight: "600", color: "#6b7280" },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  name: { fontSize: 16, fontWeight: "700", flex: 1, marginRight: 8 },
  voiceBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  voiceText: { fontSize: 11, fontWeight: "700" },
  detail: { fontSize: 13, lineHeight: 20 },

  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  rejectTxt: { color: "#ef4444", fontSize: 14, fontWeight: "600" },
  approveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
  },
  approveTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },

  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10 },
  statusTxt: { fontSize: 13, fontWeight: "600" },

  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTxt: { fontSize: 15 },
});