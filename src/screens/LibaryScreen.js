// src/screens/LibraryScreen.js
import { db, storage } from "@/src/firebase/firebase";
import * as DocumentPicker from "expo-document-picker";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useAuth } from "../context/AuthContext";

const COLORS = {
  teal: "#039899",
  tealLight: "#039899" + "18",
  red: "#c56451",
  redLight: "#c56451" + "18",
  yellow: "#cfad5d",
  yellowLight: "#cfad5d" + "22",
  bg: "#f8f9fa",
  card: "#ffffff",
  border: "#ebebeb",
  text: "#111111",
  muted: "#999999",
};

const BASE_FILTERS = [
  { key: "all", label: "All" },
  { key: "all_groups", label: "All Groups" },
];

const FILE_TYPE_MAP = {
  pdf: { label: "PDF", color: COLORS.red },
  mp3: { label: "MP3", color: COLORS.teal },
  mp4: { label: "MP4", color: "#8b5cf6" },
  wav: { label: "WAV", color: COLORS.teal },
  jpg: { label: "IMG", color: COLORS.yellow },
  jpeg: { label: "IMG", color: COLORS.yellow },
  png: { label: "IMG", color: COLORS.yellow },
  doc: { label: "DOC", color: "#2b7de9" },
  docx: { label: "DOC", color: "#2b7de9" },
  ppt: { label: "PPT", color: COLORS.teal },
  pptx: { label: "PPT", color: COLORS.teal },
  zip: { label: "ZIP", color: COLORS.yellow },
  rar: { label: "RAR", color: COLORS.yellow },
  link: { label: "YouTube", color: "#d8453a" },
};

const getFileType = (item) => {
  if (item.type === "link") return FILE_TYPE_MAP.link;
  const ext = (item.name || "").split(".").pop()?.toLowerCase() ?? "";
  return FILE_TYPE_MAP[ext] || { label: "FILE", color: COLORS.muted };
};

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ── MusicTrace: purely decorative, must never intercept touches ──────────
function MusicTrace() {
  return (
    <View
      style={[s.traceCol]}
      pointerEvents="none" // React Native prop (not CSS)
    >
      <Text style={[s.traceNote, s.traceNoteTop]}>🎵</Text>
      <Text style={[s.traceNote, s.traceNoteMid]}>🎶</Text>
      <Text style={[s.traceNote, s.traceNoteBottom]}>🎵</Text>
    </View>
  );
}

