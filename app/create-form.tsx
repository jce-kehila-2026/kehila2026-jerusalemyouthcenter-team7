import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Official Jerusalem Youth Chorus Colors
const themeColors = {
  teal: "#039899",
  red: "#c56451",
  yellow: "#cfad5d",
  bluishWhite: "#f5fafe",
  charcoal: "#353535",
  white: "#ffffff",
};

export default function CreateFormScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = () => {
    // Mock save action
    alert("Form saved successfully!");
    router.back();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.bluishWhite }]}
      edges={["top", "bottom"]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.charcoal} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: themeColors.charcoal }]}>
          Create New Form
        </Text>
        <View style={{ width: 24 }} /> {/* Spacer for centering title */}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: themeColors.white }]}>
            <Text style={[styles.label, { color: themeColors.charcoal }]}>
              Form Title
            </Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: "#e0e0e0", color: themeColors.charcoal },
              ]}
              placeholder="Enter form title..."
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[styles.label, { color: themeColors.charcoal }]}>
              Form Description
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { borderColor: "#e0e0e0", color: themeColors.charcoal },
              ]}
              placeholder="Enter form description..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          <Pressable
            style={[
              styles.addButton,
              {
                backgroundColor: themeColors.bluishWhite,
                borderColor: themeColors.teal,
              },
            ]}
            onPress={() => alert("Add Question UI coming soon!")}
          >
            <Ionicons name="add" size={20} color={themeColors.teal} />
            <Text style={[styles.addButtonText, { color: themeColors.teal }]}>
              Add Question
            </Text>
          </Pressable>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { backgroundColor: themeColors.white, borderTopColor: "#e0e0e0" },
          ]}
        >
          <Pressable
            style={[styles.saveButton, { backgroundColor: themeColors.teal }]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save Form</Text>
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: themeColors.white,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  content: { padding: 16, gap: 16 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#fafafa",
    marginBottom: 16,
  },
  textArea: { minHeight: 100, textAlignVertical: "top", marginBottom: 0 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  addButtonText: { fontSize: 15, fontWeight: "600" },
  footer: { padding: 16, borderTopWidth: 1 },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
