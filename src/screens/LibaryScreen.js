// src/screens/LibraryScreen.js
import { db, storage } from "@/src/firebase/firebase";
import * as DocumentPicker from "expo-document-picker";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
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

const FILTERS = [
  { key: "all", label: "All" },
  { key: "year1", label: "Year 1" },
  { key: "year2", label: "Year 2" },
  { key: "year3", label: "Year 3" },
  { key: "all_groups", label: "All Groups" },
];

// File type → icon character + accent color
// Uses text characters so no external dependency needed
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
  link: { label: "YT", color: "#ff0000" },
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

export default function LibraryScreen({ autoUpload = false }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [materials, setMaterials] = useState([]);
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

  // Mark that this singer has opened the library (powers the achievement)
  useEffect(() => {
    if (user && !isAdmin) {
      updateDoc(doc(db, "users", user.uid), { has_opened_library: true }).catch(
        () => {},
      );
    }
  }, [user?.uid]);

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

  // Auto-trigger file picker when navigated here with ?action=upload
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
    const { label, color } = getFileType(item);
    const groupLabel =
      FILTERS.find((f) => f.key === item.group)?.label ?? "All Groups";
    const isLink = item.type === "link";

    // Badge color per group
    const groupBadgeStyle =
      item.group === "year1"
        ? { bg: COLORS.yellowLight, text: "#9a7010" }
        : item.group === "year2"
          ? { bg: COLORS.redLight, text: COLORS.red }
          : { bg: COLORS.tealLight, text: COLORS.teal };

    return (
      <Pressable
        style={({ pressed }) => [s.card, pressed && { opacity: 0.92 }]}
        onPress={() => handleOpen(item)}
      >
        {/* File type badge box */}
        <View style={[s.iconBox, { backgroundColor: color + "18" }]}>
          <Text style={[s.iconLabel, { color }]}>{label}</Text>
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
              marginTop: 4,
            }}
          >
            <View
              style={[s.groupBadge, { backgroundColor: groupBadgeStyle.bg }]}
            >
              <Text style={[s.groupBadgeText, { color: groupBadgeStyle.text }]}>
                {groupLabel}
              </Text>
            </View>
            <Text style={s.fileMeta}>
              {isLink
                ? "YouTube"
                : [formatSize(item.size), formatDate(item.createdAt)]
                    .filter(Boolean)
                    .join("  ·  ")}
            </Text>
          </View>
          {item.uploadedBy ? (
            <Text style={s.uploadedBy}>Uploaded by {item.uploadedBy}</Text>
          ) : null}
        </View>

        <View style={{ alignItems: "center", gap: 6 }}>
          {/* Open/download — teal ghost button */}
          <Pressable
            style={[s.iconAction, { backgroundColor: COLORS.tealLight }]}
            onPress={() => handleOpen(item)}
          >
            <Text style={[s.iconActionText, { color: COLORS.teal }]}>
              {isLink ? "▶" : "↓"}
            </Text>
          </Pressable>

          {/* Delete — red ghost button, admin only */}
          {isAdmin && (
            <Pressable
              style={[s.iconAction, { backgroundColor: COLORS.redLight }]}
              onPress={() => handleDelete(item.id)}
            >
              <Text style={[s.iconActionText, { color: COLORS.red }]}>✕</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  // Shared group picker used in both modals
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
      {FILTERS.slice(1).map((f) => (
        <Pressable
          key={f.key}
          style={[s.filterBtn, value === f.key && s.filterBtnActive]}
          onPress={() => onChange(f.key)}
        >
          <Text style={[s.filterText, value === f.key && s.filterTextActive]}>
            {f.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

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
          {/* Upload File — teal fill (primary) */}
          <Pressable
            style={[s.uploadBtn, s.uploadBtnPrimary, { flex: 1 }]}
            onPress={handlePickFile}
            disabled={uploading}
          >
            {uploading && uploadProgress > 0 ? (
              <Text style={s.uploadBtnText}>↑ {uploadProgress}%</Text>
            ) : uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.uploadBtnText}>Upload File</Text>
            )}
          </Pressable>

          {/* Add Link — teal outline (secondary, replaces red) */}
          <Pressable
            style={[s.uploadBtn, s.uploadBtnSecondary, { flex: 1 }]}
            onPress={() => setLinkModal(true)}
          >
            <Text style={[s.uploadBtnText, { color: COLORS.teal }]}>
              Add Link
            </Text>
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
          <Text style={s.emptyIcon}>♪</Text>
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
            <Text style={s.modalTitle}>Upload File</Text>
            <Pressable style={s.modalClose} onPress={() => setFileModal(false)}>
              <Text style={{ color: "#aaa", fontSize: 22 }}>✕</Text>
            </Pressable>
            {pendingFile && (
              <View style={[s.card, { marginBottom: 16 }]}>
                <View
                  style={[s.iconBox, { backgroundColor: COLORS.tealLight }]}
                >
                  <Text style={[s.iconLabel, { color: COLORS.teal }]}>
                    FILE
                  </Text>
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
              <Pressable
                style={[s.uploadBtn, s.uploadBtnPrimary, { flex: 1 }]}
                onPress={handleUploadFile}
              >
                <Text style={s.uploadBtnText}>↑ Upload</Text>
              </Pressable>
              <Pressable
                style={[s.uploadBtn, s.uploadBtnCancel, { flex: 1 }]}
                onPress={() => setFileModal(false)}
              >
                <Text style={[s.uploadBtnText, { color: "#555" }]}>Cancel</Text>
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
            <Text style={s.modalTitle}>Add YouTube Link</Text>
            <Pressable style={s.modalClose} onPress={() => setLinkModal(false)}>
              <Text style={{ color: "#aaa", fontSize: 22 }}>✕</Text>
            </Pressable>
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
              <Pressable
                style={[s.uploadBtn, s.uploadBtnPrimary, { flex: 1 }]}
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
                style={[s.uploadBtn, s.uploadBtnCancel, { flex: 1 }]}
                onPress={() => setLinkModal(false)}
              >
                <Text style={[s.uploadBtnText, { color: "#555" }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  // אחרי
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: "#039899",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: 16,
  },
  orgName: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  pageTitle: { fontSize: 28, fontWeight: "800", color: "#ffffff" },

  filtersWrap: { height: 52 },
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
  // Outline teal for secondary (Add Link) — replaces the red button
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

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    // shadow removed — flat design
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },

  cardBody: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  fileMeta: { fontSize: 12, color: COLORS.muted },
  groupBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  groupBadgeText: { fontSize: 10, fontWeight: "700" },
  uploadedBy: { fontSize: 11, color: COLORS.teal, marginTop: 3 },

  iconAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconActionText: { fontWeight: "700", fontSize: 14 },

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
