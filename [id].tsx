import { COLORS, groups, students } from "@/src/data/mockData";
import { studentService } from "@/src/services/studentService";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Finding the student and their group based on the ID from the URL
  const student = students.find((s) => s.id === Number(id));
  const group = groups.find((g) => g.id === student?.group_id);

  if (!student) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centered}>
          <Text style={s.errorText}>Student not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getGroupColor = (groupName?: string) => {
    switch (groupName) {
      case "Alpha":
        return COLORS.teal;
      case "Beta":
        return COLORS.yellow;
      case "Gamma":
        return COLORS.red;
      default:
        return COLORS.gray;
    }
  };

  const groupColor = getGroupColor(group?.name);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header / Avatar Section */}
        <View style={s.header}>
          <View
            style={[
              s.avatar,
              { backgroundColor: groupColor + "20", borderColor: groupColor },
            ]}
          >
            <Text style={[s.avatarText, { color: groupColor }]}>
              {student.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </Text>
          </View>
          <Text style={s.name}>{student.full_name}</Text>
          <View style={[s.groupBadge, { backgroundColor: groupColor + "30" }]}>
            <Text style={[s.groupBadgeText, { color: groupColor }]}>
              {group?.name || "No Group"}
            </Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={s.infoSection}>
          <InfoRow icon="mail-outline" label="Email" value={student.email} />
          <View style={s.divider} />
          <InfoRow icon="call-outline" label="Phone" value={student.phone} />
          <View style={s.divider} />
          <InfoRow
            icon="calendar-outline"
            label="Year"
            value={`Year ${student.year_id}`}
          />
          <View style={s.divider} />
          <InfoRow
            icon="school-outline"
            label="Program ID"
            value={student.program_id.toString()}
          />
        </View>

        {/* Management Actions */}
        <View style={s.managementSection}>
          <Text style={s.sectionTitle}>Management</Text>

          <Pressable
            style={[
              s.editBtn,
              {
                marginBottom: 12,
                backgroundColor: "#1a1a1a",
                borderWidth: 1,
                borderColor: COLORS.teal,
              },
            ]}
            android_ripple={{ color: COLORS.tealDark + "30" }}
            onPress={() => setShowGroupModal(true)}
          >
            <Ionicons name="people-outline" size={20} color={COLORS.teal} />
            <Text style={[s.editBtnText, { color: COLORS.teal }]}>
              Change Group
            </Text>
          </Pressable>

          <Pressable
            style={s.editBtn}
            android_ripple={{ color: COLORS.tealDark }}
            onPress={() => console.log("Edit student:", student.id)}
          >
            <Ionicons name="create-outline" size={20} color={COLORS.black} />
            <Text style={s.editBtnText}>Edit Student Details</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Group Selector Modal */}
      <Modal
        visible={showGroupModal}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Group</Text>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <View style={s.groupList}>
              {groups.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    s.groupItem,
                    student.group_id === g.id && s.groupItemActive,
                  ]}
                  onPress={() => {
                    studentService
                      .updateStudentGroup(student.id.toString(), g.id)
                      .then(() => {
                        Alert.alert(
                          "Success",
                          `Student assigned to group ${g.name}`,
                        );
                        setShowGroupModal(false);
                      })
                      .catch((err) => {
                        console.error("Update failed:", err);
                        Alert.alert(
                          "Error",
                          "Could not update group assignment.",
                        );
                      });
                  }}
                >
                  <Text
                    style={[
                      s.groupItemText,
                      student.group_id === g.id && s.groupItemTextActive,
                    ]}
                  >
                    {g.name}
                  </Text>
                  {student.group_id === g.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={COLORS.teal}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={s.infoRow}>
      <View style={s.iconBg}>
        <Ionicons name={icon} size={20} color={COLORS.teal} />
      </View>
      <View>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.black },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: COLORS.white, fontSize: 16 },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 32 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: { fontSize: 32, fontWeight: "bold" },
  name: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.white,
    marginBottom: 8,
  },
  groupBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  groupBadgeText: { fontSize: 14, fontWeight: "700" },
  infoSection: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  infoLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 2 },
  infoValue: { fontSize: 16, color: COLORS.white, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#222", marginLeft: 56 },
  managementSection: { marginTop: 32 },
  sectionTitle: {
    color: COLORS.teal,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  editBtn: {
    backgroundColor: COLORS.teal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  editBtnText: { color: COLORS.black, fontWeight: "700", fontSize: 16 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#111",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: { color: COLORS.white, fontSize: 20, fontWeight: "700" },
  groupList: { gap: 12 },
  groupItem: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  groupItemActive: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.teal + "10",
  },
  groupItemText: { color: COLORS.gray, fontSize: 16, fontWeight: "600" },
  groupItemTextActive: { color: COLORS.white },
});
