import { useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const COLORS = {
  background: "#000000",
  card: "#2f2f2f",
  teal: "#11b5b9",
  red: "#cf6b55",
  white: "#ffffff",
  subtext: "#b0b0b0",
  border: "#444",
};

export default function EventDetail() {
  const { title, description, date, location, group } = useLocalSearchParams();

  const formattedDate = new Date(date).toLocaleString();

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
      }}
    >
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Group Badge */}
        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: COLORS.teal,
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 12,
            marginBottom: 18,
          }}
        >
          <Text
            style={{
              color: COLORS.white,
              fontWeight: "700",
            }}
          >
            {group || "All Groups"}
          </Text>
        </View>

        {/* Main Card */}
        <View
          style={{
            backgroundColor: COLORS.card,
            borderRadius: 28,
            padding: 24,
            borderLeftWidth: 5,
            borderLeftColor: COLORS.teal,
          }}
        >
          {/* Title */}
          <Text
            style={{
              color: COLORS.white,
              fontSize: 32,
              fontWeight: "bold",
              marginBottom: 18,
            }}
          >
            {title}
          </Text>

          {/* Date */}
          <Text
            style={{
              color: COLORS.subtext,
              fontSize: 16,
              marginBottom: 12,
            }}
          >
            📅 {formattedDate}
          </Text>

          {/* Location */}
          <Text
            style={{
              color: COLORS.teal,
              fontSize: 16,
              marginBottom: 25,
            }}
          >
            📍 {location || "Jerusalem Community Center"}
          </Text>

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: COLORS.border,
              marginBottom: 24,
            }}
          />

          {/* Description */}
          <Text
            style={{
              color: COLORS.white,
              fontSize: 18,
              lineHeight: 30,
            }}
          >
            {description}
          </Text>
        </View>
        {/* Buttons */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 25,
          }}
        >
          <TouchableOpacity
            onPress={() => alert("Joined Event!")}
            style={{
              flex: 1,
              backgroundColor: COLORS.teal,
              paddingVertical: 16,
              borderRadius: 16,
              marginRight: 10,
              alignItems: "center",
            }}
          >
            <Text
              style={{ color: COLORS.white, fontWeight: "bold", fontSize: 16 }}
            >
              Join Event
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => alert("Event Saved!")}
            style={{
              flex: 1,
              backgroundColor: COLORS.red,
              paddingVertical: 16,
              borderRadius: 16,
              marginLeft: 10,
              alignItems: "center",
            }}
          >
            <Text
              style={{ color: COLORS.white, fontWeight: "bold", fontSize: 16 }}
            >
              Save Event
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
