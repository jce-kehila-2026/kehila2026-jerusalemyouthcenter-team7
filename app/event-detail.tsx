import { db } from "@/src/firebase/firebase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
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

const sp = (n: number) => n * 8;

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

function getDateParts(dateStr: string | string[] | undefined) {
  if (!dateStr || typeof dateStr !== "string") return { day: "--", month: "" };
  const isoPart = dateStr.split("T")[0];
  const segments = isoPart.includes("-") ? isoPart.split("-") : null;
  if (!segments || segments.length < 3) return { day: "--", month: "" };
  const [, month, day] = segments;
  const monthIndex = parseInt(month, 10) - 1;
  return {
    day: String(parseInt(day, 10)),
    month: MONTH_ABBR[monthIndex] || "",
  };
}

export default function EventDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();

  // Two calling conventions:
  // 1) individual fields — admin Events screen
  // 2) JSON-encoded "event" param — student screen
  let parsedEvent: any = {};
  if (params.event) {
    try {
      parsedEvent = JSON.parse(params.event as string);
    } catch {
      parsedEvent = {};
    }
  }

  const eventId = params.eventId || parsedEvent.id || parsedEvent.eventId;
  const title = params.title || parsedEvent.title;
  const description = params.description || parsedEvent.description;
  const date = (params.date || parsedEvent.date) as string | undefined;
  const time = (params.time || parsedEvent.time) as string | undefined;
  const location = params.location || parsedEvent.location;
  const group =
    (params.group as string) ||
    parsedEvent.groupLabel ||
    parsedEvent.group_name ||
    "All Groups";
  const studentName = params.studentName as string | undefined;
  const studentId = params.studentId as string | undefined;
  const studentKey = studentId || studentName;

  const groupStyle = GROUP_STYLES[group] || GROUP_STYLES["All Groups"];
  const { day, month } = getDateParts(date);

  // RSVP
  const [rsvpStatus, setRsvpStatus] = useState<"coming" | "not_coming" | null>(
    null,
  );
  const [loadingRsvp, setLoadingRsvp] = useState(!!studentKey);
  const [saving, setSaving] = useState(false);
  const [rsvpError, setRsvpError] = useState(false);

  const rsvpDocId = studentKey && eventId ? `${eventId}_${studentKey}` : null;

  useEffect(() => {
    if (!rsvpDocId) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "rsvps", rsvpDocId));
        if (snap.exists()) setRsvpStatus(snap.data().status);
      } catch (e) {
        console.error("RSVP load error:", e);
      } finally {
        setLoadingRsvp(false);
      }
    };
    load();
  }, [rsvpDocId]);

  const respond = async (status: "coming" | "not_coming") => {
    if (!rsvpDocId) return;
    setSaving(true);
    setRsvpError(false);
    try {
      await setDoc(doc(db, "rsvps", rsvpDocId), {
        eventId,
        studentName,
        studentId,
        status,
        updatedAt: serverTimestamp(),
      });
      setRsvpStatus(status);
    } catch (e) {
      console.error("RSVP save error:", e);
      setRsvpError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: T.teal,
          paddingHorizontal: sp(2),
          paddingTop: 50,
          paddingBottom: sp(2),
          flexDirection: "row",
          alignItems: "center",
          gap: sp(1.5),
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

      <ScrollView contentContainerStyle={{ padding: sp(2), gap: sp(2) }}>
        {/* ── Single unified card ── */}
        <View
          style={{
            backgroundColor: T.white,
            borderRadius: 20,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: T.border,
            shadowColor: T.teal,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          {/* Top row: date block + content */}
          <View style={{ flexDirection: "row" }}>
            {/* Side date block */}
            <View
              style={{
                width: 80,
                backgroundColor: groupStyle.block,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: sp(3),
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 28,
                  fontWeight: "800",
                  lineHeight: 30,
                }}
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
              {time ? (
                <Text
                  style={{
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 11,
                    marginTop: sp(0.5),
                  }}
                >
                  {time}
                </Text>
              ) : null}
            </View>

            {/* Main content */}
            <View style={{ flex: 1, padding: sp(2) }}>
              {/* Group badge */}
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: groupStyle.bg,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  marginBottom: sp(1),
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
                  marginBottom: sp(0.5),
                }}
              >
                {title}
              </Text>

              {location ? (
                <Text
                  style={{
                    color: T.teal,
                    fontSize: 13,
                    fontWeight: "600",
                    marginBottom: sp(1),
                  }}
                >
                  📍 {location}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: T.border,
              marginHorizontal: sp(2),
            }}
          />

          {/* Description */}
          {description ? (
            <View style={{ padding: sp(2) }}>
              <Text style={{ color: T.textSub, fontSize: 14, lineHeight: 22 }}>
                {description}
              </Text>
            </View>
          ) : null}

          {/* RSVP section — only for students */}
          {studentKey ? (
            <>
              <View
                style={{
                  height: 1,
                  backgroundColor: T.border,
                  marginHorizontal: sp(2),
                }}
              />
              <View style={{ padding: sp(2) }}>
                <Text
                  style={{
                    color: T.text,
                    fontSize: 14,
                    fontWeight: "700",
                    marginBottom: sp(1.5),
                  }}
                >
                  Are you coming?
                </Text>

                {loadingRsvp ? (
                  <ActivityIndicator color={T.teal} />
                ) : (
                  <View style={{ flexDirection: "row", gap: sp(1) }}>
                    <Pressable
                      disabled={saving}
                      onPress={() => respond("coming")}
                      style={{
                        flex: 1,
                        backgroundColor:
                          rsvpStatus === "coming"
                            ? groupStyle.block
                            : groupStyle.bg,
                        borderWidth: 1.5,
                        borderColor: groupStyle.block,
                        paddingVertical: sp(1.5),
                        borderRadius: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color:
                            rsvpStatus === "coming" ? "#fff" : groupStyle.text,
                          fontWeight: "700",
                          fontSize: 14,
                        }}
                      >
                        ✓ I&apos;m Coming
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={saving}
                      onPress={() => respond("not_coming")}
                      style={{
                        flex: 1,
                        backgroundColor:
                          rsvpStatus === "not_coming" ? T.red : T.redBg,
                        borderWidth: 1.5,
                        borderColor: T.red,
                        paddingVertical: sp(1.5),
                        borderRadius: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: rsvpStatus === "not_coming" ? "#fff" : T.red,
                          fontWeight: "700",
                          fontSize: 14,
                        }}
                      >
                        ✕ Can&apos;t Make It
                      </Text>
                    </Pressable>
                  </View>
                )}

                {rsvpStatus && !loadingRsvp && !rsvpError && (
                  <Text
                    style={{
                      color: T.muted,
                      fontSize: 12,
                      marginTop: sp(1),
                      textAlign: "center",
                    }}
                  >
                    {rsvpStatus === "coming"
                      ? "You're marked as coming ✓"
                      : "You're marked as not coming"}
                  </Text>
                )}

                {rsvpError && (
                  <Text
                    style={{
                      color: T.red,
                      fontSize: 12,
                      marginTop: sp(1),
                      textAlign: "center",
                    }}
                  >
                    Couldn&apos;t save your response — please try again.
                  </Text>
                )}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
