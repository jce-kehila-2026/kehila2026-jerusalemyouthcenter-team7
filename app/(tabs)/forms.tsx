import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/src/context/AuthContext";
import { db } from "@/src/firebase/firebase";
import { getAllForms, getFormSubmissions } from "@/src/firebase/firestoreService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { deleteDoc, doc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const themeColors = {
  teal: "#039899",
  red: "#c56451",
  yellow: "#cfad5d",
  bluishWhite: "#f5fafe",
  charcoal: "#353535",
  white: "#ffffff",
};

const typeIcons: Record<string, React.ComponentProps<typeof Ionicons>["name"]> =
  {
    text: "text-outline",
    multiple_choice: "radio-button-on-outline",
    yes_no: "checkmark-circle-outline",
    range: "options-outline",
  };

export default function FormsScreen() {
  const { user } = useAuth() as any;
  const userRole = user?.role || "student";
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [formsList, setFormsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchForms = async () => {
      setLoading(true);
      const data = await getAllForms();
      const filteredData = data.filter(
        (f) =>
          typeof f.title !== "string" ||
          !f.title.toLowerCase().includes("new student"),
      );
      setFormsList(filteredData);

      if (userRole === "admin" || userRole === "staff") {
        const allSubs = await getFormSubmissions();
        const counts: Record<string, number> = {};
        allSubs.forEach((sub) => {
          if (sub.form_id) counts[sub.form_id] = (counts[sub.form_id] ?? 0) + 1;
        });
        setSubmissionCounts(counts);
      }

      setLoading(false);
    };
    fetchForms();
  }, [userRole]);

  const visibleForms = formsList.filter((f) => {
    if (userRole === "admin" || userRole === "staff") return true;
    const audience =
      typeof f.target_audience === "string" ? f.target_audience : "both";
    return audience === "student" || audience === "both";
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.bluishWhite }]}
    >
      <View style={styles.header}>
        <View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: themeColors.teal,
              marginBottom: 2,
            }}
          >
            Jerusalem Youth Chorus
          </Text>
          <Text
            style={[
              styles.title,
              { color: themeColors.charcoal, fontSize: 32 },
            ]}
          >
            Forms
          </Text>
          <Text style={styles.subtitle}>{visibleForms.length} active</Text>
        </View>
        {(userRole === "admin" || userRole === "staff") && (
          <Pressable
            style={styles.manageButton}
            onPress={() => router.push("/create-form" as any)}
          >
            <Text style={styles.manageButtonText}>Manage Forms</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.teal} />
        </View>
      ) : (
        <FlatList
          data={visibleForms}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <Text style={{ textAlign: "center", marginTop: 20, color: "#888" }}>
              لح
            </Text>
          )}
          renderItem={({ item, index }) => {
            const colors = [
              themeColors.teal,
              themeColors.red,
              themeColors.yellow,
            ];
            const activeColor = colors[index % 3];

            // 🛡️ دروع الحماية: التأكد إن البيانات نصوص مش كائنات (Objects)
            const safeTitle =
              typeof item.title === "string" ? item.title : "Form Title";
            const safeDescription =
              typeof item.description === "string" ? item.description : null;
            const safeDate =
              typeof item.date === "string" ? item.date : "Recently";
            const questions = Array.isArray(item.questions)
              ? item.questions
              : [];

            return (
              <Pressable
                style={[
                  styles.card,
                  {
                    backgroundColor: themeColors.white,
                    borderLeftWidth: 6,
                    borderLeftColor: activeColor,
                  },
                ]}
                onPress={() => router.push(`/form/${item.id}` as any)}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: activeColor + "26" },
                    ]}
                  >
                    <Ionicons
                      name="document-text"
                      size={22}
                      color={activeColor}
                    />
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: activeColor }]}>
                      {safeTitle}
                    </Text>
                    <Text style={styles.cardDate}>Created {safeDate}</Text>
                  </View>

                  {userRole === "admin" || userRole === "staff" ? (
                    <View style={styles.adminActions}>
                      <Pressable
                        style={styles.actionButton}
                        onPress={() =>
                          router.push({
                            pathname: "/create-form",
                            params: {
                              id: item.id,
                              isEditing: "true",
                              formData: JSON.stringify(item),
                            },
                          } as any)
                        }
                      >
                        <Ionicons
                          name="pencil-outline"
                          size={18}
                          color={themeColors.charcoal}
                        />
                      </Pressable>
                      <Pressable
                        style={styles.actionButton}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        onPress={(e) => {
                          if (e && e.stopPropagation) e.stopPropagation();
                          if (e && e.preventDefault) e.preventDefault();
                          setFormToDelete(item.id);
                        }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={themeColors.red}
                        />
                      </Pressable>
                    </View>
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={themeColors.charcoal}
                    />
                  )}
                </View>

                {safeDescription && (
                  <Text
                    style={[
                      styles.description,
                      { color: themeColors.charcoal },
                    ]}
                    numberOfLines={2}
                  >
                    {safeDescription}
                  </Text>
                )}

                {questions.length > 0 && (
                  <View style={styles.questionsList}>
                    {questions.slice(0, 2).map((q: any, i: number) => {
                      // 🛡️ حماية لطباعة نص السؤال
                      const qText =
                        typeof q.text === "string"
                          ? q.text
                          : typeof q.question_text === "string"
                            ? q.question_text
                            : `سؤال ${i + 1}`;
                      const qType =
                        typeof q.answer_type === "string"
                          ? q.answer_type
                          : "text";

                      return (
                        <View key={q.id || i} style={styles.questionRow}>
                          <Ionicons
                            name={typeIcons[qType] || "document-outline"}
                            size={13}
                            color={activeColor}
                          />
                          <Text
                            style={[
                              styles.questionText,
                              { color: themeColors.charcoal },
                            ]}
                            numberOfLines={1}
                          >
                            {qText}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={styles.footer}>
                  <Pressable
                    style={[
                      styles.fillButton,
                      { backgroundColor: activeColor },
                    ]}
                    onPress={() => router.push(`/form/${item.id}` as any)}
                  >
                    <Text style={styles.fillButtonText}>Fill out</Text>
                  </Pressable>

                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                    {(userRole === "admin" || userRole === "staff") && (
                      <View style={[styles.countBadge, { backgroundColor: activeColor + "26" }]}>
                        <Text style={[styles.countText, { color: activeColor }]}>
                          {submissionCounts[item.id] ?? 0} responses
                        </Text>
                        <Ionicons name="people-outline" size={13} color={activeColor} />
                      </View>
                    )}
                    <View
                      style={[
                        styles.countBadge,
                        { backgroundColor: activeColor + "26" },
                      ]}
                    >
                      <Text style={[styles.countText, { color: activeColor }]}>
                        {questions.length} questions
                      </Text>
                      <Ionicons
                        name="help-circle-outline"
                        size={13}
                        color={activeColor}
                      />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal visible={!!formToDelete} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Form</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this form? This action cannot be
              undone.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setFormToDelete(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={async () => {
                  if (formToDelete) {
                    try {
                      await deleteDoc(doc(db, "forms", formToDelete));
                      setFormsList((prev) =>
                        prev.filter((f) => f.id !== formToDelete),
                      );
                    } catch (err) {
                      console.error("Delete failed:", err);
                    }
                    setFormToDelete(null);
                  }
                }}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  manageButton: {
    backgroundColor: themeColors.teal,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  manageButtonText: {
    color: themeColors.white,
    fontWeight: "600",
    fontSize: 14,
  },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2, color: "#666" },
  list: { padding: 20, gap: 16 },
  card: {
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1, alignItems: "flex-start" },
  cardTitle: { fontSize: 16, fontWeight: "800", textAlign: "left" },
  cardDate: { fontSize: 11, marginTop: 2, color: "#888", textAlign: "left" },
  adminActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionButton: { padding: 4, zIndex: 10 },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    textAlign: "left",
    opacity: 0.8,
  },
  questionsList: {
    gap: 6,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
  },
  questionText: { fontSize: 12, textAlign: "left", opacity: 0.7 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  countText: { fontSize: 11, fontWeight: "700" },
  fillButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
  fillButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: themeColors.white,
    padding: 24,
    borderRadius: 16,
    width: "80%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: themeColors.charcoal,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCancelButton: { backgroundColor: "#f4f6f7" },
  modalDeleteButton: { backgroundColor: themeColors.red },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: themeColors.charcoal,
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: "600",
    color: themeColors.white,
  },
});
