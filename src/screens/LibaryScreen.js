// src/screens/LibaryScreen.js
import * as DocumentPicker from "expo-document-picker";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { db, storage } from "../../backend/firebase";
import { useAuth } from "../context/AuthContext";

const COLORS = {
  teal: "#039899",
  red: "#c56451",
  yellow: "#cfad5d",
  bg: "#f8f9fa",
  card: "#ffffff",
  border: "#e8e8e8",
  text: "#111111",
  muted: "#888888",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "year1", label: "Year 1" },
  { key: "year2", label: "Year 2" },
  { key: "year3", label: "Year 3" },
  { key: "all_groups", label: "All Groups" },
];

const FILE_ICONS = {
  pdf: { icon: "📄", color: "#e05555" },
  mp3: { icon: "🎵", color: "#039899" },
  mp4: { icon: "🎬", color: "#8b5cf6" },
  wav: { icon: "🎵", color: "#039899" },
  jpg: { icon: "🖼️", color: "#cfad5d" },
  jpeg: { icon: "🖼️", color: "#cfad5d" },
  png: { icon: "🖼️", color: "#cfad5d" },
  doc: { icon: "📝", color: "#2b7de9" },
  docx: { icon: "📝", color: "#2b7de9" },
  zip: { icon: "🗜️", color: "#f59e0b" },
  rar: { icon: "🗜️", color: "#f59e0b" },
  link: { icon: "🎬", color: "#ff0000" },
  default: { icon: "📁", color: "#888888" },
};

