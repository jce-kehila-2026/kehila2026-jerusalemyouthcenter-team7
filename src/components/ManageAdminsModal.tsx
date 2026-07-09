import { useAuth } from "@/src/context/AuthContext";
import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { deleteApp, getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  inMemoryPersistence,
  setPersistence,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Colors ────────────────────────────────────────────────────────────────────
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

// ── Types ─────────────────────────────────────────────────────────────────────
type AdminUser = {
  uid: string;
  full_name: string;
  email: string;
  phone?: string | null;
  birthday?: string | null;
  job?: string | null;
  staff_type?: string | null;
};

type AdminForm = {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  birthday: string;
  job: string;
  staff_type: string;
};

const formatBirthDate = (text: string) => {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const JOB_OPTIONS = ["Music Teacher", "Educational Supervisor"] as const;
const STAFF_TYPE_OPTIONS = ["Administrative", "Educational"] as const;

const EMPTY_FORM: AdminForm = {
  full_name: "",
  email: "",
  password: "",
  phone: "",
  birthday: "",
  job: "",
  staff_type: "",
};

type Props = { visible: boolean; onClose: () => void };

// ── Component ─────────────────────────────────────────────────────────────────
export function ManageAdminsModal({ visible, onClose }: Props) {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "super-admin";
  const [view, setView] = useState<"list" | "form">("list");
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [form, setForm] = useState<AdminForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Live admin list via onSnapshot ─────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    setListLoading(true);
    const q = query(collection(db, "users"), where("role", "==", "admin"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAdmins(
          snap.docs.map((d) => ({
            uid: d.id,
            full_name: d.data().full_name || "",
            email: d.data().email || "",
            phone: d.data().phone ?? null,
            birthday: d.data().birthday ?? null,
            job: d.data().job ?? null,
            staff_type: d.data().staff_type ?? null,
          })),
        );
        setListLoading(false);
      },
      (err) => {
        console.error("Admins onSnapshot error:", err.message);
        setListLoading(false);
      },
    );
    return () => unsub();
  }, [visible]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setError("");
  };

  const handleClose = () => {
    setView("list");
    resetForm();
    onClose();
  };

  const setField = (k: keyof AdminForm) => (v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  // ── Create admin (fresh secondary app each time so the current admin
  //    session is never affected, matches old working implementation) ─────────
  const handleSave = async () => {
    const { full_name, email, password, job, staff_type } = form;
    if (!full_name.trim()) return setError("Full name is required.");
    if (!email.trim()) return setError("Email is required.");
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (!job) return setError("Job position is required.");
    if (!staff_type) return setError("Staff type is required.");

    setSaving(true);
    setError("");
    let secondaryApp: ReturnType<typeof initializeApp> | null = null;
    try {
      const SECONDARY_NAME = "admin-creator-secondary";
      const existing = getApps().find((a) => a.name === SECONDARY_NAME);
      if (existing) await deleteApp(existing);

      const mainOptions =
        (getApps().find((a) => a.name === "[DEFAULT]") as any)?.options ?? {};
      secondaryApp = initializeApp(mainOptions, SECONDARY_NAME);
      const secAuth = getAuth(secondaryApp);
      await setPersistence(secAuth, inMemoryPersistence);

      const credential = await createUserWithEmailAndPassword(
        secAuth,
        email.trim(),
        password,
      );
      const newUid = credential.user.uid;
      await secAuth.signOut();

      await setDoc(doc(db, "users", newUid), {
        uid: newUid,
        role: "admin",
        job: form.job,
        staff_type: form.staff_type,
        mustChangePassword: true,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        birthday: form.birthday.trim() || null,
        createdAt: serverTimestamp(),
      });

      resetForm();
      setView("list");
    } catch (e: any) {
      console.error("ADMIN CREATE ERROR:", e.message);
      setError(
        e.code === "auth/email-already-in-use"
          ? "An account with this email already exists."
          : e.message || "Failed to create admin account.",
      );
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch {
          /* cleanup */
        }
      }
      setSaving(false);
    }
  };

  // ── Delete admin (double confirmation matches old working implementation) ──
  const handleDelete = (admin: AdminUser) => {
    const currentUserId = currentUser?.uid || (currentUser as any)?.id; // Robust check for current user's UID
    if (currentUserId === admin.uid) {
      Alert.alert("Action Denied", "You cannot delete your own admin account.");
      return;
    }

    const performDelete = async () => {
      try {
        console.log("ADMIN DELETE START:", admin.uid);
        await deleteDoc(doc(db, "users", admin.uid));
        console.log("ADMIN DELETE SUCCESS:", admin.uid);
        // The list updates automatically because of the onSnapshot listener
      } catch (e: any) {
        console.error("ADMIN DELETE ERROR:", e.message);
        const msg =
          e.code === "permission-denied"
            ? "Permission denied. Check your Firestore Security Rules."
            : e.message || "Unknown error occurred.";
        Alert.alert("Deletion Failed", msg);
      }
    };

    if (Platform.OS === "web") {
      // Native Alert.alert doesn't always work on Web browsers
      if (
        window.confirm(
          `Are you sure you want to permanently remove ${admin.full_name}?`,
        )
      ) {
        performDelete();
      }
    } else {
      // Use a small timeout to ensure the Alert appears correctly over the Modal on Mobile
      setTimeout(() => {
        Alert.alert(
          "Confirm Deletion",
          `Are you sure you want to permanently remove ${admin.full_name} as an administrator?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete Permanently",
              style: "destructive",
              onPress: performDelete,
            },
          ],
          { cancelable: true },
        );
      }, 100);
    }
  };

  // ── List view ─────────────────────────────────────────────────────────────
  const renderList = () => (
    <>
      <View style={s.header}>
        <Pressable onPress={handleClose} hitSlop={12}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Manage Admins</Text>
        {isSuperAdmin ? (
          <Pressable
            style={s.addChip}
            onPress={() => {
              resetForm();
              setView("form");
            }}
          >
            <Ionicons name="add" size={18} color={C.teal} />
            <Text style={s.addChipText}>Add</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {listLoading ? (
          <ActivityIndicator
            color={C.teal}
            size="large"
            style={{ marginTop: 48 }}
          />
        ) : admins.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="shield-outline" size={52} color={C.muted} />
            <Text style={s.emptyText}>No admins found</Text>
          </View>
        ) : (
          admins.map((admin) => (
            <View key={admin.uid} style={s.adminCard}>
              <View style={s.adminAvatar}>
                <Text style={s.adminInitial}>
                  {admin.full_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.adminName}>{admin.full_name}</Text>
                <Text style={s.adminEmail}>{admin.email}</Text>
                {admin.job ? (
                  <Text style={s.adminMeta}>💼 {admin.job}</Text>
                ) : null}
                {admin.phone ? (
                  <Text style={s.adminMeta}>📞 {admin.phone}</Text>
                ) : null}
              </View>
              {isSuperAdmin && (
                <TouchableOpacity
                  onPress={() => handleDelete(admin)}
                  hitSlop={20}
                  style={{ padding: 10 }}
                >
                  <Ionicons name="trash-outline" size={20} color={C.red} />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </>
  );

  // ── Form view ─────────────────────────────────────────────────────────────
  const renderForm = () => (
    <>
      <View style={s.header}>
        <Pressable
          onPress={() => {
            setView("list");
            resetForm();
          }}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Add New Admin</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={s.errorBox}>
              <Ionicons name="warning-outline" size={16} color={C.red} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <FieldLabel text="Full Name" req />
          <TextInput
            style={s.input}
            value={form.full_name}
            onChangeText={setField("full_name")}
            placeholder="e.g. Sara Cohen"
            placeholderTextColor={C.muted}
          />

          <FieldLabel text="Email" req />
          <TextInput
            style={s.input}
            value={form.email}
            onChangeText={setField("email")}
            placeholder="admin@example.com"
            placeholderTextColor={C.muted}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <FieldLabel text="Temporary Password" req />
          <TextInput
            style={s.input}
            value={form.password}
            onChangeText={setField("password")}
            placeholder="Minimum 6 characters"
            placeholderTextColor={C.muted}
            secureTextEntry
          />

          <FieldLabel text="Phone Number" />
          <TextInput
            style={s.input}
            value={form.phone}
            onChangeText={setField("phone")}
            placeholder="+972-50-000-0000"
            placeholderTextColor={C.muted}
            keyboardType="phone-pad"
          />

          <FieldLabel text="Birthday" />
          <TextInput
            style={s.input}
            value={form.birthday}
            onChangeText={(text) =>
              setForm((p) => ({ ...p, birthday: formatBirthDate(text) }))
            }
            placeholder="DD/MM/YYYY"
            placeholderTextColor={C.muted}
            keyboardType="number-pad"
            maxLength={10}
          />

          <FieldLabel text="Job Position" req />
          <View style={s.pillRow}>
            {JOB_OPTIONS.map((j) => (
              <Pressable
                key={j}
                style={[s.pill, form.job === j && s.pillActive]}
                onPress={() => setField("job")(j)}
              >
                <Text style={[s.pillText, form.job === j && s.pillTextActive]}>
                  {j}
                </Text>
              </Pressable>
            ))}
          </View>

          <FieldLabel text="Staff Type" req />
          <View style={s.pillRow}>
            {STAFF_TYPE_OPTIONS.map((st) => (
              <Pressable
                key={st}
                style={[s.pill, form.staff_type === st && s.pillActive]}
                onPress={() => setField("staff_type")(st)}
              >
                <Text style={[s.pillText, form.staff_type === st && s.pillTextActive]}>
                  {st}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.saveBtnText}>Create Admin Account</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: C.white }}
        edges={["top"]}
      >
        {view === "list" ? renderList() : renderForm()}
      </SafeAreaView>
    </Modal>
  );
}

// ── FieldLabel helper ─────────────────────────────────────────────────────────
function FieldLabel({ text, req }: { text: string; req?: boolean }) {
  return (
    <Text style={s.fieldLabel}>
      {text}
      {req ? <Text style={{ color: C.red }}> *</Text> : null}
    </Text>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
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
  addChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 3,
  },
  addChipText: { color: C.teal, fontSize: 13, fontWeight: "700" },

  // Empty
  emptyBox: { alignItems: "center", paddingTop: 64, gap: 12 },
  emptyText: { color: C.muted, fontSize: 15 },

  // Admin card
  adminCard: {
    flexDirection: "row",
    alignItems: "center",
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
    backgroundColor: C.tealLight,
    alignItems: "center",
    justifyContent: "center",
  },
  adminInitial: { fontSize: 20, fontWeight: "700", color: C.teal },
  adminName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.dark,
    marginBottom: 2,
  },
  adminEmail: { fontSize: 13, color: C.sub },
  adminMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  staffBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  staffBadgeText: { fontSize: 11, fontWeight: "700" },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fdecea",
    borderLeftWidth: 3,
    borderLeftColor: C.red,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: C.red, fontSize: 13, flex: 1 },

  // Form inputs
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: C.dark,
    marginBottom: 16,
    backgroundColor: "#f9fbfd",
  },
  pillRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  pill: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    backgroundColor: C.bg,
  },
  pillActive: { backgroundColor: C.teal, borderColor: C.teal },
  pillText: { fontSize: 13, fontWeight: "600", color: C.sub },
  pillTextActive: { color: "#fff" },

  // Save button
  saveBtn: {
    backgroundColor: C.teal,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
