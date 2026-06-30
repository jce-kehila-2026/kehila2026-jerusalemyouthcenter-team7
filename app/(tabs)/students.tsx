import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { useAuth, UserType } from "../../src/context/AuthContext";
import { leaderboardService, LeaderboardEntry } from "../../src/data/leaderboardService";
import { presenceService } from "../../src/data/presenceService";
import { Group, Student } from "../../src/data/mockData";

// ── Design System ─────────────────────────────────────────────────────────────
const ds = {
  teal: "#039899",
  red: "#c56451",
  yellow: "#cfad5d",
  purple: "#6b5ce7",
  white: "#ffffff",
  bg: "#f5fafe",
  text: "#1a1a2e",
  subtext: "#5a6a7a",
  muted: "#9aa8b4",
  border: "#e8eef2",
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────
type StudentWithVoice = Student & {
  voice_type?: UserType["voice_type"];
};

type StudentWithGroup = Omit<StudentWithVoice, "year_id"> & {
  group_name: string;
  voice_type?: UserType["voice_type"];
  year_id: number | null;
};

type JoinRequest = {
  uid: string;
  full_name: string;
  phone: string;
  email: string | null;
  voice_type: string | null;
  school_name: string | null;
  status: string;
};

// Helper inside service mapped locally for snapshot cleanups
const mapToStudent = (id: string, data: any): Student => {
  return {
    ...data,
    id,
    year_id:
      data.year_id !== undefined
        ? Number(data.year_id)
        : data.year !== undefined
          ? Number(data.year)
          : null,
    voice_type: data.voice_type
      ? String(data.voice_type).trim().toLowerCase()
      : null,
    year_joined: data.year_joined || null,
  } as Student;
};

// ── Screen ────────────────────────────────────────────────────────────────────
export default function StudentsListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { action } = useLocalSearchParams<{ action?: string }>();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string | null>(
    null,
  );
  const [selectedVoiceFilter, setSelectedVoiceFilter] = useState<string | null>(
    null,
  );
  const [studentsList, setStudentsList] = useState<StudentWithVoice[]>([]);
  const [groupsList, setGroupsList] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dynamicYearFilters, setDynamicYearFilters] = useState<
    { label: string; value: string | null }[]
  >([{ label: "All", value: null }]);
  const [dynamicVoiceFilters, setDynamicVoiceFilters] = useState<
    { label: string; value: string | null }[]
  >([{ label: "All", value: null }]);

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [presenceMap, setPresenceMap] = useState<
    Record<string, { is_online: boolean; last_seen: string | null }>
  >({});

  // ── Live leaderboard subscription (admin only — for student card rank strips)
  useEffect(() => {
    if (user?.role !== "admin") return;
    const unsub = leaderboardService.subscribe((entries) => {
      setLeaderboardData(entries);
    });
    return unsub;
  }, [user?.role]);

  // ── Live presence subscription — admin only
  useEffect(() => {
    if (user?.role !== "admin") return;
    return presenceService.subscribePresence(setPresenceMap);
  }, [user?.role]);

  // ── Join Requests state ───────────────────────────────────────────────────
  const [joinRequestsVisible, setJoinRequestsVisible] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false);

  // ── Real-time groups listener → dynamic year filter chips ─────────────────
  useEffect(() => {
    const q = query(collection(db, "groups"), orderBy("year_id"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const groups: Group[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Group, "id">),
        }));
        setGroupsList(groups);
        setDynamicYearFilters([
          { label: "All", value: null },
          ...groups.map((g) => ({ label: g.name, value: g.name })),
        ]);
      },
      () => {
        setGroupsList([]);
        setDynamicYearFilters([
          { label: "All", value: null },
          { label: "Year 1", value: "Year 1" },
          { label: "Year 2", value: "Year 2" },
          { label: "Year 3", value: "Year 3" },
        ]);
      },
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "voice_types"), (snap) => {
      const customVoices = snap.docs
        .map((d) => String(d.data().name || "").trim())
        .filter((name) => !["Bass", "Tenor", "Alto", "Soprano"].includes(name))
        .map((name) => ({
          label: name,
          value: name.toLowerCase(),
        }));

      setDynamicVoiceFilters([
        { label: "All", value: null },

        { label: "Bass", value: "bass" },
        { label: "Tenor", value: "tenor" },
        { label: "Alto", value: "alto" },
        { label: "Soprano", value: "soprano" },

        ...customVoices,
      ]);
    });

    return unsub;
  }, []);
  // ── Real-time active active students listener ──────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "singer"),
      orderBy("full_name"),
    );

    const unsubStudents = onSnapshot(
      q,
      (snapshot) => {
        const studentsData = snapshot.docs.map((docSnap) =>
          mapToStudent(docSnap.id, docSnap.data()),
        );
        setStudentsList(studentsData);
        setLoading(false);
      },
      (error) => {
        console.error("Real-time students pipeline issue:", error);
        setLoading(false);
      },
    );

    return unsubStudents;
  }, []);

  // ── Merge student year_ids into filter chips whenever students or groups change ──
  useEffect(() => {
    if (studentsList.length === 0) return;

    const seenYears = new Set<number>();
    studentsList.forEach((s) => {
      if (s.year_id != null) seenYears.add(Number(s.year_id));
    });

    setDynamicYearFilters((prev) => {
      const existingYearNums = new Set(
        prev
          .filter((f) => f.value !== null)
          .map((f) => {
            const m = f.value?.match(/\d+/);
            return m ? parseInt(m[0], 10) : -1;
          }),
      );

      const extras: { label: string; value: string }[] = [];
      seenYears.forEach((y) => {
        if (!existingYearNums.has(y)) {
          extras.push({ label: `Year ${y}`, value: `Year ${y}` });
        }
      });

      if (extras.length === 0) return prev;

      const allChips = [
        prev[0],
        ...[...prev.slice(1), ...extras].sort((a, b) => {
          const na = parseInt((a.value ?? "0").replace(/\D/g, ""), 10);
          const nb = parseInt((b.value ?? "0").replace(/\D/g, ""), 10);
          return na - nb;
        }),
      ];
      return allChips;
    });
  }, [studentsList]);

  // ── Fetch pending join requests ───────────────────────────────────────────
  const fetchJoinRequests = async () => {
    if (user?.role !== "admin") return;
    setJoinRequestsLoading(true);
    try {
      console.log("JOIN_REQUESTS: fetching pending requests...");
      const q = query(
        collection(db, "users"),
        where("role", "==", "join-request"),
      );
      const snap = await getDocs(q);
      const requests: JoinRequest[] = snap.docs.map((d) => ({
        uid: d.id,
        full_name: d.data().full_name || "",
        phone: d.data().phone || "",
        email: d.data().email || null,
        voice_type: d.data().voice_type || null,
        school_name: d.data().school_name || null,
        status: d.data().status || "pending",
      }));
      console.log("JOIN_REQUESTS: found", requests.length, "pending requests");
      setJoinRequests(requests);
    } catch (e: any) {
      console.error("JOIN_REQUESTS fetch error:", e.message);
    } finally {
      setJoinRequestsLoading(false);
    }
  };

  // ── Open Join Requests modal when arriving with ?action=join-requests ────
  useEffect(() => {
    if (action === "join-requests" && user?.role === "admin") {
      fetchJoinRequests();
      setJoinRequestsVisible(true);
      router.setParams({ action: "" });
    }
  }, [action]);

  // ── Approve handler ───────────────────────────────────────────────────────
  const handleApprove = async (request: JoinRequest) => {
    try {
      console.log("APPROVE: approving", request.full_name, request.uid);
      await updateDoc(doc(db, "users", request.uid), {
        role: "singer",
        status: "approved",
        year_id: 1,
      });
      setJoinRequests((prev) => prev.filter((r) => r.uid !== request.uid));
      Alert.alert(
        "Approved",
        `${request.full_name} has been approved and can now log in.`,
      );
    } catch (e: any) {
      console.error("APPROVE ERROR:", e.message);
      Alert.alert("Error", "Could not approve the request. Please try again.");
    }
  };

  // ── Reject handler ────────────────────────────────────────────────────────
  const handleReject = (request: JoinRequest) => {
    const confirmed = window.confirm(
      `Are you sure you want to reject ${request.full_name}'s join request?`,
    );

    if (!confirmed) return;

    (async () => {
      try {
        console.log("REJECT: rejecting", request.full_name, request.uid);
        const phoneDigits = request.phone.replace(/\D/g, "");

        await setDoc(doc(db, "join_requests", phoneDigits), {
          uid: request.uid,
          full_name: request.full_name,
          phone: request.phone,
          email: request.email,
          status: "rejected",
          rejectedAt: serverTimestamp(),
        });

        await updateDoc(doc(db, "users", request.uid), {
          role: "rejected",
          status: "rejected",
        });

        setJoinRequests((prev) => prev.filter((r) => r.uid !== request.uid));
      } catch (e: any) {
        console.error("REJECT ERROR:", e.message);
        window.alert("Could not reject the request. Please try again.");
      }
    })();
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    const enriched = studentsList.map((student) => {
      const group = groupsList.find(
        (g) => g.id === student.group_id || g.name === student.group_id,
      );
      const yearId =
        group?.year_id !== undefined
          ? Number(group.year_id)
          : student.year_id !== undefined
            ? Number(student.year_id)
            : null;

      return {
        ...student,
        group_name: yearId ? `Year ${yearId}` : student.group_id || "N/A",
        year_id: yearId,
        voice_type: student.voice_type,
      };
    });

    let result = enriched;

    if (user?.role === "singer") {
      const myGroup = groupsList.find((g) => g.id === user.group_id);
      const myYear = myGroup ? Number(myGroup.year_id) : null;
      const myVoice = user.voice_type
        ? String(user.voice_type).trim().toLowerCase()
        : null;

      if (myYear === null || !myVoice) return [];

      result = result.filter((s) => {
        const otherYear = s.year_id != null ? Number(s.year_id) : null;
        const otherVoice = s.voice_type
          ? String(s.voice_type).trim().toLowerCase()
          : null;
        return otherYear === myYear && otherVoice === myVoice;
      });
    } else {
      if (selectedYearFilter) {
        const yearNum = parseInt(selectedYearFilter.replace("Year ", ""), 10);
        if (!isNaN(yearNum))
          result = result.filter((s) => Number(s.year_id) === yearNum);
      }
      if (selectedVoiceFilter) {
        result = result.filter(
          (s) =>
            s.voice_type?.toLowerCase() === selectedVoiceFilter.toLowerCase(),
        );
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.full_name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q),
      );
    }

    return result;
  }, [
    searchQuery,
    selectedYearFilter,
    selectedVoiceFilter,
    studentsList,
    groupsList,
    user,
  ]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getGroupColor = (groupName: string): string => {
    switch (groupName) {
      case "Year 1":
        return ds.yellow;
      case "Year 2":
        return ds.red;
      case "Year 3":
        return ds.purple;
      default:
        return ds.teal;
    }
  };

  // ── Presence helper ───────────────────────────────────────────────────────
  const formatPresence = (uid: string): { label: string; isOnline: boolean } => {
    const entry = presenceMap[uid];
    if (!entry) return { label: "Never seen", isOnline: false };
    if (entry.is_online) return { label: "Online now", isOnline: true };
    if (!entry.last_seen) return { label: "Never seen", isOnline: false };
    const diff = Math.floor((Date.now() - new Date(entry.last_seen).getTime()) / 1000);
    if (diff < 60) return { label: "Just now", isOnline: false };
    if (diff < 3600) return { label: `${Math.floor(diff / 60)}m ago`, isOnline: false };
    if (diff < 86400) return { label: `${Math.floor(diff / 3600)}h ago`, isOnline: false };
    if (diff < 604800) return { label: `${Math.floor(diff / 86400)}d ago`, isOnline: false };
    return {
      label: new Date(entry.last_seen).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
      isOnline: false,
    };
  };

  // ── Card render ───────────────────────────────────────────────────────────
  const renderStudent = ({ item }: { item: StudentWithGroup }) => {
    const groupColor = getGroupColor(item.group_name);
    const initials = item.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
    const voiceLabel = item.voice_type
      ? item.voice_type.charAt(0).toUpperCase() + item.voice_type.slice(1)
      : "N/A";

    const lbEntry = leaderboardData.find((e) => e.uid === item.id);
    const lbRank = lbEntry
      ? leaderboardData.findIndex((e) => e.uid === item.id) + 1
      : null;
    const lbPoints = lbEntry?.points ?? 0;
    const rankEmoji = lbRank === 1 ? "🥇" : lbRank === 2 ? "🥈" : lbRank === 3 ? "🥉" : null;
    const presence = user?.role === "admin" ? formatPresence(item.id) : null;

    return (
      <Pressable
        onPress={() => router.push(`/student/${item.id}`)}
        style={({ pressed }) => [
          s.card,
          Platform.OS === "ios" && pressed && { opacity: 0.85 },
        ]}
        android_ripple={{ color: ds.teal + "20" }}
      >
        <View style={[s.cardTopBar, { backgroundColor: groupColor }]} />
        <View style={s.cardBody}>
          <View style={s.cardInnerRow}>
            <View style={s.badgesRow}>
              <View style={[s.badge, { backgroundColor: groupColor + "22" }]}>
                <Text style={[s.badgeText, { color: groupColor }]}>
                  {item.group_name}
                </Text>
              </View>
              <View style={[s.badge, { backgroundColor: ds.border }]}>
                <Text style={[s.badgeText, { color: ds.subtext }]}>
                  {voiceLabel}
                </Text>
              </View>
            </View>
            <View style={s.nameRow}>
              <View
                style={[
                  s.avatar,
                  {
                    backgroundColor: ds.bg,
                    borderColor: ds.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text style={[s.avatarText, { color: ds.text }]}>{initials}</Text>
              </View>
              <Text style={s.cardTitle} numberOfLines={1}>
                {item.full_name}
              </Text>
            </View>
            <View style={s.actionsRow}>
              {presence && (
                <View style={s.presenceInline}>
                  <View
                    style={[
                      s.presenceDot,
                      { backgroundColor: presence.isOnline ? "#22c55e" : ds.border },
                    ]}
                  />
                  <Text
                    style={[
                      s.presenceText,
                      { color: presence.isOnline ? "#22c55e" : ds.muted },
                    ]}
                  >
                    {presence.label}
                  </Text>
                </View>
              )}
              <Pressable
                hitSlop={8}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/messages",
                    params: { studentId: item.id, studentName: item.full_name },
                  } as any)
                }
              >
                <Ionicons name="chatbubbles-outline" size={24} color={ds.teal} />
              </Pressable>
            </View>
          </View>
          {lbEntry && (
            <View style={[s.lbStrip, { borderTopColor: ds.border }]}>
              <View style={s.lbStripLeft}>
                <Text style={s.lbRankText}>{rankEmoji ?? `#${lbRank}`}</Text>
                <Text style={s.lbRankLabel}>
                  {lbRank === 1
                    ? "Top Singer"
                    : lbRank && lbRank <= 3
                      ? "Top 3"
                      : `Rank #${lbRank}`}
                </Text>
              </View>
              <View style={s.lbPointsBadge}>
                <Text style={s.lbPointsValue}>{lbPoints}</Text>
                <Text style={s.lbPointsLabel}>pts</Text>
              </View>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={[]}>
      <View style={s.content}>
        {/* Search */}
        <View style={s.searchSection}>
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={18} color={ds.subtext} />
            <TextInput
              style={s.searchInput}
              placeholder="Search by name or email..."
              placeholderTextColor={ds.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {/* Filters */}
        {user?.role === "admin" && (
          <View style={s.filterSection}>
            <Text style={s.filterLabel}>Year</Text>
            <View style={s.filterRow}>
              {dynamicYearFilters.map((f) => (
                <Pressable
                  key={f.label}
                  onPress={() => setSelectedYearFilter(f.value)}
                  style={[
                    s.filterChip,
                    selectedYearFilter === f.value && s.filterChipActive,
                  ]}
                >
                  <View
                    style={[
                      s.filterDot,
                      {
                        backgroundColor: getGroupColor(
                          f.label === "All" ? "All Groups" : f.label,
                        ),
                      },
                    ]}
                  />
                  <Text
                    style={[
                      s.filterChipText,
                      selectedYearFilter === f.value && s.filterChipTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[s.filterLabel, { marginTop: 8 }]}>Voice Section</Text>
            <View style={s.filterRow}>
              {dynamicVoiceFilters.map((f) => (
                <Pressable
                  key={f.label}
                  onPress={() => setSelectedVoiceFilter(f.value)}
                  style={[
                    s.filterChip,
                    selectedVoiceFilter === f.value && s.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      s.filterChipText,
                      selectedVoiceFilter === f.value && s.filterChipTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Top Singers Summary — admin only */}
        {user?.role === "admin" && leaderboardData.length > 0 && (
          <View style={s.lbSummaryRow}>
            <Text style={s.lbSummaryTitle}>🏆 Top Singers</Text>
            <View style={s.lbSummaryChips}>
              {leaderboardData.slice(0, 3).map((entry, i) => {
                const podium = ["🥇", "🥈", "🥉"];
                return (
                  <View key={entry.uid} style={s.lbSummaryChip}>
                    <Text style={s.lbSummaryEmoji}>{podium[i]}</Text>
                    <Text style={s.lbSummaryName} numberOfLines={1}>
                      {entry.name?.split(" ")[0] ?? "?"}
                    </Text>
                    <Text style={s.lbSummaryPts}>{entry.points}pt</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* List Content */}
        {loading ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>Loading...</Text>
          </View>
        ) : filteredStudents.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color={ds.border} />
            <Text style={s.emptyText}>
              {searchQuery
                ? "No students match your search"
                : "No students found"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredStudents}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderStudent}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* FAB */}
      {user?.role === "admin" && (
        <Pressable
          style={s.fab}
          onPress={() => {
            fetchJoinRequests();
            setJoinRequestsVisible(true);
          }}
        >
          <Ionicons name="people" size={22} color="#fff" />
        </Pressable>
      )}

      {/* Modal */}
      <Modal
        visible={joinRequestsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setJoinRequestsVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalTitleRow}>
              <Text style={s.modalTitle}>Join Requests</Text>
              <Pressable
                onPress={fetchJoinRequests}
                hitSlop={12}
                disabled={joinRequestsLoading}
              >
                <Ionicons
                  name="refresh-outline"
                  size={22}
                  color={joinRequestsLoading ? ds.muted : ds.teal}
                />
              </Pressable>
            </View>

            {joinRequestsLoading ? (
              <ActivityIndicator
                color={ds.teal}
                size="large"
                style={{ marginVertical: 32 }}
              />
            ) : joinRequests.length === 0 ? (
              <View style={s.emptyRequests}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={48}
                  color={ds.muted}
                />
                <Text style={s.emptyRequestsText}>
                  No pending join requests
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 420 }}
              >
                {joinRequests.map((req) => (
                  <View key={req.uid} style={s.requestCard}>
                    <Text style={s.requestName}>{req.full_name}</Text>
                    <Text style={s.requestDetail}>📞 {req.phone}</Text>
                    {req.email && (
                      <Text style={s.requestDetail}>✉️ {req.email}</Text>
                    )}
                    {req.voice_type && (
                      <Text style={s.requestDetail}>
                        🎵{" "}
                        {req.voice_type.charAt(0).toUpperCase() +
                          req.voice_type.slice(1)}
                      </Text>
                    )}
                    {req.school_name && (
                      <Text style={s.requestDetail}>🏫 {req.school_name}</Text>
                    )}
                    <View style={s.requestActions}>
                      <Pressable
                        style={[s.actionBtn, { backgroundColor: ds.teal }]}
                        onPress={() => handleApprove(req)}
                      >
                        <Ionicons name="checkmark" size={15} color="#fff" />
                        <Text style={s.actionBtnText}>Approve</Text>
                      </Pressable>
                      <Pressable
                        style={[s.actionBtn, { backgroundColor: ds.red }]}
                        onPress={() => handleReject(req)}
                      >
                        <Ionicons name="close" size={15} color="#fff" />
                        <Text style={s.actionBtnText}>Reject</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <Pressable
              style={s.closeBtn}
              onPress={() => setJoinRequestsVisible(false)}
            >
              <Text style={s.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ds.bg },
  content: { flex: 1, padding: 12 },
  searchSection: { marginBottom: 12 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ds.white,
    padding: 8,
    borderRadius: 8,
  },
  searchInput: { marginLeft: 8, flex: 1, color: ds.text },
  filterSection: { marginBottom: 12 },
  filterLabel: { color: ds.subtext, fontSize: 12, marginBottom: 6 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: ds.white,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipActive: { backgroundColor: ds.teal },
  filterDot: { width: 8, height: 8, borderRadius: 8, marginRight: 8 },
  filterChipText: { color: ds.text },
  filterChipTextActive: { color: ds.white },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: ds.muted, marginTop: 8 },
  list: { paddingBottom: 120 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ds.teal,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ds.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: ds.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: ds.text },
  emptyRequests: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyRequestsText: { color: ds.muted, fontSize: 14 },
  requestCard: {
    backgroundColor: ds.bg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: ds.border,
  },
  requestName: {
    fontSize: 16,
    fontWeight: "700",
    color: ds.text,
    marginBottom: 6,
  },
  requestDetail: { fontSize: 13, color: ds.subtext, marginTop: 2 },
  requestActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  closeBtn: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: ds.border,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  closeBtnText: { fontSize: 14, fontWeight: "700", color: ds.subtext },
  card: {
    backgroundColor: ds.white,
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardTopBar: { height: 6, width: "100%" },
  cardBody: {
    padding: 12,
    flexDirection: "column",
  },
  cardInnerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgesRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeText: { fontSize: 12 },
  nameRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontWeight: "700" },
  cardTitle: { marginLeft: 12, fontWeight: "600", color: ds.text, flex: 1 },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  presenceInline: {
    alignItems: "center",
    gap: 3,
  },

  // ── Leaderboard strip on student card
  lbStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
    paddingTop: 8,
  },
  lbStripLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  lbRankText: { fontSize: 16 },
  lbRankLabel: { fontSize: 11, fontWeight: "700", color: ds.subtext },
  lbPointsBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    backgroundColor: "#cfad5d18",
    borderWidth: 1.5,
    borderColor: "#cfad5d",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  lbPointsValue: { fontSize: 14, fontWeight: "900", color: "#cfad5d" },
  lbPointsLabel: { fontSize: 9, fontWeight: "700", color: "#cfad5d" },

  // ── Admin leaderboard summary strip
  lbSummaryRow: {
    backgroundColor: "#cfad5d10",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cfad5d30",
    padding: 10,
    marginBottom: 10,
  },
  lbSummaryTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#a0842a",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  lbSummaryChips: { flexDirection: "row", gap: 8 },
  lbSummaryChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: "#cfad5d30",
  },
  lbSummaryEmoji: { fontSize: 14 },
  lbSummaryName: { flex: 1, fontSize: 11, fontWeight: "700", color: ds.text },
  lbSummaryPts: { fontSize: 10, fontWeight: "800", color: "#a0842a" },

  // ── Presence indicator on student card
  presenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  presenceText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
