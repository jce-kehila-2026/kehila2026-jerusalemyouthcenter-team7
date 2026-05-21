import { useAuth } from "@/src/context/AuthContext";
import { COLORS } from "@/src/data/mockData";
import { studentService } from "@/src/data/studentService";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

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
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedVoiceType, setSelectedVoiceType] = useState<VoiceType | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user?.role !== "admin") {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.content}>
          <Text style={s.errorText}>Only admins can access this page.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    if (!fullName || !email || !phone || !selectedVoiceType) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const newStudent = {
        full_name: fullName,
        email: email,
        phone: phone,
        voice_type: selectedVoiceType,
      };

      await studentService.addStudent(newStudent);
      Alert.alert("Success", "Student added successfully!");
      router.back();
    } catch (e) {
      console.error(e);
      setError("Failed to add student. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Add New Student</Text>

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <View style={s.inputGroup}>
          <Text style={s.label}>Full Name</Text>
          <TextInput
            style={s.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter full name"
            placeholderTextColor={COLORS.gray}
          />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="student@example.com"
            placeholderTextColor={COLORS.gray}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Phone Number</Text>
          <TextInput
            style={s.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+972..."
            placeholderTextColor={COLORS.gray}
            keyboardType="phone-pad"
          />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Voice Type</Text>
          <VoiceTypeSelector
            selectedVoice={selectedVoiceType}
            onSelect={setSelectedVoiceType}
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            s.saveBtn,
            pressed && { opacity: 0.8 },
            loading && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={s.saveBtnText}>Add Student</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { padding: 20 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.black,
    marginBottom: 20,
  },
  inputGroup: { marginBottom: 15 },
  label: {
    color: COLORS.teal,
    marginBottom: 5,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 8,
    padding: 12,
    color: COLORS.black,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.teal,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  saveBtnText: { color: COLORS.white, fontWeight: "bold", fontSize: 16 },
  voiceTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
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
  errorText: {
    color: COLORS.red,
    marginBottom: 10,
    textAlign: "center",
    fontWeight: "600",
  },
});