export default function LibraryScreen({ autoUpload = false }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [materials, setMaterials] = useState([]);
  const [dynamicFilters, setDynamicFilters] = useState(BASE_FILTERS);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setProgress] = useState(0);
  const [activeFilter, setFilter] = useState("all");

  const [fileModal, setFileModal] = useState(false);
  const [fileGroup, setFileGroup] = useState("all_groups");
  const [pendingFile, setPendingFile] = useState(null);

  const [linkModal, setLinkModal] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkGroup, setLinkGroup] = useState("all_groups");

  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── Real-time listener for Years/Groups ──────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "groups"), orderBy("year_id"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const fetchedYears = snap.docs.map((d) => {
          const data = d.data();
          return {
            key: `year${data.year_id}`,
            label: data.name || `Year ${data.year_id}`,
          };
        });
        setDynamicFilters([
          { key: "all", label: "All" },
          ...fetchedYears,
          { key: "all_groups", label: "All Groups" },
        ]);
      },
      (err) => {
        console.error("Error watching groups collection:", err);
      },
    );
    return unsub;
  }, []);

  const loadMaterials = async () => {
    try {
      const snap = await getDocs(collection(db, "library"));
      const data = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      data.sort(
        (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
      );
      setMaterials(data);
    } catch (e) {
      console.error("Error loading library:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const studentGroup = user?.current_year_id
    ? `year${user.current_year_id}`
    : null;

  const filtered = isAdmin
    ? activeFilter === "all"
      ? materials
      : activeFilter === "all_groups"
        ? materials.filter((m) => m.group === "all_groups")
        : materials.filter(
            (m) => m.group === activeFilter || m.group === "all_groups",
          )
    : materials.filter(
        (m) => m.group === "all_groups" || m.group === studentGroup,
      );

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      setPendingFile(result.assets[0]);
      setFileGroup("all_groups");
      setFileModal(true);
    } catch (e) {
      console.error("Pick error:", e);
    }
  };

  useEffect(() => {
    if (autoUpload && isAdmin) {
      handlePickFile();
    }
  }, [autoUpload]);

  const handleUploadFile = async () => {
    if (!pendingFile) return;
    setFileModal(false);
    setUploading(true);
    setProgress(0);
    try {
      const response = await fetch(pendingFile.uri);
      const blob = await response.blob();
      const storageRef = ref(
        storage,
        `library/${Date.now()}_${pendingFile.name}`,
      );
      const uploadTask = uploadBytesResumable(storageRef, blob);
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          setProgress(
            Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
          );
        },
        (error) => {
          console.error("Upload error:", error);
          setUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, "library"), {
            name: pendingFile.name,
            size: pendingFile.size ?? 0,
            mimeType: pendingFile.mimeType ?? "",
            uri: downloadURL,
            type: "file",
            group: fileGroup,
            uploadedBy: user?.full_name ?? "Admin",
            createdAt: serverTimestamp(),
          });
          await loadMaterials();
          setUploading(false);
          setProgress(0);
          setPendingFile(null);
        },
      );
    } catch (e) {
      console.error("Upload error:", e);
      setUploading(false);
    }
  };

  const handleAddLink = async () => {
    if (!linkName.trim() || !linkUrl.trim()) return;
    try {
      setUploading(true);
      await addDoc(collection(db, "library"), {
        name: linkName.trim(),
        uri: linkUrl.trim(),
        type: "link",
        group: linkGroup,
        uploadedBy: user?.full_name ?? "Admin",
        createdAt: serverTimestamp(),
      });
      await loadMaterials();
      setLinkModal(false);
      setLinkName("");
      setLinkUrl("");
      setLinkGroup("all_groups");
    } catch (e) {
      console.error("Add link error:", e);
    } finally {
      setUploading(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    try {
      await deleteDoc(doc(db, "library", targetId));
      setMaterials((p) => p.filter((m) => m.id !== targetId));
    } catch (e) {
      console.error("Delete error:", e);
    }
    setDeleteTarget(null);
  };

  const handleOpen = (item) => {
    if (!item.uri) return;
    if (Platform.OS === "web") {
      window.open(item.uri, "_blank");
    } else {
      Linking.openURL(item.uri).catch(() => {});
    }
  };

  // ── Card item ─────────────────────────────────────────────────────────
  // FIX 1: Removed the extra wrapping <View> that was blocking touches.
  // FIX 2: Using TouchableOpacity instead of Pressable for the action
  //         buttons — more reliable on both Android and iOS.
  // FIX 3: Added hitSlop to all tappable elements so small touch targets
  //         register correctly on first tap.
  const renderItem = (item) => {
    const { label, color } = getFileType(item);
    const groupLabel =
      dynamicFilters.find((f) => f.key === item.group)?.label ?? "All Groups";
    const isLink = item.type === "link";

    const metaParts = isLink
      ? [groupLabel, formatDate(item.createdAt)]
      : [groupLabel, formatSize(item.size), formatDate(item.createdAt)];
    const metaText = metaParts.filter(Boolean).join("  ·  ");

    return (
      <View key={item.id} style={s.card}>
        {/* Left colored type block — no touches needed */}
        <View style={[s.typeBlock, { backgroundColor: color }]}>
          <Text style={s.typeBlockText}>{label}</Text>
        </View>

        {/* Card body — sits on top of the decorative trace */}
        <View style={s.cardBody}>
          {isAdmin && (
            // FIX: TouchableOpacity + hitSlop for reliable first-tap
            <TouchableOpacity
              style={s.deleteSmall}
              onPress={() => setDeleteTarget(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Text style={s.deleteSmallText}>✕</Text>
            </TouchableOpacity>
          )}

          <Text
            style={[s.fileName, isAdmin && { paddingRight: 36 }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>
          <Text style={s.fileMeta} numberOfLines={1}>
            {metaText}
          </Text>
          {item.uploadedBy ? (
            <Text style={s.uploadedBy} numberOfLines={1}>
              Uploaded by {item.uploadedBy}
            </Text>
          ) : null}

          {/* FIX: TouchableOpacity for Download/Play — reliable on first tap */}
          <TouchableOpacity
            style={[
              s.actionPill,
              { backgroundColor: color + "18", borderColor: color },
            ]}
            onPress={() => handleOpen(item)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            activeOpacity={0.7}
          >
            <Text style={[s.actionPillText, { color }]}>
              {isLink ? "Play" : "Download"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Decorative music notes — pointerEvents="none" so touches pass through */}
        <MusicTrace />
      </View>
    );
  };

  // ── Shared group picker used in both modals ───────────────────────────
  const GroupPicker = ({ value, onChange }) => (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 4,
        marginBottom: 8,
      }}
    >
      {dynamicFilters.slice(1).map((f) => (
        <TouchableOpacity
          key={f.key}
          style={[s.filterBtn, value === f.key && s.filterBtnActive]}
          onPress={() => onChange(f.key)}
          activeOpacity={0.7}
        >
          <Text style={[s.filterText, value === f.key && s.filterTextActive]}>
            {f.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={s.safe}>
      {/* Filter chips — admin only */}
      {isAdmin && (
        <View style={s.filtersWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filtersContent}
            // FIX: prevent scroll gesture from swallowing filter taps
            keyboardShouldPersistTaps="handled"
          >
            {dynamicFilters.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[
                  s.filterBtn,
                  activeFilter === f.key && s.filterBtnActive,
                ]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    s.filterText,
                    activeFilter === f.key && s.filterTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Upload / Add link row — admin only */}
      {isAdmin && (
        <View style={s.uploadRow}>
          <TouchableOpacity
            style={[s.uploadBtn, s.uploadBtnPrimary, { flex: 1 }]}
            onPress={handlePickFile}
            disabled={uploading}
            activeOpacity={0.8}
          >
            {uploading && uploadProgress > 0 ? (
              <Text style={s.uploadBtnText}>↑ {uploadProgress}%</Text>
            ) : uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.uploadBtnText}>Upload File</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.uploadBtn, s.uploadBtnSecondary, { flex: 1 }]}
            onPress={() => setLinkModal(true)}
            activeOpacity={0.8}
          >
            <Text style={[s.uploadBtnText, { color: COLORS.teal }]}>
              Add Link
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={COLORS.teal} size="large" />
          <Text style={s.loadingText}>Loading library...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyIcon}>♪</Text>
          <Text style={s.emptyTitle}>No materials yet</Text>
          <Text style={s.emptySubtitle}>
            {isAdmin
              ? "Upload files or add YouTube links above"
              : "No materials have been uploaded yet"}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          // FIX: ensures taps inside the scroll view are not swallowed
          keyboardShouldPersistTaps="handled"
        >
          {/* FIX: removed the wrapping <View> around each card —
               it was creating an extra touch-blocking layer */}
          {filtered.map((item) => renderItem(item))}
        </ScrollView>
      )}

      {/* ── DELETE CONFIRMATION MODAL ────────────────────────────────── */}
      <Modal
        visible={!!deleteTarget}
        animationType="fade"
        transparent
        statusBarTranslucent
      >
        <View style={s.overlayCenter}>
          <View style={s.confirmBox}>
            <Text
              style={{ fontSize: 32, textAlign: "center", marginBottom: 8 }}
            >
              🗑️
            </Text>
            <Text style={s.confirmTitle}>Delete File?</Text>
            <Text style={s.confirmMsg}>
              This will permanently remove{"\n"}
              <Text style={{ color: COLORS.text, fontWeight: "700" }}>
                "{deleteTarget?.name}"
              </Text>
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={s.btnCancel}
                onPress={() => setDeleteTarget(null)}
                activeOpacity={0.7}
              >
                <Text style={s.btnCancelText}>Keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.btnDeleteConfirm}
                onPress={doDelete}
                activeOpacity={0.7}
              >
                <Text style={s.btnLight}>Yes, delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── FILE GROUP MODAL ─────────────────────────────────────────── */}
      <Modal
        visible={fileModal}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View style={s.overlayBottom}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Upload File</Text>
            <TouchableOpacity
              style={s.modalClose}
              onPress={() => setFileModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={{ color: "#aaa", fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
            {pendingFile && (
              <View style={[s.card, { marginBottom: 16 }]}>
                <View style={[s.typeBlock, { backgroundColor: COLORS.teal }]}>
                  <Text style={s.typeBlockText}>FILE</Text>
                </View>
                <View style={s.cardBody}>
                  <Text style={s.fileName} numberOfLines={1}>
                    {pendingFile.name}
                  </Text>
                  <Text style={s.fileMeta}>{formatSize(pendingFile.size)}</Text>
                </View>
              </View>
            )}
            <Text style={s.label}>Group</Text>
            <GroupPicker value={fileGroup} onChange={setFileGroup} />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[s.uploadBtn, s.uploadBtnPrimary, { flex: 1 }]}
                onPress={handleUploadFile}
                activeOpacity={0.8}
              >
                <Text style={s.uploadBtnText}>↑ Upload</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.uploadBtn, s.uploadBtnCancel, { flex: 1 }]}
                onPress={() => setFileModal(false)}
                activeOpacity={0.8}
              >
                <Text style={[s.uploadBtnText, { color: "#555" }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── LINK MODAL ───────────────────────────────────────────────── */}
      <Modal
        visible={linkModal}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View style={s.overlayBottom}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Add YouTube Link</Text>
            <TouchableOpacity
              style={s.modalClose}
              onPress={() => setLinkModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={{ color: "#aaa", fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
            <Text style={s.label}>Name</Text>
            <TextInput
              style={s.input}
              value={linkName}
              onChangeText={setLinkName}
              placeholder="e.g. Rehearsal Video June 2026"
              placeholderTextColor="#bbb"
            />
            <Text style={s.label}>YouTube URL</Text>
            <TextInput
              style={s.input}
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="https://youtube.com/watch?v=..."
              placeholderTextColor="#bbb"
              autoCapitalize="none"
            />
            <Text style={s.label}>Group</Text>
            <GroupPicker value={linkGroup} onChange={setLinkGroup} />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[s.uploadBtn, s.uploadBtnPrimary, { flex: 1 }]}
                onPress={handleAddLink}
                disabled={uploading}
                activeOpacity={0.8}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.uploadBtnText}>Add Link</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.uploadBtn, s.uploadBtnCancel, { flex: 1 }]}
                onPress={() => setLinkModal(false)}
                activeOpacity={0.8}
              >
                <Text style={[s.uploadBtnText, { color: "#555" }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  filtersWrap: { height: 52, marginBottom: 12 },
  filtersContent: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
    flexDirection: "row",
  },
  filterBtn: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: "#fff",
  },
  filterBtnActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  filterText: { color: "#666", fontSize: 13 },
  filterTextActive: { color: "#fff", fontWeight: "700", fontSize: 13 },
  uploadRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  uploadBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtnPrimary: { backgroundColor: COLORS.teal },
  uploadBtnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: COLORS.teal,
  },
  uploadBtnCancel: { backgroundColor: "#f0f0f0" },
  uploadBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: { color: COLORS.muted, marginTop: 12, fontSize: 14 },
  emptyIcon: { fontSize: 40, color: COLORS.teal, marginBottom: 8 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  listContent: { padding: 16, gap: 10, paddingBottom: 100 },

  // ── Card ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "stretch",
    // overflow hidden מוסר — הוא חתך את הקו הלבן
    // הפינות מעוגלות נשמרות ע"י borderRadius על typeBlock ו-traceCol
  },
  typeBlock: {
    width: 80,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 6,
    zIndex: 0,
    borderRightWidth: 3,
    borderRightColor: "#ffffff",
    // פינות שמאל מעוגלות כמו הכרטיס
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  typeBlockDivider: {},
  typeBlockText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    padding: 14,
    position: "relative",
    // FIX: raised to 2 (was 1) so it's above traceCol (zIndex 0)
    zIndex: 2,
  },
  fileName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  fileMeta: { fontSize: 12, color: COLORS.muted, marginBottom: 10 },
  uploadedBy: { fontSize: 11, color: COLORS.teal, marginBottom: 10 },
  actionPill: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  actionPillText: { fontSize: 13, fontWeight: "700" },
  deleteSmall: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.redLight,
    alignItems: "center",
    justifyContent: "center",
    // FIX: must sit above cardBody's own children
    zIndex: 3,
  },
  deleteSmallText: { color: COLORS.red, fontWeight: "700", fontSize: 13 },

  // ── Decorative music trace ────────────────────────────────────────────
  traceCol: {
    width: 60,
    flexShrink: 0,
    position: "relative",
    // FIX: explicit zIndex 0 — sits below cardBody (zIndex 2)
    zIndex: 0,
  },
  traceNote: { position: "absolute", opacity: 0.32 },
  traceNoteTop: {
    top: "14%",
    left: 6,
    fontSize: 15,
    transform: [{ rotate: "-8deg" }],
  },
  traceNoteMid: {
    top: "40%",
    left: 30,
    fontSize: 23,
    transform: [{ rotate: "10deg" }],
  },
  traceNoteBottom: {
    top: "68%",
    left: 6,
    fontSize: 15,
    transform: [{ rotate: "-4deg" }],
  },

  // ── Delete confirmation modal ─────────────────────────────────────────
  overlayCenter: {
    flex: 1,
    backgroundColor: "#0008",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmBox: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  confirmTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  confirmMsg: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  btnCancel: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnCancelText: { color: COLORS.muted, fontWeight: "700" },
  btnDeleteConfirm: {
    flex: 1,
    backgroundColor: COLORS.red,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnLight: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // ── Bottom-sheet modals ───────────────────────────────────────────────
  overlayBottom: {
    flex: 1,
    backgroundColor: "#0006",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  modalClose: { position: "absolute", top: 24, right: 24 },
  label: { color: "#666", fontSize: 13, marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    color: "#111",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
});
