import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
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
import { COLORS } from "../src/data/mockData";
import { studentService } from "../src/data/studentService";

type VoiceType = "bass" | "tenor" | "alto" | "soprano";

const voiceTypes: VoiceType[] = ["bass", "tenor", "alto", "soprano"];

function VoiceTypeSelector({
  selectedVoice,
  onSelect,
}: {
  selectedVoice: VoiceType | null;
  onSelect: (voice: VoiceType) => void;
}) {
  return (
    <View style={s.voiceTypeContainer}>
      {voiceTypes.map((voice) => (
        <Pressable
          key={voice}
          onPress={() => onSelect(voice)}
          style={[
            s.voiceTypePill,
            selectedVoice === voice && s.voiceTypePillActive,
          ]}
        >
          <Text
            style={[
              s.voiceTypeText,
              selectedVoice === voice && s.voiceTypeTextActive,
            ]}
          >
            {voice.charAt(0).toUpperCase() + voice.slice(1)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function AddStudentScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [yearJoined, setYearJoined] = useState("");
  const [selectedVoiceType, setSelectedVoiceType] = useState<VoiceType | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAddStudent = async () => {
    if (
      !fullName ||
      !phone ||
      !schoolName ||
      !yearJoined ||
      !selectedVoiceType
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // For simplicity, some fields are mocked or left empty as they are not part of this form
      const newStudent = {
        full_name: fullName,
        email: email || undefined, // Optional email
        phone: phone,
        school_name: schoolName,
        voice_type: selectedVoiceType,
        year_joined: parseInt(yearJoined, 10),
      };

      await studentService.addStudent(newStudent);
      Alert.alert("Success", "Student added successfully!");
      router.back(); // Go back to the student list
    } catch (e: any) {
      console.error("Error adding student:", e);
      setError("Failed to add student. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.pageTitle}>Add New Student</Text>

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <Text style={s.label}>Full Name</Text>
          <TextInput
            style={s.input}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={s.label}>Email (Optional)</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={s.label}>Phone Number</Text>
          <TextInput
            style={s.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={s.label}>School Name</Text>
          <TextInput
            style={s.input}
            value={schoolName}
            onChangeText={setSchoolName}
          />

          <Text style={s.label}>Year Joined</Text>
          <TextInput
            style={s.input}
            value={yearJoined}
            onChangeText={setYearJoined}
            keyboardType="numeric"
          />

          <Text style={s.label}>Voice Type</Text>
          <VoiceTypeSelector
            selectedVoice={selectedVoiceType}
            onSelect={setSelectedVoiceType}
          />

          <Pressable
            style={({ pressed }) => [
              s.button,
              pressed && { opacity: 0.8 },
              loading && { opacity: 0.6 },
            ]}
            onPress={handleAddStudent}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={s.buttonText}>Add Student</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  scroll: { padding: 16 },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.black,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gray,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: COLORS.black,
  },
  voiceTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  voiceTypePill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: COLORS.grayLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  voiceTypePillActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  voiceTypeText: {
    color: COLORS.gray,
    fontWeight: "500",
  },
  voiceTypeTextActive: {
    color: COLORS.white,
  },
  button: {
    backgroundColor: COLORS.teal,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "700",
  },
  errorText: {
    color: COLORS.red,
    marginBottom: 10,
    textAlign: "center",
  },
});