const getFileIcon = (item) => {
  if (item.type === "link") return FILE_ICONS.link;
  const ext = (item.name || "").split(".").pop()?.toLowerCase() ?? "";
  return FILE_ICONS[ext] || FILE_ICONS.default;
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

export default function LibaryScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setProgress] = useState(0);
  const [activeFilter, setFilter] = useState("all");

  // File upload modal
  const [fileModal, setFileModal] = useState(false);
  const [fileGroup, setFileGroup] = useState("all_groups");
  const [pendingFile, setPendingFile] = useState(null);

  // Link modal
  const [linkModal, setLinkModal] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkGroup, setLinkGroup] = useState("all_groups");

  const loadMaterials = async () => {
    try {
      const snap = await getDocs(collection(db, "library"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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

  // ── Step 1: Pick file and show group modal ────────────────────────────
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

  // ── Step 2: Upload after group selected ───────────────────────────────
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
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(Math.round(progress));
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

  // ── Add YouTube Link ──────────────────────────────────────────────────
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

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "library", id));
      setMaterials((p) => p.filter((m) => m.id !== id));
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const handleOpen = (item) => {
    if (!item.uri) return;
    if (Platform.OS === "web") {
      window.open(item.uri, "_blank");
    } else {
      Linking.openURL(item.uri).catch(() => {});
    }
  };

  const renderItem = ({ item }) => {
    const { icon, color } = getFileIcon(item);
    const groupLabel =
      FILTERS.find((f) => f.key === item.group)?.label ?? "All Groups";
    const isLink = item.type === "link";
    return (
      <Pressable style={s.card} onPress={() => handleOpen(item)}>
        <View style={[s.iconBox, { backgroundColor: color + "18" }]}>
          <Text style={s.iconText}>{icon}</Text>
        </View>
        <View style={s.cardBody}>
          <Text style={s.fileName} numberOfLines={1}>
            {item.name}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 3,
            }}
          >
            <View
              style={[s.groupBadge, { backgroundColor: COLORS.teal + "18" }]}
            >
              <Text style={[s.groupBadgeText, { color: COLORS.teal }]}>
                {groupLabel}
              </Text>
            </View>
            {isLink ? (
              <Text style={[s.fileMeta, { color: "#ff0000" }]}>
                YouTube Link
              </Text>
            ) : (
              <Text style={s.fileMeta}>
                {formatSize(item.size)}
                {item.size ? "  ·  " : ""}
                {formatDate(item.createdAt)}
              </Text>
            )}
          </View>
          {item.uploadedBy ? (
            <Text style={s.uploadedBy}>Uploaded by {item.uploadedBy}</Text>
          ) : null}
        </View>
        <View style={{ alignItems: "center", gap: 6 }}>
          <Pressable style={s.openBtn} onPress={() => handleOpen(item)}>
            <Text style={s.openBtnText}>{isLink ? "▶" : "⬇"}</Text>
          </Pressable>
          {isAdmin && (
            <Pressable
              style={s.deleteBtn}
              onPress={() => handleDelete(item.id)}
            >
              <Text style={s.deleteBtnText}>✕</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.orgName}>Jerusalem Youth Chorus</Text>
        <Text style={s.pageTitle}>Music Library</Text>
      </View>

      {isAdmin && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.filtersWrap}
          contentContainerStyle={s.filtersContent}
        >
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[s.filterBtn, activeFilter === f.key && s.filterBtnActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  s.filterText,
                  activeFilter === f.key && s.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {isAdmin && (
        <View style={s.uploadRow}>
          <Pressable
            style={[s.uploadBtn, { flex: 1 }]}
            onPress={handlePickFile}
            disabled={uploading}
          >
            {uploading && uploadProgress > 0 ? (
              <Text style={s.uploadBtnText}>⬆ {uploadProgress}%</Text>
            ) : uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.uploadBtnText}>Upload File</Text>
            )}
          </Pressable>
          <Pressable
            style={[s.uploadBtn, { flex: 1, backgroundColor: "#ff0000" }]}
            onPress={() => setLinkModal(true)}
          >
            <Text style={s.uploadBtnText}>Add Link</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={COLORS.teal} size="large" />
          <Text style={s.loadingText}>Loading library...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48 }}>🎵</Text>
          <Text style={s.emptyTitle}>No materials yet</Text>
          <Text style={s.emptySubtitle}>
            {isAdmin
              ? "Upload files or add YouTube links above"
              : "No materials have been uploaded yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* File Group Modal */}
      <Modal
        visible={fileModal}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View style={s.overlayBottom}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>📁 Upload File</Text>
            <Pressable style={s.modalClose} onPress={() => setFileModal(false)}>
              <Text style={{ color: "#888", fontSize: 22 }}>✕</Text>
            </Pressable>

            {pendingFile && (
              <View style={[s.card, { marginBottom: 16 }]}>
                <Text style={s.iconText}>📄</Text>
                <View style={s.cardBody}>
                  <Text style={s.fileName} numberOfLines={1}>
                    {pendingFile.name}
                  </Text>
                  <Text style={s.fileMeta}>{formatSize(pendingFile.size)}</Text>
                </View>
              </View>
            )}

            <Text style={s.label}>Group</Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 4,
                marginBottom: 8,
              }}
            >
              {FILTERS.slice(1).map((f) => (
                <Pressable
                  key={f.key}
                  style={[
                    s.filterBtn,
                    fileGroup === f.key && s.filterBtnActive,
                  ]}
                  onPress={() => setFileGroup(f.key)}
                >
                  <Text
                    style={[
                      s.filterText,
                      fileGroup === f.key && s.filterTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Pressable
                style={[s.uploadBtn, { flex: 1 }]}
                onPress={handleUploadFile}
              >
                <Text style={s.uploadBtnText}>⬆ Upload</Text>
              </Pressable>
              <Pressable
                style={[s.uploadBtn, { flex: 1, backgroundColor: "#eee" }]}
                onPress={() => setFileModal(false)}
              >
                <Text style={[s.uploadBtnText, { color: "#333" }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Link Modal */}
      <Modal
        visible={linkModal}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View style={s.overlayBottom}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>🎬 Add YouTube Link</Text>
            <Pressable style={s.modalClose} onPress={() => setLinkModal(false)}>
              <Text style={{ color: "#888", fontSize: 22 }}>✕</Text>
            </Pressable>

            <Text style={s.label}>Name</Text>
            <TextInput
              style={s.input}
              value={linkName}
              onChangeText={setLinkName}
              placeholder="e.g. Rehearsal Video June 2026"
              placeholderTextColor="#aaa"
            />

            <Text style={s.label}>YouTube URL</Text>
            <TextInput
              style={s.input}
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="https://youtube.com/watch?v=..."
              placeholderTextColor="#aaa"
              autoCapitalize="none"
            />

            <Text style={s.label}>Group</Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 4,
                marginBottom: 8,
              }}
            >
              {FILTERS.slice(1).map((f) => (
                <Pressable
                  key={f.key}
                  style={[
                    s.filterBtn,
                    linkGroup === f.key && s.filterBtnActive,
                  ]}
                  onPress={() => setLinkGroup(f.key)}
                >
                  <Text
                    style={[
                      s.filterText,
                      linkGroup === f.key && s.filterTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Pressable
                style={[s.uploadBtn, { flex: 1, backgroundColor: "#ff0000" }]}
                onPress={handleAddLink}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.uploadBtnText}>Add Link</Text>
                )}
              </Pressable>
              <Pressable
                style={[s.uploadBtn, { flex: 1, backgroundColor: "#eee" }]}
                onPress={() => setLinkModal(false)}
              >
                <Text style={[s.uploadBtnText, { color: "#333" }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 16 : 24,
    paddingBottom: 8,
  },
  orgName: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 2,
  },
  subtitle: { fontSize: 14, color: COLORS.muted, marginTop: 2 },
  filtersWrap: { height: 56 },
  filtersContent: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
    flexDirection: "row",
  },
  filterBtn: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  filterBtnActive: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  filterText: { color: "#666", fontSize: 14 },
  filterTextActive: { color: "#fff", fontWeight: "700" },
  uploadRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  uploadBtn: {
    backgroundColor: COLORS.teal,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: { color: COLORS.muted, marginTop: 12, fontSize: 14 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 24 },
  cardBody: { flex: 1 },
  fileName: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  fileMeta: { fontSize: 12, color: COLORS.muted },
  groupBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  groupBadgeText: { fontSize: 10, fontWeight: "700" },
  uploadedBy: { fontSize: 11, color: COLORS.teal, marginTop: 2 },
  openBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.teal + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  openBtnText: { color: COLORS.teal, fontWeight: "700", fontSize: 14 },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: { color: COLORS.red, fontWeight: "700", fontSize: 14 },
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
  label: { color: "#555", fontSize: 13, marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    color: "#111",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
});
