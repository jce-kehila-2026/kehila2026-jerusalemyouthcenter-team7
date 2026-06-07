import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
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
  gray: "#e0e0e0",
};

export default function CreateFormScreen() {
  const router = useRouter();
  const { id, isEditing, formData } = useLocalSearchParams<{
    id?: string;
    isEditing?: string;
    formData?: string;
  }>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<
    { id: string; text: string; type: string; options?: string[] }[]
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing === "true" && formData) {
      try {
        const parsedData = JSON.parse(formData);
        setTitle(parsedData.title || "");
        setDescription(parsedData.description || "");
        setQuestions(parsedData.questions || []);
      } catch (error) {
        console.error("Error parsing form data:", error);
      }
    }
  }, [isEditing, formData]);

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Error", "Please provide a title and description.");
      return;
    }

    setLoading(true);
    try {
      if (isEditing === "true" && id) {
        const updatedForm = {
          title: title.trim(),
          description: description.trim(),
          questions: questions,
        };
        await updateDoc(doc(db, "forms", id), updatedForm);
        Alert.alert("Success", "Form updated successfully!");
      } else {
        const newForm = {
          title: title.trim(),
          description: description.trim(),
          createdAt: new Date().toISOString(),
          target_audience: "both", // Default for now
          questions: questions,
        };
        await addDoc(collection(db, "forms"), newForm);
        Alert.alert("Success", "Form created successfully!");
      }
      router.back();
    } catch (error) {
      console.error("Error creating form:", error);
      Alert.alert("Error", "Failed to save the form. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { id: Date.now().toString(), text: "", type: "text", options: [""] },
    ]);
  };

  const updateQuestionText = (id: string, text: string) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, text } : q)));
  };

  const updateQuestionType = (id: string, type: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === id
          ? { ...q, type, options: q.options?.length ? q.options : [""] }
          : q,
      ),
    );
  };

  const updateOption = (qId: string, optIndex: number, text: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          const newOptions = [...(q.options || [])];
          newOptions[optIndex] = text;
          return { ...q, options: newOptions };
        }
        return q;
      }),
    );
  };

  const addOption = (qId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          return { ...q, options: [...(q.options || []), ""] };
        }
        return q;
      }),
    );
  };

  const removeOption = (qId: string, optIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          const newOptions = [...(q.options || [])];
          newOptions.splice(optIndex, 1);
          return { ...q, options: newOptions };
        }
        return q;
      }),
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.bluishWhite }]}
      edges={["top", "bottom"]}
    >
      <View style={[styles.header, { backgroundColor: themeColors.teal }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.white} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: themeColors.white }]}>
          {isEditing === "true" ? "Edit Form" : "Create New Form"}
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
                { borderColor: themeColors.gray, color: themeColors.charcoal },
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
                { borderColor: themeColors.gray, color: themeColors.charcoal },
              ]}
              placeholder="Enter form description..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          {questions.map((q, index) => (
            <View
              key={q.id}
              style={[styles.card, { backgroundColor: themeColors.white }]}
            >
              <View style={styles.questionHeader}>
                <Text style={[styles.label, { color: themeColors.charcoal }]}>
                  Question {index + 1}
                </Text>
                <Pressable onPress={() => removeQuestion(q.id)}>
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={themeColors.red}
                  />
                </Pressable>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: themeColors.gray,
                    color: themeColors.charcoal,
                    marginBottom: 12,
                  },
                ]}
                placeholder="Enter question text..."
                placeholderTextColor="#999"
                value={q.text}
                onChangeText={(text) => updateQuestionText(q.id, text)}
              />

              <View style={styles.typeSelector}>
                <Pressable
                  style={[
                    styles.typeBtn,
                    q.type === "text" && styles.typeBtnActive,
                  ]}
                  onPress={() => updateQuestionType(q.id, "text")}
                >
                  <Ionicons
                    name="text-outline"
                    size={16}
                    color={
                      q.type === "text" ? themeColors.teal : themeColors.gray
                    }
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      q.type === "text" && styles.typeBtnTextActive,
                    ]}
                  >
                    Text Answer
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.typeBtn,
                    q.type === "multiple_choice" && styles.typeBtnActive,
                  ]}
                  onPress={() => updateQuestionType(q.id, "multiple_choice")}
                >
                  <Ionicons
                    name="list-outline"
                    size={16}
                    color={
                      q.type === "multiple_choice"
                        ? themeColors.teal
                        : themeColors.gray
                    }
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      q.type === "multiple_choice" && styles.typeBtnTextActive,
                    ]}
                  >
                    Multiple Choice
                  </Text>
                </Pressable>
              </View>

              {q.type === "multiple_choice" && (
                <View style={styles.optionsContainer}>
                  {(q.options || []).map((opt, optIdx) => (
                    <View key={optIdx} style={styles.optionRow}>
                      <Ionicons
                        name="radio-button-off"
                        size={20}
                        color={themeColors.gray}
                      />
                      <TextInput
                        style={styles.optionInput}
                        placeholder={`Option ${optIdx + 1}`}
                        placeholderTextColor="#999"
                        value={opt}
                        onChangeText={(txt) => updateOption(q.id, optIdx, txt)}
                      />
                      {(q.options || []).length > 1 && (
                        <Pressable
                          onPress={() => removeOption(q.id, optIdx)}
                          style={styles.removeOptionBtn}
                        >
                          <Ionicons
                            name="close"
                            size={20}
                            color={themeColors.red}
                          />
                        </Pressable>
                      )}
                    </View>
                  ))}
                  <Pressable
                    style={styles.addOptionBtn}
                    onPress={() => addOption(q.id)}
                  >
                    <Ionicons name="add" size={18} color={themeColors.teal} />
                    <Text
                      style={[
                        styles.addOptionText,
                        { color: themeColors.teal },
                      ]}
                    >
                      Add Option
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}

          <Pressable
            style={[
              styles.addButton,
              {
                backgroundColor: themeColors.bluishWhite,
                borderColor: themeColors.teal,
              },
            ]}
            onPress={addQuestion}
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
            {
              backgroundColor: themeColors.white,
              borderTopColor: themeColors.gray,
            },
          ]}
        >
          <Pressable
            style={[
              styles.saveButton,
              { backgroundColor: themeColors.teal },
              loading && { opacity: 0.7 },
            ]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? "Saving..." : "Save Form"}
            </Text>
            {!loading && (
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#fff"
              />
            )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: themeColors.teal,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  content: { padding: 16, gap: 16 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.teal + "40",
    borderLeftWidth: 4,
    borderLeftColor: themeColors.teal,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
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
  typeSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.gray,
    backgroundColor: "#f9f9f9",
  },
  typeBtnActive: {
    borderColor: themeColors.teal,
    backgroundColor: themeColors.bluishWhite,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: themeColors.charcoal,
  },
  typeBtnTextActive: {
    color: themeColors.teal,
  },
  optionsContainer: {
    marginTop: 4,
    gap: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.gray,
    paddingVertical: 8,
    fontSize: 15,
    color: themeColors.charcoal,
  },
  removeOptionBtn: {
    padding: 4,
  },
  addOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  addOptionText: {
    fontSize: 14,
    fontWeight: "600",
  },
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
