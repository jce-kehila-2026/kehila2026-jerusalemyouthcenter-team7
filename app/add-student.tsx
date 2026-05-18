import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../src/data/mockData";
import { studentService } from "../src/data/studentService";

export default function AddStudentScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    group_id: "1",
    year_id: 1,
    program_id: 1,
  });

  const handleSave = async () => {
    if (!form.full_name || !form.email) {
      Alert.alert("Error", "Please fill in at least the name and email.");
      return;
    }

    try {
      await studentService.addStudent(form);
      Alert.alert("Success", "Student added successfully!");
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to add student.");
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Add New Student</Text>

        <View style={s.inputGroup}>
          <Text style={s.label}>Full Name</Text>
          <TextInput
            style={s.input}
            value={form.full_name}
            onChangeText={(v) => setForm({ ...form, full_name: v })}
            placeholder="Enter full name"
            placeholderTextColor={COLORS.gray}
          />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={form.email}
            onChangeText={(v) => setForm({ ...form, email: v })}
            placeholder="student@example.com"
            placeholderTextColor={COLORS.gray}
            keyboardType="email-address"
          />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Phone</Text>
          <TextInput
            style={s.input}
            value={form.phone}
            onChangeText={(v) => setForm({ ...form, phone: v })}
            placeholder="+972..."
            placeholderTextColor={COLORS.gray}
          />
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveBtnText}>Save Student</Text>
        </TouchableOpacity>
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
});
