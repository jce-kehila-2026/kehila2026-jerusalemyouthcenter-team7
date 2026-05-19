import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/src/context/AuthContext";
import { forms } from "@/src/data/mockData";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// 1. Official Jerusalem Youth Chorus Colors
const themeColors = {
  teal: "#039899", // Primary
  red: "#c56451", // Errors / Urgent
  yellow: "#cfad5d", // Warnings / Accents
  bluishWhite: "#f5fafe",
  charcoal: "#353535",
  white: "#ffffff",
};

const typeIcons: Record<string, React.ComponentProps<typeof Ionicons>["name"]> =
  {
    text: "text-outline",
    multiple_choice: "radio-button-on-outline",
    yes_no: "checkmark-circle-outline",
  };

export default function FormsScreen() {
  const { user } = useAuth();
  const userRole = user?.role || "student";
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const visibleForms = forms.filter((f) => {
    if (userRole === "admin") return true; // Admin sees all forms
    return f.target_audience === "student" || f.target_audience === "both"; // Students see matching forms
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.bluishWhite }]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: themeColors.charcoal }]}>
            Forms
          </Text>
          <Text style={styles.subtitle}>{visibleForms.length} active</Text>
        </View>
        {userRole === "admin" && (
          <Pressable
            style={styles.manageButton}
            onPress={() => router.push("/create-form" as any)}
          >
            <Text style={styles.manageButtonText}>Manage Forms</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={visibleForms}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          // Dynamic color assignment: Teal, Red, Yellow cycle
          const colors = [
            themeColors.teal,
            themeColors.red,
            themeColors.yellow,
          ];
          const activeColor = colors[index % 3];

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
                    {item.title}
                  </Text>
                  <Text style={styles.cardDate}>Created {item.created_at}</Text>
                </View>

                {userRole === "admin" ? (
                  <View style={styles.adminActions}>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => alert("Edit form " + item.id)}
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={18}
                        color={themeColors.charcoal}
                      />
                    </Pressable>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => alert("Delete form " + item.id)}
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

              <Text
                style={[styles.description, { color: themeColors.charcoal }]}
                numberOfLines={2}
              >
                {item.description}
              </Text>

              <View style={styles.questionsList}>
                {item.questions.slice(0, 2).map((q) => (
                  <View key={q.id} style={styles.questionRow}>
                    <Ionicons
                      name={typeIcons[q.type]}
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
                      {q.text}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.footer}>
                {/* Submit button uses the dynamic color */}
                <Pressable
                  style={[styles.fillButton, { backgroundColor: activeColor }]}
                  onPress={() => router.push(`/form/${item.id}` as any)}
                >
                  <Text style={styles.fillButtonText}>Fill out</Text>
                </Pressable>

                <View
                  style={[
                    styles.countBadge,
                    { backgroundColor: activeColor + "26" },
                  ]}
                >
                  <Text style={[styles.countText, { color: activeColor }]}>
                    {item.questions.length} questions
                  </Text>
                  <Ionicons
                    name="help-circle-outline"
                    size={13}
                    color={activeColor}
                  />
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    // Soft shadow for cards
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
});
