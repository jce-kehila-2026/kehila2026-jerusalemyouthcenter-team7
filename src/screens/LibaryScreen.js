// src/screens/LibraryScreen.js
import * as DocumentPicker from "expo-document-picker";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../backend/firebase";
import { useAuth } from "../context/AuthContext";

const COLORS = {
  teal: "#039899",
  red: "#c56451",
  yellow: "#cfad5d",
  white: "#ffffff",
  bg: "#f8f9fa",
  card: "#ffffff",
  border: "#e8e8e8",
  text: "#111111",
  muted: "#888888",
};

const FILE_ICONS = {
  pdf: { icon: "📄", color: "#e05555" },
  mp3: { icon: "🎵", color: COLORS.teal },
  mp4: { icon: "🎬", color: "#8b5cf6" },
  wav: { icon: "🎵", color: COLORS.teal },
  jpg: { icon: "🖼️", color: COLORS.yellow },
  jpeg: { icon: "🖼️", color: COLORS.yellow },
  png: { icon: "🖼️", color: COLORS.yellow },
  doc: { icon: "📝", color: "#2b7de9" },
  docx: { icon: "📝", color: "#2b7de9" },
  default: { icon: "📁", color: COLORS.muted },
};

const getFileIcon = (name = "") => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
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

export default function LibraryScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // ── Load materials from Firestore ─────────────────────────────────────
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

  // ── Upload (Admin only) ───────────────────────────────────────────────
  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setUploading(true);

      // Save metadata to Firestore (file stored as URI for now)
      await addDoc(collection(db, "library"), {
        name: file.name,
        size: file.size ?? 0,
        mimeType: file.mimeType ?? "",
        uri: file.uri,
        uploadedBy: user?.full_name ?? "Admin",
        createdAt: serverTimestamp(),
      });

      await loadMaterials();
    } catch (e) {
      console.error("Upload error:", e);
    } finally {
      setUploading(false);
    }
  };

  // ── Delete (Admin only) ───────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "library", id));
      setMaterials((p) => p.filter((m) => m.id !== id));
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  // ── Render item ───────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    const { icon, color } = getFileIcon(item.name);
    return (
      <View style={s.card}>
        <View style={[s.iconBox, { backgroundColor: color + "18" }]}>
          <Text style={s.iconText}>{icon}</Text>
        </View>
        <View style={s.cardBody}>
          <Text style={s.fileName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={s.fileMeta}>
            {formatSize(item.size)}
            {item.size ? "  ·  " : ""}
            {formatDate(item.createdAt)}
          </Text>
          {item.uploadedBy ? (
            <Text style={s.uploadedBy}>Uploaded by {item.uploadedBy}</Text>
          ) : null}
        </View>
        {isAdmin && (
          <Pressable style={s.deleteBtn} onPress={() => handleDelete(item.id)}>
            <Text style={s.deleteBtnText}>✕</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.orgName}>Jerusalem Youth Chorus</Text>
        <Text style={s.pageTitle}>Music Library</Text>
        <Text style={s.subtitle}>ספרייה מוזיקלית</Text>
      </View>

      {/* Upload button (Admin only) */}
      {isAdmin && (
        <Pressable
          style={[s.uploadBtn, uploading && { opacity: 0.6 }]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.uploadBtnText}>＋ Upload Material</Text>
          )}
        </Pressable>
      )}

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={COLORS.teal} size="large" />
          <Text style={s.loadingText}>Loading library...</Text>
        </View>
      ) : materials.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48 }}>🎵</Text>
          <Text style={s.emptyTitle}>No materials yet</Text>
          <Text style={s.emptySubtitle}>
            {isAdmin
              ? "Upload the first material using the button above"
              : "No materials have been uploaded yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={materials}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 16 : 24,
    paddingBottom: 12,
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

  uploadBtn: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.teal,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  uploadBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

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
  fileMeta: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  uploadedBy: { fontSize: 11, color: COLORS.teal, marginTop: 2 },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: { color: COLORS.red, fontWeight: "700", fontSize: 14 },
});
