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

const GROUP_STYLES: Record<string, { bg: string; text: string }> = {
  "All Groups": { bg: T.tealBg, text: T.teal },
  "Year 1": { bg: T.yellowBg, text: "#9a7b20" },
  "Year 2": { bg: T.redBg, text: T.red },
  "Year 3": { bg: T.purpleBg, text: T.purple },
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

function getDateParts(dateStr?: string) {
  if (!dateStr) return { day: "--", month: "" };
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

  // Two calling conventions are supported:
  // 1) individual fields — used by the admin Events screen
  //    (title, date, time, location, group, eventId)
  // 2) a single JSON-encoded "event" param — used by older student screens
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
  const date = params.date || parsedEvent.date;
  const time = params.time || parsedEvent.time;
  const location = params.location || parsedEvent.location;
  const group =
    (params.group as string) ||
    parsedEvent.groupLabel ||
    parsedEvent.group_name ||
    "All Groups";
  const studentName = params.studentName as string | undefined;
  const studentId = params.studentId as string | undefined;
  // Prefer a real auth uid when available; fall back to the student's name
  // since there's no auth/ID system wired up everywhere yet.
  const studentKey = studentId || studentName;

  const groupStyle = GROUP_STYLES[group] || GROUP_STYLES["All Groups"];
  const dateParts = getDateParts(typeof date === "string" ? date : undefined);

  // RSVP — a separate "intent" declaration from the student, independent
  // of the admin's actual attendance marking.
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
          paddingHorizontal: 20,
          paddingTop: 50,
          paddingBottom: 20,
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

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Group badge */}
        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: groupStyle.bg,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 999,
            marginBottom: 16,
          }}
        >
          <Text
            style={{ color: groupStyle.text, fontWeight: "700", fontSize: 12 }}
          >
            {group}
          </Text>
        </View>

        {/* Main card */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: T.border,
            overflow: "hidden",
            flexDirection: "row",
          }}
        >
          <View
            style={{
              width: 80,
              flexShrink: 0,
              backgroundColor: groupStyle.text,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 20,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 26,
                fontWeight: "700",
                lineHeight: 28,
              }}
            >
              {dateParts.day}
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
              {dateParts.month}
            </Text>
            {time ? (
              <Text
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 11,
                  marginTop: 10,
                }}
              >
                {time}
              </Text>
            ) : null}
          </View>

          <View style={{ flex: 1, minWidth: 0, padding: 22 }}>
            <Text
              style={{
                color: T.text,
                fontSize: 22,
                fontWeight: "800",
                marginBottom: 14,
              }}
            >
              {title}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 18,
              }}
            >
              <Text style={{ fontSize: 14 }}>📍</Text>
              <Text style={{ color: T.teal, fontSize: 14, fontWeight: "600" }}>
                {location || "Jerusalem Community Center"}
              </Text>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: T.border,
                marginBottom: 18,
              }}
            />

            <Text style={{ color: T.text, fontSize: 15, lineHeight: 23 }}>
              {description}
            </Text>
          </View>
        </View>

        {/* RSVP — only shown when we know who's responding (student flow) */}
        {studentKey ? (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 22,
              borderWidth: 1,
              borderColor: T.border,
              marginTop: 16,
            }}
          >
            <Text
              style={{
                color: T.text,
                fontSize: 15,
                fontWeight: "700",
                marginBottom: 14,
              }}
            >
              Are you coming?
            </Text>

            {loadingRsvp ? (
              <ActivityIndicator color={T.teal} />
            ) : (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  disabled={saving}
                  onPress={() => respond("coming")}
                  style={{
                    flex: 1,
                    backgroundColor:
                      rsvpStatus === "coming" ? T.teal : T.tealBg,
                    borderWidth: 1.5,
                    borderColor: T.teal,
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: rsvpStatus === "coming" ? "#fff" : T.teal,
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
                    paddingVertical: 14,
                    borderRadius: 14,
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
                  marginTop: 10,
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
                  marginTop: 10,
                  textAlign: "center",
                }}
              >
                Couldn&apos;t save your response — please try again.
              </Text>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
