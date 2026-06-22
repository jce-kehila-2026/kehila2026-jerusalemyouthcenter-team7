import { db } from "@/src/firebase/firebase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    SafeAreaView,
    ScrollView,
    Text,
    View,
} from "react-native";

const T = {
  teal: "#039899",
  tealBg: "#f0fafa",
  red: "#c56451",
  redBg: "#fff1ee",
  yellow: "#cfad5d",
  yellowBg: "#fffbf0",
  purple: "#6b5ce7",
  purpleBg: "#f3f0ff",
  white: "#ffffff",
  bg: "#f5fafe",
  border: "#e8eef2",
  text: "#1a1a2e",
  textSub: "#5a6a7a",
  muted: "#9aa8b4",
};

const MONTH_ABBR = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const GROUP_STYLES: Record<
  string,
  { bg: string; text: string; block: string }
> = {
  "All Groups": { bg: T.tealBg, text: T.teal, block: T.teal },
  "Year 1": { bg: T.yellowBg, text: "#9a7b20", block: T.yellow },
  "Year 2": { bg: T.redBg, text: T.red, block: T.red },
  "Year 3": { bg: T.purpleBg, text: T.purple, block: T.purple },
  "From Google Calendar": { bg: T.tealBg, text: T.teal, block: T.teal },
};

export default function EventDetailById() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "events", id))
      .then((snap) => {
        if (snap.exists()) setEvent({ id: snap.id, ...snap.data() });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const group =
    event?.groupLabel || event?.group_name || event?.group || "All Groups";
  const groupStyle = GROUP_STYLES[group] || GROUP_STYLES["All Groups"];

  let day = "--",
    month = "";
  if (event?.date) {
    const parts = event.date.split("T")[0].split("-");
    if (parts.length >= 3) {
      day = String(parseInt(parts[2], 10));
      month = MONTH_ABBR[parseInt(parts[1], 10) - 1] || "";
    }
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: T.bg,
        }}
      >
        <ActivityIndicator size="large" color={T.teal} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <View
        style={{
          backgroundColor: T.teal,
          paddingHorizontal: 16,
          paddingTop: 50,
          paddingBottom: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: "rgba(255,255,255,0.25)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
            ←
          </Text>
        </Pressable>
        <Text
          style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}
          numberOfLines={1}
        >
          Event Details
        </Text>
      </View>

      {!event ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: T.muted, fontSize: 16 }}>Event not found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View
            style={{
              backgroundColor: T.white,
              borderRadius: 20,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: T.border,
              elevation: 3,
            }}
          >
            <View style={{ flexDirection: "row" }}>
              <View
                style={{
                  width: 80,
                  backgroundColor: groupStyle.block,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 24,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 28, fontWeight: "800" }}
                >
                  {day}
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.9)",
                    fontSize: 12,
                    fontWeight: "600",
                    letterSpacing: 1,
                    marginTop: 2,
                  }}
                >
                  {month}
                </Text>
                {event.time ? (
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.85)",
                      fontSize: 11,
                      marginTop: 4,
                    }}
                  >
                    {event.time}
                  </Text>
                ) : null}
              </View>
              <View style={{ flex: 1, padding: 16 }}>
                <View
                  style={{
                    alignSelf: "flex-start",
                    backgroundColor: groupStyle.bg,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      color: groupStyle.text,
                      fontWeight: "700",
                      fontSize: 11,
                    }}
                  >
                    {group}
                  </Text>
                </View>
                <Text
                  style={{
                    color: T.text,
                    fontSize: 20,
                    fontWeight: "800",
                    marginBottom: 4,
                  }}
                >
                  {event.title}
                </Text>
                {event.location ? (
                  <Text
                    style={{ color: T.teal, fontSize: 13, fontWeight: "600" }}
                  >
                    📍 {event.location}
                  </Text>
                ) : null}
              </View>
            </View>

            {event.description ? (
              <>
                <View
                  style={{
                    height: 1,
                    backgroundColor: T.border,
                    marginHorizontal: 16,
                  }}
                />
                <View style={{ padding: 16 }}>
                  <Text
                    style={{ color: T.textSub, fontSize: 14, lineHeight: 22 }}
                  >
                    {event.description}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
