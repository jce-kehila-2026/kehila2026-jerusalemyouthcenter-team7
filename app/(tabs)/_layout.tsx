import { AppColors, Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ForcePasswordChangeModal } from "@/src/components/ForcePasswordChangeModal";
import { useAuth } from "@/src/context/AuthContext";
import { messageService } from "@/src/data/messageService";
import { notificationService } from "@/src/data/notificationService";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EventsProvider } from "../../src/context/EventsContext";

// ── Global Header ─────────────────────────────────────────────────────────────
function GlobalHeader({ title }: { title: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const currentUid = user?.uid ?? "";

  useEffect(() => {
    if (!currentUid) return;
    const unsub = notificationService.subscribe(
      (notifs) => setUnreadNotifs(notifs.filter((n) => !n.is_read).length),
      currentUid,
      user?.role === "admin" ? "admin" : "singer",
    );
    return unsub;
  }, [currentUid]);

  useEffect(() => {
    if (!currentUid) return;
    const unsub = messageService.subscribeUnreadCount(currentUid, (count) => {
      setUnreadMessages(count);
    });
    return unsub;
  }, [currentUid]);

  return (
    <>
      <StatusBar style="light" />
      <View style={[gh.container, { paddingTop: insets.top + 10 }]}>
        <View style={gh.left}>
          <Text style={gh.brand}>🎵 Jerusalem Youth Chorus</Text>
          <Text style={gh.title}>{title}</Text>
        </View>

        <View style={gh.actions}>
          <Pressable
            style={gh.iconWrap}
            onPress={() => router.push("/(tabs)/messages" as any)}
            hitSlop={8}
          >
            <Ionicons name="chatbubbles-outline" size={22} color="#fff" />
            {unreadMessages > 0 && (
              <View style={gh.badge}>
                <Text style={gh.badgeText}>
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={gh.iconWrap}
            onPress={() => router.push("/(tabs)/notifications" as any)}
            hitSlop={8}
          >
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {unreadNotifs > 0 && (
              <View style={gh.badge}>
                <Text style={gh.badgeText}>
                  {unreadNotifs > 9 ? "9+" : unreadNotifs}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable onPress={() => router.push("/profile" as any)} hitSlop={8}>
            <View style={gh.avatar}>
              <Text style={gh.avatarText}>
                {user?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const gh = StyleSheet.create({
  container: {
    backgroundColor: "#039899",
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
    borderColor: "#039899",
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});

// ── Tab Icon ──────────────────────────────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];
function TabIcon({
  name,
  color,
  size,
}: {
  name: IoniconsName;
  color: string;
  size: number;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { user } = useAuth();
  const [showForceChange, setShowForceChange] = useState(false);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const prevId = prevUserIdRef.current;
    const currentId = user?.uid ?? null;
    if (!prevId && currentId && user?.mustChangePassword) {
      setShowForceChange(true);
    }
    if (!currentId) setShowForceChange(false);
    prevUserIdRef.current = currentId;
  }, [user]);

  return (
    <EventsProvider>
      <Tabs
        screenOptions={({ route }) => ({
          tabBarActiveTintColor: AppColors.primary,
          tabBarInactiveTintColor: theme.tabIconDefault,
          tabBarStyle: {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
            paddingBottom: 4,
          },
          headerShown: true,

          header: () => {
            const titles: Record<string, string> = {
              index: "Dashboard",
              students: "Singers",
              events: "Events",
              forms: "Forms",
              library: "Library",
              messages: "Messages",
              notifications: "Notifications",
            };
            return <GlobalHeader title={titles[route.name] ?? "Kehila"} />;
          },
        })}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarLabel: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="grid-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="students"
          options={{
            tabBarLabel: "Singers",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="people-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="calendar-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="forms"
          options={{
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="document-text-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="notifications"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="library"
          options={{
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="musical-notes-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="Join-requests"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="admin"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="student-events"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="student-calender"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="calendar"
          options={{ href: null, headerShown: false }}
        />
      </Tabs>

      <ForcePasswordChangeModal
        visible={showForceChange && !!user}
        uid={user?.uid ?? ""}
        onDone={() => setShowForceChange(false)}
      />
    </EventsProvider>
  );
}
