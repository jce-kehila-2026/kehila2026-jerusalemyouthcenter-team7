import { AppColors, Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/src/context/AuthContext";
import {
  FirestoreNotification,
  notificationService,
} from "@/src/data/notificationService";
import { notifColor, notifIcon } from "@/src/utils/notifMeta";
import { timeAgo } from "@/src/utils/timeUtils";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Tab = "alerts" | "messages";

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("alerts");
  const [notifs, setNotifs] = useState<FirestoreNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const unsub = notificationService.subscribe(
      (items) => {
        setNotifs(items);
        setLoading(false);
      },
      user.uid,
      user.role,
    );
    return unsub;
  }, [user]);

  const alertItems = notifs.filter((n) => n.type !== "message");
  const messageItems = notifs.filter((n) => n.type === "message");
  const visibleNotifs = activeTab === "alerts" ? alertItems : messageItems;

  const alertUnread = alertItems.filter((n) => !n.is_read).length;
  const msgUnread = messageItems.filter((n) => !n.is_read).length;
  const activeUnread = activeTab === "alerts" ? alertUnread : msgUnread;

  async function markRead(id: string) {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    try {
      await notificationService.markRead(id);
    } catch (e) {
      console.error(e);
    }
  }

  async function markAllRead() {
    const ids = visibleNotifs.filter((n) => !n.is_read).map((n) => n.id);
    setNotifs((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n)),
    );
    try {
      await notificationService.markAllRead(ids);
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[s.container, { backgroundColor: theme.background }]}
      >
        <View style={s.center}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: theme.text }]}>Notifications</Text>
        {activeUnread > 0 && (
          <Pressable style={s.markAllBtn} onPress={markAllRead}>
            <Text style={s.markAllTxt}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {/* Tab bar — Alerts + Messages only */}
      <View
        style={[
          s.tabBar,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Pressable
          style={[
            s.tabPill,
            activeTab === "alerts" && { backgroundColor: AppColors.primary },
          ]}
          onPress={() => setActiveTab("alerts")}
        >
          <Ionicons
            name="notifications-outline"
            size={15}
            color={activeTab === "alerts" ? "#fff" : theme.subtext}
          />
          <Text style={[s.tabTxt, activeTab === "alerts" && { color: "#fff" }]}>
            Alerts
          </Text>
          {alertUnread > 0 && (
            <View
              style={[
                s.tabBadge,
                {
                  backgroundColor:
                    activeTab === "alerts"
                      ? "rgba(255,255,255,0.25)"
                      : AppColors.danger,
                },
              ]}
            >
              <Text style={s.tabBadgeTxt}>{alertUnread}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={[
            s.tabPill,
            activeTab === "messages" && { backgroundColor: AppColors.purple },
          ]}
          onPress={() => setActiveTab("messages")}
        >
          <Ionicons
            name="chatbubble-outline"
            size={15}
            color={activeTab === "messages" ? "#fff" : theme.subtext}
          />
          <Text
            style={[s.tabTxt, activeTab === "messages" && { color: "#fff" }]}
          >
            Messages
          </Text>
          {msgUnread > 0 && (
            <View
              style={[
                s.tabBadge,
                {
                  backgroundColor:
                    activeTab === "messages"
                      ? "rgba(255,255,255,0.25)"
                      : AppColors.purple,
                },
              ]}
            >
              <Text style={s.tabBadgeTxt}>{msgUnread}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Notifications list */}
      <FlatList
        data={visibleNotifs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const color = notifColor(item.type);
          const accentColor =
            activeTab === "messages" ? AppColors.purple : AppColors.primary;
          return (
            <Pressable
              style={[
                s.card,
                { backgroundColor: theme.card, borderColor: theme.border },
                !item.is_read && [
                  s.cardUnread,
                  { borderLeftColor: accentColor },
                ],
              ]}
              onPress={() => markRead(item.id)}
            >
              <View style={[s.iconWrap, { backgroundColor: color + "20" }]}>
                <Ionicons name={notifIcon(item.type)} size={18} color={color} />
              </View>
              <View style={s.cardBody}>
                <View style={s.cardTop}>
                  <Text
                    style={[
                      s.cardTitle,
                      { color: theme.text },
                      !item.is_read && s.cardTitleBold,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={[s.cardTime, { color: theme.subtext }]}>
                    {timeAgo(item.timestamp)}
                  </Text>
                </View>
                <Text
                  style={[s.cardBodyTxt, { color: theme.subtext }]}
                  numberOfLines={2}
                >
                  {item.body}
                </Text>
              </View>
              {!item.is_read && (
                <View style={[s.unreadDot, { backgroundColor: accentColor }]} />
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons
              name={
                activeTab === "alerts"
                  ? "notifications-off-outline"
                  : "chatbubble-ellipses-outline"
              }
              size={48}
              color={theme.subtext}
            />
            <Text style={[s.emptyTxt, { color: theme.text }]}>
              {activeTab === "alerts"
                ? "No alerts"
                : "No message notifications"}
            </Text>
            <Text style={[s.emptySubtxt, { color: theme.subtext }]}>
              {activeTab === "alerts"
                ? "Event and form notifications will appear here"
                : "Notifications from messages will appear here"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: { fontSize: 24, fontWeight: "800" },
  markAllBtn: {
    backgroundColor: AppColors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllTxt: { color: AppColors.primary, fontSize: 13, fontWeight: "600" },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 9,
  },
  tabTxt: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  tabBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  tabBadgeTxt: { color: "#fff", fontSize: 9, fontWeight: "800" },
  list: { padding: 16, gap: 10, paddingBottom: 100 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  cardUnread: { borderLeftWidth: 3 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
    gap: 8,
  },
  cardTitle: { fontSize: 14, flex: 1 },
  cardTitleBold: { fontWeight: "700" },
  cardTime: { fontSize: 11, flexShrink: 0 },
  cardBodyTxt: { fontSize: 13, lineHeight: 18 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  empty: { alignItems: "center", paddingTop: 70, gap: 10 },
  emptyTxt: { fontSize: 16, fontWeight: "600" },
  emptySubtxt: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 32,
  },
});
