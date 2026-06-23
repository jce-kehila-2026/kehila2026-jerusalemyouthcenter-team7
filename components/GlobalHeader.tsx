import { useAuth } from "@/src/context/AuthContext";
import { messageService } from "@/src/data/messageService";
import { notificationService } from "@/src/data/notificationService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TEAL = "#039899";

type Props = { title: string };

export function GlobalHeader({ title }: Props) {
  const router  = useRouter();
  const { user } = useAuth();
  const insets  = useSafeAreaInsets();

  const [unreadNotifs,   setUnreadNotifs]   = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const uid = user?.uid ?? "";

  useEffect(() => {
    if (!uid) return;
    const unsub = notificationService.subscribe(
      (notifs) => setUnreadNotifs(notifs.filter((n) => !n.is_read).length),
      uid,
      user?.role === "admin" ? "admin" : "singer",
    );
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const unsub = messageService.subscribeUnreadCount(uid, setUnreadMessages);
    return unsub;
  }, [uid]);

  return (
    <>
      <StatusBar style="light" />
      <View style={[s.container, { paddingTop: insets.top + 10 }]}>
        {/* Left — branding + title */}
        <View style={s.left}>
          <Text style={s.brand}>🎵 Jerusalem Youth Chorus</Text>
          <Text style={s.title}>{title}</Text>
        </View>

        {/* Right — messages, notifications, profile */}
        <View style={s.actions}>

          {/* Messages */}
          <Pressable
            style={s.iconWrap}
            onPress={() => router.push("/(tabs)/messages" as any)}
            hitSlop={8}
          >
            <Ionicons name="chatbubbles-outline" size={22} color="#fff" />
            {unreadMessages > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Notifications */}
          <Pressable
            style={s.iconWrap}
            onPress={() => router.push("/(tabs)/notifications" as any)}
            hitSlop={8}
          >
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {unreadNotifs > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>
                  {unreadNotifs > 9 ? "9+" : unreadNotifs}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Profile avatar */}
          <Pressable onPress={() => router.push("/profile" as any)} hitSlop={8}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {user?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
              </Text>
            </View>
          </Pressable>

        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: TEAL,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  left: { flex: 1, gap: 2 },
  brand: { fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "600" },
  title: { fontSize: 20, fontWeight: "800", color: "#fff" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#c56451",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: TEAL,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
