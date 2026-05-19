import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useAuth, UserType } from "../../src/context/AuthContext";
import {
  COLORS,
  Group,
  groups as mockGroups,
  students as mockStudents,
  Student,
} from "../../src/data/mockData";
import { studentService } from "../../src/data/studentService";

type StudentWithVoice = Student & {
  voice_type?: UserType["voice_type"];
};

type StudentWithGroup = Omit<StudentWithVoice, "year_id"> & {
  group_name: string;
  voice_type?: UserType["voice_type"];
  year_id: number | null;
};

export default function StudentsListScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(""); // For admin search
  const [selectedYearFilter, setSelectedYearFilter] = useState<string | null>(
    null,
  ); // For admin year filter
  const [selectedVoiceFilter, setSelectedVoiceFilter] = useState<string | null>(
    null,
  ); // For admin voice filter
  const [studentsList, setStudentsList] = useState<StudentWithVoice[]>([]);
  const [groupsList, setGroupsList] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          const [s, g] = await Promise.all([
            studentService.getAllStudents(),
            studentService.getGroups(),
          ]);

          // Fallback independently to handle cases where one collection might be empty in Firestore.
          setStudentsList(s.length > 0 ? s : mockStudents);
          setGroupsList(g.length > 0 ? g : mockGroups); // Always ensure groupsList has data for matching
        } catch (error) {
          console.error("Firebase fetch error:", error);
          setStudentsList(mockStudents);
          setGroupsList(mockGroups);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, []),
  );

  // Enhance student data with group names and apply filtering
  const filteredStudents = useMemo(() => {
    const enriched = studentsList.map((student) => {
      // Try to match group by ID or by name (in case group_id stores the name string) - this is for group_name display
      const group = groupsList.find(
        (g) => g.id === student.group_id || g.name === student.group_id,
      );
      const yearId =
        group?.year_id !== undefined
          ? Number(group.year_id)
          : student.year_id !== undefined
            ? Number(student.year_id)
            : null;

      return {
        ...student,
        // Use Year X format for display instead of Alpha/Beta/Gamma
        group_name: yearId ? `Year ${yearId}` : student.group_id || "N/A",
        year_id: yearId,
        voice_type: student.voice_type,
      };
    });

    let result = enriched;

    if (user?.role === "student") {
      // Students only see other students from their own year and voice section
      // Find the logged-in student's year by looking up their group assignment (chosen by admin)
      const myGroup = groupsList.find((g) => g.id === user.group_id);
      const myYear = myGroup ? Number(myGroup.year_id) : null;

      const myVoice = user.voice_type
        ? String(user.voice_type).trim().toLowerCase()
        : null;

      // Privacy protection: If the admin hasn't assigned them to a group/year yet, they see no one.
      if (myYear === null || !myVoice) return [];

      result = result.filter((s) => {
        // Ensure the comparison targets the same normalized format
        const otherYear = s.year_id != null ? Number(s.year_id) : null;
        const otherVoice = s.voice_type
          ? String(s.voice_type).trim().toLowerCase()
          : null;

        // Strict match: Same Year AND Same Voice
        const matchYear = otherYear === myYear;
        const matchVoice = otherVoice === myVoice;

        return matchYear && matchVoice;
      });
    } else {
      // Admins can filter by Year and Voice
      if (selectedYearFilter) {
        const yearNum = parseInt(selectedYearFilter.replace("Year ", ""), 10);
        if (!isNaN(yearNum))
          result = result.filter((s) => Number(s.year_id) === yearNum);
      }

      if (selectedVoiceFilter) {
        result = result.filter(
          (s) =>
            s.voice_type?.toLowerCase() === selectedVoiceFilter.toLowerCase(),
        );
      }
    }

    // Search works for everyone (Students search within their section)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.full_name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query),
      );
    }

    return result;
  }, [
    searchQuery,
    selectedYearFilter,
    selectedVoiceFilter,
    studentsList,
    groupsList,
    user,
  ]);

  useEffect(() => {
    console.log("Filtered Students Count (final):", filteredStudents.length);
  }, [filteredStudents]);

  const getGroupColor = (groupName: string) => {
    switch (groupName) {
      case "Year 1":
        return COLORS.yellow;
      case "Year 2":
        return COLORS.red;
      case "Year 3":
        return "#8b5cf6";
      case "All Groups":
        return COLORS.teal;
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
          <Text style={s.cardDetail}>
            🎤{" "}
            {item.voice_type
              ? item.voice_type.charAt(0).toUpperCase() +
                item.voice_type.slice(1)
              : "N/A"}
          </Text>
          <Text style={s.cardDetail}>📞 {item.phone}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

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

      {user?.role === "admin" && (
        <>
          <View style={s.legendContainer}>
            <Text style={s.legendTitle}>Years</Text>
            <View style={s.legend}>
              {[
                { label: "All", value: null },
                { label: "Year 1", value: "Year 1" },
                { label: "Year 2", value: "Year 2" },
                { label: "Year 3", value: "Year 3" },
              ].map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => setSelectedYearFilter(item.value)}
                  style={[
                    s.legendItem,
                    selectedYearFilter === item.value && s.legendItemActive,
                  ]}
                >
                  <View
                    style={[
                      s.legendDot,
                      {
                        backgroundColor: getGroupColor(
                          item.label === "All" ? "All Groups" : item.label,
                        ),
                      },
                    ]}
                  />
                  <Text
                    style={[
                      s.legendText,
                      selectedYearFilter === item.value && s.legendTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={s.legendContainer}>
            <Text style={s.legendTitle}>Voice Sections</Text>
            <View style={s.legend}>
              {[
                { label: "All", value: null },
                { label: "Bass", value: "bass" },
                { label: "Tenor", value: "tenor" },
                { label: "Alto", value: "alto" },
                { label: "Soprano", value: "soprano" },
              ].map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => setSelectedVoiceFilter(item.value)}
                  style={[
                    s.legendItem,
                    selectedVoiceFilter === item.value && s.legendItemActive,
                  ]}
                >
                  <View
                    style={[s.legendDot, { backgroundColor: COLORS.gray }]}
                  />
                  <Text
                    style={[
                      s.legendText,
                      selectedVoiceFilter === item.value && s.legendTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      )}

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
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStudent}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {user?.role === "admin" && (
        <Pressable style={s.fab} onPress={() => router.push("/add-student")}>
          <Text style={s.fabText}>+</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  legendContainer: { paddingHorizontal: 16, marginBottom: 8 },
  legendTitle: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  legend: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendItemActive: {
    backgroundColor: COLORS.tealLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: COLORS.gray, fontSize: 12 },
  legendTextActive: { color: COLORS.teal, fontWeight: "700" },
  orgName: { color: COLORS.teal, fontSize: 13, fontWeight: "600" },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.black,
    marginTop: 2,
    marginBottom: 12,
  },
  searchContainer: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    height: 40,
    color: COLORS.black,
    fontSize: 14,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    backgroundColor: COLORS.teal,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    fontSize: 28,
    color: COLORS.black,
    fontWeight: "300",
    lineHeight: 32,
  },
  card: {
    backgroundColor: COLORS.white,
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
    color: COLORS.black,
    marginBottom: 4,
  },
  cardDetail: {
    fontSize: 13,
    color: COLORS.gray,
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
