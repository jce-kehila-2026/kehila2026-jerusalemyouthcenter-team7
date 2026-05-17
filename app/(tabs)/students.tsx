import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  COLORS,
  Group,
  groups as mockGroups,
  students as mockStudents,
  Student,
} from "../../src/data/mockData";
import { studentService } from "../../src/data/studentService";

type StudentWithGroup = Student & { group_name: string };

export default function StudentsListScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [groupsList, setGroupsList] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, g] = await Promise.all([
          studentService.getAllStudents(),
          studentService.getGroups(),
        ]);
        setStudentsList(s.length > 0 ? s : mockStudents); // Fallback to mock if DB is empty
        setGroupsList(g.length > 0 ? g : mockGroups);
      } catch (error) {
        console.error("Firebase fetch error:", error);
        setStudentsList(mockStudents);
        setGroupsList(mockGroups);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Enhance student data with group names and apply filtering
  const filteredStudents = useMemo(() => {
    const enriched = studentsList.map((student) => {
      const group = groupsList.find((g) => g.id === student.group_id);
      return {
        ...student,
        group_name: group ? group.name : "N/A",
      };
    });

    if (!searchQuery.trim()) return enriched;

    return enriched.filter(
      (s) =>
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery, studentsList, groupsList]);

  const getGroupColor = (groupName: string) => {
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

  const renderStudent = ({ item }: { item: StudentWithGroup }) => {
    const groupColor = getGroupColor(item.group_name);

    return (
      <Pressable
        onPress={() => router.push(`/student/${item.id}`)}
        style={({ pressed }) => [
          s.card,
          Platform.OS === "ios" && pressed && { opacity: 0.7 },
        ]}
        android_ripple={{ color: COLORS.tealLight + "30" }}
      >
        <View style={[s.cardAccent, { backgroundColor: groupColor }]} />
        <View style={s.cardContent}>
          <View style={s.cardHeader}>
            <View
              style={[s.groupBadge, { backgroundColor: groupColor + "30" }]}
            >
              <Text style={[s.groupBadgeText, { color: groupColor }]}>
                {item.group_name}
              </Text>
            </View>
          </View>
          <Text style={s.cardTitle}>{item.full_name}</Text>
          <Text style={s.cardDetail}>📧 {item.email}</Text>
          <Text style={s.cardDetail}>📞 {item.phone}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      <View style={s.header}>
        <Text style={s.orgName}>Jerusalem Youth Chorus</Text>
        <Text style={s.pageTitle}>Students</Text>

        <View style={s.searchContainer}>
          <TextInput
            style={s.searchInput}
            placeholder="Search students by name or email..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {loading ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>Loading...</Text>
        </View>
      ) : filteredStudents.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>
            {searchQuery
              ? "No students match your search"
              : "No students found"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderStudent}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.black },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  orgName: { color: COLORS.teal, fontSize: 13, fontWeight: "600" },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.white,
    marginTop: 2,
    marginBottom: 12,
  },
  searchContainer: {
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  searchInput: {
    height: 40,
    color: COLORS.white,
    fontSize: 14,
  },
  card: {
    backgroundColor: "#111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    overflow: "hidden",
  },
  cardAccent: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  groupBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  groupBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 4,
  },
  cardDetail: {
    fontSize: 13,
    color: "#aaa",
    lineHeight: 19,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 16,
  },
});
